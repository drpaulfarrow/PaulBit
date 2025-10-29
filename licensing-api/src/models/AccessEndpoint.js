const db = require('../db');
const { logAudit } = require('../utils/audit');

class AccessEndpoint {
  /**
   * Create new access endpoint
   */
  static async create(data, userId) {
    const {
      publisher_id, access_type, endpoint, name, description,
      auth_type = 'none', rate_limit = 1000,
      requires_mtls = false, scopes = [], ext = {},
      request_format = 'json', response_format = 'json',
      request_headers = {}, sample_request, sample_response
    } = data;
    
    if (!publisher_id || access_type === undefined || !endpoint) {
      throw new Error('publisher_id, access_type, and endpoint are required');
    }
    
    // Validate access_type
    if (access_type < 0 || access_type > 4) {
      throw new Error('access_type must be between 0 and 4 (0=HTML, 1=RSS, 2=API, 3=MCP, 4=NLWeb)');
    }
    
    // Validate auth_type
    const validAuthTypes = ['none', 'api_key', 'oauth2'];
    if (!validAuthTypes.includes(auth_type)) {
      throw new Error(`auth_type must be one of: ${validAuthTypes.join(', ')}`);
    }
    
    // Set sensible defaults for request/response formats based on access_type
    const defaultRequestFormat = request_format || (['http-get', 'http-get', 'json', 'json', 'http-get'][access_type]);
    const defaultResponseFormat = response_format || (['html', 'xml', 'json', 'json', 'html'][access_type]);
    
    const result = await db.query(`
      INSERT INTO access_endpoints (
        publisher_id, access_type, endpoint, name, description, auth_type, rate_limit,
        requires_mtls, scopes, ext, request_format, response_format, request_headers,
        sample_request, sample_response
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      publisher_id, access_type, endpoint, name, description, auth_type, rate_limit,
      requires_mtls, scopes, JSON.stringify(ext), defaultRequestFormat, defaultResponseFormat,
      JSON.stringify(request_headers), sample_request, sample_response
    ]);
    
    const accessEndpoint = result.rows[0];
    
    await logAudit({
      entity_type: 'access_endpoint',
      entity_id: accessEndpoint.id,
      action: 'create',
      user_id: userId,
      new_values: accessEndpoint
    });
    
    return accessEndpoint;
  }
  
  /**
   * Find access endpoint by ID
   */
  static async findById(id) {
    const result = await db.query('SELECT * FROM access_endpoints WHERE id = $1', [id]);
    return result.rows[0];
  }
  
  /**
   * Find endpoints by publisher
   */
  static async findByPublisher(publisherId) {
    const result = await db.query(
      'SELECT * FROM access_endpoints WHERE publisher_id = $1 ORDER BY access_type, id DESC',
      [publisherId]
    );
    return result.rows;
  }

  /**
   * @deprecated Access endpoints are now publisher-level, not license-level
   * Find all access endpoints for a license (legacy method)
   */
  static async findByLicense(licenseId) {
    console.warn('AccessEndpoint.findByLicense() is deprecated - access endpoints are now publisher-level');
    // Return empty array since license_id column no longer exists
    return [];
  }
  
  /**
   * Update access endpoint
   */
  static async update(id, data, userId) {
    const oldEndpoint = await this.findById(id);
    if (!oldEndpoint) {
      throw new Error('Access endpoint not found');
    }
    
    const fields = [];
    const values = [];
    let paramCount = 0;
    
    const allowedFields = [
      'endpoint', 'name', 'description', 'auth_type', 'rate_limit', 'requires_mtls', 'scopes', 'ext',
      'request_format', 'response_format', 'request_headers', 'sample_request', 'sample_response'
    ];
    
    const jsonFields = ['ext', 'request_headers'];
    
    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        paramCount++;
        fields.push(`${field} = $${paramCount}`);
        values.push(jsonFields.includes(field) ? JSON.stringify(data[field]) : data[field]);
      }
    });
    
    if (fields.length === 0) {
      return oldEndpoint;
    }
    
    values.push(id);
    paramCount++;
    
    const query = `UPDATE access_endpoints SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;
    const result = await db.query(query, values);
    const newEndpoint = result.rows[0];
    
    // Log audit trail
    const changedFields = {};
    allowedFields.forEach(field => {
      if (data[field] !== undefined && JSON.stringify(oldEndpoint[field]) !== JSON.stringify(data[field])) {
        changedFields[field] = { old: oldEndpoint[field], new: data[field] };
      }
    });
    
    await logAudit({
      entity_type: 'access_endpoint',
      entity_id: id,
      action: 'update',
      user_id: userId,
      changed_fields: changedFields,
      old_values: oldEndpoint,
      new_values: newEndpoint
    });
    
    return newEndpoint;
  }
  
  /**
   * Delete access endpoint
   */
  static async delete(id, userId) {
    const endpoint = await this.findById(id);
    if (!endpoint) {
      throw new Error('Access endpoint not found');
    }
    
    await db.query('DELETE FROM access_endpoints WHERE id = $1', [id]);
    
    await logAudit({
      entity_type: 'access_endpoint',
      entity_id: id,
      action: 'delete',
      user_id: userId,
      old_values: endpoint
    });
  }
  
  /**
   * Test access endpoint (perform HEAD/GET request)
   */
  static async testEndpoint(id) {
    const endpoint = await this.findById(id);
    if (!endpoint) {
      throw new Error('Access endpoint not found');
    }
    
    const axios = require('axios');
    const startTime = Date.now();
    
    try {
      const response = await axios.head(endpoint.endpoint, {
        timeout: 5000,
        validateStatus: () => true // Accept any status code
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: true,
        status_code: response.status,
        response_time_ms: responseTime,
        headers: response.headers,
        accessible: response.status >= 200 && response.status < 400
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        response_time_ms: responseTime,
        accessible: false
      };
    }
  }
  
  /**
   * Get access type name
   */
  static getAccessTypeName(type) {
    const names = {
      0: 'HTML',
      1: 'RSS',
      2: 'API',
      3: 'MCP',
      4: 'NLWeb'
    };
    return names[type] || 'Unknown';
  }
}

module.exports = AccessEndpoint;
