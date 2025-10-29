/**
 * StrategyMatcher - Intelligent matching of negotiation partners to configured strategies
 * 
 * Implements priority-based strategy selection:
 * 1. Specific partner + specific use case (highest priority)
 * 2. Specific partner + general use case
 * 3. Partner tier + specific use case
 * 4. Partner tier + general use case (lowest priority)
 */

class StrategyMatcher {
  constructor(db) {
    this.db = db;
    
    // Known tier 1 AI companies
    this.tier1Companies = [
      'openai',
      'anthropic',
      'google',
      'microsoft',
      'meta',
      'cohere',
      'amazon'
    ];
    
    // Known tier 2 AI companies
    this.tier2Companies = [
      'mistral',
      'together',
      'replicate',
      'huggingface',
      'perplexity',
      'character'
    ];
    
    // Research institutions patterns
    this.researchPatterns = [
      /\.edu$/i,
      /\.ac\./i,
      /university/i,
      /research/i,
      /institute/i,
      /academic/i
    ];
  }

  /**
   * Find the best matching strategy for a negotiation partner
   * @param {number} publisherId - Publisher ID
   * @param {string} partnerIdentifier - Partner domain, company name, or user-agent
   * @param {number} requestedLicenseType - Explicitly requested license type (0-4)
   * @returns {Promise<Object|null>} Matched strategy or null
   */
  async findMatchingStrategy(publisherId, partnerIdentifier, requestedLicenseType = null) {
    const partnerType = this.classifyPartner(partnerIdentifier);
    const partnerName = this.extractPartnerName(partnerIdentifier);
    const licenseType = requestedLicenseType !== null ? requestedLicenseType : this.inferLicenseType(partnerIdentifier);
    
    console.log(`[StrategyMatcher] Matching: publisher=${publisherId}, partner=${partnerName}, type=${partnerType}, licenseType=${licenseType}`);
    
    // Try to find strategy in priority order
    const strategies = [
      // Priority 1: Specific partner + specific license type
      await this.queryStrategy(publisherId, 'specific_partner', partnerName, licenseType),
      
      // Priority 2: Partner tier + specific license type
      await this.queryStrategy(publisherId, partnerType, null, licenseType)
    ];
    
    // Return first non-null strategy
    const matchedStrategy = strategies.find(s => s !== null);
    
    if (matchedStrategy) {
      console.log(`[StrategyMatcher] Matched strategy ID ${matchedStrategy.id}: ${matchedStrategy.partner_type}/${matchedStrategy.partner_name || 'any'}/licenseTypes=${matchedStrategy.license_type}`);
    } else {
      console.log(`[StrategyMatcher] No strategy found for publisher=${publisherId}, partner=${partnerName}, type=${partnerType}`);
    }
    
    return matchedStrategy;
  }

