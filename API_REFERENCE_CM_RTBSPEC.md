# CM RTB Spec v0.1 API Reference

This document describes the new cm_rtbspec-compliant API endpoints for content licensing.

## Base URL
```
http://localhost:3000
```

---

## Content API

### Get All Content
```
GET /api/content?publisherId={id}&content_origin={0-2}&has_third_party_media={true|false}&search={query}&limit={n}
```

**Query Parameters:**
- `publisherId` (required): Publisher ID
- `content_origin` (optional): Filter by origin (0=Human, 1=AI, 2=Hybrid)
- `has_third_party_media` (optional): Filter by third-party media presence
- `search` (optional): Text search in URL or content
- `limit` (optional): Maximum results

**Response:**
```json
{
  "success": true,
  "content": [
    {
      "id": 1,
      "content_id": "uuid-1234",
      "publisher_id": 1,
      "url": "https://example.com/article",
      "content_origin": 0,
      "body_word_count": 1500,
      "authority_score": 0.92,
      "originality_score": 0.88,
      "has_third_party_media": false,
      "created_ts": "2024-01-15T10:00:00Z"
    }
  ]
}
```

### Get Single Content
```
GET /api/content/{id}
```

### Export Content to cm_rtbspec Format
```
GET /api/content/{id}/export
```

**Response:** Full cm_rtbspec v0.1 compliant JSON with nested licenses and access endpoints.

### Export All Publisher Content
```
GET /api/content/publisher/{publisherId}/export
```

**Response:**
```json
{
  "cm_rtbspec": "0.1",
  "publisher_id": 1,
  "count": 250,
  "content": [ /* array of cm_rtbspec objects */ ]
}
```

### Create Content
```
POST /api/content
Content-Type: application/json
X-User-Id: {userId}

{
  "publisher_id": 1,
  "url": "https://example.com/article",
  "content_origin": 0,
  "body_word_count": 1500,
  "authority_score": 0.92,
  "originality_score": 0.88,
  "has_third_party_media": false
}
```

### Update Content
```
PUT /api/content/{id}
Content-Type: application/json
X-User-Id: {userId}

{
  "authority_score": 0.95,
  "originality_score": 0.90
}
```

### Delete Content
```
DELETE /api/content/{id}?userId={userId}
```

---

## License API

### Get All Licenses
```
GET /api/licenses?publisherId={id}&contentId={id}&license_type={0-4}&status={active|inactive}&limit={n}
```

**Query Parameters:**
- `publisherId` (required): Publisher ID
- `contentId` (optional): Filter by content ID
- `license_type` (optional): Filter by license type (0-4)
- `status` (optional): Filter by status
- `limit` (optional): Maximum results

**Response:**
```json
{
  "success": true,
  "licenses": [
    {
      "id": 1,
      "license_id": "uuid-5678",
      "content_id": 1,
      "license_type": 2,
      "price": 0.05,
      "currency": "USD",
      "term_months": 12,
      "max_word_count": 500,
      "status": "active"
    }
  ]
}
```

### License Types Reference
```
GET /api/licenses/meta/types
```

**Response:**
```json
{
  "success": true,
  "types": [
    { "value": 0, "name": "Training + Display", "requires": ["price", "currency"] },
    { "value": 1, "name": "RAG Unrestricted", "requires": ["price", "currency"] },
    { "value": 2, "name": "RAG Max Words", "requires": ["price", "currency", "max_word_count"] },
    { "value": 3, "name": "RAG Attribution", "requires": ["price", "currency", "attribution_required"] },
    { "value": 4, "name": "RAG No Display", "requires": ["price", "currency"] }
  ]
}
```

### Get Single License
```
GET /api/licenses/{id}
```

### Get Licenses for Content
```
GET /api/licenses/content/{contentId}
```

### Create License
```
POST /api/licenses
Content-Type: application/json
X-User-Id: {userId}

{
  "content_id": 1,
  "license_type": 2,
  "price": 0.05,
  "currency": "USD",
  "term_months": 12,
  "max_word_count": 500,
  "status": "active"
}
```

**Note:** The API validates conditional fields:
- Type 2 (RAG Max Words) requires `max_word_count`
- Type 3 (RAG Attribution) requires `attribution_required: true`

### Clone License
```
POST /api/licenses/{id}/clone
Content-Type: application/json
X-User-Id: {userId}

{
  "content_id": 2,
  "price": 0.06
}
```

### Validate License Schema
```
POST /api/licenses/validate
Content-Type: application/json

{
  "license": {
    "license_type": 2,
    "price": 0.05,
    "currency": "USD"
  }
}
```

**Response (validation error):**
```json
{
  "success": false,
  "valid": false,
  "errors": ["License type 2 (RAG Max Words) requires max_word_count"]
}
```

### Update License
```
PUT /api/licenses/{id}
Content-Type: application/json
X-User-Id: {userId}

{
  "price": 0.06,
  "status": "inactive"
}
```

### Delete License
```
DELETE /api/licenses/{id}?userId={userId}
```

---

## Access Endpoint API

