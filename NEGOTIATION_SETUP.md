# AI-to-AI Negotiation Agent - Setup & Quick Start

## What We Built

An **autonomous AI-powered negotiation system** that enables AI companies to programmatically negotiate content licensing terms with publishers. The system uses LLMs (GPT-4, Claude) to conduct multi-round negotiations on behalf of publishers, automatically reaching agreements and generating licenses.

---

## 🏗️ Architecture Overview

```
AI Company (via MCP)
    ↓
MCP Server (propose_terms, counter_offer, accept_terms)
    ↓
Negotiation Engine (LLM-powered)
    ↓
Database (negotiations, rounds, strategies)
    ↓
License Generator → Policy Created
```

**Key Components:**
- **negotiation-agent/** - New service with MCP server & negotiation engine
- **Database migration** - `009_negotiation_system.sql`
- **Docker Compose** - Service integrated and ready to run
- **Test script** - `test-negotiation.ps1` for end-to-end testing

---

## 📦 What's Included

### New Service: `negotiation-agent/`

```
negotiation-agent/
├── src/
│   ├── server.js              # Main Express + REST API
│   ├── mcp-server.js          # MCP protocol server
│   ├── negotiation-engine.js  # Core LLM negotiation logic
│   ├── license-generator.js   # Convert terms → policies
│   ├── llm-provider.js        # OpenAI/Anthropic abstraction
│   ├── db.js                  # PostgreSQL client
│   ├── redis.js               # Redis client
│   └── logger.js              # Winston logging
├── Dockerfile
├── package.json
└── README.md
```

### Database Tables

1. **`negotiation_strategies`** - Publisher negotiation preferences
2. **`negotiations`** - Active/completed negotiation sessions
3. **`negotiation_rounds`** - Full audit trail of each round
4. **`negotiation_messages`** - Optional conversational logs

---

## 🚀 Quick Start

### Step 1: Run Database Migration

```powershell
# Make sure services are up
docker-compose up -d postgres

# Run the migration
docker-compose exec postgres psql -U tollbit -d tollbit -f /docker-entrypoint-initdb.d/migrations/009_negotiation_system.sql
```

**Or manually:**

```powershell
Get-Content .\database\migrations\009_negotiation_system.sql | docker exec -i tollbit-postgres psql -U tollbit -d tollbit
```

### Step 2: Set API Keys

You need an OpenAI or Anthropic API key for the LLM negotiation engine:

```powershell
# Windows PowerShell
$env:OPENAI_API_KEY="sk-..."
$env:ANTHROPIC_API_KEY="sk-ant-..."

# Or add to docker-compose.yml environment section
```

### Step 3: Build & Start Service

```powershell
# Build and start
docker-compose up -d --build negotiation-agent

# Check logs
docker-compose logs -f negotiation-agent

# Verify it's running
curl.exe http://localhost:3003/health
```

### Step 4: Run Test Script

```powershell
.\test-negotiation.ps1
```

This will:
1. ✅ List available publishers
2. ✅ Get publisher negotiation strategy
3. ✅ Propose initial terms (as AI company)
4. ✅ Receive counter-offer from publisher's AI agent
5. ✅ Submit counter-proposal
6. ✅ Accept terms (or continue negotiating)
7. ✅ Generate license from agreement
8. ✅ View analytics

---

## 🎯 How It Works

### 1. **Publisher Sets Strategy**

```sql
-- Already seeded in migration
SELECT * FROM negotiation_strategies WHERE publisher_id = 1;
```

Defines:
- Price boundaries ($0.001 - $0.005)
- Negotiation style (aggressive, balanced, flexible, cooperative)
- Auto-accept threshold (e.g., 90% of preferred terms)
- Deal breakers (auto-reject conditions)
- LLM configuration (GPT-4, Claude, etc.)

### 2. **AI Company Proposes Terms** (via MCP)

```javascript
// AI company calls MCP tool
await mcp.callTool('propose_license_terms', {
  publisher_hostname: 'site-a.local',
  client_name: 'OpenAI',
  proposed_terms: {
    price_per_fetch_micro: 1500,  // $0.0015
    token_ttl_seconds: 600,
    burst_rps: 10,
    purposes: ['inference']
  }
});
```

### 3. **Publisher's AI Agent Evaluates** (Automatic)

The negotiation engine:
1. **Loads strategy** for the publisher
2. **Checks deal breakers** → Auto-reject if violated
3. **Scores proposal** against preferred terms (0.0 - 1.0)
4. **Auto-accept** if score ≥ threshold (e.g., 90%)
5. **Generates counter-offer** using LLM if not accepted

**LLM Prompt Example:**

```
You are negotiating on behalf of Publisher A.

Current Proposal:
- Price: $0.0015 per fetch
- TTL: 600 seconds
- RPS: 10
- Purpose: inference

Your Strategy:
- Min Price: $0.001
- Preferred Price: $0.002
- Style: balanced

Generate a counter-offer that moves toward your preferred terms.
Consider: this is round 1 of max 10 rounds.
```

**LLM Response:**

```json
{
  "price_per_fetch_micro": 1900,
  "token_ttl_seconds": 600,
  "burst_rps": 10,
  "purposes": ["inference"],
  "reasoning": "Your proposal is close to our preferred terms. We're willing to accept the TTL and RPS, but need a slightly higher price to cover our content costs. This is a fair middle ground.",
  "tone": "friendly"
}
```

### 4. **Multi-Round Negotiation**

Continues until:
- ✅ **Accepted** - Terms meet threshold or AI company accepts
- ❌ **Rejected** - Deal breaker violated
- ⏱️ **Timeout** - Max rounds exceeded or time limit reached

### 5. **License Generation**

```javascript
// After acceptance
POST /api/negotiations/{id}/generate-license

// Returns generated policy
{
  "policy_id": 123,
  "policy_json": {
    "rules": [{
      "agent": "OpenAI",
      "allow": true,
      "price_per_fetch": 0.0018,
      "purpose": ["inference"],
      ...
    }]
  }
}
```

---

## 🧪 Testing

### Manual Test (REST API)

```powershell
# 1. List publishers
curl.exe http://localhost:3003/api/publishers

# 2. Propose terms
curl.exe -X POST http://localhost:3003/api/negotiations/initiate `
  -H "Content-Type: application/json" `
  -d '{
    "publisher_hostname": "site-a.local",
    "client_name": "TestAI",
    "proposed_terms": {
      "price_per_fetch_micro": 1500,
      "purposes": ["inference"]
    }
  }'

# 3. Get status
curl.exe http://localhost:3003/api/negotiations/{id}

# 4. Counter-offer
curl.exe -X POST http://localhost:3003/api/negotiations/counter `
  -H "Content-Type: application/json" `
  -d '{
    "negotiation_id": "{id}",
    "counter_terms": {
      "price_per_fetch_micro": 1800,
      "purposes": ["inference"]
    }
  }'

# 5. Generate license
curl.exe -X POST http://localhost:3003/api/negotiations/{id}/generate-license
```

### Automated Test

```powershell
.\test-negotiation.ps1
```

---

## 📊 Database Queries

### View Active Negotiations

```sql
SELECT 
  n.id,
  p.name as publisher,
  n.client_name,
  n.status,
  n.current_round,
  s.negotiation_style,
  n.initiated_at
FROM negotiations n
JOIN publishers p ON n.publisher_id = p.id
JOIN negotiation_strategies s ON n.strategy_id = s.id
WHERE n.status = 'negotiating'
ORDER BY n.initiated_at DESC;
```

### View Negotiation History

```sql
SELECT 
  nr.round_number,
  nr.actor,
  nr.action,
  nr.proposed_terms,
  nr.reasoning,
  nr.created_at
FROM negotiation_rounds nr
WHERE nr.negotiation_id = 'uuid-here'
ORDER BY nr.round_number;
```

### Analytics

```sql
SELECT 
  status,
  COUNT(*) as count,
  AVG(current_round) as avg_rounds,
  AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))) as avg_duration_sec
FROM negotiations
WHERE initiated_at >= NOW() - INTERVAL '30 days'
GROUP BY status;
```

---

## 🔧 Configuration

### Negotiation Strategy Settings

```sql
UPDATE negotiation_strategies
SET 
  negotiation_style = 'flexible',  -- aggressive, balanced, flexible, cooperative
  min_price_per_fetch_micro = 800,
  preferred_price_per_fetch_micro = 1500,
  auto_accept_threshold = 0.85,
  max_rounds = 15
WHERE publisher_id = 1;
```

### LLM Settings

```sql
UPDATE negotiation_strategies
SET 
  llm_provider = 'anthropic',  -- openai, anthropic
  llm_model = 'claude-3-5-sonnet-20241022',
  llm_temperature = 0.8
WHERE publisher_id = 1;
```

---

## 🎨 Next Steps (UI Integration)

To complete the system, add UI pages to `publisher-dashboard/`:

### 1. **Negotiation Strategy Manager**
   - Edit price boundaries
   - Set negotiation style
   - Configure deal breakers
   - Test strategy with mock proposals

### 2. **Active Negotiations Dashboard**
   - Real-time list of ongoing negotiations
   - View round-by-round history
   - Manual intervention option
   - Accept/reject controls

### 3. **Negotiation Analytics**
   - Success rate by client
   - Average rounds to agreement
   - Price trends over time
   - LLM performance metrics

### 4. **License Library**
   - View all negotiated licenses
   - Export license terms
   - Revoke/modify licenses

---

## 🛠️ Troubleshooting

### Service won't start

```powershell
# Check logs
docker-compose logs negotiation-agent

# Common issues:
# - Missing API keys → Set OPENAI_API_KEY or ANTHROPIC_API_KEY
# - Database not ready → Wait for postgres to fully start
# - Port conflict → Change PORT in docker-compose.yml
```

### LLM not responding

```powershell
# Test API key
curl https://api.openai.com/v1/models -H "Authorization: Bearer $env:OPENAI_API_KEY"

# Check logs for errors
docker-compose logs -f negotiation-agent | Select-String "LLM"
```

### Migration issues

```powershell
# Check if migration ran
docker-compose exec postgres psql -U tollbit -d tollbit -c "\dt negotiation*"

# Re-run migration
docker-compose exec postgres psql -U tollbit -d tollbit -f /path/to/009_negotiation_system.sql
```

---

## 📚 API Reference

### MCP Tools (For AI Companies)

| Tool | Description |
|------|-------------|
| `propose_license_terms` | Start negotiation with initial proposal |
| `counter_offer` | Submit counter-proposal |
| `accept_terms` | Accept publisher's offer |
| `get_negotiation_status` | View negotiation details |
| `list_publishers` | Get available publishers |
| `get_publisher_strategy` | View publisher's general approach |

### REST Endpoints (For Publishers)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/negotiations/publisher/:id` | GET | List negotiations |
| `/api/negotiations/:id` | GET | Get details |
| `/api/negotiations/:id/generate-license` | POST | Create license |
| `/api/strategies/publisher/:id` | GET | List strategies |
| `/api/strategies` | POST | Create strategy |
| `/api/strategies/:id` | PATCH | Update strategy |
| `/api/analytics/negotiations` | GET | Statistics |

---

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Service starts without errors
2. ✅ Test script completes full negotiation flow
3. ✅ Database has negotiation records
4. ✅ License is auto-generated from accepted terms
5. ✅ LLM reasoning appears in negotiation rounds

---

## 🚀 Production Considerations

Before deploying to production:

- [ ] Add authentication/authorization
- [ ] Implement rate limiting
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Add webhook notifications
- [ ] Implement human approval workflow
- [ ] Load test negotiation concurrency
- [ ] Set up LLM fallback providers
- [ ] Add audit log retention policy
- [ ] Configure SSL/TLS for MCP connections
- [ ] Implement negotiation replay for debugging

---

## 📖 Learn More

- **Full Documentation**: `negotiation-agent/README.md`
- **Database Schema**: `database/migrations/009_negotiation_system.sql`
- **MCP Protocol**: https://modelcontextprotocol.io/
- **Test Script**: `test-negotiation.ps1`

---

**Built with ❤️ for autonomous AI-to-AI content licensing**