  /**
   * Query database for a specific strategy combination
   * Now handles license_type as an array - matches if requested license type is in the array
   */
  async queryStrategy(publisherId, partnerType, partnerName, licenseType) {
    try {
      const query = `
        SELECT * FROM partner_negotiation_strategies
        WHERE publisher_id = $1
          AND partner_type = $2
          AND (partner_name = $3 OR ($3 IS NULL AND partner_name IS NULL))
          AND $4 = ANY(license_type)
        LIMIT 1
      `;
      
      const result = await this.db.query(query, [publisherId, partnerType, partnerName, licenseType]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('[StrategyMatcher] Query error:', error);
      return null;
    }
  }

  /**
   * Classify partner into tier categories
   * @param {string} identifier - Domain, company name, or user-agent
   * @returns {string} Partner type: tier1_ai, tier2_ai, startup, or research
   */
  classifyPartner(identifier) {
    if (!identifier) return 'startup'; // Default fallback
    
    const lowerIdentifier = identifier.toLowerCase();
    
    // Check for research institutions
    if (this.researchPatterns.some(pattern => pattern.test(identifier))) {
      return 'research';
    }
    
    // Check for tier 1 companies
    if (this.tier1Companies.some(company => lowerIdentifier.includes(company))) {
      return 'tier1_ai';
    }
    
    // Check for tier 2 companies
    if (this.tier2Companies.some(company => lowerIdentifier.includes(company))) {
      return 'tier2_ai';
    }
    
    // Default to startup for unknown entities
    return 'startup';
  }

  /**
   * Extract normalized partner name from identifier
   * @param {string} identifier - Domain, company name, or user-agent
   * @returns {string|null} Normalized partner name or null
   */
  extractPartnerName(identifier) {
    if (!identifier) return null;
    
    const lowerIdentifier = identifier.toLowerCase();
    
    // Check for known companies
    const allCompanies = [...this.tier1Companies, ...this.tier2Companies];
    for (const company of allCompanies) {
      if (lowerIdentifier.includes(company)) {
        // Normalize to title case (e.g., 'openai' -> 'OpenAI')
        return this.normalizeCompanyName(company);
      }
    }
    
    return null;
  }

  /**
   * Normalize company names to standard format
   */
  normalizeCompanyName(company) {
    const nameMap = {
      'openai': 'OpenAI',
      'anthropic': 'Anthropic',
      'google': 'Google',
      'microsoft': 'Microsoft',
      'meta': 'Meta',
      'cohere': 'Cohere',
      'amazon': 'Amazon',
      'mistral': 'Mistral',
      'together': 'Together AI',
      'replicate': 'Replicate',
      'huggingface': 'Hugging Face',
      'perplexity': 'Perplexity',
      'character': 'Character AI'
    };
    
    return nameMap[company.toLowerCase()] || company;
  }

  /**
   * Infer license type from partner identifier or user-agent
   * @param {string} identifier - Domain, company name, or user-agent
   * @returns {number} Inferred license type: 0-4
   */
  inferLicenseType(identifier) {
    if (!identifier) return 1; // Default to RAG Unrestricted
    
    const lowerIdentifier = identifier.toLowerCase();
    
    // Training bots - Type 0 (Training + Display)
    if (lowerIdentifier.includes('gptbot') || 
        lowerIdentifier.includes('claudebot') ||
        lowerIdentifier.includes('crawler') ||
        lowerIdentifier.includes('scraper')) {
      return 0;
    }
    
    // Search bots - Type 1 (RAG Unrestricted)
    if (lowerIdentifier.includes('googlebot') ||
        lowerIdentifier.includes('bingbot') ||
        lowerIdentifier.includes('search') ||
        lowerIdentifier.includes('perplexity')) {
      return 1;
    }
    
    // API/inference usage - Type 1 (RAG Unrestricted)
    if (lowerIdentifier.includes('api') ||
        lowerIdentifier.includes('sdk')) {
      return 1;
    }
    
    return 1; // Default to RAG Unrestricted
  }

  /**
   * Get all strategies for a publisher (for UI display)
   * @param {number} publisherId - Publisher ID
   * @returns {Promise<Array>} All configured strategies
   */
  async getPublisherStrategies(publisherId) {
    const query = `
      SELECT * FROM partner_negotiation_strategies
      WHERE publisher_id = $1
      ORDER BY 
        CASE partner_type 
          WHEN 'specific_partner' THEN 1
          WHEN 'tier1_ai' THEN 2
          WHEN 'tier2_ai' THEN 3
          WHEN 'startup' THEN 4
          WHEN 'research' THEN 5
        END,
        partner_name NULLS LAST,
        id
    `;
    
    const result = await this.db.query(query, [publisherId]);
    return result.rows;
  }

  /**
   * Create a new strategy
   */
  async createStrategy(publisherId, strategyData) {
    const query = `
      INSERT INTO partner_negotiation_strategies (
        publisher_id, partner_type, partner_name, license_type,
        pricing_model, min_price, max_price, preferred_price,
        negotiation_style, auto_accept_threshold,
        deal_breakers, preferred_terms,
        llm_provider, llm_model
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const values = [
      publisherId,
      strategyData.partner_type,
      strategyData.partner_name || null,
      strategyData.license_type || [1], // Default to RAG Unrestricted
      strategyData.pricing_model || 'per_token',
      strategyData.min_price,
      strategyData.max_price,
      strategyData.preferred_price,
      strategyData.negotiation_style,
      strategyData.auto_accept_threshold || 0.90,
      JSON.stringify(strategyData.deal_breakers || []),
      JSON.stringify(strategyData.preferred_terms || {}),
      strategyData.llm_provider || 'openai',
      strategyData.llm_model || 'gpt-4'
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Update an existing strategy
   */
  async updateStrategy(strategyId, updates) {
    const setClauses = [];
    const values = [];
    let paramCount = 1;
    
    const updatableFields = [
      'partner_type', 'partner_name', 'license_type',
      'pricing_model', 'min_price', 'max_price', 'preferred_price',
      'negotiation_style', 'auto_accept_threshold',
      'deal_breakers', 'preferred_terms',
      'llm_provider', 'llm_model'
    ];
    
    for (const field of updatableFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = $${paramCount}`);
        values.push(
          (field === 'deal_breakers' || field === 'preferred_terms')
            ? JSON.stringify(updates[field])
            : updates[field]
        );
        paramCount++;
      }
    }
    
    if (setClauses.length === 0) {
      throw new Error('No fields to update');
    }
    
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(strategyId);
    
    const query = `
      UPDATE partner_negotiation_strategies
      SET ${setClauses.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete a strategy
   */
  async deleteStrategy(strategyId) {
    const query = 'DELETE FROM partner_negotiation_strategies WHERE id = $1';
    await this.db.query(query, [strategyId]);
  }
}

export default StrategyMatcher;
