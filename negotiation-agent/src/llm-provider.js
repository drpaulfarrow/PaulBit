import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import logger from './logger.js';

/**
 * Unified LLM provider interface
 * Supports OpenAI, Anthropic, and potentially other providers
 */
export class LLMProvider {
  constructor(config = {}) {
    this.provider = config.provider || 'openai';
    this.model = config.model || 'gpt-4';
    this.temperature = config.temperature || 0.7;
    
    // Initialize clients
    if (this.provider === 'openai') {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else if (this.provider === 'anthropic') {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      });
    }
  }

  /**
   * Generate a completion from the LLM
   * @param {string} systemPrompt - System instructions
   * @param {string} userPrompt - User message
   * @param {object} options - Additional options
   * @returns {Promise<{content: string, tokensUsed: number, responseTime: number}>}
   */
  async complete(systemPrompt, userPrompt, options = {}) {
    const startTime = Date.now();
    
    try {
      if (this.provider === 'openai') {
        return await this._completeOpenAI(systemPrompt, userPrompt, options);
      } else if (this.provider === 'anthropic') {
        return await this._completeAnthropic(systemPrompt, userPrompt, options);
      } else {
        throw new Error(`Unsupported LLM provider: ${this.provider}`);
      }
    } catch (error) {
      logger.error('LLM completion error', { error: error.message, provider: this.provider });
      throw error;
    } finally {
      const responseTime = Date.now() - startTime;
      logger.info('LLM completion', { 
        provider: this.provider, 
        model: this.model, 
        responseTime 
      });
    }
  }

  async _completeOpenAI(systemPrompt, userPrompt, options) {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      temperature: this.temperature,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      ...options
    });

    return {
      content: response.choices[0].message.content,
      tokensUsed: response.usage?.total_tokens || 0,
      responseTime: Date.now(),
      model: this.model
    };
  }

  async _completeAnthropic(systemPrompt, userPrompt, options) {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: options.max_tokens || 4096,
      temperature: this.temperature,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    });

    return {
      content: response.content[0].text,
      tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0,
      responseTime: Date.now(),
      model: this.model
    };
  }

  /**
   * Generate structured JSON output from LLM
   * @param {string} systemPrompt - System instructions
   * @param {string} userPrompt - User message
   * @param {object} schema - Expected JSON schema (for validation)
   * @returns {Promise<object>}
   */
  async completeJSON(systemPrompt, userPrompt, schema = null) {
    const options = this.provider === 'openai' 
      ? { response_format: { type: 'json_object' } }
      : {};

    const result = await this.complete(
      systemPrompt + '\n\nYou MUST respond with valid JSON only.',
      userPrompt,
      options
    );

    try {
      const parsed = JSON.parse(result.content);
      return { ...result, parsed };
    } catch (error) {
      logger.error('Failed to parse LLM JSON response', { error: error.message });
      throw new Error('LLM did not return valid JSON');
    }
  }
}

export default LLMProvider;
