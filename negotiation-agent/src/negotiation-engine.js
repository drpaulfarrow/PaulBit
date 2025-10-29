import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import logger from './logger.js';
import { LLMProvider } from './llm-provider.js';
import StrategyMatcher from './strategy-matcher.js';
import {
  notifyNegotiationInitiated,
  notifyNegotiationRound,
  notifyNegotiationAccepted,
  notifyNegotiationRejected,
  notifyNegotiationTimeout
} from './notifications.js';

/**
 * Core negotiation engine
 * Handles the LLM-powered negotiation logic
 */
export class NegotiationEngine {
  constructor() {
    this.llmProviders = new Map();
    this.io = null;
    this.broadcast = null;
    this.strategyMatcher = new StrategyMatcher(db);
  }

  /**
   * Broadcast event to connected clients
   */
  _broadcast(publisherId, event, data) {
    if (this.broadcast) {
      this.broadcast(publisherId, event, data);
    }
  }

  /**
   * Get or create LLM provider for a strategy
   */
  getLLMProvider(strategy) {
    const key = `${strategy.llm_provider}:${strategy.llm_model}`;
    
    if (!this.llmProviders.has(key)) {
      this.llmProviders.set(key, new LLMProvider({
        provider: strategy.llm_provider,
        model: strategy.llm_model,
        temperature: parseFloat(strategy.llm_temperature)
      }));
    }
    
    return this.llmProviders.get(key);
  }

