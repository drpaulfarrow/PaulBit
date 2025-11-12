# Access Endpoints Configuration Guide

## Overview

Access Endpoints define **how AI systems and clients can access your licensed content**. Each endpoint specifies the protocol, authentication method, format, and rate limits for accessing content under a specific license.

## Access Types

The system supports **5 different access types**, each designed for different consumption patterns:

| Type | Name | Use Case | Default Format |
|------|------|----------|---------------|
| **0** | HTML | Web browser access, standard HTML pages | Request: `http-get` / Response: `html` |
| **1** | RSS | RSS/Atom feed syndication | Request: `http-get` / Response: `xml` |
| **2** | API | RESTful API programmatic access | Request: `json` / Response: `json` |
| **3** | MCP | Model Context Protocol server | Request: `json` / Response: `json` |
| **4** | NLWeb | Natural Language Web interface | Request: `http-get` / Response: `html` |

---

## Type 0: HTML Web Access

**Use Case**: Standard web browser access to HTML content

**Configuration Example**:
```json
{
  "publisher_id": 1,
  "name": "HTML Web Access",
  "description": "Standard web browser access to HTML content",
  "access_type": 0,
  "endpoint": "https://site-a.local/content/{url}",
  "auth_type": "none",
  "rate_limit": 1000,
  "requires_mtls": false,
  "request_format": "http-get",
  "response_format": "html",
  "sample_request": "GET https://site-a.local/content/https://example.com/article/ai-trends-2024",
  "sample_response": "<html>...</html>",
  "ext": {
    "content_type": "text/html",
    "charset": "utf-8"
  }
}
```

**Best For**:
- Web scraping
- Browser-based access
- Human-readable content delivery

---

## Type 1: RSS Feed Syndication

**Use Case**: RSS/Atom feed syndication for content aggregators

**Configuration Example**:
```json
{
  "publisher_id": 1,
  "name": "RSS Feed",
  "description": "RSS/Atom feed syndication endpoint",
  "access_type": 1,
  "endpoint": "https://site-a.local/feed/rss",
  "auth_type": "api_key",
  "rate_limit": 100,
  "requires_mtls": false,
  "request_format": "http-get",
  "response_format": "xml",
  "sample_request": "GET https://site-a.local/feed/rss?api_key=xxx",
  "sample_response": "<?xml version=\"1.0\"?><rss version=\"2.0\">...</rss>",
  "ext": {
    "feed_type": "rss",
    "update_frequency": "hourly"
  }
}
```

**Best For**:
- Feed readers
- Content aggregators
- Syndication platforms
- News aggregation

---

## Type 2: RESTful API

**Use Case**: Programmatic API access with structured JSON responses

**Configuration Example**:
```json
{
  "publisher_id": 1,
  "name": "REST API",
  "description": "RESTful API for programmatic access",
  "access_type": 2,
  "endpoint": "https://site-a.local/api/v1/content",
  "auth_type": "api_key",
  "rate_limit": 500,
  "requires_mtls": false,
  "request_format": "json",
  "response_format": "json",
  "request_headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {api_key}"
  },
  "sample_request": "POST https://site-a.local/api/v1/content\nContent-Type: application/json\nAuthorization: Bearer api_key_here\n\n{\"url\": \"https://example.com/article/ai-trends-2024\"}",
  "sample_response": "{\"content\": \"...\", \"metadata\": {...}}",
  "ext": {
    "version": "v1",
    "supports_batch": true,
    "max_batch_size": 100
  }
}
```

**Best For**:
- Programmatic integrations
- Batch processing
- Custom applications
- Data pipelines

---

## Type 3: Model Context Protocol (MCP)

