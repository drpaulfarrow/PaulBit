const express = require('express');
const axios = require('axios');
const db = require('../db');
const router = express.Router();

const URL_PARSER_URL = process.env.URL_PARSER_URL || 'http://url-parser:4000';

/**
 * POST /grounding/test
 * 
 * Test access to a URL via a specific access endpoint with a specific license.
 * This validates: Can I access this URL through endpoint X using license Y?
 * 
 * Request body:
 * {
 *   "url": "https://example.com/article",
 *   "accessEndpointId": 8,
 *   "licenseId": 24,
 *   "publisherId": 1,
 *   "extractMainContent": true,
 *   "includeMetadata": true
 * }
 */
router.post('/grounding/test', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const {
      url,
      accessEndpointId,
      licenseId,
      publisherId = 1,
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

    if (!accessEndpointId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing accessEndpointId' 
      });
    }

    if (!licenseId) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing licenseId' 
      });
    }

    // 1. Get access endpoint configuration
    const endpointQuery = await db.query(
      `SELECT * FROM access_endpoints WHERE id = $1 AND publisher_id = $2`,
      [accessEndpointId, publisherId]
    );

    if (endpointQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Access endpoint not found'
      });
    }

    const endpoint = endpointQuery.rows[0];

    // 2. Get license configuration
    const licenseQuery = await db.query(
      `SELECT * FROM license_options WHERE id = $1 AND publisher_id = $2`,
      [licenseId, publisherId]
    );

    if (licenseQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'License not found'
      });
    }

    const license = licenseQuery.rows[0];

    // 3. Prepare request based on endpoint configuration
    const requestFormat = endpoint.request_format || 'json';
    const responseFormat = endpoint.response_format || 'html';
    const requestHeaders = endpoint.request_headers || {};

    let requestData;
    let requestConfig = {
      timeout: 20000,
      headers: {
        ...requestHeaders,
        'User-Agent': 'MonetizePlus-Scraper/1.0',
        'X-License-Id': licenseId.toString(),
        'X-Publisher-Id': publisherId.toString()
      }
    };

    // Build request based on format
    if (requestFormat === 'json') {
      requestConfig.headers['Content-Type'] = 'application/json';
      requestData = {
        url,
        extractMainContent,
        includeMetadata,
        licenseId,
        publisherId
      };
    } else if (requestFormat === 'form') {
      requestConfig.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams({
        url,
        extractMainContent: extractMainContent.toString(),
        includeMetadata: includeMetadata.toString(),
        licenseId: licenseId.toString(),
        publisherId: publisherId.toString()
      });
      requestData = params.toString();
    }

    // 4. Make request to the access endpoint
    let accessResponse;
    let accessGranted = false;
    let accessError = null;

    try {
      // For API endpoints, make direct request
      if (endpoint.access_type === 2) { // API
        accessResponse = await axios.post(
          endpoint.endpoint,
          requestData,
          requestConfig
        );
        
        // Check if response indicates access granted
        if (accessResponse.status === 200) {
          accessGranted = true;
        }
      } else {
        // For HTML/RSS/other types, use the URL parser
        accessResponse = await axios.post(
          `${URL_PARSER_URL}/to-markdown`,
          { url, extractMainContent, includeMetadata },
          requestConfig
        );
        
        if (accessResponse.status === 200) {
          accessGranted = true;
        }
      }
    } catch (err) {
      console.error('Access endpoint request failed:', err.message);
      accessError = err.response?.data?.error || err.message;
      accessGranted = false;
    }

    // 5. Parse response based on response format
    let parsedContent = null;
    let metadata = {};

    if (accessGranted && accessResponse) {
      if (responseFormat === 'json') {
        parsedContent = accessResponse.data.markdown || accessResponse.data.content;
        metadata = accessResponse.data.metadata || {};
      } else if (responseFormat === 'html' || responseFormat === 'markdown') {
        parsedContent = accessResponse.data.markdown;
        metadata = accessResponse.data.metadata || {};
      } else if (responseFormat === 'xml' || responseFormat === 'rss') {
        // For XML/RSS, the parser should handle it
        parsedContent = accessResponse.data.markdown;
        metadata = accessResponse.data.metadata || {};
      }
    }

    // 6. Apply license terms
    const licenseTypeNames = {
      0: 'Training + Display',
      1: 'RAG Display (Unrestricted)',
      2: 'RAG Display (Max Words)',
      3: 'RAG Display (Attribution)',
      4: 'RAG No Display'
    };

    const licenseInfo = {
      licenseId: license.id,
      licenseName: license.name || `license_${license.id}`,
      licenseType: license.license_type,
      licenseTypeName: licenseTypeNames[license.license_type] || 'Unknown',
      price: parseFloat(license.price),
      currency: license.currency,
      maxWordCount: license.max_word_count,
      attributionRequired: license.attribution_required,
      displayAllowed: [0, 1, 2, 3].includes(license.license_type),
      trainingAllowed: license.license_type === 0
    };

    // Apply word limit if specified
    if (licenseInfo.maxWordCount && parsedContent) {
      const words = parsedContent.split(/\s+/);
      if (words.length > licenseInfo.maxWordCount) {
        parsedContent = words.slice(0, licenseInfo.maxWordCount).join(' ') + '...';
        metadata.wordCountLimited = true;
        metadata.originalWordCount = words.length;
      }
    }

    // 7. Build response
    const totalTime = Date.now() - startTime;

    const result = {
      success: true,
      accessGranted,
      url,
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        type: endpoint.access_type,
        typeName: ['HTML', 'RSS', 'API', 'MCP', 'NLWeb'][endpoint.access_type],
        endpoint: endpoint.endpoint,
        requestFormat: endpoint.request_format,
        responseFormat: endpoint.response_format
      },
      license: licenseInfo,
      content: accessGranted ? parsedContent : null,
      metadata: accessGranted ? metadata : {},
      error: accessError,
      processingTimeMs: totalTime
    };

    // 8. Log usage if access was granted
    if (accessGranted) {
      try {
        const { v4: uuidv4 } = require('uuid');
        
        await db.query(
          `INSERT INTO usage_events 
           (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose, license_id) 
           VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8)`,
          [
            uuidv4(),
            publisherId,
            4, // Test client
            url,
            'MonetizePlus-Test-Scraper/1.0',
            Math.round(parseFloat(license.price) * 1000000),
            'test',
            licenseId
          ]
        );
      } catch (err) {
        console.error('Failed to log usage event:', err);
      }
    }

    res.json(result);

  } catch (error) {
    console.error('Grounding test error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /grounding
 * 
 * Grounding API for search/copilot systems that need licensed content as markdown.
 * 
 * Request body:
 * {
 *   "url": "https://site-a.local/news/foo.html",
 *   "userAgent": "GPTBot/1.0",
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

    // 2. Check if this domain belongs to any publisher via publisher_domains table
    let publisherQuery = await db.query(
      `SELECT p.id, p.name, p.hostname 
       FROM publishers p
       INNER JOIN publisher_domains pd ON p.id = pd.publisher_id
       WHERE pd.domain = $1
       LIMIT 1`,
      [publisherDomain]
    );

    // Fallback: Check legacy hostname match (for backwards compatibility)
    if (publisherQuery.rows.length === 0) {
      publisherQuery = await db.query(
        'SELECT id, name, hostname FROM publishers WHERE hostname = $1',
        [publisherDomain]
      );
    }

    // Auto-register new publishers when first encountered
    if (publisherQuery.rows.length === 0) {
      console.log(`Auto-registering new publisher: ${publisherDomain}`);
      const insertResult = await db.query(
        'INSERT INTO publishers (name, hostname) VALUES ($1, $2) RETURNING id, name, hostname',
        [publisherDomain, publisherDomain]
      );
      publisherQuery = insertResult;
      
      // Also add to publisher_domains
      await db.query(
        'INSERT INTO publisher_domains (publisher_id, domain, verified) VALUES ($1, $2, true)',
        [insertResult.rows[0].id, publisherDomain]
      );
      
      console.log(`Publisher registered: id=${insertResult.rows[0].id}, hostname=${publisherDomain}`);
    }

    let licenseInfo = {
      domain: publisherDomain,
      isRegisteredPublisher: false,
      policyEnforced: false,
      allowed: true,  // Default to allowed for open access
      status: 'open_access',
      message: 'No publisher policy found for this domain - content freely available'
    };

    // Check publisher's policy
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
        // Extract bot name from clientId or User-Agent header
        // Priority: clientId (explicit bot name) > userAgent (from headers)
        let agentName = clientId.toLowerCase().trim();
        
        // If clientId is generic (anonymous, unknown, etc), try to extract from userAgent
        if (agentName === 'anonymous' || agentName === 'unknown' || !agentName) {
          agentName = userAgent.split('/')[0].toLowerCase().trim();
        }
        
        let allowed = policyDoc.default?.allow || false;
        let costPerFetch = policyDoc.default?.price_per_fetch || 0;
        let matchedRule = null;

        console.log(`Policy evaluation for: ${agentName} accessing ${url}`);
        console.log(`Default policy: allow=${allowed}`);

        // Check for specific agent rules
        for (const rule of policyDoc.rules || []) {
          const ruleAgent = (rule.agent || '').toLowerCase().trim();
          
          // Skip empty rules
          if (!ruleAgent) continue;
          
          console.log(`Checking rule: agent=${ruleAgent}, allow=${rule.allow}, license_type=${rule.license_type}`);
          
          // Match: exact match or wildcard (*)
          const isMatch = ruleAgent === '*' || 
                         ruleAgent === agentName || 
                         agentName.startsWith(ruleAgent.replace('*', ''));
          
          if (isMatch) {
            console.log(`  → Agent matched: ${ruleAgent} === ${agentName}`);
            // Agent matches - apply this rule
            allowed = rule.allow;
            costPerFetch = rule.price_per_fetch || costPerFetch;
            matchedRule = rule;
            break;
          }
        }

        console.log(`Final decision: allowed=${allowed}, matched rule=${matchedRule?.agent || 'default'}`);

        // License type mapping
        const licenseTypeNames = {
          0: 'TrainingDisplay',
          1: 'RAGDisplayUnrestricted',
          2: 'RAGDisplayMaxWords',
          3: 'RAGDisplayAttribution',
          4: 'RAGNoDisplay'
        };

        const licenseType = matchedRule?.license_type !== undefined ? matchedRule.license_type : 1;
        const licenseTypeName = licenseTypeNames[licenseType] || 'RAGDisplayUnrestricted';

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
          currency: 'USD',
          licenseType: licenseType,
          licenseTypeName: licenseTypeName,
          maxWordCount: matchedRule?.max_word_count,
          attributionRequired: matchedRule?.attribution_required,
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
            
            // Map bot name to client ID (or use anonymous)
            const botToClientMap = {
              'gptbot': 1,      // OpenAI
              'claudebot': 2,   // Anthropic  
              'perplexity': 3   // Perplexity
            };
            
            const botName = agentName.toLowerCase();
            const clientIdNum = botToClientMap[botName] || 4; // Default to Anonymous Bots
            
            await db.query(
              `INSERT INTO usage_events 
               (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, license_type) 
               VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7)`,
              [
                uuidv4(),
                publisherId,
                clientIdNum,
                url,
                userAgent,
                Math.round(costPerFetch * 1000000), // Convert to micro-dollars
                licenseType
              ]
            );
          } catch (err) {
            console.error('Failed to log usage event:', err);
          }
        }
      }
    }

    // 3. Check if access is denied - return error before fetching content
    if (licenseInfo && !licenseInfo.allowed) {
      return res.status(403).json({
        success: false,
        error: 'Access Denied',
        message: licenseInfo.message,
        license: licenseInfo,
        url
      });
    }

    // 4. Return content with license information
    const totalTime = Date.now() - startTime;
    
    // 5. Save/update URL in parsed_urls table
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
        licenseType: licenseInfo.licenseType,
        licenseTypeName: licenseInfo.licenseTypeName,
        licensePath: licenseInfo.policyEnforced ? `Publisher ${licenseInfo.publisherId} Policy v${licenseInfo.policyVersion}` : 'No policy',
        error: ''
      };
      
      // REMOVED: Auto-save to parsed_urls table
      // URLs must be manually added to the library BEFORE testing via the Scraper
      // This enforces the workflow: URL Library => Policy Editor => Scraper => Analytics
      /*
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
      */
    } catch (err) {
      console.error('Parser or license check error:', err);
      // Continue with the request
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