  /**
   * Initiate a new negotiation
   * @param {object} proposal - Initial proposal from AI company
   * @param {number} publisherId - Publisher ID
   * @param {string} clientName - AI company name
   * @param {number} clientId - Optional client ID
   * @param {object} context - Additional context (partnerIdentifier, useCase)
   * @returns {Promise<object>} Created negotiation
   */
  async initiateNegotiation(proposal, publisherId, clientName, clientId = null, context = {}) {
    logger.info('Initiating negotiation', { publisherId, clientName, context });

    // Extract partner identifier and use case from context
    const partnerIdentifier = context.partnerIdentifier || clientName;
    const useCase = context.useCase || proposal.use_case || null;

    // Match to appropriate strategy using StrategyMatcher
    const strategy = await this.strategyMatcher.findMatchingStrategy(
      publisherId,
      partnerIdentifier,
      useCase
    );

    if (!strategy) {
      throw new Error(`No matching negotiation strategy found for publisher ${publisherId}, partner ${partnerIdentifier}, use case ${useCase}`);
    }

    // Extract partner classification for storage
    const partnerType = this.strategyMatcher.classifyPartner(partnerIdentifier);
    const partnerName = this.strategyMatcher.extractPartnerName(partnerIdentifier);
    const inferredUseCase = useCase || this.strategyMatcher.inferUseCase(partnerIdentifier);

    logger.info('Matched strategy', { 
      strategyId: strategy.id, 
      partnerType, 
      partnerName, 
      useCase: inferredUseCase 
    });

    // Check deal breakers immediately
    const dealBreakers = await this.checkDealBreakers(proposal, strategy);
    if (dealBreakers.length > 0) {
      return await this.createRejectedNegotiation(
        proposal, 
        publisherId, 
        clientName, 
        clientId, 
        strategy, 
        dealBreakers,
        context,
        partnerType,
        partnerName,
        inferredUseCase
      );
    }

    // Check auto-accept threshold
    const score = this.scoreProposal(proposal, strategy);
    if (score >= strategy.auto_accept_threshold) {
      return await this.createAcceptedNegotiation(
        proposal,
        publisherId,
        clientName,
        clientId,
        strategy,
        context,
        'Auto-accepted: Proposal meets acceptance threshold',
        partnerType,
        partnerName,
        inferredUseCase
      );
    }

    // Create negotiation record
    const negotiationId = uuidv4();
    await db.query(
      `INSERT INTO negotiations (
        id, publisher_id, client_id, client_name, strategy_id,
        status, current_round, initial_proposal, current_terms, context,
        partner_type, partner_name, use_case
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        negotiationId,
        publisherId,
        clientId,
        clientName,
        strategy.id,
        'negotiating',
        0,
        JSON.stringify(proposal),
        JSON.stringify(proposal),
        JSON.stringify(context),
        partnerType,
        partnerName,
        inferredUseCase
      ]
    );

    // Generate first counter-offer using LLM
    const counterOffer = await this.generateCounterOffer(
      negotiationId,
      proposal,
      strategy,
      0,
      { partnerType, partnerName, useCase: inferredUseCase }
    );

    logger.info('Negotiation initiated', { negotiationId, score, counterOffer });

    // Create notification
    await notifyNegotiationInitiated({
      publisherId,
      negotiationId,
      clientName,
      partnerType,
      useCase: inferredUseCase,
      proposedPrice: proposal.price || proposal.price_per_fetch_micro || proposal.preferred_price
    }).catch(err => logger.error('Failed to create notification', err));

    // Broadcast to UI
    this._broadcast(publisherId, 'negotiation:initiated', {
      negotiationId,
      clientName,
      status: 'negotiating',
      round: 1,
      counterOffer,
      timestamp: new Date()
    });

    return {
      negotiationId,
      status: 'negotiating',
      round: 1,
      counterOffer
    };
  }

  /**
   * Process a counter-proposal from the client
   */
  async processCounterProposal(negotiationId, counterProposal) {
    logger.info('Processing counter-proposal', { negotiationId });

    // Get negotiation
    const negotiationResult = await db.query(
      `SELECT * FROM negotiations WHERE id = $1`,
      [negotiationId]
    );

    if (negotiationResult.rows.length === 0) {
      throw new Error(`Negotiation ${negotiationId} not found`);
    }

    const negotiation = negotiationResult.rows[0];
    
    // Get strategy
    const strategyResult = await db.query(
      `SELECT * FROM partner_negotiation_strategies WHERE id = $1`,
      [negotiation.strategy_id]
    );
    
    if (strategyResult.rows.length === 0) {
      throw new Error(`Strategy ${negotiation.strategy_id} not found`);
    }
    
    const strategy = strategyResult.rows[0];

    // Check if negotiation is still active
    if (negotiation.status !== 'negotiating') {
      throw new Error(`Negotiation ${negotiationId} is not active (status: ${negotiation.status})`);
    }

    // Check max rounds
    if (negotiation.current_round >= strategy.max_rounds) {
      await this.timeoutNegotiation(negotiationId);
      return { status: 'timeout', message: 'Maximum rounds reached' };
    }

    // Check timeout
    const lastActivity = new Date(negotiation.last_activity_at);
    const now = new Date();
    const secondsSinceActivity = (now - lastActivity) / 1000;
    if (secondsSinceActivity > strategy.timeout_seconds) {
      await this.timeoutNegotiation(negotiationId);
      return { status: 'timeout', message: 'Negotiation timeout' };
    }

    const newRound = negotiation.current_round + 1;

    // Log the client's counter-proposal
    await this.logRound(
      negotiationId,
      newRound,
      'client',
      'counter',
      counterProposal,
      'Client counter-proposal'
    );

    // Check deal breakers
    const dealBreakers = await this.checkDealBreakers(counterProposal, strategy);
    if (dealBreakers.length > 0) {
      await this.rejectNegotiation(negotiationId, dealBreakers.join('; '));
      return { status: 'rejected', reason: dealBreakers };
    }

    // Check auto-accept
    const score = this.scoreProposal(counterProposal, strategy);
    if (score >= strategy.auto_accept_threshold) {
      await this.acceptNegotiation(negotiationId, counterProposal);
      return { 
        status: 'accepted', 
        terms: counterProposal,
        message: 'Counter-proposal meets acceptance threshold'
      };
    }

    // Generate new counter-offer using LLM
    const publisherCounterOffer = await this.generateCounterOffer(
      negotiationId,
      counterProposal,
      strategy,
      newRound,
      { 
        partnerType: negotiation.partner_type, 
        partnerName: negotiation.partner_name || negotiation.client_name,
        useCase: negotiation.use_case 
      }
    );

    // Update negotiation
    await db.query(
      `UPDATE negotiations 
       SET current_round = $1, current_terms = $2, last_activity_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newRound, JSON.stringify(counterProposal), negotiationId]
    );

