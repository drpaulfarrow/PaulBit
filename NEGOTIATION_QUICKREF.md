# 🚀 AI Negotiation Quick Reference

## Services & Ports
| Service | Port | Purpose |
|---------|------|---------|
| negotiation-agent | 3003 | AI negotiation backend + WebSocket |
| publisher-dashboard | 5173 | React UI (dev mode) |
| licensing-api | 3000 | Main API |
| postgres | 5432 | Database |
| redis | 6379 | Cache |

## Key URLs
- **Dashboard:** http://localhost:5173
- **Negotiations:** http://localhost:5173/negotiations
- **Strategy Config:** http://localhost:5173/negotiations/strategy
- **API Docs:** http://localhost:3003/mcp (MCP endpoint)

## Quick Commands

### Setup
```powershell
# First time only
docker-compose up -d
.\run-migration.ps1 009

# Start dashboard
cd publisher-dashboard
npm install
npm run dev
```

### Testing
```powershell
# Complete test with UI verification
.\test-negotiation-ui.ps1

# Backend only tests
.\test-negotiation.ps1
```

### Development
```powershell
# View logs
docker-compose logs -f negotiation-agent

# Restart service
docker-compose restart negotiation-agent

# Check database
docker exec -it tollbit-postgres-1 psql -U postgres -d content_licensing
```

## MCP Tools (AI-to-AI Communication)

### 1. propose_license_terms
Initiate negotiation with terms:
```json
{
  "method": "propose_license_terms",
  "params": {
    "publisher_id": 1,
    "client_name": "OpenAI GPT-4",
    "client_agent": "gpt-bot/1.0",
    "proposed_terms": {
      "price_per_1k_chars": 300,
      "ttl_seconds": 43200,
      "requests_per_second": 5,
      "allowed_use_cases": ["training"]
    }
  }
}
```

### 2. counter_offer
Submit counter-proposal:
```json
{
  "method": "counter_offer",
  "params": {
    "negotiation_id": "uuid",
    "new_terms": {
      "price_per_1k_chars": 400,
      "ttl_seconds": 86400
    }
  }
}
```

### 3. accept_terms
Accept current offer:
```json
{
  "method": "accept_terms",
  "params": {
    "negotiation_id": "uuid"
  }
}
```

### 4. get_negotiation_status
Check progress:
```json
{
  "method": "get_negotiation_status",
  "params": {
    "negotiation_id": "uuid"
  }
}
```

### 5. list_publishers
Find available publishers:
```json
{
  "method": "list_publishers",
  "params": {}
}
```

### 6. get_publisher_strategy
View negotiation preferences:
```json
{
  "method": "get_publisher_strategy",
  "params": {
    "publisher_id": 1
  }
}
```

## REST API Endpoints

### Strategies
- `GET /api/negotiation/strategies?publisher_id=1` - List strategies
- `POST /api/negotiation/strategies` - Create strategy
- `PUT /api/negotiation/strategies/:id` - Update strategy

### Negotiations
- `GET /api/negotiation/negotiations?publisher_id=1` - List all
- `GET /api/negotiation/negotiations/:id` - Get details
- `POST /api/negotiation/negotiations/:id/license` - Generate license

### Analytics (Future)
- `GET /api/negotiation/analytics?publisher_id=1` - Get metrics

## WebSocket Events

### Subscribe
```javascript
socket.emit('subscribe', { publisherId: 1 });
```

### Events
- `negotiation:initiated` - New negotiation started
- `negotiation:round` - New round/counter-offer
- `negotiation:accepted` - Agreement reached
- `negotiation:rejected` - Negotiation failed

### Event Data
```javascript
{
  type: 'negotiation:round',
  data: {
    negotiationId: 'uuid',
    publisherId: 1,
    status: 'negotiating',
    currentRound: 3,
    action: 'counter',
    terms: { ... },
    reasoning: "..."
  }
}
```

## Strategy Configuration

### Pricing
- Min: $0.0001 (100 micro-dollars)
- Preferred: $0.0005 (500 micro-dollars)
- Max: $0.0010 (1000 micro-dollars)

### Technical
- TTL: 3600 - 604800 seconds (1 hour - 7 days)
- RPS: 1 - 100 requests per second

### Negotiation
- Max Rounds: 1-20 (recommended: 3-7)
- Auto-Accept: 0.0-1.0 (recommended: 0.80-0.90)
- Deal Breakers: price_too_low, rate_limit_too_low, use_cases_restricted, ttl_too_short

