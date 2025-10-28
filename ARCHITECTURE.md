# Architecture Diagrams

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         INTERNET / CLIENTS                          │
│                    (Browsers, Bots, AI Systems)                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 │ HTTP Requests
                                 │
                    ┌────────────▼─────────────┐
                    │    EDGE GATEWAY (Nginx)   │
                    │      Port 8080            │
                    │                           │
                    │  • Reverse Proxy          │
                    │  • Load Balancer          │
                    │  • SSL Termination        │
                    └────────────┬──────────────┘
                                 │
                                 │ Forward All
                                 │
                    ┌────────────▼──────────────┐
                    │   EDGE WORKER (Node.js)   │
                    │      Port 3001            │
                    │                           │
                    │  1. Detect Bot vs Human   │
                    │  2. Check for Token       │
                    │  3. Verify Token          │
                    │  4. Route Request         │
                    └──┬──────────┬─────────────┘
                       │          │
        Human Traffic  │          │  Bot Traffic
              (bypass) │          │  (check token)
                       │          │
                       │          │
       ┌───────────────┘          └──────────────┐
       │                                         │
       │ If Human                    If Bot      │
       │ → Direct                    → Verify    │
       │                                         │
       ▼                                         ▼
┌──────────────┐                    ┌───────────────────────┐
│  PUBLISHER   │                    │  LICENSING GATEWAY    │
│   ORIGINS    │◄───────────────────│    (Node/Express)     │
│              │    Valid Token     │      Port 3000        │
│ • Site A     │                    │                       │
│ • Site B     │                    │ • /authorize → HTML   │
└──────────────┘                    │ • /token → JWT        │
                                    │ • /verify → Check     │
                                    │ • /policies → Rules   │
                                    │ • /usage → Meter      │
                                    │ • /admin → Manage     │
                                    └───────┬───────────────┘
                                            │
                                ┌───────────┴──────────┐
                                │                      │
                    ┌───────────▼────────┐   ┌────────▼────────┐
                    │   POSTGRESQL       │   │     REDIS       │
                    │   Port 5432        │   │   Port 6379     │
                    │                    │   │                 │
                    │ • Publishers       │   │ • Rate Limits   │
                    │ • Policies         │   │ • Token Lists   │
                    │ • Clients          │   │ • Counters      │
                    │ • Plans            │   │ • Cache         │
                    │ • Tokens           │   └─────────────────┘
                    │ • Usage Events     │
                    └────────────────────┘
```

## Request Flow: Human Access

```
┌──────────┐
│  Human   │
│ Browser  │
└────┬─────┘
     │ GET /news/foo.html
     │ UA: Mozilla/5.0
     ▼
┌─────────────┐
│    Nginx    │
│  Edge GW    │
└─────┬───────┘
      │ Forward
      ▼
┌──────────────┐
│ Edge Worker  │
│              │
│ UA Check:    │
│ ✓ Is Human   │
└──────┬───────┘
       │ Proxy Direct
       ▼
┌──────────────┐
│ Publisher A  │
│ Port 8081    │
│              │
│ Return HTML  │
└──────┬───────┘
       │
       │ 200 OK + Content
       ▼
┌──────────┐
│  Human   │
│  Reads   │
└──────────┘

Time: ~5ms overhead
```

## Request Flow: Unlicensed Bot

```
┌──────────┐
│ AI Bot   │
│ (GPTBot) │
└────┬─────┘
     │ GET /news/foo.html
     │ UA: GPTBot/1.0
     ▼
┌─────────────┐
│    Nginx    │
│  Edge GW    │
└─────┬───────┘
      │ Forward
      ▼
┌──────────────┐
│ Edge Worker  │
│              │
│ UA Check:    │
│ ✗ Is Bot     │
│ ✗ No Token   │
└──────┬───────┘
       │ 302 Redirect
       ▼
┌────────────────────────────────────┐
│  Licensing Gateway                 │
│  /authorize?url=...&ua=...         │
│                                    │
│  HTML Page with:                   │
│  • Publisher info                  │
│  • Pricing                         │
│  • API instructions                │
│  • cURL examples                   │
└────────────────────────────────────┘
       │
       │ Bot sees instructions
       ▼
