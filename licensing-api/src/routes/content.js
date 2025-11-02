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
      
      // Get the license to check its type and whether it's a parent license
      const licenseData = await db.query(
        'SELECT * FROM license_options WHERE id = $1 AND publisher_id = $2',
        [licenseId, publisherId]
      );
      
      if (licenseData.rows.length === 0) {
        return res.status(404).json({ error: 'License not found' });
      }
      
      const originalLicense = licenseData.rows[0];
      
      // Check if this content already has a license of this type
      const existingLicense = await db.query(
        'SELECT * FROM license_options WHERE content_id = $1 AND license_type = $2',
        [contentId, originalLicense.license_type]
      );
      
      if (existingLicense.rows.length > 0) {
        // Content already has a license of this type - update it instead of creating duplicate
        const updated = await db.query(
          `UPDATE license_options 
           SET license_id = $1, price = $2, currency = $3, term_months = $4, 
               revshare_pct = $5, max_word_count = $6, attribution_required = $7,
               attribution_text = $8, attribution_url = $9, derivative_allowed = $10,
               name = $11, updated_ts = NOW()
           WHERE id = $12
           RETURNING *`,
          [
            originalLicense.license_id ? `${originalLicense.license_id}_${contentId}` : `license_${contentId}_${originalLicense.license_type}`,
            originalLicense.price,
            originalLicense.currency,
            originalLicense.term_months,
            originalLicense.revshare_pct,
            originalLicense.max_word_count,
            originalLicense.attribution_required,
            originalLicense.attribution_text,
            originalLicense.attribution_url,
            originalLicense.derivative_allowed,
            originalLicense.name,
            existingLicense.rows[0].id
          ]
        );
        license = updated.rows[0];
      } else {
        // Need to create/clone a license for this content
        // Use INSERT ... ON CONFLICT to handle race conditions
        const userId = req.body.userId || req.headers['x-user-id'];
        
        // Generate unique license_id
        const newLicenseId = originalLicense.license_id 
          ? `${originalLicense.license_id}_${contentId}_${Date.now()}`
          : `license_${contentId}_${originalLicense.license_type}_${Date.now()}`;
        
        // Use upsert pattern to handle the unique constraint on (content_id, license_type)
        const upsertResult = await db.query(`
          INSERT INTO license_options (
            license_id, content_id, publisher_id, license_type, price, currency,
            term_months, revshare_pct, max_word_count, attribution_required,
            attribution_text, attribution_url, derivative_allowed, name, status, ext
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          ON CONFLICT ON CONSTRAINT license_options_content_id_license_type_key 
          DO UPDATE SET
            license_id = EXCLUDED.license_id,
            price = EXCLUDED.price,
            currency = EXCLUDED.currency,
            term_months = EXCLUDED.term_months,
            revshare_pct = EXCLUDED.revshare_pct,
            max_word_count = EXCLUDED.max_word_count,
            attribution_required = EXCLUDED.attribution_required,
            attribution_text = EXCLUDED.attribution_text,
            attribution_url = EXCLUDED.attribution_url,
            derivative_allowed = EXCLUDED.derivative_allowed,
            name = EXCLUDED.name,
            updated_ts = NOW()
          RETURNING *
        `, [
          newLicenseId,
          contentId,
          publisherId,
          originalLicense.license_type,
          originalLicense.price,
          originalLicense.currency,
          originalLicense.term_months,
          originalLicense.revshare_pct,
          originalLicense.max_word_count,
          originalLicense.attribution_required,
          originalLicense.attribution_text,
          originalLicense.attribution_url,
          originalLicense.derivative_allowed,
          originalLicense.name,
          originalLicense.status || 'active',
          JSON.stringify(originalLicense.ext || {})
        ]);
        
        license = upsertResult.rows[0];
        
        // Log audit if it was an insert (id matches expected new id pattern)
        // Note: We can't easily distinguish insert vs update with ON CONFLICT,
        // so we'll log as create for now
        const { logAudit } = require('../utils/audit');
        await logAudit({
          entity_type: 'license_option',
          entity_id: license.id,
          action: 'create',
          user_id: userId,
          new_values: license
        });
      }
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
