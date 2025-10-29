const db = require('../db');
const { logAudit } = require('../utils/audit');

class LicenseOption {
  /**
   * Create new license option
   */
  static async create(data, userId) {
    const {
      license_id, content_id, publisher_id, license_type,
      price = 0, currency = 'USD', term_months, revshare_pct,
      max_word_count, attribution_required = false,
      attribution_text, attribution_url, derivative_allowed = true,
      status = 'active', ext = {}, name = null
    } = data;
    
    // Validate required fields
    if (!publisher_id || license_type === undefined) {
      throw new Error('publisher_id and license_type are required');
    }
    // Generate a license_id if not provided
    const newLicenseId = license_id || `lic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Validate conditional fields
    const errors = this.validateSchema({
      license_type, price, max_word_count, attribution_required
    });
    
    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }
    
    const result = await db.query(`
      INSERT INTO license_options (
        license_id, content_id, publisher_id, license_type, price, currency,
        term_months, revshare_pct, max_word_count, attribution_required,
        attribution_text, attribution_url, derivative_allowed, name, status, ext
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      newLicenseId, content_id, publisher_id, license_type, price, currency,
      term_months, revshare_pct, max_word_count, attribution_required,
      attribution_text, attribution_url, derivative_allowed, name, status, JSON.stringify(ext)
    ]);
    
    const license = result.rows[0];
    
    await logAudit({
      entity_type: 'license_option',
      entity_id: license.id,
      action: 'create',
      user_id: userId,
      new_values: license
    });
    
    return license;
  }
  
  /**
   * Find license by ID
   */
  static async findById(id) {
    const result = await db.query('SELECT * FROM license_options WHERE id = $1', [id]);
    return result.rows[0];
  }
  
  /**
   * Find license by license_id (external ID)
   */
  static async findByLicenseId(licenseId) {
    const result = await db.query('SELECT * FROM license_options WHERE license_id = $1', [licenseId]);
    return result.rows[0];
  }
  
  /**
   * Find all licenses for a content asset
   */
  static async findByContent(contentId) {
    const result = await db.query(
      'SELECT * FROM license_options WHERE content_id = $1 ORDER BY license_type',
      [contentId]
    );
    return result.rows;
  }
  
  /**
   * Find all licenses for a publisher
   */
  static async findByPublisher(publisherId, filters = {}) {
    let query = 'SELECT * FROM license_options WHERE publisher_id = $1';
    const params = [publisherId];
    let paramCount = 1;
    
    if (filters.license_type !== undefined) {
      paramCount++;
      query += ` AND license_type = $${paramCount}`;
      params.push(filters.license_type);
    }
    
    if (filters.status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
    }
    
    if (filters.content_id) {
      paramCount++;
      query += ` AND content_id = $${paramCount}`;
      params.push(filters.content_id);
    }
    
    query += ' ORDER BY created_ts DESC';
    
    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }
    
    const result = await db.query(query, params);
    return result.rows;
  }
  
  /**
   * Update license
   */
  static async update(id, data, userId) {
    const oldLicense = await this.findById(id);
    if (!oldLicense) {
      throw new Error('License not found');
    }
    
    // Validate if license_type is being changed
    if (data.license_type !== undefined) {
      const errors = this.validateSchema({
        license_type: data.license_type,
        price: data.price !== undefined ? data.price : oldLicense.price,
        max_word_count: data.max_word_count !== undefined ? data.max_word_count : oldLicense.max_word_count,
        attribution_required: data.attribution_required !== undefined ? data.attribution_required : oldLicense.attribution_required
      });
      
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }
    }
    
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    const allowedFields = [
      'name', 'price', 'currency', 'term_months', 'revshare_pct', 'max_word_count',
      'attribution_required', 'attribution_text', 'attribution_url',
      'derivative_allowed', 'status', 'ext'
    ];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(field === 'ext' ? JSON.stringify(data[field]) : data[field]);
      }
    });
    
    if (fields.length === 0) {
      return oldLicense;
    }
    
    paramCount++;
    fields.push(`updated_ts = NOW()`);
    values.push(id);
    
    const query = `UPDATE license_options SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    const newLicense = result.rows[0];
    
    // Log audit trail
    const changedFields = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined && JSON.stringify(oldLicense[field]) !== JSON.stringify(data[field])) {
        changedFields[field] = { old: oldLicense[field], new: data[field] };
      }
    });
    
    await logAudit({
      entity_type: 'license_option',
      entity_id: id,
      action: 'update',
      user_id: userId,
      changed_fields: changedFields,
      old_values: oldLicense,
      new_values: newLicense
    });
    
    return newLicense;
  }
  
  /**
   * Delete license
   */
  static async delete(id, userId) {
    const license = await this.findById(id);
    if (!license) {
      throw new Error('License not found');
    }
    
    await db.query('DELETE FROM license_options WHERE id = $1', [id]);
    
    await logAudit({
      entity_type: 'license_option',
      entity_id: id,
      action: 'delete',
      user_id: userId,
      old_values: license
    });
  }
  
  /**
   * Clone/copy a license
   */
  static async clone(id, newData, userId) {
    const original = await this.findById(id);
    if (!original) {
      throw new Error('License not found');
    }
    
    const cloneData = {
      license_id: newData.license_id || `${original.license_id}_copy_${Date.now()}`,
      content_id: newData.content_id || original.content_id,
      publisher_id: original.publisher_id,
      name: newData.name || (original.name ? `${original.name} (Copy)` : null),
      license_type: newData.license_type !== undefined ? newData.license_type : original.license_type,
      price: newData.price !== undefined ? newData.price : original.price,
      currency: newData.currency || original.currency,
      term_months: newData.term_months !== undefined ? newData.term_months : original.term_months,
      revshare_pct: newData.revshare_pct !== undefined ? newData.revshare_pct : original.revshare_pct,
      max_word_count: newData.max_word_count !== undefined ? newData.max_word_count : original.max_word_count,
      attribution_required: newData.attribution_required !== undefined ? newData.attribution_required : original.attribution_required,
      attribution_text: newData.attribution_text !== undefined ? newData.attribution_text : original.attribution_text,
      attribution_url: newData.attribution_url !== undefined ? newData.attribution_url : original.attribution_url,
      derivative_allowed: newData.derivative_allowed !== undefined ? newData.derivative_allowed : original.derivative_allowed,
      ext: newData.ext || original.ext
    };
    
    return await this.create(cloneData, userId);
  }
  
  /**
   * Validate license schema compliance
   */
  static validateSchema(license) {
    const errors = [];
    
    // License type must be 0-4
    if (license.license_type < 0 || license.license_type > 4) {
      errors.push('license_type must be between 0 and 4');
    }
    
    // Price must be non-negative
    if (license.price < 0) {
      errors.push('price must be >= 0');
    }
    
    // Type 2 (RAG MaxWords) requires max_word_count
    if (license.license_type === 2 && !license.max_word_count) {
      errors.push('max_word_count is required for license_type 2 (RAG Display Max Words)');
    }
    
    // Type 3 (RAG Attribution) requires attribution_required = true
    if (license.license_type === 3 && !license.attribution_required) {
      errors.push('attribution_required must be true for license_type 3 (RAG Display Attribution)');
    }
    
    return errors;
  }
  
  /**
   * Get license type name
   */
  static getLicenseTypeName(type) {
    const names = {
      0: 'Training + Display',
      1: 'RAG Display (Unrestricted)',
      2: 'RAG Display (Max Words)',
      3: 'RAG Display (Attribution)',
      4: 'RAG No Display'
    };
    return names[type] || 'Unknown';
  }
}

module.exports = LicenseOption;