┌──────────┐
│ AI Bot   │
│ Learns   │
└──────────┘

Time: ~8ms
```

## Request Flow: Licensed Bot

```
┌──────────┐
│ AI Bot   │
│ (GPTBot) │
└────┬─────┘
     │
     │ Step 1: Request Token
     │ POST /token
     │ {url, ua, purpose}
     ▼
┌──────────────────┐
│ Licensing API    │
│                  │
│ 1. Check Policy  │──┐
│ 2. Verify Rules  │  │ Query
│ 3. Generate JWT  │◄─┘
│ 4. Store in DB   │
│ 5. Add to Redis  │
└────────┬─────────┘
         │
         │ Return: {token, expires_at}
         ▼
┌──────────┐
│ AI Bot   │
│ Has Token│
└────┬─────┘
     │
     │ Step 2: Access Content
     │ GET /news/foo.html?token=JWT...
     │ UA: GPTBot/1.0
     ▼
┌─────────────┐
│    Nginx    │
└─────┬───────┘
      │
      ▼
┌──────────────┐
│ Edge Worker  │
│              │
│ UA Check:    │
│ ✓ Is Bot     │
│ ✓ Has Token  │
└──────┬───────┘
       │
       │ Verify Token
       ▼
┌──────────────────┐
│ Licensing API    │
│ /verify          │
│                  │
│ 1. JWT Sig ✓     │
│ 2. Expiry ✓      │
│ 3. Redis List ✓  │
│ 4. URL Match ✓   │
└────────┬─────────┘
         │
         │ {valid: true}
         ▼
┌──────────────┐
│ Edge Worker  │
│              │
│ Valid!       │
│ → Proxy      │
│ → Meter      │
└──────┬───────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Publisher A  │  │ Usage Event  │
│ Port 8081    │  │ → PostgreSQL │
│              │  │              │
│ Return HTML  │  │ Record:      │
└──────┬───────┘  │ • URL        │
       │          │ • Cost       │
       │          │ • Timestamp  │
       │          └──────────────┘
       │ 200 OK + Content
       ▼
┌──────────┐
│ AI Bot   │
│ Gets Data│
└──────────┘

Time: ~15ms total
```

## Data Flow: Token Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│                     TOKEN LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

1. ISSUANCE
   ┌──────────┐
   │  Bot     │ POST /token
   └────┬─────┘
        │
        ▼
   ┌────────────────┐
   │ Licensing API  │
   │                │
   │ Generate JWT:  │
   │ • Sign HS256   │
   │ • Claims       │
   │ • Expiry       │
   └───┬────────┬───┘
       │        │
       │        └────────────┐
       ▼                     ▼
   ┌────────┐          ┌─────────┐
   │ Redis  │          │ Postgres│
   │ Token  │          │ tokens  │
   │ Allow  │          │ table   │
   │ List   │          └─────────┘
   └────────┘
       │
       │ TTL: 600s
       ▼
   ┌──────────┐
   │ Bot gets │
   │  token   │
   └──────────┘

2. USAGE
   ┌──────────┐
   │ Bot with │
   │  Token   │
   └────┬─────┘
        │ Request + Token
        ▼
   ┌────────────────┐
   │ Edge Worker    │
   │                │
   │ Call /verify   │
   └───────┬────────┘
           │
           ▼
   ┌────────────────┐
   │ Licensing API  │
   │                │
   │ 1. JWT.verify()│──┐ Check
   │ 2. Redis check │◄─┘ Allowlist
   │ 3. URL match   │
   └───────┬────────┘
           │
           │ Valid ✓
           ▼
   ┌────────────────┐
   │ Content        │
   │ Delivered      │
   └────────────────┘
           │
           │ Log
           ▼
   ┌────────────────┐
   │ usage_events   │
   │ (PostgreSQL)   │
   └────────────────┘

3. EXPIRATION / REVOCATION
   
   Automatic Expiry:
   ┌────────┐
   │ Redis  │ TTL expires
   │ Key    │ (600s)
   │ Deleted│────────────┐
   └────────┘            │
                         ▼
                    ┌─────────┐
                    │ Next    │
                    │ Verify  │
                    │ Fails   │
                    └─────────┘
   
   Manual Revoke:
   ┌────────┐
   │ Admin  │ POST /admin/tokens/:jti/revoke
   └───┬────┘
       │
       ▼
   ┌────────────────┐
   │ Licensing API  │
   │                │
   │ 1. Delete Redis│
   │ 2. Mark DB     │
   └────────────────┘
```

