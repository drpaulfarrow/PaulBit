const express = require('express');
const { getAuditTrail, getRecentAudit, exportAuditTrail } = require('../utils/audit');
const router = express.Router();

/**
 * GET /api/audit/:entityType/:entityId
 * Get audit trail for a specific entity
 */
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { action, userId, startDate, endDate, limit } = req.query;
    
    const options = {};
    if (action) options.action = action;
    if (userId) options.userId = parseInt(userId);
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    if (limit) options.limit = parseInt(limit);
    
    const trail = await getAuditTrail(entityType, parseInt(entityId), options);
    
    res.json({ success: true, trail });
  } catch (error) {
    console.error('Error fetching audit trail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/recent
 * Get recent audit events across all entities
 */
router.get('/recent', async (req, res) => {
  try {
    const { entityType, action, userId, startDate, endDate, limit } = req.query;
    
    const options = {};
    if (entityType) options.entityType = entityType;
    if (action) options.action = action;
    if (userId) options.userId = parseInt(userId);
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);
    if (limit) options.limit = parseInt(limit);
    
    const events = await getRecentAudit(options);
    
    res.json({ success: true, events });
  } catch (error) {
    console.error('Error fetching recent audit events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/audit/:entityType/:entityId/export
 * Export audit trail to CSV
 */
router.get('/:entityType/:entityId/export', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const csv = await exportAuditTrail(entityType, parseInt(entityId));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit_${entityType}_${entityId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting audit trail:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
