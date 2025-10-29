const db = require('../db');
const { logAudit } = require('../utils/audit');

class Content {
  /**
   * Create new content asset
   */
  static async create(data, userId) {
    const {
      content_id, publisher_id, title, description, url,
      content_origin = 0, body_word_count = 0, has_third_party_media = false,
      authority_score, originality_score, metadata = {}
    } = data;
    
    if (!publisher_id || !url) {
      throw new Error('publisher_id and url are required');
    }
    
    // Auto-generate content_id if not provided
    const finalContentId = content_id || `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const result = await db.query(`
      INSERT INTO content (
        content_id, publisher_id, title, description, url,
        content_origin, body_word_count, has_third_party_media,
        authority_score, originality_score, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      finalContentId, publisher_id, title, description, url,
      content_origin, body_word_count, has_third_party_media,
      authority_score, originality_score, JSON.stringify(metadata)
    ]);
    
    const content = result.rows[0];
    
    await logAudit({
      entity_type: 'content',
      entity_id: content.id,
      action: 'create',
      user_id: userId,
      new_values: content
    });
    
    return content;
  }
  
  /**
   * Find content by ID
   */
  static async findById(id) {
    const result = await db.query('SELECT * FROM content WHERE id = $1', [id]);
    return result.rows[0];
  }
  
  /**
   * Find content by content_id (external ID)
   */
  static async findByContentId(contentId) {
    const result = await db.query('SELECT * FROM content WHERE content_id = $1', [contentId]);
    return result.rows[0];
  }
  
  /**
   * Find content by URL
   */
  static async findByUrl(url, publisherId) {
    const result = await db.query(
      'SELECT * FROM content WHERE url = $1 AND publisher_id = $2',
      [url, publisherId]
    );
    return result.rows[0];
  }
  
  /**
   * Find all content for a publisher with filters
   */
  static async findByPublisher(publisherId, filters = {}) {
    let query = 'SELECT * FROM content WHERE publisher_id = $1';
    const params = [publisherId];
    let paramCount = 1;
    
    if (filters.content_origin !== undefined) {
      paramCount++;
      query += ` AND content_origin = $${paramCount}`;
      params.push(filters.content_origin);
    }
    
    if (filters.has_third_party_media !== undefined) {
      paramCount++;
      query += ` AND has_third_party_media = $${paramCount}`;
      params.push(filters.has_third_party_media);
    }
    
    if (filters.search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount} OR url ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
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
   * Update content
   */
  static async update(id, data, userId) {
    const oldContent = await this.findById(id);
    if (!oldContent) {
      throw new Error('Content not found');
    }
    
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    const allowedFields = [
      'title', 'description', 'content_origin', 'body_word_count',
      'has_third_party_media', 'authority_score', 'originality_score', 'metadata'
    ];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(field === 'metadata' ? JSON.stringify(data[field]) : data[field]);
      }
    });
    
    if (fields.length === 0) {
      return oldContent;
    }
    
    // Always update updated_ts
    paramCount++;
    fields.push(`updated_ts = NOW()`);
    
    // Update last_scored_at if scores changed
    if (data.authority_score !== undefined || data.originality_score !== undefined) {
      paramCount++;
      fields.push(`last_scored_at = NOW()`);
    }
    
    values.push(id);
    paramCount++;
    
    const query = `UPDATE content SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    const newContent = result.rows[0];
    
    // Log audit trail
    const changedFields = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined && JSON.stringify(oldContent[field]) !== JSON.stringify(data[field])) {
        changedFields[field] = { old: oldContent[field], new: data[field] };
      }
    });
    
    await logAudit({
      entity_type: 'content',
      entity_id: id,
      action: 'update',
      user_id: userId,
      changed_fields: changedFields,
      old_values: oldContent,
      new_values: newContent
    });
    
    return newContent;
  }
  
  /**
   * Delete content (cascades to licenses and access endpoints)
   */
  static async delete(id, userId) {
    const content = await this.findById(id);
    if (!content) {
      throw new Error('Content not found');
    }
    
    await db.query('DELETE FROM content WHERE id = $1', [id]);
    
    await logAudit({
      entity_type: 'content',
      entity_id: id,
      action: 'delete',
      user_id: userId,
      old_values: content
    });
  }
  
  /**
   * Export content to cm_rtbspec format with licenses and access endpoints
   */
  static async exportToCMRTBSpec(id) {
    const content = await this.findById(id);
    if (!content) {
      return null;
    }
    
    // Get associated licenses
    const licenses = await db.query(
      'SELECT * FROM license_options WHERE content_id = $1 AND status = $2 ORDER BY created_ts',
      [id, 'active']
    );
    
    // Get access endpoints (publisher-level, not license-specific)
    const publisherId = content.publisher_id || 1;
    const accessEndpoints = await db.query(
      'SELECT * FROM access_endpoints WHERE publisher_id = $1 ORDER BY id',
      [publisherId]
    );
    
    // Build license options with shared access endpoints
    const licenseOptionsWithAccess = licenses.rows.map(license => {
        const licenseData = {
          license_id: license.license_id,
          license_name: license.name || `license_${license.id}`,
          license_type: license.license_type,
          price: parseFloat(license.price),
          currency: license.currency
        };
        
        // Add optional fields
        if (license.term_months) licenseData.term_months = license.term_months;
        if (license.revshare_pct) licenseData.revshare_pct = parseFloat(license.revshare_pct);
        if (license.max_word_count) licenseData.max_word_count = license.max_word_count;
        if (license.attribution_required) {
          licenseData.attribution_required = true;
          if (license.attribution_text) licenseData.attribution_text = license.attribution_text;
          if (license.attribution_url) licenseData.attribution_url = license.attribution_url;
        }
        
        // Add access endpoints
        licenseData.access = accessEndpoints.rows.map(a => {
          const accessData = {
            type: a.access_type,
            endpoint: a.endpoint,
            auth_type: a.auth_type
          };
          
          if (a.rate_limit) accessData.rate_limit = a.rate_limit;
          if (a.requires_mtls) accessData.requires_mtls = a.requires_mtls;
          if (a.scopes && a.scopes.length > 0) accessData.scopes = a.scopes;
          if (a.ext && Object.keys(a.ext).length > 0) accessData.ext = a.ext;
          
          return accessData;
        });
        
        // Add extensions
        if (license.ext && Object.keys(license.ext).length > 0) {
          licenseData.ext = license.ext;
        }
        
        return licenseData;
      });
    
    // Build content object
    const contentData = {
      id: content.content_id,
      title: content.title,
      url: content.url,
      content_origin: content.content_origin,
      body_word_count: content.body_word_count,
      has_third_party_media: content.has_third_party_media,
      created_ts: content.created_ts,
      updated_ts: content.updated_ts
    };
    
    // Add optional fields
    if (content.description) contentData.description = content.description;
    if (content.authority_score) contentData.authority_score = parseFloat(content.authority_score);
    if (content.originality_score) contentData.originality_score = parseFloat(content.originality_score);
    
    return {
      cm_rtbspec: content.cm_rtbspec_version,
      content: contentData,
      license_options: licenseOptionsWithAccess,
      ext: content.metadata || {}
    };
  }
  
  /**
   * Bulk export all content for a publisher
   */
  static async exportPublisherContent(publisherId) {
    const contents = await this.findByPublisher(publisherId);
    
    const exports = await Promise.all(
      contents.map(c => this.exportToCMRTBSpec(c.id))
    );
    
    return exports.filter(e => e !== null);
  }
}

module.exports = Content;
