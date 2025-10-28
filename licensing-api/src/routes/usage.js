const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// POST /usage - Record usage event (called by edge-worker)
router.post('/', async (req, res) => {
  try {
    const { publisher_id, client_id, url, agent_ua, purpose, token_id, bytes_sent } = req.body;

    // Handle anonymous clients - convert string "anonymous" to NULL
    const clientIdValue = (client_id === 'anonymous' || !client_id) ? null : client_id;

    // Get pricing from policy
    const policyResult = await db.query(
      'SELECT policy_json FROM policies WHERE publisher_id = $1 ORDER BY created_at DESC LIMIT 1',
      [publisher_id]
    );

    let costMicro = 2000; // Default $0.002 = 2000 micro-dollars
    
    if (policyResult.rows.length > 0) {
      const policy = policyResult.rows[0].policy_json;
      const rule = policy.rules?.find(r => r.agent && agent_ua.includes(r.agent));
      if (rule && rule.price_per_fetch) {
        costMicro = Math.round(rule.price_per_fetch * 1000000);
      }
    }

    // Insert usage event
    await db.query(
      `INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, token_id, bytes_sent, purpose)
       VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9)`,
      [uuidv4(), publisher_id, clientIdValue, url, agent_ua, costMicro, token_id, bytes_sent, purpose]
    );

    res.json({ success: true, cost_micro: costMicro });

  } catch (error) {
    console.error('Error recording usage:', error);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

// GET /usage - Query usage events
router.get('/', async (req, res) => {
  try {
    const { publisherId, clientId, from, to, limit = 100 } = req.query;

    let query = 'SELECT * FROM usage_events WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (publisherId) {
      query += ` AND publisher_id = $${paramCount}`;
      params.push(publisherId);
      paramCount++;
    }

    if (clientId) {
      query += ` AND client_id = $${paramCount}`;
      params.push(clientId);
      paramCount++;
    }

    if (from) {
      query += ` AND ts >= $${paramCount}`;
      params.push(from);
      paramCount++;
    }

    if (to) {
      query += ` AND ts <= $${paramCount}`;
      params.push(to);
      paramCount++;
    }

    query += ` ORDER BY ts DESC LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    const result = await db.query(query, params);

    // Calculate summary
    const totalCostMicro = result.rows.reduce((sum, row) => sum + parseInt(row.cost_micro || 0), 0);
    const totalRequests = result.rows.length;

    res.json({
      events: result.rows,
      summary: {
        total_requests: totalRequests,
        total_cost_micro: totalCostMicro,
        total_cost_usd: (totalCostMicro / 1000000).toFixed(4)
      }
    });

  } catch (error) {
    console.error('Error querying usage:', error);
    res.status(500).json({ error: 'Failed to query usage' });
  }
});

module.exports = router;
