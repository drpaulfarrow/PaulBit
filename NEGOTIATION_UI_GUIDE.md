# AI-to-AI Negotiation UI Guide

Complete guide for using the Publisher Dashboard's AI negotiation features.

## 🎯 Quick Start

### 1. Launch the System

```powershell
# Start all services
docker-compose up -d

# Run database migrations
.\run-migration.ps1 009

# Start the dashboard (in separate terminal)
cd publisher-dashboard
npm install
npm run dev
```

Dashboard available at: http://localhost:5173

### 2. First-Time Setup

1. **Login** as Publisher #1 (or your publisher ID)
2. **Configure Strategy** (Menu: AI Negotiation → Strategy Config)
   - Set pricing boundaries (min/preferred/max)
   - Define technical limits (TTL, RPS)
   - Choose negotiation style (collaborative/competitive/defensive)
   - Configure LLM settings (provider, model, temperature)

## 📋 Features Overview

### Active Negotiations Dashboard

**Path:** `/negotiations`

**Features:**
- **Real-time updates** - Live indicator shows WebSocket connection status
- **Filter tabs** - All / Negotiating / Accepted / Rejected
- **Negotiation cards** showing:
  - Client name and agent
  - Current status with color-coding
  - Round progress (e.g., "Round 3 of 5")
  - Last activity timestamp
  - Pricing summary

**Real-time Events:**
- 🆕 `negotiation:initiated` - New negotiation started
- 🔄 `negotiation:round` - Counter-offer or new round
- ✅ `negotiation:accepted` - Agreement reached
- ❌ `negotiation:rejected` - Negotiation failed

**Auto-refresh:** Polls every 10 seconds as fallback

### Negotiation Detail Viewer

**Path:** `/negotiations/:id`

**Features:**
- **Live updates** - Real-time round additions
- **Complete history** - All rounds with full audit trail
- **LLM reasoning** - See why your AI made each decision
- **Term comparisons** - Track changes across rounds
- **Performance metrics** - Token usage, response times
- **License generation** - Convert accepted terms to policy

**Round Information:**
- Actor (Publisher AI vs AI Company)
- Action (propose/counter/accept/reject)
- Proposed terms with formatted values
- AI reasoning text
- LLM model and performance stats

**Actions:**
- "Generate License" - Creates policy from accepted terms
- "View License" - Opens generated policy in editor

### Strategy Configuration

**Path:** `/negotiations/strategy`

**Sections:**

#### 1. Pricing Terms
- **Min Price** - Absolute minimum (e.g., $0.0001 = 100 micro-dollars)
- **Preferred Price** - Target price
- **Max Price** - Maximum acceptable
- Auto-converts between dollars and micro-dollars

#### 2. Technical Terms
- **TTL** (Time To Live) - How long licenses remain valid
  - Min: 1 hour, Preferred: 24 hours, Max: 7 days
- **RPS** (Requests Per Second) - Rate limiting
  - Min: 1, Preferred: 10, Max: 100

#### 3. Negotiation Rules
- **Max Rounds** - Maximum negotiation attempts (1-20)
- **Auto-Accept Threshold** - Score to auto-accept (0.0-1.0)
  - Higher = stricter requirements
  - 0.85 = accept if 85% of preferred terms met
- **Deal Breakers** - Conditions that force rejection
  - Options: low price, low rate limit, restricted use cases, short TTL

#### 4. LLM Configuration
- **Provider** - OpenAI or Anthropic
- **Model** - gpt-4, gpt-4-turbo, claude-3-opus, claude-3-sonnet
- **Temperature** - Creativity level (0.0-1.0)
  - Lower = more conservative/predictable
  - Higher = more creative/variable

## 🔄 Typical Workflow

### Scenario: AI Company Initiates Negotiation

1. **AI Company** sends MCP request with initial terms:
   ```json
   {
     "price_per_1k_chars": 300,
     "ttl_seconds": 43200,
     "requests_per_second": 5,
     "allowed_use_cases": ["training"]
   }
   ```

2. **Your Dashboard** shows:
   - 🔔 New negotiation appears in Active Negotiations
   - Green "Live" indicator confirms WebSocket connected
   - Card shows "Negotiating - Round 1"

3. **Your AI Agent** (automatically):
   - Evaluates against your strategy
   - Calculates score (0.0-1.0)
   - Generates counter-offer OR accepts/rejects
   - Logs reasoning for transparency

4. **You See**:
   - Real-time update in Active Negotiations
   - Click negotiation to view details
   - Read AI's reasoning: "Price too low, counter with $0.0004..."

5. **AI Company** responds with better offer:
   ```json
   {
     "price_per_1k_chars": 400,
     "ttl_seconds": 86400,
     "requests_per_second": 8,
     "allowed_use_cases": ["training", "inference"]
   }
   ```

6. **Your AI Agent** re-evaluates:
   - Score improves (e.g., 0.78 → 0.89)
   - Exceeds auto-accept threshold (0.85)
   - **Automatically accepts!**

7. **Final Steps**:
   - Status updates to "Accepted" (green)
   - Click "Generate License" button
   - Policy automatically created in licensing-api
   - AI company can now access content under agreed terms

## 🔌 WebSocket Integration

### Connection Details
- **Endpoint:** `ws://localhost:3003`
- **Room-based:** Subscribes to `publisher:{id}`
- **Auto-reconnect:** Handles disconnections gracefully

