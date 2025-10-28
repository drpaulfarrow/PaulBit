const express = require('express');
const axios = require('axios');
const db = require('../db');
const router = express.Router();

const URL_PARSER_URL = process.env.URL_PARSER_URL || 'http://url-parser:4000';

/**
 * POST /grounding
 * 
 * Grounding API for search/copilot systems that need licensed content as markdown.
 * 
 * Request body:
 * {
 *   "url": "https://site-a.local/news/foo.html",
 *   "userAgent": "GPTBot/1.0",
 *   "purpose": "inference",
 *   "clientId": "openai-client-123",
 *   "extractMainContent": true,
 *   "includeMetadata": true
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "url": "...",
 *   "markdown": "...",
 *   "metadata": {...},
 *   "license": {
 *     "publisher": "site-a.local",
 *     "publisherId": 1,
 *     "allowed": true,
 *     "purpose": "inference",
 *     "costPerFetch": 0.002,
 *     "policyVersion": "1.0"
 *   },
 *   "processingTimeMs": 450
 * }
 */
router.post('/grounding', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      url,
      userAgent = 'Unknown',
      purpose = 'inference',
      clientId = 'anonymous',
      extractMainContent = true,
      includeMetadata = true
    } = req.body;

    // Validate required fields
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ 
        success: false,
        error: 'Missing or invalid URL' 
      });
    }

    // Parse URL to get publisher domain
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch (err) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid URL format' 
      });
    }

    const publisherDomain = parsedUrl.hostname;

    // 1. Always fetch and parse the URL first (open access for grounding)
    let parserResponse;
    try {
      parserResponse = await axios.post(
        `${URL_PARSER_URL}/to-markdown`,
        {
          url,
          extractMainContent,
          includeMetadata
        },
        {
          timeout: 20000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (err) {
      console.error('Parser service error:', err.message);
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch or parse URL',
        details: err.response?.data || err.message
      });
    }

    // 2. Check if this domain has a registered publisher and policy (optional)
    const publisherQuery = await db.query(
      'SELECT id, name, hostname FROM publishers WHERE hostname = $1',
      [publisherDomain]
    );

    let licenseInfo = {
      domain: publisherDomain,
      isRegisteredPublisher: false,
      policyEnforced: false,
      status: 'open_access',
      message: 'No publisher policy found for this domain - content freely available'
    };

    // If publisher exists, check their policy
    if (publisherQuery.rows.length > 0) {
      const publisher = publisherQuery.rows[0];
      const publisherId = publisher.id;

      // Get policies: check for page-specific first, then default
      // Priority: exact URL match > default publisher policy
      const policyQuery = await db.query(
        `SELECT policy_json, version, url_pattern, name, description, created_at 
         FROM policies 
         WHERE publisher_id = $1 
           AND (url_pattern = $2 OR url_pattern IS NULL)
         ORDER BY 
           CASE WHEN url_pattern IS NULL THEN 1 ELSE 0 END,
           created_at DESC 
         LIMIT 1`,
        [publisherId, url]
      );

      if (policyQuery.rows.length > 0) {
        const policyDoc = policyQuery.rows[0].policy_json;
        const policyVersion = policyQuery.rows[0].version;
        const policyUrlPattern = policyQuery.rows[0].url_pattern;
        const policyName = policyQuery.rows[0].name;
        const isPageSpecific = policyUrlPattern !== null;

        // Evaluate policy
        // Extract bot name from User-Agent or use clientId
        const agentName = (userAgent.split('/')[0] || clientId).toLowerCase().trim();
        let allowed = policyDoc.default?.allow || false;
        let costPerFetch = policyDoc.default?.price_per_fetch || 0;
        let matchedRule = null;

        // Check for specific agent rules
        for (const rule of policyDoc.rules || []) {
          const ruleAgent = (rule.agent || '').toLowerCase().trim();
          
          // Skip empty rules
          if (!ruleAgent) continue;
          
          // Match: exact match or wildcard (*)
          const isMatch = ruleAgent === '*' || 
                         ruleAgent === agentName || 
                         agentName.startsWith(ruleAgent.replace('*', ''));
          
          if (isMatch) {
            // Check if rule has purpose restrictions
            if (rule.purpose && Array.isArray(rule.purpose) && rule.purpose.length > 0) {
              // Purpose-specific rule: only match if purpose matches
              if (rule.purpose.includes(purpose)) {
                allowed = rule.allow;
                costPerFetch = rule.price_per_fetch || costPerFetch;
                matchedRule = rule;
                break;
              }
            } else {
              // No purpose restriction: always match
              allowed = rule.allow;
              costPerFetch = rule.price_per_fetch || costPerFetch;
              matchedRule = rule;
              break;
            }
          }
        }

        licenseInfo = {
          domain: publisherDomain,
          isRegisteredPublisher: true,
          publisherId,
          publisherName: publisher.name,
          policyEnforced: true,
          policyVersion,
          policyName,
          policyType: isPageSpecific ? 'page-specific' : 'default',
          urlPattern: policyUrlPattern,
          allowed,
          costPerFetch,
          rule: matchedRule?.agent || 'default',
          status: allowed ? 'licensed' : 'restricted',
          message: allowed 
            ? `Access granted under ${publisher.name} ${isPageSpecific ? 'page-specific' : 'default'} policy` 
            : `Access restricted by ${publisher.name} ${isPageSpecific ? 'page-specific' : 'default'} policy - content included for reference only`
        };

        // Log usage if policy allows
        if (allowed) {
          try {
            const { v4: uuidv4 } = require('uuid');
            await db.query(
              `INSERT INTO usage_events 
               (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) 
               VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
              [
                uuidv4(),
                publisherId,
                clientId,
                url,
                userAgent,
                Math.round(costPerFetch * 1000000), // Convert to micro-dollars
                purpose
              ]
            );
          } catch (err) {
            console.error('Failed to log usage event:', err);
          }
        }
      }
    }

    // 3. Return content with license information
    const totalTime = Date.now() - startTime;
    
    // 4. Save/update URL in parsed_urls table
    try {
      const urlMetadata = parserResponse.data.metadata || {};
      const markdownContent = parserResponse.data.markdown || '';
      
      // Structure the content in the required format
      const structuredContent = {
        header: urlMetadata.title || '',
        main: markdownContent,
        footer: ''
      };
      
      // Build metadata section
      const contentMetadata = {
        ...urlMetadata,
        lastParseTime: totalTime,
        licenseStatus: licenseInfo.status
      };
      
      // Build rate information
      const rateInfo = {
        priceMicros: licenseInfo.costPerFetch ? Math.round(licenseInfo.costPerFetch * 1000000) : 0,
        currency: 'USD',
        licenseType: licenseInfo.allowed ? 'ON_DEMAND_LICENSE' : 'RESTRICTED',
        licensePath: licenseInfo.policyEnforced ? `Publisher ${licenseInfo.publisherId} Policy v${licenseInfo.policyVersion}` : 'No policy',
        error: ''
      };
      
      await db.query(
        `INSERT INTO parsed_urls 
         (url, domain, title, description, content, last_status, metadata, parse_count, last_parsed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, CURRENT_TIMESTAMP)
         ON CONFLICT (url) 
         DO UPDATE SET 
           title = COALESCE(EXCLUDED.title, parsed_urls.title),
           description = COALESCE(EXCLUDED.description, parsed_urls.description),
           content = EXCLUDED.content,
           last_parsed_at = CURRENT_TIMESTAMP,
           parse_count = parsed_urls.parse_count + 1,
           last_status = EXCLUDED.last_status,
           metadata = EXCLUDED.metadata`,
        [
          url,
          publisherDomain,
          urlMetadata.title || null,
          urlMetadata.description || null,
          JSON.stringify({
            content: structuredContent,
            metadata: contentMetadata,
            rate: rateInfo
          }),
          'success',
          JSON.stringify(contentMetadata)
        ]
      );
    } catch (err) {
      console.error('Failed to save parsed URL to library:', err);
      // Don't fail the request if we can't save to library
    }
    
    res.json({
      success: true,
      url,
      markdown: parserResponse.data.markdown,
      metadata: parserResponse.data.metadata,
      license: licenseInfo,
      processingTimeMs: totalTime,
      parserDetails: parserResponse.data.details
    });

  } catch (error) {
    console.error('Grounding API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;
