# Content Licensing Gateway (MonetizePlus MVP)

An educational MVP demonstrating content licensing and access control for AI bots, with comprehensive telemetry analytics and modern publisher dashboard.

## 🎯 Overview

This system demonstrates six core flows:

1. **Human Access** → Unaffected, direct access to content
2. **Unlicensed Bot** → 302 redirect to licensing/paywall  
3. **Licensed Bot** → Short-lived token → Metered content access
4. **AI-to-AI Negotiation** → Autonomous license negotiation between publisher agents and AI companies
5. **License Management** → Password-protected publisher dashboard for managing licenses, URLs, policies
6. **Telemetry & Analytics** → Real-time ingestion, aggregation, and visualization of access logs with anomaly detection

## 🔐 Security & Access

The publisher dashboard is **password-protected** and served under the `/demo` path:
- **Password**: `PCM2025!` (configurable)
- **Access URL**: `http://localhost/demo/` (local) or `https://your-domain.com/demo/` (production)
- **Root path** (`/`) returns 404 for security
- **All product branding removed** for generic white-label usage

## 🏗️ Architecture

```
                           ┌──────────────────────┐
                           │ Publisher Dashboard  │ (React/Vite :5173)
                           │ • License Manager    │
                           │ • Negotiations UI    │
                           │ • Usage Analytics    │
                           │ • URL Library        │
                           │ • Policy Tester      │
                           └──────────┬───────────┘
                                      │
           ┌────────────────────────────┐
           │  Mock CDN / Edge Gateway   │  (Nginx + Edge Worker)
Request -->│  • Bot detect (UA/IP/Rate) │──┐
           │  • Policy lookup cache     │  │   If AI/bot:
           │  • 302 redirect or proxy   │  │   302 → /authorize
           └───────────┬────────────────┘  │
                       │                   │
      Humans ──────────┘                   ▼
                          ┌──────────────────────────┐
                          │ Licensing API            │ (Node/Express :3000)
                          │ • Token issuance (JWT)   │
                          │ • License management     │
                          │ • Usage metering         │
                          │ • Content parsing        │
                          │ • Policy enforcement     │
                          └────────────┬─────────────┘
                                       │
                          ┌────────────┴──────────────┐
                          │                           │
               ┌──────────▼──────────┐    ┌──────────▼──────────┐
               │ Negotiation Agent   │    │ URL Parser          │
               │ (AI-to-AI) :3003    │    │ (Markdown) :4000    │
               │ • Auto-negotiation  │    │ • URL→Markdown      │
               │ • Strategy engine   │    │ • Content extract   │
               │ • License creation  │    └─────────────────────┘
               └─────────────────────┘
                          │
                ┌─────────┴────────┐
                │                  │
       ┌────────▼────────┐  ┌─────▼──────────┐
       │ Publisher A      │  │ Publisher B    │
       │ (Mock) :8081     │  │ (Mock) :8082   │
       └──────────────────┘  └────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- 8GB RAM recommended
- Ports 80, 3000, 3001, 3003, 4000, 5173, 5432, 6379, 8081, 8082 available

### Start Services

```bash
# Clone repository
cd MonetizePlus

# Start all services
docker-compose up -d

