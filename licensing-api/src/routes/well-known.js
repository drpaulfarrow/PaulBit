const express = require('express');
const Content = require('../models/Content');
const router = express.Router();

/**
 * GET /.well-known/cm-license.json
 * Marketplace discovery endpoint - returns all active licenses in cm_rtbspec format
 */
router.get('/cm-license.json', async (req, res) => {
  try {
    const { publisherId } = req.query;
    
    if (!publisherId) {
      return res.status(400).json({ 
        error: 'publisherId query parameter is required',
        example: '/.well-known/cm-license.json?publisherId=1'
      });
    }
    
    const exported = await Content.exportPublisherContent(parseInt(publisherId));
    
    const response = {
      cm_rtbspec: '0.1',
      publisher_id: parseInt(publisherId),
      generated_at: new Date().toISOString(),
      count: exported.length,
      content: exported
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow buyer systems to fetch
    res.json(response);
  } catch (error) {
    console.error('Error generating cm-license.json:', error);
    res.status(500).json({ 
      error: error.message,
      cm_rtbspec: '0.1'
    });
  }
});

module.exports = router;