**Use Case**: [Model Context Protocol](https://modelcontextprotocol.io/) server for AI assistants

**Configuration Example**:
```json
{
  "publisher_id": 1,
  "name": "MCP Server",
  "description": "Model Context Protocol server endpoint",
  "access_type": 3,
  "endpoint": "https://site-a.local/mcp",
  "auth_type": "oauth2",
  "rate_limit": 200,
  "requires_mtls": true,
  "request_format": "json",
  "response_format": "json",
  "request_headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {oauth_token}"
  },
  "sample_request": "POST https://site-a.local/mcp\nContent-Type: application/json\nAuthorization: Bearer oauth_token\n\n{\"method\": \"content.fetch\", \"params\": {\"url\": \"https://example.com/article\"}}",
  "sample_response": "{\"result\": {...}, \"error\": null}",
  "ext": {
    "mcp_version": "1.0",
    "capabilities": ["content.fetch", "content.search", "content.summarize"]
  }
}
```

**Best For**:
- Claude Desktop integration
- AI assistant tools
- Standardized AI access
- Tool-based interactions

**MCP Methods Supported**:
- `content.fetch` - Retrieve single content
- `content.search` - Search content
- `content.list` - List available content

---

## Type 4: Natural Language Web (NLWeb)

**Use Case**: Natural language queries returning human-readable responses

**Configuration Example**:
```json
{
  "publisher_id": 1,
  "name": "NLWeb Access",
  "description": "Natural Language Web interface",
  "access_type": 4,
  "endpoint": "https://site-a.local/nlweb",
  "auth_type": "none",
  "rate_limit": 1000,
  "requires_mtls": false,
  "request_format": "http-get",
  "response_format": "html",
  "sample_request": "GET https://site-a.local/nlweb?query=latest+AI+news",
  "sample_response": "Here are the latest articles about AI...",
  "ext": {
    "nl_interface": true,
    "supports_queries": true,
    "language": "en"
  }
}
```

**Best For**:
- Conversational AI interfaces
- Chatbots
- Voice assistants
- Natural language queries

---

## Authentication Types

### `none` - No Authentication
- **Use Case**: Public content, demos
- **Security**: Low
- **Example**: Public RSS feeds, marketing content

### `api_key` - API Key Authentication
- **Use Case**: Identified clients, basic security
- **Security**: Medium
- **Header**: `Authorization: Bearer {api_key}` or `X-API-Key: {api_key}`
- **Example**: Standard API integrations

### `oauth2` - OAuth 2.0
- **Use Case**: Enterprise clients, high security
- **Security**: High
- **Header**: `Authorization: Bearer {oauth_token}`
- **Example**: Enterprise integrations, MCP servers

---

## Configuration Fields Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `publisher_id` | Integer | ✅ Yes | Publisher ID |
| `name` | String | ✅ Yes | Human-readable endpoint name |
| `description` | String | ⬜ No | Detailed description |
| `access_type` | Integer (0-4) | ✅ Yes | Access type (see above) |
| `endpoint` | String (URL) | ✅ Yes | Full endpoint URL |
| `auth_type` | Enum | ✅ Yes | `none`, `api_key`, or `oauth2` |
| `rate_limit` | Integer | ⬜ No | Requests per hour (default: 1000) |
| `requires_mtls` | Boolean | ⬜ No | Mutual TLS required (default: false) |
| `scopes` | Array[String] | ⬜ No | OAuth scopes if applicable |
| `request_format` | String | ⬜ No | Auto-set based on access_type |
| `response_format` | String | ⬜ No | Auto-set based on access_type |
| `request_headers` | Object | ⬜ No | Required HTTP headers |
| `sample_request` | String | ⬜ No | Example request for documentation |
| `sample_response` | String | ⬜ No | Example response for documentation |
| `ext` | JSONB | ⬜ No | Custom metadata |

---

## API Endpoints

### Get Access Types
```http
GET /api/access/meta/types
```

**Response**:
```json
{
  "success": true,
  "types": [
    { "value": 0, "name": "HTML", "description": "Standard HTML web access" },
    { "value": 1, "name": "RSS", "description": "RSS/Atom feed syndication" },
    { "value": 2, "name": "API", "description": "RESTful API access" },
    { "value": 3, "name": "MCP", "description": "Model Context Protocol server" },
    { "value": 4, "name": "NLWeb", "description": "Natural Language Web access" }
  ]
}
```

### Create Access Endpoint
```http
POST /api/access
Content-Type: application/json
X-User-Id: {userId}

{
  "publisher_id": 1,
  "name": "My API Endpoint",
  "access_type": 2,
  "endpoint": "https://api.example.com/v1/content",
  "auth_type": "api_key",
  "rate_limit": 500
}
```

### Get Access Endpoints for Publisher
```http
GET /api/access?publisherId=1
```

### Get Access Endpoints for License
```http
GET /api/access/license/{licenseId}
```

---

## Best Practices

### 1. **Match Access Type to Use Case**
- Use **HTML** (0) for web scraping
- Use **RSS** (1) for feed readers
- Use **API** (2) for structured data access
- Use **MCP** (3) for AI assistants
- Use **NLWeb** (4) for conversational interfaces

### 2. **Set Appropriate Rate Limits**
```
HTML/NLWeb: 1000-5000 req/hour  (high volume)
RSS: 100-500 req/hour            (periodic polling)
API: 500-2000 req/hour           (moderate)
MCP: 200-1000 req/hour           (AI assistants)
```

### 3. **Choose Right Authentication**
- **Public content** → `none`
- **Identified clients** → `api_key`
- **Enterprise/sensitive** → `oauth2`

### 4. **Require mTLS for Sensitive Data**
Set `requires_mtls: true` for:
- Financial data
- Healthcare information
- Regulated content
- High-value IP

### 5. **Document with Examples**
Always provide `sample_request` and `sample_response` to help integrators understand your API.

---

## Common Patterns

### Pattern 1: Multi-Access Content
**Scenario**: Same content accessible via multiple methods

```
Content ID: 123
├── Access Endpoint 1: HTML Web Access (public)
├── Access Endpoint 2: REST API (api_key required)
└── Access Endpoint 3: MCP Server (oauth2 required)
```

### Pattern 2: Tiered Access
**Scenario**: Different rate limits for different tiers

```
Free Tier License
└── RSS Feed (100 req/hour, no auth)

Standard License
└── REST API (500 req/hour, api_key)

Premium License
└── MCP Server (2000 req/hour, oauth2, mTLS)
```

### Pattern 3: Format Conversion
**Scenario**: Same content, different formats

```
Content: News Article
├── HTML: https://site.com/article/123
├── RSS: https://site.com/rss (includes article)
├── API: https://api.site.com/articles/123 (JSON)
└── NLWeb: https://site.com/query?q=article+123 (NL summary)
```

---

## Testing Access Endpoints

Use the **Grounding Test** feature in the Publisher Dashboard:

```http
POST /grounding/test
Content-Type: application/json

{
  "url": "https://example.com/article",
  "accessEndpointId": 8,
  "licenseId": 24,
  "publisherId": 1,
  "extractMainContent": true,
  "includeMetadata": true
}
```

This validates:
1. ✅ Endpoint is accessible
2. ✅ Authentication works
3. ✅ Content can be retrieved
4. ✅ Response format is correct

---

## Related Documentation

- [API Reference (CM_RTBSPEC)](./API_REFERENCE_CM_RTBSPEC.md) - Full API documentation
- [CM_RTBSPEC Implementation](./CM_RTBSPEC_IMPLEMENTATION.md) - Technical implementation details
- [Grounding Setup](./NEGOTIATION_SETUP.md) - Setting up grounding endpoints
- [Publisher Dashboard Guide](./README.md#️-publisher-dashboard) - UI guide

---

## Support

For questions about access endpoint configuration:
1. Check the sample endpoints in the dashboard (`/admin/populate-sample-data` creates examples)
2. Review the `insert-access-endpoints.sql` file for working examples
3. Test endpoints using the Grounding Test tool in the Publisher Dashboard

---

**Last Updated**: November 12, 2025