# Wait for initialization (~10 seconds)
# Check status
docker-compose ps
```

All services should show as "Up" and healthy.

### Access Points

- **Publisher Dashboard**: http://localhost/demo/ (password: `PCM2025!`)
  - Modern React SPA with password protection
  - White-label design with no product branding
  - Comprehensive analytics and telemetry dashboard
- **Edge Worker**: http://localhost:3001 (entry point for bot requests)
- **Licensing API**: http://localhost:3000 (REST API backend)
- **Negotiation Agent**: http://localhost:3003 (AI-to-AI negotiation)
- **URL Parser**: http://localhost:4000 (content extraction service)
- **PostgreSQL**: localhost:5432 (user: `monetizeplus`, db: `monetizeplus`)
- **Redis**: localhost:6379 (caching and rate limiting)

### 🔑 Authentication Flow

1. **Password Gate**: Enter `PCM2025!` to access the application
2. **Account Selection**: Choose Publisher ID (1 or 2 for demo)
3. **Dashboard Access**: Full analytics, licensing, and management interface

## 🎨 Modern UI & Styling

The dashboard features a **modern, professional design** built with:

- **Tailwind CSS v3.4.0**: Reliable utility-first CSS framework with proper content detection
- **React 18**: Modern component-based UI with hooks and context
- **Heroicons**: Beautiful SVG icons with proper sizing and colors
- **Recharts**: Interactive charts and data visualization
- **Responsive Design**: Mobile-friendly layout with grid systems
- **White-label Interface**: No product branding, fully customizable

### 🔧 Technical Stack

**Frontend:**
- **React 18** + **Vite** (fast development and building)
- **Tailwind CSS v3** (utility-first styling)
- **React Router v7** (client-side routing)
- **Axios** (HTTP client)
- **Vitest** + **Testing Library** (unit testing)

**Backend:**
- **Node.js** + **Express** (REST API)
- **PostgreSQL 16** (primary database)
- **Redis 7** (caching and rate limiting)
- **JWT** (stateless authentication)
- **Jest** + **Supertest** (API testing)

**Infrastructure:**
- **Docker Compose** (local development)
- **Nginx** (reverse proxy and static serving)
- **Azure App Service** (production deployment)
- **Docker Hub** (container registry)

### Telemetry & Analytics

- **Log Ingestion API**: `POST http://localhost:3000/api/logs/ingest`
  - Authenticate with `X-PaulBit-Key`. For local sample data the raw key is `publisher-{id}-ingest`
    (the API persists the SHA-256 hash).
  - Accepts NDJSON or JSON arrays from platforms such as Fastly, Cloudflare, and Akamai.
- **Aggregated Metrics**: `/api/logs/summary` exposes hourly/daily rollups (`aggregated_metrics` table).
- **Ingestion Sources**: `/api/logs/sources` for managing CDN integrations.
- **Alerts API**: `/api/logs/alerts` for webhook-based anomaly detection (bot ratio, error rate, latency spikes, traffic drops).

## 🧪 Comprehensive Testing Suite

The project includes **automated testing** across all layers:

### **🚀 Quick Test (All Suites)**
```bash
bash tests/run-automation.sh
```

This single command runs:
1. **Backend Unit Tests** (Jest) - API routes, models, services
2. **Frontend Unit Tests** (Vitest + Testing Library) - React components
3. **Integration Tests** (Bash) - End-to-end flow testing

### **📊 Test Coverage**

**Backend (Jest):**
- ✅ **Telemetry ingestion** (`/api/logs/ingest`)
- ✅ **Analytics endpoints** (`/api/logs/summary`, `/api/logs/sources`, `/api/logs/alerts`)
- ✅ **Authentication flows** with mocked dependencies
- ✅ **Data validation** and error handling

**Frontend (Vitest + Testing Library):**
- ✅ **Analytics dashboard** rendering and data fetching
- ✅ **Form submissions** (log sources, alerts)
- ✅ **Component interactions** with mocked API calls
- ✅ **ResizeObserver polyfill** for chart components

**Integration (Bash):**
- ✅ **Human access** (no restrictions)
- ✅ **Unlicensed bot redirection** (302 to authorization)
- ✅ **Licensed bot flow** (token issuance → content access)
- ✅ **Token verification** and URL validation
- ✅ **Admin endpoints** (publishers, clients, plans)
- ✅ **Policy enforcement** testing

### **🔧 Individual Test Commands**

```bash
# Backend only (licensing-api directory)
cd licensing-api && npm test

# Frontend only (publisher-dashboard directory) 
cd publisher-dashboard && npm test

# Integration only
bash tests/run-tests.sh
```

### **📈 Test Results**
- **Backend**: 8/8 tests passing
- **Frontend**: 2/2 tests passing  
- **Integration**: 16/16 tests passing
- **Total Coverage**: All critical paths tested

### PowerShell Alternative (Windows)

```powershell
cd tests
.\run-automation.ps1
```

### Manual Testing

See `tests/MANUAL_TESTS.md` for detailed manual test cases and edge case scenarios.