## Policy Evaluation Flow

```
┌──────────────────────────────────────────────────────────┐
│               POLICY EVALUATION                          │
└──────────────────────────────────────────────────────────┘

Bot Request → Check Policy → Match Rules → Allow/Deny

┌──────────────┐
│ Incoming     │
│ Request      │
│              │
│ URL: /foo    │
│ UA: GPTBot   │
│ Purpose: inf │
└──────┬───────┘
       │
       │ Lookup
       ▼
┌──────────────────────┐
│ policies table       │
│ (PostgreSQL)         │
│                      │
│ SELECT policy_json   │
│ WHERE publisher_id   │
└──────┬───────────────┘
       │
       │ Policy JSON
       ▼
┌────────────────────────────────┐
│ Policy Rules:                  │
│                                │
│ 1. agent: "GPTBot"             │
│    allow: true                 │
│    purpose: ["inference"]      │
│    price: 0.002                │
│    ttl: 600                    │
│                                │
│ 2. agent: "ClaudeBot"          │
│    allow: true                 │
│    purpose: ["inference"]      │
│    price: 0.002                │
│                                │
│ 3. agent: "*"                  │
│    allow: false                │
└────────┬───────────────────────┘
         │
         │ Evaluate
         ▼
    ┌────────────┐
    │ Match UA   │
    │ GPTBot ✓   │
    └─────┬──────┘
          │
          ▼
    ┌────────────┐
    │ Check      │
    │ Purpose ✓  │
    └─────┬──────┘
          │
          ▼
    ┌────────────────┐
    │ ALLOW          │
    │ price: 0.002   │
    │ ttl: 600s      │
    └────────────────┘
```

## Component Interaction Map

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT INTERACTIONS                    │
└─────────────────────────────────────────────────────────────┘

edge-worker ←──────→ licensing-api
     │                    │
     │                    │
     ├──→ Redis ←─────────┤
     │                    │
     │                    │
     └──→ Publishers      │
                          │
                          └──→ PostgreSQL

Legend:
  ←──→  HTTP/REST API calls
  ──→   Read/Write data

Dependencies:
  edge-worker:
    - licensing-api (/verify endpoint)
    - Redis (rate limits)
    - Publishers (proxy target)
  
  licensing-api:
    - PostgreSQL (policies, usage, tokens)
    - Redis (token allowlist)
  
  All services:
    - Nginx (reverse proxy)
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   DOCKER COMPOSE DEPLOYMENT                  │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     Host Machine                             │
│  ┌────────────────────────────────────────────────────────┐  │
│  │            Docker Network: tollbit-network             │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │  │
│  │  │ edge         │  │ edge-worker  │  │ licensing  │  │  │
│  │  │ (nginx)      │  │ (node:18)    │  │ (node:18)  │  │  │
│  │  │ Port: 8080   │  │ Internal     │  │ Port: 3000 │  │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘  │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ publisher-a  │  │ publisher-b  │                  │  │
│  │  │ (nginx)      │  │ (nginx)      │                  │  │
│  │  │ Internal     │  │ Internal     │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ postgres     │  │ redis        │                  │  │
│  │  │ Port: 5432   │  │ Port: 6379   │                  │  │
│  │  │ Volume ↓     │  │ Memory       │                  │  │
│  │  └──────────────┘  └──────────────┘                  │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Volumes:                                                    │
│  └─ postgres-data/ (persistent)                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘

External Access:
  • 8080 → Nginx Edge
  • 3000 → Licensing API
  • 5432 → PostgreSQL (dev only)
  • 6379 → Redis (dev only)
```
