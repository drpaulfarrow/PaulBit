# AI-to-AI Negotiation Agent - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Company Side                          │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  AI Company  │  "We want to license your content"          │
│  │   Agent      │                                              │
│  └──────┬───────┘                                              │
│         │                                                       │
└─────────┼───────────────────────────────────────────────────────┘
          │
          │ MCP Protocol (propose_terms, counter_offer, accept)
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                   Tollbit Platform                              │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │           Negotiation Agent (Port 3003)                │   │
│  │                                                        │   │
│  │  ┌──────────────┐         ┌────────────────────┐     │   │
│  │  │  MCP Server  │────────▶│ Negotiation Engine │     │   │
│  │  │              │         │   (LLM-Powered)    │     │   │
│  │  └──────────────┘         └─────────┬──────────┘     │   │
│  │                                      │                │   │
│  │                                      │                │   │
│  │  ┌──────────────┐         ┌─────────▼──────────┐     │   │
│  │  │  REST API    │────────▶│ License Generator  │     │   │
│  │  │  (Management)│         │                    │     │   │
│  │  └──────────────┘         └────────────────────┘     │   │
│  └────────────────────┬───────────────┬──────────────────┘   │
│                       │               │                      │
│  ┌────────────────────▼───────────────▼──────────────────┐   │
│  │            PostgreSQL Database                        │   │
│  │  ┌──────────────────┐  ┌────────────────────────┐    │   │
│  │  │   negotiations   │  │ negotiation_strategies │    │   │
│  │  │ negotiation_rounds│  │      policies          │    │   │
│  │  └──────────────────┘  └────────────────────────┘    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │              LLM Providers                             │   │
│  │  ┌────────────┐  ┌────────────┐  ┌──────────────┐    │   │
│  │  │  OpenAI    │  │ Anthropic  │  │ Azure OpenAI │    │   │
│  │  │  (GPT-4)   │  │  (Claude)  │  │              │    │   │
│  │  └────────────┘  └────────────┘  └──────────────┘    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
          │
          │ Generated License/Policy
          │
┌─────────▼───────────────────────────────────────────────────────┐
│                    Publisher Side                               │
│                                                                 │
│  ┌──────────────────────────────────────────────────────┐     │
│  │          Licensing API (Port 3000)                   │     │
│  │  - Enforces generated policies                       │     │
│  │  - Issues access tokens                              │     │
│  │  - Tracks usage                                      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Negotiation Flow Sequence

```
AI Company                Negotiation Agent           LLM              Database
    │                            │                    │                   │
    │ 1. propose_terms()         │                    │                   │
    ├───────────────────────────▶│                    │                   │
    │                            │                    │                   │
    │                            │ 2. Load Strategy   │                   │
    │                            ├────────────────────┼──────────────────▶│
    │                            │◀───────────────────┼───────────────────┤
    │                            │                    │                   │
    │                            │ 3. Check Deal      │                   │
    │                            │    Breakers        │                   │
    │                            │                    │                   │
    │                            │ 4. Score Proposal  │                   │
    │                            │    (0.0 - 1.0)     │                   │
    │                            │                    │                   │
    │                            │ 5. Generate Counter│                   │
    │                            ├───────────────────▶│                   │
    │                            │                    │                   │
    │                            │   "Your proposal   │                   │
    │                            │    is $0.0015. We  │                   │
    │                            │    prefer $0.002.  │                   │
    │                            │    Counter: $0.0019│                   │
    │                            │    Reason: ..."    │                   │
    │                            │◀───────────────────┤                   │
    │                            │                    │                   │
    │                            │ 6. Log Round       │                   │
    │                            ├────────────────────┼──────────────────▶│
    │                            │                    │                   │
    │ Counter-Offer: $0.0019     │                    │                   │
    │◀───────────────────────────┤                    │                   │
    │                            │                    │                   │
    │ 7. counter_offer()         │                    │                   │
    │    $0.0018                 │                    │                   │
    ├───────────────────────────▶│                    │                   │
    │                            │                    │                   │
    │                            │ 8. Re-evaluate     │                   │
    │                            ├───────────────────▶│                   │
    │                            │◀───────────────────┤                   │
    │                            │                    │                   │
    │                            │ 9. Score: 0.92     │                   │
    │                            │    ≥ threshold     │                   │
    │                            │    → AUTO-ACCEPT!  │                   │
    │                            │                    │                   │
    │ Status: ACCEPTED ✓         │                    │                   │
    │◀───────────────────────────┤                    │                   │
    │                            │                    │                   │
    │ 10. generate_license()     │                    │                   │
    ├───────────────────────────▶│                    │                   │
    │                            │ 11. Create Policy  │                   │
    │                            ├────────────────────┼──────────────────▶│
    │                            │                    │                   │
    │ License: policy_id=123     │                    │                   │
    │◀───────────────────────────┤                    │                   │
    │                            │                    │                   │
```