## 🚀 Production Deployment

### **Azure App Service (Recommended)**

**One-Command Deploy:**
```bash
curl -sS https://raw.githubusercontent.com/drpaulfarrow/PaulBit/main/azure-deploy.sh | bash
```

This automated script:
- ✅ **Creates Azure resources** (resource group, app service plan)
- ✅ **Generates secure JWT secret**
- ✅ **Deploys all containers** from Docker Hub
- ✅ **Configures environment variables**
- ✅ **Initializes database** with sample data
- ✅ **Verifies deployment** and provides access URL

**Result:** Your app will be live at `https://your-app.azurewebsites.net/demo/` (password: `PCM2025!`)

### **Manual Deployment Steps**

If you prefer manual control:

1. **Push latest changes to GitHub:**
   ```bash
   git add . && git commit -m "Update with latest features" && git push origin main
   ```

2. **Build and push Docker images** (if needed):
   ```bash
   # Only needed if you modified the dashboard
   docker build -f publisher-dashboard/Dockerfile.azure -t paulandrewfarrow/monetizeplus-publisher-dashboard:azure-$(date +%Y%m%d) ./publisher-dashboard
   docker push paulandrewfarrow/monetizeplus-publisher-dashboard:azure-$(date +%Y%m%d)
   ```

3. **Deploy via Azure CLI:**
   ```bash
   az webapp config container set \
     --name monetizeplusapp \
     --resource-group MonetizePlusRG \
     --multicontainer-config-type compose \
     --multicontainer-config-file docker-compose.azure.yml
   
   az webapp restart --name monetizeplusapp --resource-group MonetizePlusRG
   ```

### **🔧 Environment Configuration**

The system supports both **local development** and **production deployment**:

- **`docker-compose.yml`**: Local development with all services
- **`docker-compose.azure.yml`**: Production Azure deployment
- **Environment variables**: Configured via `.env` (local) or Azure App Settings (production)

### **🎯 Key Deployment Features**

- ✅ **Password Protection**: Secure access with configurable password
- ✅ **White-label Design**: No product branding, fully customizable
- ✅ **Modern Styling**: Tailwind CSS v3 with proper utility class generation
- ✅ **Asset Optimization**: Nginx-served static assets with proper caching
- ✅ **Database Migrations**: Automatic schema updates and data seeding
- ✅ **Health Monitoring**: Container health checks and service monitoring

## 🧪 Example Usage

### Test 1: Human Access (No Restriction)

```bash
curl -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" \
     -H "Host: site-a.local" \
     http://localhost:3001/news/foo.html
```

**Result**: HTTP 200, content returned immediately

### Test 2: Bot Without Token (Redirect)

```bash
curl -i -H "User-Agent: GPTBot/1.0" \
        -H "Host: site-a.local" \
        http://localhost:3001/news/foo.html
```

**Result**: HTTP 302 redirect to authorization page

### Test 3: Bot With Token (Authorized Access)

#### Step 1: Request Token

```bash
curl -X POST http://localhost:3000/token \
  -H 'Content-Type: application/json' \
  -d '{
    "url": "http://site-a.local/news/foo.html",
    "ua": "GPTBot/1.0",
    "purpose": "inference"
  }'
```

**Response**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-10-27T12:10:00.000Z",
  "expires_in": 600,
  "publisher": "site-a.local",
  "purpose": "inference",
  "cost_per_fetch": 0.002
}
```

#### Step 2: Access Content with Token

```bash
curl -H "User-Agent: GPTBot/1.0" \
     -H "Host: site-a.local" \
     "http://localhost:3001/news/foo.html?token=YOUR_TOKEN_HERE"
