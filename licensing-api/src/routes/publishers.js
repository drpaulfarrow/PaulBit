const express = require('express');
const db = require('../db');
const Publisher = require('../models/Publisher');

const router = express.Router();

/**
 * GET /api/publishers
 * Get all publishers
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.hostname, p.contact_email, p.api_key_hash, p.plan_id, p.created_at, p.updated_at,
              plans.name AS plan_name
       FROM publishers p
       LEFT JOIN plans ON plans.id = p.plan_id
       ORDER BY p.id ASC`
    );
    res.json({ publishers: result.rows });
  } catch (error) {
    console.error('Error fetching publishers:', error);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

/**
 * GET /api/publishers/:id
 * Get single publisher by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.query(
      `SELECT p.id, p.name, p.hostname, p.contact_email, p.api_key_hash, p.plan_id, p.created_at, p.updated_at,
              plans.name AS plan_name
       FROM publishers p
       LEFT JOIN plans ON plans.id = p.plan_id
       WHERE p.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }
    
    res.json({
      publisher_id: result.rows[0].id,
      name: result.rows[0].name,
      hostname: result.rows[0].hostname,
      contact_email: result.rows[0].contact_email,
      api_key_hash: result.rows[0].api_key_hash,
      plan_id: result.rows[0].plan_id,
      plan_name: result.rows[0].plan_name,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error fetching publisher:', error);
    res.status(500).json({ error: 'Failed to fetch publisher' });
  }
});

/**
 * POST /api/publishers
 * Create a new publisher
 */
router.post('/', async (req, res) => {
  try {
    const { name, hostname, contact_email, plan_id } = req.body;
    
    if (!name || !hostname) {
      return res.status(400).json({ error: 'Missing required fields: name, hostname' });
    }

    // Check if hostname already exists
    const existing = await db.query(
      'SELECT id FROM publishers WHERE hostname = $1',
      [hostname]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Publisher with this hostname already exists' });
    }

    // Create publisher with auto-generated API key
    const result = await db.query(
      `INSERT INTO publishers (name, hostname, contact_email, plan_id, api_key_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING *`,
      [
        name,
        hostname,
        contact_email || null,
        plan_id || 1, // Default to plan 1
        `publisher-${Date.now()}-${Math.random().toString(36).substring(2, 8)}-hash`
      ]
    );

    const publisher = result.rows[0];

    // Create default policy for new publisher
    await db.query(
      `INSERT INTO policies (publisher_id, policy_json, version, name, description)
       VALUES ($1, $2, '1.0', 'Default Policy', 'Auto-generated default policy')`,
      [
        publisher.id,
        JSON.stringify({
          version: "1.0",
          publisher: hostname,
          default: { allow: false, action: "redirect" },
          rules: [
            {
              agent: "*",
              allow: true,
              purpose: ["inference"],
              price_per_fetch: 0.002,
              token_ttl_seconds: 600,
              max_rps: 2
            }
          ],
          redirect_url: "http://licensing-api:3000/authorize"
        })
      ]
    );

    res.status(201).json({
      publisher: {
        id: publisher.id,
        name: publisher.name,
        hostname: publisher.hostname,
        contact_email: publisher.contact_email,
        api_key_hash: publisher.api_key_hash,
        plan_id: publisher.plan_id,
        created_at: publisher.created_at,
        updated_at: publisher.updated_at
      }
    });
  } catch (error) {
    console.error('Error creating publisher:', error);
    res.status(500).json({ error: 'Failed to create publisher', message: error.message });
  }
});

/**
 * PUT /api/publishers/:id
 * Update publisher information
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, hostname, contact_email, plan_id } = req.body;
    
    // Check if publisher exists
    const existing = await db.query('SELECT id FROM publishers WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    // Check hostname uniqueness (if changing)
    if (hostname) {
      const hostnameCheck = await db.query(
        'SELECT id FROM publishers WHERE hostname = $1 AND id != $2',
        [hostname, id]
      );
      if (hostnameCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Hostname already in use by another publisher' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 0;

    if (name) {
      updates.push(`name = $${++paramCount}`);
      values.push(name);
    }
    if (hostname) {
      updates.push(`hostname = $${++paramCount}`);
      values.push(hostname);
    }
    if (contact_email !== undefined) {
      updates.push(`contact_email = $${++paramCount}`);
      values.push(contact_email);
    }
    if (plan_id) {
      updates.push(`plan_id = $${++paramCount}`);
      values.push(plan_id);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE publishers SET ${updates.join(', ')} WHERE id = $${++paramCount} RETURNING *`,
      values
    );

    res.json({ publisher: result.rows[0] });
  } catch (error) {
    console.error('Error updating publisher:', error);
    res.status(500).json({ error: 'Failed to update publisher', message: error.message });
  }
});

module.exports = router;