---

## Data Flow

### 1. Negotiation Strategy (Publisher Configuration)

```json
{
  "publisher_id": 1,
  "negotiation_style": "balanced",
  "min_price_per_fetch_micro": 1000,      // $0.001
  "preferred_price_per_fetch_micro": 2000, // $0.002
  "max_price_per_fetch_micro": 5000,       // $0.005
  "auto_accept_threshold": 0.90,
  "deal_breakers": [
    {"field": "price_per_fetch_micro", "operator": "<", "value": 500}
  ],
  "llm_provider": "openai",
  "llm_model": "gpt-4"
}
```

### 2. Initial Proposal (AI Company → Agent)

```json
{
  "publisher_hostname": "site-a.local",
  "client_name": "OpenAI",
  "proposed_terms": {
    "price_per_fetch_micro": 1500,
    "token_ttl_seconds": 600,
    "burst_rps": 10,
    "purposes": ["inference"]
  }
}
```

### 3. LLM Evaluation

**System Prompt:**
```
You are negotiating on behalf of Publisher A.
Your goal: achieve fair compensation while building relationships.

Strategy:
- Min: $0.001, Preferred: $0.002, Max: $0.005
- Style: balanced
- Round 1 of 10

Current Proposal: $0.0015 per fetch, 600s TTL, 10 RPS, inference

Generate counter-offer as JSON with reasoning.
```

**LLM Response:**
```json
{
  "price_per_fetch_micro": 1900,
  "token_ttl_seconds": 600,
  "burst_rps": 10,
  "purposes": ["inference"],
  "reasoning": "Your proposal is reasonable but below our preferred rate. We're willing to match your TTL and RPS, but need $0.0019 to cover content costs.",
  "tone": "friendly"
}
```

### 4. Negotiation Record (Database)

```sql
negotiations:
  id: uuid
  publisher_id: 1
  client_name: "OpenAI"
  status: "negotiating"
  current_round: 1
  initial_proposal: {...}
  current_terms: {...}

negotiation_rounds:
  negotiation_id: uuid
  round_number: 1
  actor: "publisher"
  action: "counter"
  proposed_terms: {...}
  reasoning: "..."
  llm_model: "gpt-4"
  llm_tokens_used: 245
```

### 5. Generated License (Final Output)

```json
{
  "policy_id": 123,
  "policy_json": {
    "version": "1.0",
    "publisher": "site-a.local",
    "rules": [{
      "agent": "OpenAI",
      "allow": true,
      "price_per_fetch": 0.0018,
      "token_ttl_seconds": 600,
      "max_rps": 10,
      "purpose": ["inference"]
    }]
  }
}
```

---

## Component Responsibilities

### MCP Server (`mcp-server.js`)
- **Purpose**: Protocol interface for AI companies
- **Tools Exposed**:
  - `propose_license_terms` - Start negotiation
  - `counter_offer` - Submit counter-proposal
  - `accept_terms` - Accept current offer
  - `get_negotiation_status` - View details
  - `list_publishers` - Browse available publishers
  - `get_publisher_strategy` - Understand approach
