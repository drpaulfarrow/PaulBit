const express = require('express');
const AccessEndpoint = require('../models/AccessEndpoint');
const router = express.Router();

/**
 * GET /api/access/meta/types
 * Get all access type definitions
 */
router.get('/meta/types', async (req, res) => {
  try {
    const types = [
      { 
        value: 0, 
        name: AccessEndpoint.getAccessTypeName(0),
        description: 'Standard HTML web access'
      },
      { 
        value: 1, 
        name: AccessEndpoint.getAccessTypeName(1),
        description: 'RSS/Atom feed syndication'
      },
      { 
        value: 2, 
        name: AccessEndpoint.getAccessTypeName(2),
        description: 'RESTful API access'
      },
      { 
        value: 3, 
        name: AccessEndpoint.getAccessTypeName(3),
        description: 'Model Context Protocol server'
      },
      { 
        value: 4, 
        name: AccessEndpoint.getAccessTypeName(4),
        description: 'Natural Language Web access'
      }
    ];
    
    res.json({ success: true, types });
  } catch (error) {
    console.error('Error fetching access types:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/access?publisherId=X or publisher_id=X
 * Get all access endpoints for a publisher
 */
router.get('/', async (req, res) => {
  try {
    const { publisherId, publisher_id } = req.query;
    
    const pubId = publisherId || publisher_id;
    
    if (!pubId) {
      return res.status(400).json({ 
        success: false, 
        error: 'publisherId or publisher_id parameter required' 
      });
    }
    
    const db = require('../db');
    const result = await db.query(`
      SELECT * 
      FROM access_endpoints
      WHERE publisher_id = $1
      ORDER BY id DESC
    `, [pubId]);
    
    res.json({ success: true, rules: result.rows, endpoints: result.rows });
  } catch (error) {
    console.error('Error fetching access endpoints:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/access/default-policy
 * Get the default access policy for a publisher
 */
router.get('/default-policy', async (req, res) => {
  try {
    const { publisher_id } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const db = require('../db');
    const result = await db.query(
      `SELECT policy_json FROM policies 
       WHERE publisher_id = $1 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [publisher_id]
    );

    const defaultPolicy = result.rows.length > 0 
      ? result.rows[0].policy_json 
      : { default: { allow: false }, rules: [] };

    res.json({ 
      success: true,
      policy: defaultPolicy 
    });
  } catch (error) {
    console.error('Error fetching default policy:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/access/license/:licenseId
 * Get all access endpoints for a license
 */
router.get('/license/:licenseId', async (req, res) => {
  try {
    const { licenseId } = req.params;
    const endpoints = await AccessEndpoint.findByLicense(parseInt(licenseId));
    
    res.json({ success: true, endpoints });
  } catch (error) {
    console.error('Error fetching access endpoints:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/access/:id
 * Get single access endpoint by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const endpoint = await AccessEndpoint.findById(parseInt(id));
    
    if (!endpoint) {
      return res.status(404).json({ success: false, error: 'Access endpoint not found' });
    }
    
    res.json({ success: true, endpoint });
  } catch (error) {
    console.error('Error fetching access endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/access
 * Create new access endpoint
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'];
    const endpoint = await AccessEndpoint.create(req.body, userId);
    
    res.status(201).json({ success: true, endpoint });
  } catch (error) {
    console.error('Error creating access endpoint:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/access/:id
 * Update access endpoint
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'];
    const endpoint = await AccessEndpoint.update(parseInt(id), req.body, userId);
    
    res.json({ success: true, endpoint });
  } catch (error) {
    console.error('Error updating access endpoint:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/access/:id
 * Delete access endpoint
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || req.headers['x-user-id'];
    await AccessEndpoint.delete(parseInt(id), userId);
    
    res.json({ success: true, message: 'Access endpoint deleted' });
  } catch (error) {
    console.error('Error deleting access endpoint:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/access/:id/test
 * Test if endpoint is accessible
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await AccessEndpoint.testEndpoint(parseInt(id));
    
    res.json({ success: true, test: result });
  } catch (error) {
    console.error('Error testing access endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