```

**Result**: HTTP 200, content returned, usage metered

## �️ Publisher Dashboard

The Publisher Dashboard is a modern React-based UI for managing all aspects of content licensing:

### Access
Navigate to http://localhost:5173 and log in with any publisher ID (e.g., `1` for Publisher A).

### Features

#### Dashboard
- **Usage Analytics**: View request volumes, revenue trends, and top clients
- **Real-time Metrics**: Total requests, revenue, unique clients, and average transaction values
- **Charts**: Request volume over time, revenue trends, client distribution

#### License Manager
- **Create License Templates**: Define reusable license configurations with names
  - License types: Training+Display, RAG Unrestricted, RAG Max Words, RAG Attribution, RAG No Display
  - Pricing: Set price per fetch and currency (USD/EUR/GBP)
  - Terms: Specify term length and revenue share percentage
  - Special conditions: Max word counts, attribution requirements
- **Edit Licenses**: Modify existing license templates
- **Clone Licenses**: Duplicate licenses for quick creation
- **License Naming**: All licenses require descriptive names (negotiation-created licenses auto-named as `partner_usecase_price`)

#### URL Library
- **Manage URLs**: Add, view, and organize your content URLs
- **Assign Licenses**: Link licenses to specific URLs
- **Content Parsing**: Parse URLs to extract markdown content
- **Access Endpoints**: Configure API, RSS, HTML, MCP, and NLWeb access methods
- **Search & Sort**: Find URLs by title, description, or URL pattern

#### Negotiations
- **View Negotiations**: See all incoming negotiation requests from AI companies
- **Accept/Reject**: Review and respond to proposed terms
- **Auto-License Creation**: Accepting a negotiation automatically creates a named license
- **Negotiation History**: Track all rounds and final terms
- **Strategy Management**: Configure your negotiation strategy (pricing, thresholds, deal-breakers)

#### Usage Logs
- **Detailed Access Logs**: View every request with timestamp, client, URL, cost, and purpose
- **Filter & Search**: Find specific usage events
- **Cost Tracking**: Monitor per-request costs and cumulative totals

#### Notifications
- **Real-time Alerts**: Get notified of negotiation events, license creation, and system updates
- **Unread Counter**: Badge showing unread notification count in sidebar
- **Filter by Type**: View all, unread, license, or negotiation notifications
- **Mark as Read/Delete**: Manage notification states

#### Policy Tester
- **Test Bot Detection**: Simulate requests with different user agents
- **Policy Validation**: Verify your policies work correctly
- **Response Preview**: See what bots will receive (redirect, allow, block)

## 🤖 AI-to-AI Negotiation System

The negotiation agent enables autonomous license negotiation between publishers and AI companies.

### How It Works

1. **AI Company Initiates**: Sends a negotiation request with proposed terms
2. **Publisher Agent Evaluates**: Uses configured strategy to assess proposal
3. **Multi-Round Negotiation**: Agents counter-propose until agreement or rejection
4. **Auto-Accept**: If proposal meets threshold, automatically accepts
5. **License Creation**: Successful negotiation creates a named license (format: `partner_usecase_price`)

### Negotiation Strategy

Configure via Dashboard → Negotiations → Strategies:
- **Min/Preferred/Max Price**: Price boundaries for negotiation
- **Auto-Accept Threshold**: Automatically accept proposals ≥X% of preferred terms
- **Negotiation Style**: Aggressive, balanced, flexible, or cooperative
- **Max Rounds**: Limit negotiation length
- **Deal Breakers**: Conditions that trigger auto-rejection

### API Endpoints

#### `POST /api/negotiations/initiate`
Start a new negotiation (called by AI companies).

#### `GET /api/negotiations/publisher/:publisherId`
List all negotiations for a publisher.

#### `GET /api/negotiations/:negotiationId`
Get detailed negotiation history with all rounds.

#### `POST /api/negotiations/:negotiationId/accept`
Accept negotiation terms and create license.

#### `POST /api/negotiations/:negotiationId/reject`
Reject negotiation with optional reason.

## �📡 API Reference

### Public Endpoints (Bots)

#### `GET /authorize`
Display authorization page with instructions.

**Query Parameters**:
- `url` (required): Target content URL
- `ua` (optional): User agent string

#### `POST /token`
Issue an access token.

**Request Body**:
```json
{
  "url": "http://site-a.local/news/foo.html",
  "ua": "GPTBot/1.0",
  "purpose": "inference",
  "client_id": "optional-client-id"
}
```

**Response**:
```json
{
  "token": "JWT_TOKEN",
  "expires_at": "ISO8601_TIMESTAMP",
  "expires_in": 600,
  "publisher": "site-a.local",
  "cost_per_fetch": 0.002
}
```

#### `GET /verify`
Verify a token's validity.

**Query Parameters**:
- `token` (required): JWT token to verify
- `url` (optional): URL to validate against

**Response**:
```json
{
  "valid": true,
  "publisher_id": 1,
  "client_id": "anonymous",
  "purpose": "inference",
  "jti": "token-id",
  "expires_at": "ISO8601_TIMESTAMP"
}
```

### License Management Endpoints

#### `GET /api/licenses?publisherId={id}`
List all licenses for a publisher.

**Response**:
```json
{
  "success": true,
  "licenses": [
    {
      "id": 1,
      "name": "openai_training_display_0_0100",
      "license_type": 0,
      "price": 0.0100,
      "currency": "USD",
      "term_months": 12,
      "status": "active",
      "created_ts": "2025-10-29T12:00:00Z"
    }
  ]
}
```

#### `POST /api/licenses`
Create a new license template.

**Request Body**:
```json
{
  "publisher_id": 1,
  "name": "anthropic_rag_unrestricted_0_0085",
  "license_type": 1,
  "price": 0.0085,
  "currency": "USD",
  "term_months": 12,
  "status": "active"
}
```

#### `PUT /api/licenses/:id`
Update an existing license.

#### `DELETE /api/licenses/:id`
Delete a license template.

#### `POST /api/licenses/:id/clone`
Clone an existing license.

### Content & URL Management Endpoints

#### `GET /parsed-urls?publisherId={id}`
List parsed URLs for a publisher.

#### `POST /api/content/from-url`
Create content entry from URL and assign license.

**Request Body**:
```json
{
  "url": "https://example.com/article",
  "publisherId": 1,
  "licenseId": 5,
  "title": "Article Title",
  "description": "Article description"
}
```

#### `POST /parse`
Parse a URL to extract markdown content.

**Request Body**:
```json
{
  "url": "https://example.com/article"
}
```

### Admin Endpoints

#### `GET /admin/publishers`
List all publishers.

#### `GET /admin/clients`
List all registered AI clients.

#### `POST /admin/clients`
Create a new client.

#### `POST /admin/tokens/:jti/revoke`
Revoke a specific token.

#### `GET /admin/logs`
Retrieve recent access logs.

**Query Parameters**:
- `limit` (optional): Number of logs (default: 50)

### Policy Endpoints

#### `GET /policies/:publisherId`
Get policy for a publisher.

**Response**:
```json
{
  "publisher_id": 1,
  "publisher_name": "Publisher A News",
  "hostname": "site-a.local",
  "version": "1.0",
  "policy": {
    "version": "1.0",
    "default": { "allow": false },
    "rules": [...]
  }
}
```

#### `PUT /policies/:publisherId`
Update publisher policy.

### Usage Endpoints

#### `GET /usage`
Query usage events.

**Query Parameters**:
- `publisherId`: Filter by publisher
- `clientId`: Filter by client
- `from`: Start date (ISO8601)
- `to`: End date (ISO8601)
- `limit`: Results limit (default: 100)

**Response**:
```json
{
  "events": [...],
  "summary": {
    "total_requests": 150,
    "total_cost_micro": 300000,
    "total_cost_usd": "0.3000"
  }
}
```

#### `POST /usage`
Record usage event (internal, called by edge-worker).

## 🗄️ Data Models

### Publishers
```sql
id, name, hostname, created_at
```

### License Options
```sql
id, license_id, name, content_id, publisher_id, license_type,
price, currency, term_months, revshare_pct, max_word_count,
attribution_required, attribution_text, attribution_url,
derivative_allowed, status, ext, created_ts, updated_ts
```

**License Types**:
- `0`: Training + Display
- `1`: RAG Display (Unrestricted)
- `2`: RAG Display (Max Words)
- `3`: RAG Display (Attribution)
- `4`: RAG No Display

### Negotiations
```sql
id (UUID), publisher_id, client_id, client_name, strategy_id,
status, current_round, initial_proposal, current_terms, final_terms,
license_id, initiated_by, initiated_at, completed_at, last_activity_at,
context, created_at, updated_at
```

**Statuses**: `initiated`, `negotiating`, `accepted`, `rejected`, `timeout`, `error`

### Negotiation Strategies
```sql
id, publisher_id, strategy_name, negotiation_style,
min_price_per_fetch_micro, preferred_price_per_fetch_micro, max_price_per_fetch_micro,
min_token_ttl_seconds, preferred_token_ttl_seconds, max_token_ttl_seconds,
min_burst_rps, preferred_burst_rps, max_burst_rps,
allowed_purposes, preferred_purposes, deal_breakers,
max_rounds, auto_accept_threshold, timeout_seconds,
llm_provider, llm_model, llm_temperature, system_prompt,
is_active, created_at, updated_at
```

### Negotiation Rounds
```sql
id, negotiation_id, round_number, actor, action,
proposed_terms, reasoning, llm_model, llm_tokens_used,
llm_response_time_ms, analysis, created_at
```

### Parsed URLs
```sql
id, publisher_id, url, content, title, description,
fetch_count, last_fetched, created_at, updated_at
```

### Content
```sql
id, publisher_id, url, content_origin, title, summary,
license_id, created_ts, updated_ts
```

### Notifications
```sql
id, publisher_id, type, title, message, metadata,
category, entity_id, is_read, created_at
```

**Notification Types**: `negotiation_initiated`, `negotiation_accepted`, `negotiation_rejected`, `license_created`, `system`

### Policies
```sql
id, publisher_id, policy_json, version, created_at
```

**Policy JSON Structure**:
```json
{
  "version": "1.0",
  "publisher": "site-a.local",
  "default": { "allow": false, "action": "redirect" },
  "rules": [
    {
      "agent": "GPTBot",
      "allow": true,
      "purpose": ["inference"],
      "price_per_fetch": 0.002,
      "token_ttl_seconds": 600,
      "max_rps": 2
    }
  ],
  "redirect_url": "http://licensing-api:3000/authorize"
}
```

### Tokens (JWT Claims)
```json
{
  "iss": "gatehouse-licensing",
  "aud": "gatehouse-edge",
  "sub": "client:openai",
  "publisher_id": 1,
  "publisher": "site-a.local",
  "url": "http://site-a.local/news/foo.html",
  "purpose": "inference",
  "jti": "unique-token-id",
  "iat": 1730012345,
  "exp": 1730012945
}
```

### Usage Events
```sql
id, ts, publisher_id, client_id, url, agent_ua, 
cost_micro, token_id, bytes_sent, purpose, license_id
```

## 🔧 Configuration

### Environment Variables

#### Edge Worker
```env
NODE_ENV=development
LICENSING_API_URL=http://licensing-api:3000
PUBLISHER_A_URL=http://publisher-a:8081
PUBLISHER_B_URL=http://publisher-b:8082
REDIS_URL=redis://redis:6379
```

#### Licensing API
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus
REDIS_URL=redis://redis:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_ISSUER=gatehouse-licensing
JWT_AUDIENCE=gatehouse-edge
```

