const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /policies/:publisherId - Get policies for a publisher (both default and page-specific)
router.get('/:publisherId', async (req, res) => {
  try {
    const { publisherId } = req.params;
    const { urlPattern } = req.query; // Optional: filter by URL pattern

    // Check if publisherId is numeric (ID) or string (hostname)
    const isNumeric = !isNaN(publisherId);
    
    let query = `
      SELECT pol.id, pol.publisher_id, pol.policy_json, pol.version, pol.url_pattern, 
             pol.name, pol.description, pol.created_at, p.name as publisher_name, p.hostname
      FROM policies pol
      JOIN publishers p ON pol.publisher_id = p.id
      WHERE ${isNumeric ? 'pol.publisher_id = $1' : 'p.hostname = $1'}
    `;
    
    const params = [publisherId];
    
    if (urlPattern !== undefined) {
      if (urlPattern === 'null' || urlPattern === '') {
        query += ' AND pol.url_pattern IS NULL';
      } else {
        query += ' AND pol.url_pattern = $2';
        params.push(urlPattern);
      }
    }
    
    query += ' ORDER BY pol.url_pattern NULLS FIRST, pol.created_at DESC';

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No policies found' });
    }

    // If requesting a specific URL pattern or default, return single policy
    if (urlPattern !== undefined && result.rows.length > 0) {
      const policy = result.rows[0];
      return res.json({
        publisher_id: policy.publisher_id,
        publisher_name: policy.publisher_name,
        hostname: policy.hostname,
        version: policy.version,
        url_pattern: policy.url_pattern,
        name: policy.name,
        description: policy.description,
        policy: policy.policy_json,
        created_at: policy.created_at
      });
    }

    // Return all policies for this publisher
    res.json({
      publisher_id: result.rows[0].publisher_id,
      publisher_name: result.rows[0].publisher_name,
      hostname: result.rows[0].hostname,
      policies: result.rows.map(row => ({
        id: row.id,
        version: row.version,
        url_pattern: row.url_pattern,
        name: row.name,
        description: row.description,
        policy: row.policy_json,
        created_at: row.created_at,
        is_default: row.url_pattern === null
      }))
    });

  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// PUT /policies/:publisherId - Create or update policy for a publisher
router.put('/:publisherId', async (req, res) => {
  try {
    const { publisherId } = req.params;
    const { policy, urlPattern, name, description } = req.body;

    if (!policy) {
      return res.status(400).json({ error: 'Missing policy data' });
    }

    // Determine if this is a page-specific or default policy
    const isPageSpecific = urlPattern && urlPattern !== 'null' && urlPattern !== '';
    const policyUrlPattern = isPageSpecific ? urlPattern : null;
    const policyName = name || (isPageSpecific ? `Policy for ${urlPattern}` : 'Default Policy');
    const policyDescription = description || (isPageSpecific 
      ? `Page-specific policy for ${urlPattern}` 
      : 'Publisher-wide default licensing policy');

    // Get current version for this policy type (page-specific or default)
    let versionQuery = 'SELECT version FROM policies WHERE publisher_id = $1';
    const versionParams = [publisherId];
    
    if (isPageSpecific) {
      versionQuery += ' AND url_pattern = $2';
      versionParams.push(policyUrlPattern);
    } else {
      versionQuery += ' AND url_pattern IS NULL';
    }
    
    versionQuery += ' ORDER BY created_at DESC LIMIT 1';
    
    const currentResult = await db.query(versionQuery, versionParams);

    const newVersion = currentResult.rows.length > 0 
      ? (parseFloat(currentResult.rows[0].version) + 0.1).toFixed(1)
      : '1.0';

    // Insert new policy version
    const result = await db.query(
      `INSERT INTO policies (publisher_id, policy_json, version, url_pattern, name, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, version, url_pattern, name, description, created_at`,
      [publisherId, JSON.stringify(policy), newVersion, policyUrlPattern, policyName, policyDescription]
    );

    res.json({
      success: true,
      policy_id: result.rows[0].id,
      version: result.rows[0].version,
      url_pattern: result.rows[0].url_pattern,
      name: result.rows[0].name,
      description: result.rows[0].description,
      is_default: result.rows[0].url_pattern === null,
      created_at: result.rows[0].created_at
    });

  } catch (error) {
    console.error('Error updating policy:', error);
    res.status(500).json({ error: 'Failed to update policy', details: error.message });
  }
});

// DELETE /policies/:policyId - Delete a specific policy
router.delete('/:policyId', async (req, res) => {
  try {
    const { policyId } = req.params;

    const result = await db.query(
      'DELETE FROM policies WHERE id = $1 RETURNING id, name, url_pattern',
      [policyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json({
      success: true,
      message: `Policy "${result.rows[0].name}" deleted successfully`,
      deleted_policy_id: result.rows[0].id
    });

  } catch (error) {
    console.error('Error deleting policy:', error);
    res.status(500).json({ error: 'Failed to delete policy' });
  }
});

module.exports = router;
