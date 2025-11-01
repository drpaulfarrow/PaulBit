const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/urls
 * Get all URLs for a publisher
 */
router.get('/', async (req, res) => {
  try {
    const { publisher_id, limit = 100, offset = 0 } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const result = await db.query(
      `SELECT c.id, c.url, c.title, c.publisher_id, c.created_ts as created_at, c.updated_ts as updated_at,
              COUNT(DISTINCT l.id) as license_count
       FROM content c
       LEFT JOIN license_options l ON c.id = l.content_id
       WHERE c.publisher_id = $1
       GROUP BY c.id, c.created_ts, c.updated_ts
       ORDER BY c.created_ts DESC
       LIMIT $2 OFFSET $3`,
      [publisher_id, limit, offset]
    );

    res.json({ 
      urls: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Failed to fetch URLs' });
  }
});

/**
 * GET /api/urls/stats
 * Get URL statistics for a publisher
 */
router.get('/stats', async (req, res) => {
  try {
    const { publisher_id } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const statsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT c.id) as total_urls,
        COUNT(DISTINCT l.id) as total_licenses,
        COUNT(DISTINCT CASE WHEN l.status = 'active' THEN l.id END) as active_licenses
       FROM content c
       LEFT JOIN license_options l ON c.id = l.content_id
       WHERE c.publisher_id = $1`,
      [publisher_id]
    );

    res.json({ 
      total_urls: parseInt(statsResult.rows[0].total_urls) || 0,
      total_licenses: parseInt(statsResult.rows[0].total_licenses) || 0,
      active_licenses: parseInt(statsResult.rows[0].active_licenses) || 0
    });
  } catch (error) {
    console.error('Error fetching URL stats:', error);
    res.status(500).json({ error: 'Failed to fetch URL stats' });
  }
});

/**
 * POST /api/urls
 * Add a new URL
 */
router.post('/', async (req, res) => {
  try {
    const { publisher_id, url, title } = req.body;
    
    if (!publisher_id || !url) {
      return res.status(400).json({ error: 'publisher_id and url are required' });
    }

    const result = await db.query(
      `INSERT INTO content (publisher_id, url, title, content_id, created_ts, updated_ts)
       VALUES ($1, $2, $3, gen_random_uuid()::text, NOW(), NOW())
       RETURNING *`,
      [publisher_id, url, title || url]
    );

    res.status(201).json({ 
      success: true,
      url: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding URL:', error);
    res.status(500).json({ error: 'Failed to add URL' });
  }
});

/**
 * DELETE /api/urls/:id
 * Delete a URL
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM content WHERE id = $1', [id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting URL:', error);
    res.status(500).json({ error: 'Failed to delete URL' });
  }
});

module.exports = router;
