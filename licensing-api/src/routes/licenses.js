const express = require('express');
const LicenseOption = require('../models/LicenseOption');
const router = express.Router();

/**
 * GET /api/licenses/meta/types
 * Get all license type definitions
 */
router.get('/meta/types', async (req, res) => {
  try {
    const types = [
      { 
        value: 0, 
        name: LicenseOption.getLicenseTypeName(0),
        description: 'Full rights for training and display',
        requires: ['price', 'currency']
      },
      { 
        value: 1, 
        name: LicenseOption.getLicenseTypeName(1),
        description: 'Unlimited RAG usage without restrictions',
        requires: ['price', 'currency']
      },
      { 
        value: 2, 
        name: LicenseOption.getLicenseTypeName(2),
        description: 'RAG with maximum word count limit',
        requires: ['price', 'currency', 'max_word_count']
      },
      { 
        value: 3, 
        name: LicenseOption.getLicenseTypeName(3),
        description: 'RAG with required attribution',
        requires: ['price', 'currency', 'attribution_required']
      },
      { 
        value: 4, 
        name: LicenseOption.getLicenseTypeName(4),
        description: 'RAG without display rights',
        requires: ['price', 'currency']
      }
    ];
    
    res.json({ success: true, types });
  } catch (error) {
    console.error('Error fetching license types:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/licenses
 * Get all licenses (with optional filters)
 */
router.get('/', async (req, res) => {
  try {
    const { publisherId, contentId, license_type, status, limit } = req.query;
    
    if (!publisherId) {
      return res.status(400).json({ error: 'publisherId query parameter is required' });
    }
    
    const filters = {};
    if (contentId) filters.contentId = parseInt(contentId);
    if (license_type !== undefined) filters.license_type = parseInt(license_type);
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    
    const licenses = await LicenseOption.findByPublisher(parseInt(publisherId), filters);
    
    res.json({ success: true, licenses });
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/licenses/:id
 * Get single license by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const license = await LicenseOption.findById(parseInt(id));
    
    if (!license) {
      return res.status(404).json({ success: false, error: 'License not found' });
    }
    
    res.json({ success: true, license });
  } catch (error) {
    console.error('Error fetching license:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/licenses/content/:contentId
 * Get all licenses for a specific content asset
 */
router.get('/content/:contentId', async (req, res) => {
  try {
    const { contentId } = req.params;
    const licenses = await LicenseOption.findByContent(parseInt(contentId));
    
    res.json({ success: true, licenses });
  } catch (error) {
    console.error('Error fetching licenses for content:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/licenses
 * Create new license (supports multiple types via license_types array)
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'];
    const { license_types, ...licenseData } = req.body;
    
    // If license_types array is provided, create one license per type
    if (license_types && Array.isArray(license_types) && license_types.length > 0) {
      const createdLicenses = [];
      
      for (const licenseType of license_types) {
        const licenseWithType = {
          ...licenseData,
          license_type: licenseType
        };
        const license = await LicenseOption.create(licenseWithType, userId);
        createdLicenses.push(license);
      }
      
      // Return all created licenses
      res.status(201).json({ 
        success: true, 
        licenses: createdLicenses,
        license: createdLicenses[0] // For backward compatibility
      });
    } else if (req.body.license_type !== undefined) {
      // Legacy single license creation
      const license = await LicenseOption.create(req.body, userId);
      res.status(201).json({ success: true, license });
    } else {
      throw new Error('Either license_type or license_types array is required');
    }
  } catch (error) {
    console.error('Error creating license:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/licenses/:id/clone
 * Clone existing license
 */
router.post('/:id/clone', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'];
    const license = await LicenseOption.clone(parseInt(id), req.body, userId);
    
    res.status(201).json({ success: true, license });
  } catch (error) {
    console.error('Error cloning license:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/licenses/validate
 * Validate license schema without creating
 */
router.post('/validate', async (req, res) => {
  try {
    const { license } = req.body;
    const validation = LicenseOption.validateSchema(license);
    
    if (validation.valid) {
      res.json({ success: true, valid: true });
    } else {
      res.status(400).json({ success: false, valid: false, errors: validation.errors });
    }
  } catch (error) {
    console.error('Error validating license:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * PUT /api/licenses/:id
 * Update license
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.body.userId || req.headers['x-user-id'];
    const license = await LicenseOption.update(parseInt(id), req.body, userId);
    
    res.json({ success: true, license });
  } catch (error) {
    console.error('Error updating license:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/licenses/:id
 * Delete license
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId || req.headers['x-user-id'];
    await LicenseOption.delete(parseInt(id), userId);
    
    res.json({ success: true, message: 'License deleted' });
  } catch (error) {
    console.error('Error deleting license:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