### Bot Detection Patterns

Configured in `edge-worker/src/detector.js`:
```javascript
const BOT_PATTERNS = [
  /GPTBot/i,
  /ClaudeBot/i,
  /Perplexity/i,
  /CCBot/i,
  /Google-Extended/i,
  /bingbot/i
];
```

### Rate Limiting

- **Window**: 60 seconds
- **Max Requests**: 10 per window per IP+UA combination
- **Storage**: Redis

## 🔒 Security Features

### Token Security
- **JWT** with HS256 signature
- **Short TTL**: 10 minutes (default)
- **URL Binding**: Token tied to specific URL
- **Revocation**: Redis allowlist for instant revocation
- **Expiry**: Automatic expiration enforced

### Access Control
- **Bot Detection**: User-Agent pattern matching
- **Rate Limiting**: Redis-backed sliding window
- **Policy Enforcement**: Publisher-specific rules
- **Audit Trail**: All access logged to database

### Best Practices Implemented
- JWT secret in environment variables
- Database credentials not hardcoded
- CORS disabled on sensitive endpoints
- Input validation on all API endpoints
- Prepared SQL statements (parameterized queries)

## 📊 Monitoring & Observability

### Logs

#### Edge Worker
```bash
docker-compose logs -f edge-worker
```

#### Licensing API
```bash
docker-compose logs -f licensing-api
```