- **Communication**: Stdio or HTTP (MCP protocol)

### Negotiation Engine (`negotiation-engine.js`)
- **Purpose**: Core negotiation logic
- **Responsibilities**:
  - Evaluate proposals against strategy
  - Check deal breakers
  - Score proposals (0.0 - 1.0)
  - Invoke LLM for counter-offers
  - Manage multi-round flow
  - Auto-accept/reject decisions
  - Log all rounds with audit trail
- **State Machine**:
  ```
  initiated → negotiating → [accepted|rejected|timeout]
  ```

### LLM Provider (`llm-provider.js`)
- **Purpose**: Abstract LLM interactions
- **Supports**:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Azure OpenAI
- **Functions**:
  - `complete()` - Text completion
  - `completeJSON()` - Structured output
  - Error handling & retries
  - Token tracking

### License Generator (`license-generator.js`)
- **Purpose**: Convert negotiated terms → policy
- **Process**:
  1. Validate negotiation status = 'accepted'
  2. Extract final terms
  3. Build policy JSON (Tollbit format)
  4. Insert into `policies` table
  5. Link negotiation → policy
- **Output**: Ready-to-use license policy

### REST API (`server.js`)
- **Purpose**: Management & monitoring for publishers
- **Endpoints**:
  - `GET /api/negotiations/publisher/:id` - List
  - `GET /api/negotiations/:id` - Details
  - `POST /api/strategies` - Create strategy
  - `PATCH /api/strategies/:id` - Update
  - `GET /api/analytics/negotiations` - Stats
  - `POST /api/negotiations/:id/generate-license`

---

## Negotiation Scoring Algorithm

```javascript
function scoreProposal(proposal, strategy) {
  let score = 0;
  
  // Price (40% weight)
  const priceRatio = proposal.price / strategy.preferred_price;
  score += Math.min(priceRatio, 2.0) / 2.0 * 0.4;
  
  // TTL (20% weight)
  const ttlDiff = Math.abs(proposal.ttl - strategy.preferred_ttl);
  score += (1 - Math.min(ttlDiff / strategy.preferred_ttl, 1)) * 0.2;
  
  // RPS (20% weight)
  const rpsDiff = Math.abs(proposal.rps - strategy.preferred_rps);
  score += (1 - Math.min(rpsDiff / strategy.preferred_rps, 1)) * 0.2;
  
  // Purposes (20% weight)
  const matchingPurposes = proposal.purposes.filter(p => 
    strategy.preferred_purposes.includes(p)
  ).length;
  score += (matchingPurposes / strategy.preferred_purposes.length) * 0.2;
  
  return score; // 0.0 - 1.0
}

// Auto-accept if score ≥ threshold (e.g., 0.90)
```

---

## Database Schema

### `negotiation_strategies`
```sql
id, publisher_id, strategy_name, negotiation_style,
min_price_per_fetch_micro, preferred_price_per_fetch_micro, max_price_per_fetch_micro,
min_token_ttl_seconds, preferred_token_ttl_seconds, max_token_ttl_seconds,
min_burst_rps, preferred_burst_rps, max_burst_rps,
allowed_purposes[], preferred_purposes[], deal_breakers (jsonb),
max_rounds, auto_accept_threshold, timeout_seconds,
llm_provider, llm_model, llm_temperature, system_prompt,
is_active, created_at, updated_at
```

### `negotiations`
```sql
id (uuid), publisher_id, client_id, client_name,
strategy_id, status, current_round,
initial_proposal (jsonb), current_terms (jsonb), final_terms (jsonb),
generated_policy_id, initiated_by, initiated_at, completed_at,
last_activity_at, context (jsonb), created_at, updated_at
```

