const express = require('express');
const db = require('../db');
const redis = require('../redis');

const router = express.Router();

// GET /admin/clients - List all clients
router.get('/clients', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.contact_email, c.plan_id, c.created_at, p.name as plan_name
       FROM clients c
       LEFT JOIN plans p ON c.plan_id = p.id
       ORDER BY c.created_at DESC`
    );

    res.json({ clients: result.rows });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /admin/clients - Create a new client
router.post('/clients', async (req, res) => {
  try {
    const { name, contact_email, plan_id } = req.body;

    if (!name || !contact_email) {
      return res.status(400).json({ error: 'Missing required fields: name, contact_email' });
    }

    const result = await db.query(
      `INSERT INTO clients (name, contact_email, plan_id, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, name, contact_email, plan_id, created_at`,
      [name, contact_email, plan_id]
    );

    res.status(201).json({ client: result.rows[0] });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// GET /admin/plans - List all pricing plans
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM plans ORDER BY price_per_fetch_micro ASC'
    );

    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /admin/plans - Create a new pricing plan
router.post('/plans', async (req, res) => {
  try {
    const { name, price_per_fetch_micro, token_ttl_seconds, burst_rps, purpose_mask } = req.body;

    if (!name || price_per_fetch_micro === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, price_per_fetch_micro' });
    }

    const result = await db.query(
      `INSERT INTO plans (name, price_per_fetch_micro, token_ttl_seconds, burst_rps, purpose_mask)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, price_per_fetch_micro, token_ttl_seconds || 600, burst_rps || 10, purpose_mask || 'inference']
    );

    res.status(201).json({ plan: result.rows[0] });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// GET /admin/publishers - List all publishers
router.get('/publishers', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM publishers ORDER BY name ASC'
    );

    res.json({ publishers: result.rows });
  } catch (error) {
    console.error('Error fetching publishers:', error);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

// POST /admin/tokens/:jti/revoke - Revoke a token
router.post('/tokens/:jti/revoke', async (req, res) => {
  try {
    const { jti } = req.params;

    // Mark as revoked in database
    await db.query(
      'UPDATE tokens SET revoked = true WHERE jti = $1',
      [jti]
    );

    // Remove from Redis allowlist
    await redis.revokeToken(jti);

    res.json({ success: true, message: 'Token revoked' });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// GET /admin/logs - Get recent access logs
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await db.query(
      `SELECT ue.*, p.name as publisher_name, c.name as client_name
       FROM usage_events ue
       LEFT JOIN publishers p ON ue.publisher_id = p.id
       LEFT JOIN clients c ON ue.client_id = c.id
       ORDER BY ue.ts DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

module.exports = router;
