import db from './db.js';
import logger from './logger.js';

/**
 * License Generator
 * Converts negotiated terms into a policy/license
 */
export class LicenseGenerator {
  /**
   * Generate a policy from negotiated terms
   * @param {string} negotiationId - Negotiation UUID
   * @returns {Promise<object>} Created policy
   */
  async generateLicenseFromNegotiation(negotiationId) {
    logger.info('Generating license from negotiation', { negotiationId });

    // Get negotiation with final terms
    const result = await db.query(
      `SELECT n.*, p.hostname as publisher_hostname, p.name as publisher_name
       FROM negotiations n
       JOIN publishers p ON n.publisher_id = p.id
       WHERE n.id = $1`,
      [negotiationId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Negotiation ${negotiationId} not found`);
    }

    const negotiation = result.rows[0];

    if (negotiation.status !== 'accepted') {
      throw new Error(`Cannot generate license: negotiation status is ${negotiation.status}`);
    }

    if (negotiation.generated_policy_id) {
      logger.info('License already exists for negotiation', { 
        negotiationId, 
        policyId: negotiation.generated_policy_id 
      });
      return await this.getPolicyById(negotiation.generated_policy_id);
    }

    const finalTerms = negotiation.final_terms;
    const context = negotiation.context || {};
    const urlPatterns = context.url_patterns || null;

    // Build policy JSON in Tollbit format
    const policyJson = this.buildPolicyJson(
      negotiation.publisher_hostname,
      negotiation.client_name,
      finalTerms,
      urlPatterns
    );

    // Insert policy
    const policyResult = await db.query(
      `INSERT INTO policies (
        publisher_id, 
        policy_json, 
        version, 
        url_pattern, 
        name, 
        description
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id`,
      [
        negotiation.publisher_id,
        policyJson,
        '1.0',
        urlPatterns ? urlPatterns[0] : null,
        `Negotiated License - ${negotiation.client_name}`,
        `Auto-generated from negotiation ${negotiationId}`
      ]
    );

    const policyId = policyResult.rows[0].id;

    // Update negotiation with generated policy
    await db.query(
      `UPDATE negotiations SET generated_policy_id = $1 WHERE id = $2`,
      [policyId, negotiationId]
    );

    logger.info('License generated successfully', { negotiationId, policyId });

    return {
      policy_id: policyId,
      negotiation_id: negotiationId,
      policy_json: policyJson
    };
  }

  /**
   * Build policy JSON from negotiated terms
   */
  buildPolicyJson(publisherHostname, clientName, terms, urlPatterns) {
    return {
      version: '1.0',
      publisher: publisherHostname,
      default: { allow: false, action: 'redirect' },
      rules: [
        {
          agent: clientName,
          allow: true,
          purpose: terms.purposes || ['inference'],
          price_per_fetch: terms.price_per_fetch_micro / 1000000, // Convert to dollars
          token_ttl_seconds: terms.token_ttl_seconds || 600,
          max_rps: terms.burst_rps || 10,
          url_patterns: urlPatterns || null
        }
      ],
      redirect_url: `http://licensing-api:3000/authorize`,
      negotiated: true,
      negotiation_id: null // Will be set by caller
    };
  }

  /**
   * Get policy by ID
   */
  async getPolicyById(policyId) {
    const result = await db.query(
      'SELECT * FROM policies WHERE id = $1',
      [policyId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Policy ${policyId} not found`);
    }

    return result.rows[0];
  }

  /**
   * Update an existing policy with new terms
   */
  async updatePolicyFromNegotiation(policyId, negotiationId) {
    logger.info('Updating policy from negotiation', { policyId, negotiationId });

    const negotiation = await db.query(
      `SELECT n.*, p.hostname as publisher_hostname
       FROM negotiations n
       JOIN publishers p ON n.publisher_id = p.id
       WHERE n.id = $1`,
      [negotiationId]
    );

    if (negotiation.rows.length === 0) {
      throw new Error(`Negotiation ${negotiationId} not found`);
    }

    const neg = negotiation.rows[0];
    const finalTerms = neg.final_terms;
    const context = neg.context || {};

    const policyJson = this.buildPolicyJson(
      neg.publisher_hostname,
      neg.client_name,
      finalTerms,
      context.url_patterns
    );

    await db.query(
      `UPDATE policies 
       SET policy_json = $1, description = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [
        policyJson,
        `Updated from negotiation ${negotiationId}`,
        policyId
      ]
    );

    logger.info('Policy updated successfully', { policyId, negotiationId });

    return await this.getPolicyById(policyId);
  }
}

export default LicenseGenerator;
