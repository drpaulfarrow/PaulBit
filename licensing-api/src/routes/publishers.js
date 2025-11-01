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
      'SELECT id, name, hostname, created_at FROM publishers ORDER BY id ASC'
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
      'SELECT id, name, hostname, created_at FROM publishers WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }
    
    res.json({
      publisher_id: result.rows[0].id,
      name: result.rows[0].name,
      hostname: result.rows[0].hostname,
      created_at: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error fetching publisher:', error);
    res.status(500).json({ error: 'Failed to fetch publisher' });
  }
});

module.exports = router;
