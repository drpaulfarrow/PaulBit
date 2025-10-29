const express = require('express');
const db = require('../db');
const router = express.Router();

/**
 * POST /parsed-urls
 * 
 * Manually add a URL to the library (without parsing)
 * 
 * Body:
 * - url: the URL to add (required)
 * - title: optional title
 * - description: optional description
 */
router.post('/parsed-urls', async (req, res) => {
  try {
    const { url, title, description } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Extract domain from URL
    let domain;
    try {
      const urlObj = new URL(url);
      domain = urlObj.hostname;
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    // Insert or update the URL
    const result = await db.query(`
      INSERT INTO parsed_urls (url, domain, title, description, parse_count, last_status)
      VALUES ($1, $2, $3, $4, 0, 'not_parsed')
      ON CONFLICT (url) 
      DO UPDATE SET 
        title = COALESCE($3, parsed_urls.title),
        description = COALESCE($4, parsed_urls.description),
        last_parsed_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [url, domain, title, description]);

    res.json({
      success: true,
      message: 'URL added to library',
      url: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add URL',
      message: error.message
    });
  }
});

/**
 * GET /parsed-urls
 * 
 * List all parsed URLs in the user's library
 * 
 * Query params:
 * - domain: filter by domain
 * - limit: max results (default 50)
 * - offset: pagination offset (default 0)
 * - search: search in title/description
 * - sortBy: 'last_parsed' (default) or 'first_parsed' or 'parse_count'
 * - sortOrder: 'desc' (default) or 'asc'
 */
router.get('/parsed-urls', async (req, res) => {
  try {
    const {
      domain,
      limit = 50,
      offset = 0,
      search,
      sortBy = 'last_parsed',
      sortOrder = 'desc'
    } = req.query;

    // Build query - exclude content field (metadata only for URL library)
    let query = 'SELECT id, url, domain, title, description, first_parsed_at, last_parsed_at, parse_count, last_status, metadata, created_at FROM parsed_urls WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (domain) {
      query += ` AND domain = $${paramIndex}`;
      params.push(domain);
      paramIndex++;
    }

    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Sorting
    const validSortColumns = {
      'last_parsed': 'last_parsed_at',
      'first_parsed': 'first_parsed_at',
      'parse_count': 'parse_count'
    };
    const sortColumn = validSortColumns[sortBy] || 'last_parsed_at';
    const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${order}`;

    // Pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Enrich each URL with policy information
    const enrichedUrls = await Promise.all(result.rows.map(async (url) => {
      try {
        // Extract domain from URL
        const urlObj = new URL(url.url);
        const hostname = urlObj.hostname;

        // Check for page-specific policy (exact URL match)
        const pagePolicy = await db.query(
          'SELECT id, name FROM policies WHERE url_pattern = $1',
          [url.url]
        );

        // Check for default policy (by hostname)
        const defaultPolicy = await db.query(`
          SELECT p.id, p.name, pub.hostname 
          FROM policies p
          JOIN publishers pub ON p.publisher_id = pub.id
          WHERE pub.hostname = $1 AND p.url_pattern IS NULL
        `, [hostname]);

        // Build metadata
        const metadata = {
          hasPageSpecificPolicy: pagePolicy.rows.length > 0,
          pageSpecificPolicyName: pagePolicy.rows[0]?.name || null,
          hasDefaultPolicy: defaultPolicy.rows.length > 0,
          defaultPolicyName: defaultPolicy.rows[0]?.name || null,
          licenseStatus: pagePolicy.rows.length > 0 ? 'licensed' : 
                        defaultPolicy.rows.length > 0 ? 'licensed' : 'no_policy'
        };

        return {
          ...url,
          metadata
        };
      } catch (err) {
        console.error('Error enriching URL:', url.url, err);
        return {
          ...url,
          metadata: { licenseStatus: 'unknown' }
        };
      }
    }));

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM parsed_urls WHERE 1=1';
    const countParams = [];
    let countParamIndex = 1;

    if (domain) {
      countQuery += ` AND domain = $${countParamIndex}`;
      countParams.push(domain);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex} OR url ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      urls: enrichedUrls,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + result.rows.length) < totalCount
      }
    });

  } catch (error) {
    console.error('Error fetching parsed URLs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch parsed URLs',
      message: error.message
    });
  }
});

/**
 * GET /parsed-urls/:id
 * 
 * Get details of a specific parsed URL
 */
router.get('/parsed-urls/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM parsed_urls WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'URL not found'
      });
    }

    res.json({
      success: true,
      url: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching URL details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch URL details',
      message: error.message
    });
  }
});

/**
 * DELETE /parsed-urls/:id
 * 
 * Remove a URL from the library
 */
router.delete('/parsed-urls/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM parsed_urls WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'URL not found'
      });
    }

    res.json({
      success: true,
      message: 'URL removed from library',
      url: result.rows[0]
    });

  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete URL',
      message: error.message
    });
  }
});

/**
 * GET /parsed-urls/stats/summary
 * 
 * Get summary statistics about the URL library
 */
router.get('/parsed-urls/stats/summary', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_urls,
        COUNT(DISTINCT domain) as unique_domains,
        SUM(parse_count) as total_parses,
        MAX(last_parsed_at) as most_recent_parse
      FROM parsed_urls
    `);

    const topDomains = await db.query(`
      SELECT domain, COUNT(*) as url_count
      FROM parsed_urls
      GROUP BY domain
      ORDER BY url_count DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      stats: stats.rows[0],
      topDomains: topDomains.rows
    });

  } catch (error) {
    console.error('Error fetching URL stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch URL statistics',
      message: error.message
    });
  }
});

module.exports = router;
