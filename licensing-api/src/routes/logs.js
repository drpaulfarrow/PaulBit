const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/logs
 * Get usage logs for a publisher
 */
router.get('/', async (req, res) => {
  try {
    const { publisher_id, limit = 100, offset = 0, start_date, end_date } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    let query = `
      SELECT ue.*
      FROM usage_events ue
      WHERE ue.publisher_id = $1
    `;
    const params = [publisher_id];

    if (start_date) {
      query += ` AND ue.ts >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ue.ts <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY ue.ts DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      logs: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * GET /api/logs/stats
 * Get usage statistics for a publisher
 */
router.get('/stats', async (req, res) => {
  try {
    const { publisher_id, days = 30 } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT ue.client_id) as unique_clients,
        COUNT(DISTINCT ue.url) as accessed_urls,
        COUNT(*) as authorized_requests,
        0 as unauthorized_requests
       FROM usage_events ue
       WHERE ue.publisher_id = $1
       AND ue.ts >= NOW() - INTERVAL '${parseInt(days)} days'`,
      [publisher_id]
    );

    // Get revenue estimate (if available)
    const revenueResult = await db.query(
      `SELECT 
        SUM(ue.cost_micro / 1000000.0) as estimated_revenue
       FROM usage_events ue
       WHERE ue.publisher_id = $1
       AND ue.ts >= NOW() - INTERVAL '${parseInt(days)} days'`,
      [publisher_id]
    );

    res.json({
      total_requests: parseInt(statsResult.rows[0].total_requests) || 0,
      unique_clients: parseInt(statsResult.rows[0].unique_clients) || 0,
      accessed_urls: parseInt(statsResult.rows[0].accessed_urls) || 0,
      authorized_requests: parseInt(statsResult.rows[0].authorized_requests) || 0,
      unauthorized_requests: parseInt(statsResult.rows[0].unauthorized_requests) || 0,
      estimated_revenue: parseFloat(revenueResult.rows[0].estimated_revenue) || 0,
      days: parseInt(days)
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log stats' });
  }
});

module.exports = router;