    // Broadcast round update
    this._broadcast(negotiation.publisher_id, 'negotiation:round', {
      negotiationId,
      round: newRound + 1,
      status: 'negotiating',
      publisherCounterOffer,
      timestamp: new Date()
    });

    return {
      status: 'negotiating',
      round: newRound + 1,
      counterOffer: publisherCounterOffer
    };
  }

  /**
   * Generate a counter-offer using LLM
   */
  async generateCounterOffer(negotiationId, currentProposal, strategy, round, partnerInfo = {}) {
    logger.info('Generating counter-offer', { negotiationId, round, partnerInfo });

    const llm = this.getLLMProvider(strategy);

    // Build context for LLM
    const systemPrompt = strategy.system_prompt || this.getDefaultSystemPrompt();
    
    const userPrompt = this.buildNegotiationPrompt(currentProposal, strategy, round, partnerInfo);

    // Get LLM response
    const result = await llm.completeJSON(systemPrompt, userPrompt);

    const counterOffer = result.parsed;

    // Log this round
    await this.logRound(
      negotiationId,
      round + 1,
      'publisher',
      'counter',
      counterOffer,
      result.parsed.reasoning || 'LLM-generated counter-offer',
      result.model,
      result.tokensUsed,
      result.responseTime
    );

    return counterOffer;
  }

  /**
   * Build the prompt for the LLM
   */
  buildNegotiationPrompt(currentProposal, strategy, round, partnerInfo = {}) {
    const { partnerType = 'unknown', partnerName = 'AI Company', useCase = 'general' } = partnerInfo;
    
    // Build partner context description
    let partnerContext = `**Partner Information:**
- Partner: ${partnerName}`;
    
    if (partnerType === 'tier1_ai') {
      partnerContext += ` (Tier 1 AI Company - Premium partner with high volume potential)`;
    } else if (partnerType === 'tier2_ai') {
      partnerContext += ` (Tier 2 AI Company - Growing partner with good potential)`;
    } else if (partnerType === 'startup') {
      partnerContext += ` (Startup - Flexible partnership opportunity)`;
    } else if (partnerType === 'research') {
      partnerContext += ` (Research Institution - Academic collaboration)`;
    }
    
    partnerContext += `
- Use Case: ${useCase}`;
    
    if (useCase === 'training') {
      partnerContext += ` (Model Training - High value, bulk usage)`;
    } else if (useCase === 'inference') {
      partnerContext += ` (Production Inference - Ongoing usage)`;
    } else if (useCase === 'search') {
      partnerContext += ` (Search Engine - High volume, lower margin)`;
    }
    
    return `You are negotiating a content licensing agreement on behalf of a publisher.

${partnerContext}

**Publisher's Strategy for This Partner:**
- Negotiation Style: ${strategy.negotiation_style}
- Minimum Price: $${strategy.min_price} per ${strategy.pricing_model === 'per_token' ? 'token' : 'query'}
- Preferred Price: $${strategy.preferred_price} per ${strategy.pricing_model === 'per_token' ? 'token' : 'query'}
- Max Price: $${strategy.max_price} per ${strategy.pricing_model === 'per_token' ? 'token' : 'query'}
- Auto-Accept Threshold: ${(strategy.auto_accept_threshold * 100).toFixed(0)}% of preferred price

**Deal Breakers:**
${strategy.deal_breakers && strategy.deal_breakers.length > 0 
  ? strategy.deal_breakers.map(db => `- ${db}`).join('\n') 
  : '- None specified'}

**Preferred Terms:**
${JSON.stringify(strategy.preferred_terms || {}, null, 2)}

**Current Round:** ${round + 1}

**Current Proposal from ${partnerName}:**
${JSON.stringify(currentProposal, null, 2)}

**Your Task:**
Generate a counter-offer that moves toward your preferred terms while considering:
1. Your negotiation style (${strategy.negotiation_style})
2. The partner's tier and use case (adjust strategy accordingly)
3. Building a positive long-term relationship
4. The specific value this partner brings

Respond with a JSON object containing:
{
  "price": <number>,
  "pricing_model": "${strategy.pricing_model}",
  "terms": {<any additional terms>},
  "reasoning": "<your explanation for these terms, referencing partner tier and use case>",
  "tone": "<friendly|neutral|firm>"
}

Be strategic: Consider the partner's position (${partnerType}) and intended use (${useCase}) when making concessions.`;
  }

  /**
   * Default system prompt if none provided
   */
  getDefaultSystemPrompt() {
    return `You are a professional AI licensing negotiator representing a content publisher. 
Your goal is to achieve fair compensation while maintaining positive relationships with AI companies.
You must negotiate firmly but fairly, always providing clear reasoning for your positions.
You understand both the value of quality content and the needs of AI companies.
Respond only with valid JSON.`;
  }

  /**
   * Score a proposal (0.0 - 1.0) based on how well it meets preferred terms
   */
  scoreProposal(proposal, strategy) {
    let score = 0;
    let weights = 0;

    // Price score (weight: 0.4)
    if (proposal.price_per_fetch_micro) {
      const priceScore = Math.min(
        proposal.price_per_fetch_micro / strategy.preferred_price_per_fetch_micro,
        2.0
      ) / 2.0;
      score += priceScore * 0.4;
      weights += 0.4;
    }

    // TTL score (weight: 0.2)
    if (proposal.token_ttl_seconds) {
      const ttlScore = Math.abs(
        proposal.token_ttl_seconds - strategy.preferred_token_ttl_seconds
      ) / strategy.preferred_token_ttl_seconds;
      score += (1 - Math.min(ttlScore, 1)) * 0.2;
      weights += 0.2;
    }

    // RPS score (weight: 0.2)
    if (proposal.burst_rps) {
      const rpsScore = Math.abs(
        proposal.burst_rps - strategy.preferred_burst_rps
      ) / strategy.preferred_burst_rps;
      score += (1 - Math.min(rpsScore, 1)) * 0.2;
      weights += 0.2;
    }

    // Purpose score (weight: 0.2)
    if (proposal.purposes && Array.isArray(proposal.purposes)) {
      const preferredSet = new Set(strategy.preferred_purposes);
      const matchingPurposes = proposal.purposes.filter(p => preferredSet.has(p)).length;
      const purposeScore = matchingPurposes / strategy.preferred_purposes.length;
      score += purposeScore * 0.2;
      weights += 0.2;
    }

    return weights > 0 ? score / weights : 0;
  }

  /**
   * Check if proposal violates any deal breakers
   */
  async checkDealBreakers(proposal, strategy) {
    const violations = [];
    const dealBreakers = strategy.deal_breakers || [];

    for (const breaker of dealBreakers) {
      const field = breaker.field;
      const operator = breaker.operator;
      const value = breaker.value;

      if (!proposal[field]) continue;

      let violated = false;

      switch (operator) {
        case '<':
          violated = proposal[field] < value;
          break;
        case '>':
          violated = proposal[field] > value;
          break;
        case '=':
        case '==':
          violated = proposal[field] === value;
          break;
        case 'contains':
          violated = Array.isArray(proposal[field]) && proposal[field].includes(value);
          break;
      }

      if (violated) {
        violations.push(`Deal breaker: ${field} ${operator} ${value}`);
      }
    }

    return violations;
  }

  /**
   * Log a negotiation round
   */
  async logRound(negotiationId, round, actor, action, terms, reasoning, model = null, tokensUsed = null, responseTime = null) {
    await db.query(
      `INSERT INTO negotiation_rounds (
        negotiation_id, round_number, actor, action, proposed_terms, 
        reasoning, llm_model, llm_tokens_used, llm_response_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        negotiationId,
        round,
        actor,
        action,
        JSON.stringify(terms),
        reasoning,
        model,
        tokensUsed,
        responseTime
      ]
    );
  }

  /**
   * Accept a negotiation
   */
  async acceptNegotiation(negotiationId, finalTerms) {
    const result = await db.query(
      `UPDATE negotiations 
       SET status = 'accepted', final_terms = $1, completed_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING publisher_id`,
      [JSON.stringify(finalTerms), negotiationId]
    );

    await this.logRound(negotiationId, -1, 'publisher', 'accept', finalTerms, 'Final terms accepted');
    
    logger.info('Negotiation accepted', { negotiationId });

    // Broadcast acceptance
    if (result.rows.length > 0) {
      this._broadcast(result.rows[0].publisher_id, 'negotiation:accepted', {
        negotiationId,
        finalTerms,
        timestamp: new Date()
      });
    }
  }

  /**
   * Reject a negotiation
   */
  async rejectNegotiation(negotiationId, reason) {
    const result = await db.query(
      `UPDATE negotiations 
       SET status = 'rejected', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING publisher_id`,
      [negotiationId]
    );

    await this.logRound(negotiationId, -1, 'publisher', 'reject', {}, reason);
    
    logger.info('Negotiation rejected', { negotiationId, reason });

    // Broadcast rejection
    if (result.rows.length > 0) {
      this._broadcast(result.rows[0].publisher_id, 'negotiation:rejected', {
        negotiationId,
        reason,
        timestamp: new Date()
      });
    }
  }

  /**
   * Timeout a negotiation
   */
  async timeoutNegotiation(negotiationId) {
    await db.query(
      `UPDATE negotiations 
       SET status = 'timeout', completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [negotiationId]
    );

    logger.info('Negotiation timed out', { negotiationId });
  }

  /**
   * Create a rejected negotiation (due to deal breakers)
   */
  async createRejectedNegotiation(proposal, publisherId, clientName, clientId, strategy, dealBreakers, context, partnerType, partnerName, useCase) {
    const negotiationId = uuidv4();
    
    await db.query(
      `INSERT INTO negotiations (
        id, publisher_id, client_id, client_name, strategy_id,
        status, current_round, initial_proposal, context, completed_at,
        partner_type, partner_name, use_case
      ) VALUES ($1, $2, $3, $4, $5, 'rejected', 0, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10)`,
      [negotiationId, publisherId, clientId, clientName, strategy.id, JSON.stringify(proposal), JSON.stringify(context), partnerType, partnerName, useCase]
    );

    await this.logRound(negotiationId, 0, 'publisher', 'reject', proposal, dealBreakers.join('; '));

    // Create notification
    await notifyNegotiationRejected({
      publisherId,
      negotiationId,
      clientName,
      reason: dealBreakers.join('; ')
    }).catch(err => logger.error('Failed to create notification', err));

    return {
      negotiationId,
      status: 'rejected',
      reason: dealBreakers
    };
  }

  /**
   * Create an accepted negotiation (auto-accepted)
   */
  async createAcceptedNegotiation(proposal, publisherId, clientName, clientId, strategy, context, reason, partnerType, partnerName, useCase) {
    const negotiationId = uuidv4();
    
    await db.query(
      `INSERT INTO negotiations (
        id, publisher_id, client_id, client_name, strategy_id,
        status, current_round, initial_proposal, final_terms, context, completed_at,
        partner_type, partner_name, use_case
      ) VALUES ($1, $2, $3, $4, $5, 'accepted', 0, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, $11)`,
      [negotiationId, publisherId, clientId, clientName, strategy.id, JSON.stringify(proposal), JSON.stringify(proposal), JSON.stringify(context), partnerType, partnerName, useCase]
    );

    await this.logRound(negotiationId, 0, 'publisher', 'accept', proposal, reason);

    // Create notification
    await notifyNegotiationAccepted({
      publisherId,
      negotiationId,
      clientName,
      finalPrice: proposal.price || proposal.price_per_fetch_micro || proposal.preferred_price
    }).catch(err => logger.error('Failed to create notification', err));

    return {
      negotiationId,
      status: 'accepted',
      terms: proposal,
      message: reason
    };
  }

  /**
   * Get negotiation status
   */
  async getNegotiationStatus(negotiationId) {
    const result = await db.query(
      `SELECT n.*,
              s.negotiation_style,
              s.min_price,
              s.max_price,
              s.preferred_price,
              s.pricing_model
       FROM negotiations n
       LEFT JOIN partner_negotiation_strategies s ON n.strategy_id = s.id
       WHERE n.id = $1`,
      [negotiationId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Negotiation ${negotiationId} not found`);
    }

    const negotiation = result.rows[0];

    // Get rounds
    const roundsResult = await db.query(
      `SELECT * FROM negotiation_rounds 
       WHERE negotiation_id = $1 
       ORDER BY round_number ASC`,
      [negotiationId]
    );

    return {
      ...negotiation,
      rounds: roundsResult.rows
    };
  }
}

export default NegotiationEngine;
