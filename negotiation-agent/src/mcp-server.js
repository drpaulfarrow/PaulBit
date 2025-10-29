import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { NegotiationEngine } from './negotiation-engine.js';
import logger from './logger.js';
import db from './db.js';

/**
 * MCP Server for AI-to-AI Negotiation
 * Exposes tools for AI companies to negotiate licenses
 */
export class NegotiationMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'monetizeplus-negotiation-agent',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.negotiationEngine = new NegotiationEngine();
    this.setupHandlers();
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'propose_license_terms',
          description: 'Propose initial licensing terms to a publisher. The publisher\'s AI agent will evaluate your proposal and either accept, reject, or counter-offer. Returns negotiation ID for tracking.',
          inputSchema: {
            type: 'object',
            properties: {
              publisher_hostname: {
                type: 'string',
                description: 'Publisher hostname (e.g., "site-a.local")'
              },
              client_name: {
                type: 'string',
                description: 'Your AI company name (e.g., "OpenAI", "Anthropic")'
              },
              proposed_terms: {
                type: 'object',
                description: 'Your proposed licensing terms',
                properties: {
                  price_per_fetch_micro: {
                    type: 'number',
                    description: 'Price per content fetch in micro-dollars (e.g., 2000 = $0.002)'
                  },
                  token_ttl_seconds: {
                    type: 'number',
                    description: 'Token validity period in seconds'
                  },
                  burst_rps: {
                    type: 'number',
                    description: 'Maximum requests per second'
                  },
                  purposes: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Intended purposes: "inference", "training", etc.'
                  }
                },
                required: ['price_per_fetch_micro', 'purposes']
              },
              url_patterns: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional URL patterns this license covers'
              },
              context: {
                type: 'object',
                description: 'Optional additional context or requirements'
              }
            },
            required: ['publisher_hostname', 'client_name', 'proposed_terms']
          }
        },
        {
          name: 'counter_offer',
          description: 'Submit a counter-offer in an ongoing negotiation. The publisher agent will evaluate and respond.',
          inputSchema: {
            type: 'object',
            properties: {
              negotiation_id: {
                type: 'string',
                description: 'UUID of the negotiation'
              },
              counter_terms: {
                type: 'object',
                description: 'Your counter-offer terms',
                properties: {
                  price_per_fetch_micro: { type: 'number' },
                  token_ttl_seconds: { type: 'number' },
                  burst_rps: { type: 'number' },
                  purposes: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['price_per_fetch_micro', 'purposes']
              }
            },
            required: ['negotiation_id', 'counter_terms']
          }
        },
        {
          name: 'accept_terms',
          description: 'Accept the current terms offered by the publisher. This finalizes the negotiation and creates a license.',
          inputSchema: {
            type: 'object',
            properties: {
              negotiation_id: {
                type: 'string',
                description: 'UUID of the negotiation'
              }
            },
            required: ['negotiation_id']
          }
        },
        {
          name: 'get_negotiation_status',
          description: 'Get the current status of a negotiation including all rounds, current terms, and history.',
          inputSchema: {
            type: 'object',
            properties: {
              negotiation_id: {
                type: 'string',
                description: 'UUID of the negotiation'
              }
            },
            required: ['negotiation_id']
          }
        },
        {
          name: 'list_publishers',
          description: 'List all publishers available for negotiation with their basic information.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'get_publisher_strategy',
          description: 'Get general information about a publisher\'s negotiation approach (without revealing exact thresholds). Useful for understanding what terms might be acceptable.',
          inputSchema: {
            type: 'object',
            properties: {
              publisher_hostname: {
                type: 'string',
                description: 'Publisher hostname'
              }
            },
            required: ['publisher_hostname']
          }
        }
      ]
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'propose_license_terms':
            return await this.handleProposeLicenseTerms(args);
          
          case 'counter_offer':
            return await this.handleCounterOffer(args);
          
          case 'accept_terms':
            return await this.handleAcceptTerms(args);
          
          case 'get_negotiation_status':
            return await this.handleGetNegotiationStatus(args);
          
          case 'list_publishers':
            return await this.handleListPublishers(args);
          
          case 'get_publisher_strategy':
            return await this.handleGetPublisherStrategy(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error('Tool execution error', { tool: name, error: error.message });
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async handleProposeLicenseTerms(args) {
    const { publisher_hostname, client_name, proposed_terms, url_patterns, context } = args;

    // Get publisher ID
    const publisherResult = await db.query(
      'SELECT id FROM publishers WHERE hostname = $1',
      [publisher_hostname]
    );

    if (publisherResult.rows.length === 0) {
      throw new Error(`Publisher not found: ${publisher_hostname}`);
    }

    const publisherId = publisherResult.rows[0].id;

    // Initiate negotiation
    const result = await this.negotiationEngine.initiateNegotiation(
      proposed_terms,
      publisherId,
      client_name,
      null,
      { url_patterns, ...context }
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleCounterOffer(args) {
    const { negotiation_id, counter_terms } = args;

    const result = await this.negotiationEngine.processCounterProposal(
      negotiation_id,
      counter_terms
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleAcceptTerms(args) {
    const { negotiation_id } = args;

    // Get current terms
    const negotiation = await this.negotiationEngine.getNegotiationStatus(negotiation_id);

    if (negotiation.status !== 'negotiating') {
      throw new Error(`Cannot accept: negotiation status is ${negotiation.status}`);
    }

    // Accept the current terms
    await this.negotiationEngine.acceptNegotiation(
      negotiation_id,
      negotiation.current_terms
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'accepted',
            message: 'Terms accepted successfully',
            negotiation_id,
            final_terms: negotiation.current_terms
          }, null, 2)
        }
      ]
    };
  }

  async handleGetNegotiationStatus(args) {
    const { negotiation_id } = args;

    const status = await this.negotiationEngine.getNegotiationStatus(negotiation_id);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(status, null, 2)
        }
      ]
    };
  }

  async handleListPublishers(args) {
    const result = await db.query(
      `SELECT p.id, p.name, p.hostname, 
              COUNT(DISTINCT ps.id) as policy_count
       FROM publishers p
       LEFT JOIN policies ps ON p.id = ps.publisher_id
       GROUP BY p.id, p.name, p.hostname
       ORDER BY p.name`
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result.rows, null, 2)
        }
      ]
    };
  }

  async handleGetPublisherStrategy(args) {
    const { publisher_hostname } = args;

    const result = await db.query(
      `SELECT p.name, p.hostname, 
              s.negotiation_style, s.allowed_purposes, s.max_rounds,
              s.min_price_per_fetch_micro, s.max_price_per_fetch_micro
       FROM publishers p
       JOIN negotiation_strategies s ON p.id = s.publisher_id
       WHERE p.hostname = $1 AND s.is_active = TRUE
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [publisher_hostname]
    );

    if (result.rows.length === 0) {
      throw new Error(`No active strategy found for ${publisher_hostname}`);
    }

    // Return general info without revealing exact thresholds
    const strategy = result.rows[0];
    const info = {
      publisher: strategy.name,
      hostname: strategy.hostname,
      negotiation_style: strategy.negotiation_style,
      allowed_purposes: strategy.allowed_purposes,
      max_negotiation_rounds: strategy.max_rounds,
      price_range: {
        minimum: `$${strategy.min_price_per_fetch_micro / 1000000}`,
        maximum: strategy.max_price_per_fetch_micro 
          ? `$${strategy.max_price_per_fetch_micro / 1000000}`
          : 'negotiable'
      },
      note: 'These are general guidelines. Specific terms are negotiated case-by-case.'
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(info, null, 2)
        }
      ]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('MCP Negotiation Server started on stdio');
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mcpServer = new NegotiationMCPServer();
  mcpServer.start().catch((error) => {
    logger.error('Failed to start MCP server', { error: error.message });
    process.exit(1);
  });
}

export default NegotiationMCPServer;
