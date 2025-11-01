const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/negotiations
 * Get all negotiations for a publisher
 */
router.get('/', async (req, res) => {
  try {
    const { publisher_id, status, limit = 50, offset = 0 } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    let query = `
      SELECT * FROM negotiations
      WHERE publisher_id = $1
    `;
    const params = [publisher_id];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      negotiations: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching negotiations:', error);
    res.status(500).json({ error: 'Failed to fetch negotiations' });
  }
});

/**
 * GET /api/negotiations/strategies
 * Get all strategy configurations for a publisher
 */
router.get('/strategies', async (req, res) => {
  try {
    const { publisher_id } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const result = await db.query(
      `SELECT * FROM partner_negotiation_strategies
       WHERE publisher_id = $1
       ORDER BY created_at DESC`,
      [publisher_id]
    );

    res.json({
      strategies: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching strategy configs:', error);
    res.status(500).json({ error: 'Failed to fetch strategy configs' });
  }
});

/**
 * GET /api/negotiations/:id
 * Get single negotiation by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT * FROM negotiations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching negotiation:', error);
    res.status(500).json({ error: 'Failed to fetch negotiation' });
  }
});

/**
 * POST /api/negotiations/:id/accept
 * Accept a negotiation offer
 */
router.post('/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE negotiations 
       SET status = 'accepted', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    res.json({ success: true, negotiation: result.rows[0] });
  } catch (error) {
    console.error('Error accepting negotiation:', error);
    res.status(500).json({ error: 'Failed to accept negotiation' });
  }
});

/**
 * POST /api/negotiations/:id/reject
 * Reject a negotiation offer
 */
router.post('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await db.query(
      `UPDATE negotiations 
       SET status = 'rejected', rejection_reason = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, reason]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    res.json({ success: true, negotiation: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting negotiation:', error);
    res.status(500).json({ error: 'Failed to reject negotiation' });
  }
});

/**
 * POST /api/negotiations/strategies
 * Create a new strategy configuration
 */
router.post('/strategies', async (req, res) => {
  try {
    const { 
      publisher_id,
      partner_type = 'specific_partner',
      partner_name,
      pricing_model = 'per_token',
      min_price = 0.0001,
      max_price = 0.01,
      preferred_price = 0.001,
      negotiation_style = 'balanced',
      auto_accept_threshold = 0.95,
      deal_breakers = [],
      preferred_terms = {},
      llm_provider = 'openai',
      llm_model = 'gpt-4',
      license_type = [1]
    } = req.body;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const result = await db.query(
      `INSERT INTO partner_negotiation_strategies (
        publisher_id, partner_type, partner_name, pricing_model,
        min_price, max_price, preferred_price, negotiation_style,
        auto_accept_threshold, deal_breakers, preferred_terms,
        llm_provider, llm_model, license_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        publisher_id, partner_type, partner_name, pricing_model,
        min_price, max_price, preferred_price, negotiation_style,
        auto_accept_threshold, JSON.stringify(deal_breakers), 
        JSON.stringify(preferred_terms), llm_provider, llm_model, license_type
      ]
    );

    res.status(201).json({ success: true, strategy: result.rows[0] });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ error: 'Failed to create strategy' });
  }
});

/**
 * PUT /api/negotiations/strategies/:id
 * Update a strategy configuration
 */
router.put('/strategies/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Map the allowed update fields
    const allowedFields = [
      'partner_type', 'partner_name', 'pricing_model', 'min_price', 
      'max_price', 'preferred_price', 'negotiation_style', 
      'auto_accept_threshold', 'deal_breakers', 'preferred_terms',
      'llm_provider', 'llm_model', 'license_type'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = $${paramCount++}`);
        // Handle JSONB fields
        if (field === 'deal_breakers' || field === 'preferred_terms') {
          values.push(JSON.stringify(req.body[field]));
        } else {
          values.push(req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE partner_negotiation_strategies 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({ success: true, strategy: result.rows[0] });
  } catch (error) {
    console.error('Error updating strategy:', error);
    res.status(500).json({ error: 'Failed to update strategy' });
  }
});

/**
 * DELETE /api/negotiations/strategies/:id
 * Delete a strategy configuration
 */
router.delete('/strategies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'DELETE FROM partner_negotiation_strategies WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Strategy not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({ error: 'Failed to delete strategy' });
  }
});

module.exports = router;