### Database Queries

```sql
-- Recent usage events
SELECT * FROM usage_events ORDER BY ts DESC LIMIT 10;

-- Total cost per publisher
SELECT publisher_id, SUM(cost_micro)/1000000.0 as total_usd
FROM usage_events
GROUP BY publisher_id;

-- Active tokens
SELECT COUNT(*) FROM tokens WHERE expires_at > NOW() AND revoked = false;
```

### Redis Inspection

```bash
# Connect to Redis
docker exec -it tollbit-redis redis-cli

# Check rate limit keys
KEYS ratelimit:*

# Check token allowlist
KEYS token:*
```

## 🛠️ Development

### Project Structure

```
.
├── docker-compose.yml          # Service orchestration
├── edge/
│   └── nginx.conf              # Nginx configuration
├── edge-worker/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js              # Main application
│       ├── detector.js         # Bot detection logic
│       └── router.js           # Origin routing
├── licensing-api/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js           # Express server
│       ├── db.js               # Database connection
│       ├── redis.js            # Redis client
│       ├── models/
│       │   ├── LicenseOption.js  # License CRUD operations
│       │   └── Content.js        # Content management
│       └── routes/
│           ├── auth.js           # Token endpoints
│           ├── policies.js       # Policy management
│           ├── usage.js          # Usage tracking
│           ├── admin.js          # Admin endpoints
│           ├── licenses.js       # License management
│           ├── content.js        # Content & URL management
│           ├── access.js         # Access endpoint config
│           └── notifications.js  # Notification system
├── negotiation-agent/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js             # Express server & Socket.IO
│       ├── negotiation-engine.js # AI negotiation logic
│       ├── notifications.js      # Notification helpers
│       └── logger.js             # Winston logging
├── publisher-dashboard/
│   ├── Dockerfile
│   ├── nginx.conf                # Nginx reverse proxy config
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx               # Main React app
│       ├── components/
│       │   └── Layout.jsx        # Main layout with nav
│       └── pages/
│           ├── Login.jsx         # Publisher login
│           ├── Dashboard.jsx     # Analytics & metrics
│           ├── LicenseWizard.jsx # License management
│           ├── UrlLibrary.jsx    # URL & content management
│           ├── Negotiations.jsx  # Negotiation UI
│           ├── UsageLogs.jsx     # Access logs
│           ├── Notifications.jsx # Notification center
│           └── PolicyTester.jsx  # Policy testing tool
├── Simple Parser/
│   └── url-to-markdown/          # URL parsing service
│       ├── Dockerfile
│       ├── package.json
│       └── src/
│           └── server.js         # Express server
├── publisher-a/                  # Mock publisher site
│   ├── Dockerfile
│   ├── nginx.conf
│   └── html/
├── publisher-b/                  # Mock publisher site
│   ├── Dockerfile
│   ├── nginx.conf
│   └── html/
├── database/
│   ├── init.sql                  # Initial schema & seed data
│   └── migrations/               # Database migrations
│       ├── 009_negotiation_system.sql
│       ├── 010_partner_strategies.sql
│       ├── 019_add_license_name.sql
│       └── ...
└── tests/
    ├── run-tests.sh              # Automated tests (Bash)
    ├── run-tests.ps1             # Automated tests (PowerShell)
    └── MANUAL_TESTS.md           # Manual test guide
```