### Get Access Endpoints for License
```
GET /api/access/license/{licenseId}
```

**Response:**
```json
{
  "success": true,
  "endpoints": [
    {
      "id": 1,
      "license_id": 1,
      "access_type": 2,
      "endpoint": "https://api.example.com/content",
      "auth_type": "api_key",
      "rate_limit": 1000,
      "requires_mtls": false
    }
  ]
}
```

### Access Types Reference
```
GET /api/access/meta/types
```

**Response:**
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

### Get Single Access Endpoint
```
GET /api/access/{id}
```

### Create Access Endpoint
```
POST /api/access
Content-Type: application/json
X-User-Id: {userId}

{
  "license_id": 1,
  "access_type": 2,
  "endpoint": "https://api.example.com/content",
  "auth_type": "api_key",
  "rate_limit": 1000,
  "requires_mtls": false
}
```

**Auth Types:** `none`, `api_key`, `oauth2`

### Test Endpoint Accessibility
```
POST /api/access/{id}/test
```

**Response:**
```json
{
  "success": true,
  "test": {
    "accessible": true,
    "status_code": 200,
    "tested_at": "2024-01-15T12:00:00Z"
  }
}
```

### Update Access Endpoint
```
PUT /api/access/{id}
Content-Type: application/json
X-User-Id: {userId}

{
  "rate_limit": 2000,
  "auth_type": "oauth2"
}
```

### Delete Access Endpoint
```
DELETE /api/access/{id}?userId={userId}
```

---

## Audit Trail API

### Get Audit Trail for Entity
```
GET /api/audit/{entityType}/{entityId}?action={create|update|delete}&userId={id}&startDate={iso8601}&endDate={iso8601}&limit={n}
```

**Entity Types:** `content`, `license`, `access_endpoint`

**Response:**
```json
{
  "success": true,
  "trail": [
    {
      "id": 1,
      "entity_type": "license",
      "entity_id": 1,
      "action": "update",
      "user_id": 123,
      "changed_fields": ["price", "status"],
      "old_values": { "price": 0.05, "status": "active" },
      "new_values": { "price": 0.06, "status": "inactive" },
      "created_at": "2024-01-15T12:00:00Z"
    }
  ]
}
```

### Get Recent Audit Events
```
GET /api/audit/recent?entityType={type}&action={action}&userId={id}&startDate={iso8601}&endDate={iso8601}&limit={n}
```

### Export Audit Trail to CSV
```
GET /api/audit/{entityType}/{entityId}/export
```

**Response:** CSV file download

---

## Marketplace Discovery Endpoint

### Get Publisher's cm-license.json
```
GET /.well-known/cm-license.json?publisherId={id}
```

**Purpose:** Enables buyer systems to discover available licenses.

**Response:**
```json
{
  "cm_rtbspec": "0.1",
  "publisher_id": 1,
  "generated_at": "2024-01-15T12:00:00Z",
  "count": 250,
  "content": [
    {
      "content_id": "uuid-1234",
      "publisher_id": 1,
      "url": "https://example.com/article",
      "content_origin": 0,
      "body_word_count": 1500,
      "authority_score": 0.92,
      "originality_score": 0.88,
      "has_third_party_media": false,
      "license_options": [
        {
          "license_id": "uuid-5678",
          "license_type": 2,
          "price": 0.05,
          "currency": "USD",
          "term_months": 12,
          "max_word_count": 500,
          "access_endpoints": [
            {
              "access_type": 2,
              "endpoint": "https://api.example.com/content",
              "auth_type": "api_key",
              "rate_limit": 1000
            }
          ]
        }
      ]
    }
  ]
}
```

**Headers:**
- `Content-Type: application/json`
- `Access-Control-Allow-Origin: *` (for buyer discovery)

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

**Common HTTP Status Codes:**
- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication

Currently using `X-User-Id` header for audit logging. Future versions will implement proper JWT authentication.

---

## Examples

### Complete Content Creation Flow

**1. Create content asset:**
```bash
curl -X POST http://localhost:3000/api/content \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{
    "publisher_id": 1,
    "url": "https://example.com/article",
    "content_origin": 0,
    "body_word_count": 1500,
    "authority_score": 0.92
  }'
```

**2. Create license for content:**
```bash
curl -X POST http://localhost:3000/api/licenses \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{
    "content_id": 1,
    "license_type": 2,
    "price": 0.05,
    "currency": "USD",
    "max_word_count": 500,
    "status": "active"
  }'
```

**3. Create access endpoint:**
```bash
curl -X POST http://localhost:3000/api/access \
  -H "Content-Type: application/json" \
  -H "X-User-Id: 1" \
  -d '{
    "license_id": 1,
    "access_type": 2,
    "endpoint": "https://api.example.com/content",
    "auth_type": "api_key",
    "rate_limit": 1000
  }'
```

**4. Export to cm_rtbspec format:**
```bash
curl http://localhost:3000/api/content/1/export
```

**5. Check audit trail:**
```bash
curl http://localhost:3000/api/audit/content/1
```