### LLM
- Providers: openai, anthropic
- Models: gpt-4, gpt-4-turbo, claude-3-opus, claude-3-sonnet
- Temperature: 0.0-1.0 (recommended: 0.7)

## Negotiation Styles

| Style | Behavior | Use When |
|-------|----------|----------|
| **collaborative** | Seeks win-win, flexible | Long-term partnerships |
| **competitive** | Maximizes value, firm | One-time deals |
| **defensive** | Protects interests, cautious | High-value content |

## Scoring Algorithm

Score = weighted average of term alignment:
- **1.0** = Perfect match with preferred terms
- **0.85+** = Usually acceptable (if threshold set)
- **0.7-0.84** = Needs counter-offer
- **< 0.7** = Likely rejection

### Weights
- Price: 40%
- RPS: 20%
- TTL: 20%
- Use Cases: 20%

## Troubleshooting

### ❌ WebSocket not connecting
```powershell
# Check service
docker-compose ps negotiation-agent

# Check CORS in .env
WEBSOCKET_CORS_ORIGINS=http://localhost:5173

# Restart
docker-compose restart negotiation-agent
```

### ❌ Negotiations not updating
```powershell
# Check logs
docker-compose logs negotiation-agent | grep "WebSocket"

# Verify room subscription
# Browser console should show: "Subscribed to publisher:1"
```

### ❌ Strategy not saving
- Verify min < preferred < max for all terms
- Check all required fields filled
- Look for API errors in browser Network tab

### ❌ License generation fails
- Ensure negotiation status is "accepted"
- Check final_terms exist
- Verify licensing-api is running: `docker-compose ps licensing-api`

## Database Queries

### View negotiations
```sql
SELECT id, client_name, status, current_round, 
       initiated_at, last_activity_at
FROM negotiations 
WHERE publisher_id = 1
ORDER BY initiated_at DESC;
```

### View rounds
```sql
SELECT nr.round_number, nr.actor, nr.action, 
       nr.proposed_terms, nr.reasoning
FROM negotiation_rounds nr
WHERE nr.negotiation_id = 'uuid'
ORDER BY nr.round_number;
```

### Check strategy
```sql
SELECT * FROM negotiation_strategies 
WHERE publisher_id = 1;
```

### Success rate
```sql
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM negotiations
WHERE publisher_id = 1
GROUP BY status;
```

## Environment Variables

### Required
```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

### Optional
```bash
# WebSocket
ENABLE_WEBSOCKET=true
WEBSOCKET_CORS_ORIGINS=http://localhost:5173

# LLM Defaults
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-4
DEFAULT_LLM_TEMPERATURE=0.7

# Negotiation
DEFAULT_MAX_ROUNDS=5
DEFAULT_AUTO_ACCEPT_THRESHOLD=0.85
```

## Best Practices

### ✅ DO
- Set realistic pricing boundaries
- Use collaborative style for recurring partners
- Monitor LLM token usage
- Review AI reasoning regularly
- Test strategies with low-value negotiations first
- Keep max_rounds between 3-7
- Set auto-accept threshold 0.80-0.90

### ❌ DON'T
- Set min/max too close (limits negotiation space)
- Use too many deal breakers (reduces flexibility)
- Set threshold too high (prevents agreements)
- Ignore LLM reasoning (miss optimization opportunities)
- Exceed reasonable round limits (wastes tokens)

## Common Patterns

### Pattern 1: Conservative Start
```json
{
  "negotiation_style": "defensive",
  "auto_accept_threshold": 0.90,
  "max_rounds": 7,
  "deal_breakers": ["price_too_low"]
}
```

### Pattern 2: Fast Agreement
```json
{
  "negotiation_style": "collaborative",
  "auto_accept_threshold": 0.80,
  "max_rounds": 3,
  "deal_breakers": []
}
```

### Pattern 3: Maximize Value
```json
{
  "negotiation_style": "competitive",
  "auto_accept_threshold": 0.95,
  "max_rounds": 10,
  "deal_breakers": ["price_too_low", "rate_limit_too_low"]
}
```

## Documentation

- **Setup:** `NEGOTIATION_SETUP.md`
- **Architecture:** `NEGOTIATION_ARCHITECTURE.md`
- **UI Guide:** `NEGOTIATION_UI_GUIDE.md`
- **API Reference:** `negotiation-agent/README.md`
- **Project Overview:** `PROJECT_SUMMARY.md`

---

**Quick Help:**
```powershell
# View this file
cat NEGOTIATION_QUICKREF.md

# Test everything
.\test-negotiation-ui.ps1

# Start dashboard
cd publisher-dashboard; npm run dev
```