### Adding a New Publisher

1. **Create publisher service**:
```yaml
# docker-compose.yml
publisher-c:
  build: ./publisher-c
  container_name: monetizeplus-publisher-c
  networks:
    - monetizeplus-network
```

2. **Add to database**:
```sql
INSERT INTO publishers (name, hostname) VALUES
  ('Publisher C', 'site-c.local');
```

3. **Create policy**:
```sql
INSERT INTO policies (publisher_id, policy_json, version) VALUES
  (3, '{"version": "1.0", ...}', '1.0');
```

4. **Update edge worker router**:
```javascript
// edge-worker/src/router.js
const HOST_MAP = {
  'site-a.local': PUBLISHER_A_URL,
  'site-b.local': PUBLISHER_B_URL,
  'site-c.local': 'http://publisher-c:8083'
};
```

### Custom Bot Detection

Edit `edge-worker/src/detector.js`:
```javascript
const BOT_PATTERNS = [
  /GPTBot/i,
  /YourCustomBot/i,
  // Add more patterns
];
```

## 🐛 Troubleshooting

### Services won't start
```bash
# Check logs
docker-compose logs

# Rebuild images
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Database connection errors
```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d
```

### Token verification fails
```bash
# Check Redis is running
docker exec -it tollbit-redis redis-cli PING

