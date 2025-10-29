const db = require('../db');

/**
 * Log audit trail event for compliance
 */
async function logAudit({ entity_type, entity_id, action, user_id, user_email, changed_fields, old_values, new_values }) {
  try {
    await db.query(`
      INSERT INTO audit_trail (
        entity_type, entity_id, action, user_id, user_email,
        changed_fields, old_values, new_values, ts
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      entity_type,
      entity_id,
      action,
      user_id || null,
      user_email || null,
      changed_fields ? JSON.stringify(changed_fields) : null,
      old_values ? JSON.stringify(old_values) : null,
      new_values ? JSON.stringify(new_values) : null
    ]);
  } catch (error) {
    console.error('Failed to log audit trail:', error);
    // Don't throw - audit logging should not break main operations
  }
}

/**
 * Get audit trail for an entity
 */
async function getAuditTrail(entity_type, entity_id, options = {}) {
  const { limit = 100, offset = 0 } = options;
  
  const result = await db.query(`
    SELECT * FROM audit_trail
    WHERE entity_type = $1 AND entity_id = $2
    ORDER BY ts DESC
    LIMIT $3 OFFSET $4
  `, [entity_type, entity_id, limit, offset]);
  
  return result.rows;
}

/**
 * Get recent audit trail across all entities
 */
async function getRecentAudit(options = {}) {
  const { limit = 100, offset = 0, entity_type, user_id, action } = options;
  
  let query = 'SELECT * FROM audit_trail WHERE 1=1';
  const params = [];
  let paramCount = 0;
  
  if (entity_type) {
    paramCount++;
    query += ` AND entity_type = $${paramCount}`;
    params.push(entity_type);
  }
  
  if (user_id) {
    paramCount++;
    query += ` AND user_id = $${paramCount}`;
    params.push(user_id);
  }
  
  if (action) {
    paramCount++;
    query += ` AND action = $${paramCount}`;
    params.push(action);
  }
  
  query += ' ORDER BY ts DESC';
  
  paramCount++;
  query += ` LIMIT $${paramCount}`;
  params.push(limit);
  
  paramCount++;
  query += ` OFFSET $${paramCount}`;
  params.push(offset);
  
  const result = await db.query(query, params);
  return result.rows;
}

/**
 * Export audit trail to CSV
 */
async function exportAuditTrail(entity_type, entity_id) {
  const events = await getAuditTrail(entity_type, entity_id, { limit: 10000 });
  
  if (events.length === 0) {
    return '';
  }
  
  // CSV header
  const headers = ['timestamp', 'action', 'user_id', 'user_email', 'changed_fields'];
  let csv = headers.join(',') + '\n';
  
  // CSV rows
  events.forEach(event => {
    const row = [
      event.ts,
      event.action,
      event.user_id || '',
      event.user_email || '',
      JSON.stringify(event.changed_fields || {})
    ];
    csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
  });
  
  return csv;
}

module.exports = {
  logAudit,
  getAuditTrail,
  getRecentAudit,
  exportAuditTrail
};