### Event Format
```javascript
{
  type: 'negotiation:round',
  data: {
    negotiationId: '123e4567-...',
    publisherId: 1,
    status: 'negotiating',
    currentRound: 3,
    action: 'counter',
    terms: { ... },
    reasoning: "..."
  }
}
```

### Browser Console Testing
```javascript
// Open dashboard and check console
// Should see: "WebSocket connected to negotiation-agent"

// Trigger negotiation via test script
// Watch console for real-time events
```

## 🧪 Testing

### Run Complete Test Suite

```powershell
# Test backend + trigger events for UI
.\test-negotiation-ui.ps1
```

This script will:
1. Create strategy
2. Initiate negotiation
3. Submit counter-offers
4. Show negotiation list

### Manual UI Testing

1. **Open dashboard**: http://localhost:5173
2. **Check Active Negotiations** - should show test negotiation
3. **Verify live indicator** - green dot = connected
4. **Click negotiation** - view full history
5. **Edit strategy** - modify preferences
6. **Watch real-time updates** - run test script again

### Test Real-time Updates

**Terminal 1:**
```powershell
cd publisher-dashboard
npm run dev
```

**Terminal 2:**
```powershell
# Initiate multiple negotiations
.\test-negotiation-ui.ps1
```

**Browser:** Watch Active Negotiations update automatically

## 📊 Analytics & Monitoring

### Key Metrics (Coming Soon)
- Success rate (% accepted vs rejected)
- Average rounds to agreement
- Pricing trends over time
- LLM performance (tokens, response times)
- Most successful strategies

### Current Monitoring
- View all negotiations in dashboard
- Individual round-by-round audit trails
- LLM reasoning for every decision
- Performance metrics per round

## 🎨 UI Components Reference

### Custom Hooks

**useNegotiationSocket(publisherId)**
```javascript
const { isConnected, lastEvent, socket } = useNegotiationSocket(1);

// isConnected: boolean - WebSocket status
// lastEvent: object - Last received event
// socket: Socket.io instance - For manual emit
```

### API Service

**negotiationApi**
```javascript
import negotiationApi from '../services/negotiationApi';

// Strategies
await negotiationApi.getStrategies(publisherId);
await negotiationApi.createStrategy(data);
await negotiationApi.updateStrategy(id, data);

// Negotiations
await negotiationApi.getNegotiations(publisherId, status);
await negotiationApi.getNegotiation(id);
await negotiationApi.generateLicense(id);

// Analytics (future)
await negotiationApi.getAnalytics(publisherId);
```

## 🛠️ Configuration

### Environment Variables

**negotiation-agent/.env:**
```bash
# LLM Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# WebSocket
WEBSOCKET_CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Database
DB_HOST=postgres
DB_NAME=content_licensing
DB_USER=postgres
DB_PASSWORD=postgres
```

### Docker Setup

Service runs on port 3003:
```yaml
negotiation-agent:
  ports:
    - "3003:3003"
  environment:
    - ENABLE_WEBSOCKET=true
```

## 🐛 Troubleshooting

### WebSocket Not Connecting

**Symptom:** No green "Live" indicator

**Solutions:**
1. Check service is running: `docker-compose ps negotiation-agent`
2. Verify CORS origins in `.env`
3. Check browser console for errors
4. Restart dashboard: `npm run dev`

### Negotiations Not Updating

**Symptom:** Static list, no real-time changes

**Solutions:**
1. Check WebSocket connection (green dot)
2. Verify publisher ID matches
3. Use polling fallback (auto every 10s)
4. Check browser console for errors

### Strategy Not Saving

**Symptom:** Form resets or shows errors

**Solutions:**
1. Verify all required fields filled
2. Check price values (min < preferred < max)
3. Ensure TTL/RPS ranges valid
4. Check network tab for API errors

### License Generation Fails

**Symptom:** "Failed to generate license" error

**Solutions:**
1. Verify negotiation status is "accepted"
2. Check final_terms are present
3. Ensure licensing-api is running
4. Check logs: `docker-compose logs negotiation-agent`

## 📚 Additional Resources

- **Architecture:** See `NEGOTIATION_ARCHITECTURE.md`
- **Setup Guide:** See `NEGOTIATION_SETUP.md`
- **API Reference:** See `negotiation-agent/README.md`
- **MCP Protocol:** See `negotiation-agent/src/mcp-server.js`

## 🎯 Best Practices

### Strategy Configuration
- Start with **collaborative** style for better outcomes
- Set **auto-accept threshold** around 0.80-0.90
- Use **deal breakers** sparingly (only for critical requirements)
- Test different **LLM temperatures** (0.7 recommended)

### Monitoring
- Check Active Negotiations regularly
- Review AI reasoning in detail view
- Track which strategies perform best
- Adjust preferences based on outcomes

### Performance
- Keep max_rounds between 3-7 (avoid endless loops)
- Use faster models (gpt-4-turbo) for quick negotiations
- Monitor token usage in detail view
- Enable WebSocket for real-time (better UX)

## 🚀 Next Steps

1. **Configure your strategy** with realistic preferences
2. **Test with AI companies** using MCP protocol
3. **Monitor negotiations** in real-time dashboard
4. **Analyze outcomes** to optimize strategy
5. **Generate licenses** from accepted terms
6. **Integrate with edge** for automatic enforcement

---

**Questions?** Check the main `PROJECT_SUMMARY.md` for overall architecture context.
