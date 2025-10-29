const express = require('express');
const Content = require('../models/Content');
const router = express.Router();

/**
 * GET /api/content
 * Get all content for a publisher
 */
router.get('/', async (req, res) => {
  try {
    const { publisherId, content_origin, has_third_party_media, search, limit } = req.query;
    
    if (!publisherId) {
      return res.status(400).json({ error: 'publisherId query parameter is required' });
    }
    
    const filters = {};
    if (content_origin !== undefined) filters.content_origin = parseInt(content_origin);
    if (has_third_party_media !== undefined) filters.has_third_party_media = has_third_party_media === 'true';
    if (search) filters.search = search;
    if (limit) filters.limit = parseInt(limit);
    
    const content = await Content.findByPublisher(parseInt(publisherId), filters);
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/:id
 * Get single content by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(parseInt(id));
    
    if (!content) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/:id/export
 * Export content to cm_rtbspec format
 */
router.get('/:id/export', async (req, res) => {
  try {
    const { id } = req.params;
    const exported = await Content.exportToCMRTBSpec(parseInt(id));
    
    if (!exported) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    
    res.json(exported);
  } catch (error) {
    console.error('Error exporting content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/content
 * Create new content
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'];
    const content = await Content.create(req.body, userId);
    
    res.status(201).json({ success: true, content });
  } catch (error) {
    console.error('Error creating content:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/content/:id
 * Update content
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'];
    const content = await Content.update(parseInt(id), req.body, userId);
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/content/:id
 * Delete content
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || req.headers['x-user-id'];
    await Content.delete(parseInt(id), userId);
    
    res.json({ success: true, message: 'Content deleted' });
  } catch (error) {
    console.error('Error deleting content:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/by-url
 * Get content and associated license by URL
 */
router.get('/by-url', async (req, res) => {
  try {
    const { url, publisherId } = req.query;
    
    if (!url || !publisherId) {
      return res.status(400).json({ error: 'url and publisherId query parameters are required' });
    }
    
    const db = require('../db');
    const result = await db.query(`
      SELECT 
        c.*,
        lo.id as license_id,
        lo.license_type,
        lo.price,
        lo.currency,
        lo.status as license_status
      FROM content c
      LEFT JOIN license_options lo ON c.id = lo.content_id
      WHERE c.publisher_id = $1 AND c.url = $2
    `, [parseInt(publisherId), url]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }
    
    res.json({ success: true, content: result.rows[0] });
  } catch (error) {
    console.error('Error fetching content by URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/content/from-url
 * Create content from parsed_url and optionally assign license
 */
router.post('/from-url', async (req, res) => {
  try {
    const { url, publisherId, licenseId, title, description } = req.body;
    const userId = req.body.userId || req.headers['x-user-id'];
    
    if (!url || !publisherId) {
      return res.status(400).json({ error: 'url and publisherId are required' });
    }
    
    // Check if content already exists for this URL
    const db = require('../db');
    const existingContent = await db.query(
      'SELECT id, content_id FROM content WHERE publisher_id = $1 AND url = $2',
      [publisherId, url]
    );
    
    let contentId;
    let contentRecord;
    
    if (existingContent.rows.length > 0) {
      contentId = existingContent.rows[0].id;
      contentRecord = existingContent.rows[0];
    } else {
      // Create new content record
      const newContent = await Content.create({
        publisher_id: publisherId,
        url,
        title: title || null,
        description: description || null,
        content_origin: 0 // Default to Human
      }, userId);
      
      contentId = newContent.id;
      contentRecord = newContent;
    }
    
    // If licenseId provided, create license association
    let license = null;
    if (licenseId) {
      const LicenseOption = require('../models/LicenseOption');
      
      // Get the license to check its type
      const licenseData = await db.query(
        'SELECT * FROM license_options WHERE id = $1 AND publisher_id = $2',
        [licenseId, publisherId]
      );
      
      if (licenseData.rows.length === 0) {
        return res.status(404).json({ error: 'License not found' });
      }
      
      // Update the license to link it to this content
      await db.query(
        'UPDATE license_options SET content_id = $1, updated_ts = NOW() WHERE id = $2',
        [contentId, licenseId]
      );
      
      license = licenseData.rows[0];
    }
    
    res.status(201).json({ 
      success: true, 
      content: contentRecord,
      license: license,
      message: licenseId ? 'Content created and license assigned' : 'Content created'
    });
  } catch (error) {
    console.error('Error creating content from URL:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/content/publisher/:publisherId/export
 * Export all content for a publisher
 */
router.get('/publisher/:publisherId/export', async (req, res) => {
  try {
    const { publisherId } = req.params;
    const exported = await Content.exportPublisherContent(parseInt(publisherId));
    
    res.json({
      cm_rtbspec: '0.1',
      publisher_id: parseInt(publisherId),
      count: exported.length,
      content: exported
    });
  } catch (error) {
    console.error('Error exporting publisher content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
