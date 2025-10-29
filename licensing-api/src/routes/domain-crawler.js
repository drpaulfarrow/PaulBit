const express = require('express');
const axios = require('axios');
const { parseString } = require('xml2js');
const { promisify } = require('util');
const db = require('../db');
const router = express.Router();

const parseXml = promisify(parseString);

/**
 * Parse robots.txt and extract sitemap URLs
 */
async function getRobotsTxtSitemaps(domain) {
  try {
    const robotsUrl = `https://${domain}/robots.txt`;
    console.log(`Fetching robots.txt from: ${robotsUrl}`);
    const response = await axios.get(robotsUrl, { timeout: 10000 });
    const robotsTxt = response.data;
    
    // Extract sitemap URLs from robots.txt
    const sitemapRegex = /Sitemap:\s*(.+)/gi;
    const sitemaps = [];
    let match;
    
    while ((match = sitemapRegex.exec(robotsTxt)) !== null) {
      sitemaps.push(match[1].trim());
    }
    
    console.log(`Found ${sitemaps.length} sitemaps in robots.txt`);
    return sitemaps;
  } catch (error) {
    console.log(`No robots.txt found for ${domain}, trying default sitemap locations`);
    // Try common sitemap locations
    return [
      `https://${domain}/sitemap.xml`,
      `https://${domain}/sitemap_index.xml`
    ];
  }
}

/**
 * Fetch and parse sitemap XML to extract URLs
 */
async function getSitemapUrls(sitemapUrl, limit = 5) {
  try {
    console.log(`Fetching sitemap: ${sitemapUrl}`);
    const response = await axios.get(sitemapUrl, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'TollbitCrawler/1.0'
      }
    });
    const xml = response.data;
    
    const result = await parseXml(xml);
    const urls = [];
    
    // Handle sitemap index (links to other sitemaps)
    if (result.sitemapindex) {
      console.log('Found sitemap index, fetching nested sitemap');
      const sitemaps = result.sitemapindex.sitemap || [];
      // Take first sitemap from index
      if (sitemaps.length > 0 && sitemaps[0].loc) {
        const nestedSitemapUrl = sitemaps[0].loc[0];
        return await getSitemapUrls(nestedSitemapUrl, limit);
      }
    }
    
    // Handle regular sitemap (URLs)
    if (result.urlset && result.urlset.url) {
      const urlEntries = result.urlset.url;
      console.log(`Found ${urlEntries.length} URLs in sitemap, taking ${Math.min(limit, urlEntries.length)}`);
      for (let i = 0; i < Math.min(limit, urlEntries.length); i++) {
        if (urlEntries[i].loc && urlEntries[i].loc[0]) {
          urls.push(urlEntries[i].loc[0]);
        }
      }
    }
    
    return urls;
  } catch (error) {
    console.error(`Failed to fetch sitemap ${sitemapUrl}:`, error.message);
    return [];
  }
}

/**
 * POST /domain-crawler/crawl
 * Crawl a domain to discover and add pages
 * 
 * Body: { domain, publisherId, limit }
 */
router.post('/crawl', async (req, res) => {
  const { domain, publisherId, limit = 5 } = req.body;
  
  if (!domain || !publisherId) {
    return res.status(400).json({ 
      success: false,
      error: 'Missing domain or publisherId' 
    });
  }
  
  try {
    console.log(`Starting crawl for domain: ${domain}, publisher: ${publisherId}`);
    
    // Step 1: Ensure domain is associated with publisher
    await db.query(`
      INSERT INTO publisher_domains (publisher_id, domain, verified)
      VALUES ($1, $2, true)
      ON CONFLICT (publisher_id, domain) DO NOTHING
    `, [publisherId, domain]);
    
    // Step 2: Get sitemaps from robots.txt
    const sitemaps = await getRobotsTxtSitemaps(domain);
    console.log(`Found ${sitemaps.length} sitemaps for ${domain}`);
    
    const discoveredUrls = [];
    
    // Step 3: Parse sitemaps to get URLs
    for (const sitemapUrl of sitemaps) {
      const urls = await getSitemapUrls(sitemapUrl, limit - discoveredUrls.length);
      discoveredUrls.push(...urls);
      
      if (discoveredUrls.length >= limit) {
        break; // Got enough URLs
      }
    }
    
    console.log(`Discovered ${discoveredUrls.length} URLs from ${domain}`);
    
    if (discoveredUrls.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'No URLs found', 
        message: `Could not find any URLs in sitemaps for ${domain}` 
      });
    }
    
    // Step 4: Add URLs to library
    const addedUrls = [];
    const skippedUrls = [];
    
    for (const url of discoveredUrls) {
      try {
        // Extract basic info
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        
        // Check if URL already exists
        const existing = await db.query(
          'SELECT id FROM parsed_urls WHERE url = $1',
          [url]
        );
        
        if (existing.rows.length > 0) {
          skippedUrls.push(url);
          continue;
        }
        
        // Add to library
        const result = await db.query(`
          INSERT INTO parsed_urls (url, domain, parse_count, last_status, metadata, created_at)
          VALUES ($1, $2, 0, 'not_parsed', $3, NOW())
          RETURNING id, url, domain
        `, [
          url,
          hostname,
          JSON.stringify({ 
            discovered_via: 'domain_crawler',
            source_domain: domain,
            crawled_at: new Date().toISOString()
          })
        ]);
        
        addedUrls.push(result.rows[0]);
      } catch (error) {
        console.error(`Failed to add URL ${url}:`, error.message);
      }
    }
    
    console.log(`Crawl complete: ${addedUrls.length} added, ${skippedUrls.length} skipped`);
    
    res.json({
      success: true,
      domain,
      discovered: discoveredUrls.length,
      added: addedUrls.length,
      skipped: skippedUrls.length,
      urls: addedUrls,
      message: `Successfully added ${addedUrls.length} pages from ${domain}`
    });
    
  } catch (error) {
    console.error('Domain crawl error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Crawl failed', 
      details: error.message 
    });
  }
});

module.exports = router;
