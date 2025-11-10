const express = require('express');
const db = require('../db');

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

module.exports = router;