### `negotiation_rounds`
```sql
id, negotiation_id, round_number, actor, action,
proposed_terms (jsonb), reasoning, llm_model,
llm_tokens_used, llm_response_time_ms,
analysis (jsonb), created_at
```

### `negotiation_messages` (optional)
```sql
id, negotiation_id, round_id, sender, message_type,
message, structured_data (jsonb), created_at
```

---

## Negotiation Styles

| Style | Description | Behavior |
|-------|-------------|----------|
| **Aggressive** | Hard bargaining | Minimal concessions, firm on price |
| **Balanced** | Moderate approach | Reasonable give-and-take |
| **Flexible** | Accommodating | Willing to compromise quickly |
| **Cooperative** | Partnership-focused | Seeks win-win outcomes |

Each style affects:
- Initial counter-offer distance
- Concession size per round
- Tone of reasoning
- Willingness to accept

---

## Error Handling & Edge Cases

### Deal Breaker Violation
```javascript
if (proposal.price < strategy.min_price) {
  status = 'rejected';
  reason = 'Price below minimum threshold';
  // Auto-reject, no negotiation
}
```

### Timeout (Max Rounds)
```javascript
if (currentRound >= strategy.max_rounds) {
  status = 'timeout';
  reason = 'Maximum rounds reached without agreement';
}
```

### LLM Failure
```javascript
try {
  counterOffer = await llm.complete(prompt);
} catch (error) {
  // Fallback: Use rule-based counter-offer
  counterOffer = calculateFallbackOffer(proposal, strategy);
}
```

### Concurrent Negotiations
```javascript
// Redis lock per negotiation
const lock = await redis.set(`lock:negotiation:${id}`, '1', 'NX', 'EX', 60);
if (!lock) throw new Error('Negotiation in progress');
```

---

## Performance Considerations

### LLM Latency
- Average: 2-5 seconds per round
- Caching: Store common counter-offers
- Async: Don't block on LLM response

### Database Optimization
- Index on `negotiations.status`
- Index on `negotiations.last_activity_at`
- JSONB indexes for term queries

### Rate Limiting
- Max 10 negotiations per client per hour
- Max 3 concurrent negotiations per publisher
- Timeout inactive negotiations after 1 hour

---

## Security

### API Key Protection
- LLM keys in environment variables only
- Never log API keys or full prompts
- Rotate keys regularly

### Access Control
- MCP tools: Public (for AI companies)
- REST API: Require publisher authentication
- Strategy details: Never expose to clients

### Audit Trail
- Log every proposal, counter, decision
- Include LLM reasoning for transparency
- Immutable negotiation history

---

## Monitoring & Observability

### Key Metrics
```
- negotiations_started_total
- negotiations_accepted_total
- negotiations_rejected_total
- negotiations_timeout_total
- avg_rounds_to_agreement
- avg_negotiation_duration_seconds
- llm_requests_total
- llm_tokens_used_total
- llm_errors_total
```

### Dashboards
1. **Negotiation Overview**
   - Success rate by publisher
   - Average rounds
   - Time to agreement

2. **LLM Performance**
   - Response time
   - Token usage
   - Error rate

3. **Financial**
   - Average agreed price
   - Price trends over time
   - Revenue impact

---

## Future Enhancements

### Phase 2
- [ ] Human-in-the-loop approval workflow
- [ ] Multi-publisher bundle negotiations
- [ ] Volume-based pricing tiers
- [ ] Seasonal/temporal pricing

### Phase 3
- [ ] Reputation scoring for AI companies
- [ ] A/B testing negotiation strategies
- [ ] Multi-LLM ensemble (consensus)
- [ ] Real-time dashboard with WebSockets

### Phase 4
- [ ] Blockchain-based license registry
- [ ] Smart contracts for automatic payments
- [ ] Decentralized negotiation marketplace
- [ ] Cross-publisher licensing consortia

---

**Last Updated**: October 29, 2025
**Version**: 1.0.0
**Status**: Production Ready (MVP)
