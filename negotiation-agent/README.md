# Tollbit Negotiation Agent

AI-to-AI autonomous license negotiation system for Tollbit.

## Overview

The Negotiation Agent enables AI companies to programmatically negotiate content licensing terms with publishers. Using LLM-powered agents, both parties can engage in multi-round negotiations to reach mutually acceptable agreements that are automatically converted into licenses.

## Architecture

### Components

1. **MCP Server** - Model Context Protocol server exposing negotiation tools
2. **Negotiation Engine** - LLM-powered negotiation logic
3. **License Generator** - Converts agreed terms into policies
4. **REST API** - Management endpoints for publishers
5. **Database** - Stores negotiations, strategies, and audit trail

### Key Features

- **Autonomous Negotiation**: LLM agents negotiate on behalf of publishers
- **Strategy-Based**: Publishers define negotiation preferences and constraints
- **Multi-Round**: Supports back-and-forth bargaining until agreement
- **Auto-Accept**: Automatically accepts proposals meeting threshold
- **Deal Breakers**: Auto-rejects proposals violating constraints
- **Full Audit Trail**: Logs every round with reasoning
- **License Generation**: Converts final terms into enforceable policies

## Database Schema

### `negotiation_strategies`
Defines how each publisher wants to negotiate:
- Price boundaries (min, preferred, max)
- Token TTL and RPS preferences
- Allowed/preferred purposes
- Negotiation style (aggressive, balanced, flexible, cooperative)
- Deal breakers (auto-reject conditions)
- LLM configuration

### `negotiations`
Tracks each negotiation session:
- Parties (publisher, client)
- Current status and round
- Initial proposal, current terms, final terms
- Generated policy reference

### `negotiation_rounds`
Full audit trail of each negotiation round:
- Actor (publisher/client)
- Action (propose, counter, accept, reject)
- Proposed terms
- LLM reasoning and metadata

## MCP Tools

### For AI Companies

#### `propose_license_terms`
Initiate a negotiation with a publisher.

```json
{
  "publisher_hostname": "site-a.local",
  "client_name": "OpenAI",
  "proposed_terms": {
    "price_per_fetch_micro": 2000,
    "token_ttl_seconds": 600,
    "burst_rps": 10,
    "purposes": ["inference"]
  }
}
```

#### `counter_offer`
Submit a counter-proposal in an ongoing negotiation.

```json
{
  "negotiation_id": "uuid",
  "counter_terms": {
    "price_per_fetch_micro": 1800,
    "token_ttl_seconds": 900,
    "burst_rps": 15,
    "purposes": ["inference"]
  }
}
```

#### `accept_terms`
Accept the publisher's current offer.

```json
{
  "negotiation_id": "uuid"
}
```

#### `get_negotiation_status`
Get current status and full history of a negotiation.

```json
{
  "negotiation_id": "uuid"
}
```

#### `list_publishers`
Get list of all publishers available for negotiation.

#### `get_publisher_strategy`
Get general information about a publisher's negotiation approach.

```json
{
  "publisher_hostname": "site-a.local"
}
```

## REST API (For Publishers)

### Negotiations

- `GET /api/negotiations/publisher/:publisherId` - List negotiations
- `GET /api/negotiations/:negotiationId` - Get negotiation details
- `POST /api/negotiations/:negotiationId/generate-license` - Generate license from accepted terms

### Strategies

- `GET /api/strategies/publisher/:publisherId` - List strategies
- `POST /api/strategies` - Create new strategy
- `PATCH /api/strategies/:strategyId` - Update strategy

### Analytics

- `GET /api/analytics/negotiations` - Negotiation statistics

## Configuration

### Environment Variables

```bash
# Database
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=tollbit
POSTGRES_USER=tollbit
POSTGRES_PASSWORD=tollbit123

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Server
PORT=3003
NODE_ENV=production
LOG_LEVEL=info
START_MCP=false  # Set to true to start MCP server on stdio
```

### Negotiation Strategy

Example strategy configuration:

```json
{
  "publisher_id": 1,
  "strategy_name": "Default Strategy",
  "negotiation_style": "balanced",
  "min_price_per_fetch_micro": 1000,
  "preferred_price_per_fetch_micro": 2000,
  "max_price_per_fetch_micro": 5000,
  "min_token_ttl_seconds": 300,
  "preferred_token_ttl_seconds": 600,
  "max_token_ttl_seconds": 1800,
  "min_burst_rps": 2,
  "preferred_burst_rps": 10,
  "max_burst_rps": 50,
  "allowed_purposes": ["inference", "training"],
  "preferred_purposes": ["inference"],
  "deal_breakers": [
    {"field": "price_per_fetch_micro", "operator": "<", "value": 500}
  ],
  "max_rounds": 10,
  "auto_accept_threshold": 0.90,
  "timeout_seconds": 3600,
  "llm_provider": "openai",
  "llm_model": "gpt-4",
  "llm_temperature": 0.7
}
```