# Verify JWT secret matches in both services
docker-compose config | grep JWT_SECRET
```

### Rate limiting not working
```bash
# Check Redis connection
docker exec -it monetizeplus-redis redis-cli
> KEYS ratelimit:*
```

## 📚 Learning Resources

### Concepts Demonstrated

1. **Edge Computing**: Processing at the gateway before origin
2. **JWT Authentication**: Stateless token-based auth
3. **Rate Limiting**: Redis sliding window algorithm
4. **Policy-Based Access Control**: Flexible, per-publisher rules
5. **Usage Metering**: Event-based billing data
6. **Microservices Architecture**: Independent, composable services
7. **Reverse Proxy**: Nginx as traffic router
8. **API Design**: RESTful endpoints with clear contracts
9. **AI-to-AI Negotiation**: Autonomous license negotiation using LLMs
10. **Real-time Communication**: WebSockets (Socket.IO) for live updates
11. **Modern Frontend**: React + Vite + Tailwind CSS
12. **Database Migrations**: Versioned schema evolution
13. **Content Parsing**: URL-to-Markdown extraction
14. **Named Licenses**: Human-readable license identifiers with auto-generation

### Related Technologies

- **Node.js/Express**: Backend API framework
- **PostgreSQL**: Relational database for structured data
- **Redis**: In-memory cache for rate limiting & sessions
- **Nginx**: High-performance reverse proxy
- **Docker**: Containerization & orchestration
- **JWT**: JSON Web Tokens for stateless auth

## 🎓 Educational Notes

### Why This Architecture?

- **Edge Interception**: Minimal latency, protects origin
- **Stateless Tokens**: Horizontal scaling, no session store
- **Short TTLs**: Security without complex revocation
- **Redis Allowlist**: Instant revocation when needed
- **Policy-Driven**: Flexible rules without code changes
- **Usage Tracking**: Foundation for billing/analytics

### Production Considerations

This is an educational MVP. For production:

1. **Security**:
   - Rotate JWT secrets regularly
   - Use HTTPS everywhere
   - Implement proper API key management
   - Add input sanitization
   - Enable SQL injection protection
   - Add DDoS protection

2. **Scalability**:
   - Multi-region edge workers
   - Database read replicas
   - Redis cluster for HA
   - CDN integration
   - Load balancing

3. **Monitoring**:
   - Prometheus metrics
   - Grafana dashboards
   - Alert management
   - Error tracking (Sentry)
   - APM (Application Performance Monitoring)

4. **Legal/Compliance**:
   - Terms of service
   - Privacy policy
   - GDPR compliance
   - Data retention policies
   - Audit logging

## 🤝 Contributing

This is an educational project. Feel free to:
- Add new features
- Improve documentation
- Submit bug fixes
- Enhance test coverage

## 📄 License

MIT License - This is educational software for learning purposes.

## 🙏 Acknowledgments

Created to demonstrate publisher-AI relationships and content licensing concepts.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review test cases in `tests/MANUAL_TESTS.md`
3. Check Docker logs: `docker-compose logs`

---

**Note**: This is an educational MVP to demonstrate content licensing concepts. It is not production-ready and should not be used for actual commercial licensing without significant enhancements to security, scalability, and legal compliance.