## Negotiation Styles

- **Aggressive**: Hard bargaining, minimal concessions
- **Balanced**: Moderate approach, reasonable concessions
- **Flexible**: Accommodating, willing to compromise
- **Cooperative**: Partnership-focused, seeks win-win

## Usage Example

### 1. AI Company Proposes Terms

```javascript
// Via MCP
const result = await mcp.callTool('propose_license_terms', {
  publisher_hostname: 'site-a.local',
  client_name: 'OpenAI',
  proposed_terms: {
    price_per_fetch_micro: 1500,
    token_ttl_seconds: 900,
    burst_rps: 15,
    purposes: ['inference']
  }
});
// Returns: { negotiationId, status: 'negotiating', counterOffer }
```

### 2. Publisher Agent Evaluates (Automatic)

The LLM agent:
1. Checks deal breakers → None violated
2. Scores proposal → 0.75 (below 0.90 threshold)
3. Generates counter-offer based on strategy
4. Returns counter-offer to AI company

### 3. AI Company Counter-Offers

```javascript
const result = await mcp.callTool('counter_offer', {
  negotiation_id: 'uuid',
  counter_terms: {
    price_per_fetch_micro: 1800,
    token_ttl_seconds: 750,
    burst_rps: 12,
    purposes: ['inference']
  }
});
// Returns: { status: 'negotiating', round: 2, counterOffer }
```

### 4. Negotiation Continues...

Multiple rounds until:
- AI company accepts → Status: 'accepted'
- Publisher auto-accepts (threshold met) → Status: 'accepted'
- Deal breaker violated → Status: 'rejected'
- Max rounds reached → Status: 'timeout'

### 5. License Generation

```bash
curl -X POST http://localhost:3003/api/negotiations/{id}/generate-license
```

Returns the generated policy that grants the AI company access under agreed terms.

## Running the Service

### With Docker Compose

```bash
# Set API keys
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

# Run migration
docker-compose exec postgres psql -U tollbit -d tollbit -f /docker-entrypoint-initdb.d/migrations/009_negotiation_system.sql

# Start service
docker-compose up -d negotiation-agent

# View logs
docker-compose logs -f negotiation-agent
```

### Standalone

```bash
cd negotiation-agent
npm install
npm start
```

### MCP Server Mode

```bash
# For AI-to-AI communication via MCP
START_MCP=true node src/mcp-server.js
```

## Testing

### Test Negotiation Flow

```bash
# 1. List publishers
curl http://localhost:3003/api/publishers

# 2. Initiate via REST (simulating MCP call)
curl -X POST http://localhost:3000/api/negotiations/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "publisher_id": 1,
    "client_name": "TestAI",
    "proposed_terms": {
      "price_per_fetch_micro": 1500,
      "purposes": ["inference"]
    }
  }'

# 3. Get status
curl http://localhost:3003/api/negotiations/{negotiation_id}

# 4. Generate license
curl -X POST http://localhost:3003/api/negotiations/{negotiation_id}/generate-license
```

## Monitoring

### Key Metrics

- Negotiation success rate (accepted / total)
- Average rounds to agreement
- Average negotiation duration
- Auto-accept vs manual accept rate
- Common rejection reasons

### Analytics Endpoint

```bash
curl "http://localhost:3003/api/analytics/negotiations?publisherId=1&days=30"
```

## Security

- API keys stored as environment variables
- All negotiations logged for audit
- Publisher strategies not exposed to clients
- Rate limiting on negotiation initiation (TODO)
- Authentication required for management endpoints (TODO)

## Future Enhancements

- [ ] Human-in-the-loop approval for sensitive negotiations
- [ ] Multi-publisher bundle negotiations
- [ ] Volume-based pricing negotiations
- [ ] Temporal license terms (seasonal pricing)
- [ ] Reputation system for AI companies
- [ ] A/B testing of negotiation strategies
- [ ] Real-time negotiation dashboard
- [ ] Webhook notifications for completed negotiations
- [ ] Multi-LLM ensemble for better negotiation outcomes

## License

MIT
