# Manual Test Cases for Content Licensing Gateway

This document provides manual test cases to verify all three flows of the content licensing gateway.

------

## 🧩 Prerequisites

Ensure all services are running:

```
docker-compose up -d
```

Wait ~10 seconds for all services to initialize.

> 💡 **Note:**
>  If using **Windows PowerShell**, use `curl.exe` instead of `curl`, since `curl` is an alias for `Invoke-WebRequest`.
>  If using **WSL/macOS/Linux**, you can use `curl` as-is.

------

## 🧍‍♂️ Test 1: Human Access (Unaffected)

### Test 1.1: Human visits Publisher A

```
curl.exe -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)" `
         -H "Host: site-a.local" `
         "http://localhost:8080/news/foo.html"
```

**Expected:** HTTP 200, HTML content returned.

------

### Test 1.2: Human visits Publisher B

```
curl.exe -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" `
         -H "Host: site-b.local" `
         "http://localhost:8080/docs/a.html"
```

**Expected:** HTTP 200, HTML content returned.

------

### Test 1.3: Human browses multiple pages

```
curl.exe -H "User-Agent: Mozilla/5.0" "http://localhost:8080/"
curl.exe -H "User-Agent: Mozilla/5.0" "http://localhost:8080/tech/bar.html"
```

**Expected:** All requests return HTTP 200.

------

## 🤖 Test 2: Unlicensed Bot (302 Redirect)

### Test 2.1: GPTBot without token

```
curl.exe -i -H "User-Agent: GPTBot/1.0" `
         -H "Host: site-a.local" `
         "http://localhost:8080/news/foo.html"
```

**Expected:**

- HTTP 302 Redirect
- `Location` header points to:
   `http://licensing-api:3000/authorize?url=...&ua=...`

------

### Test 2.2: ClaudeBot without token

```
curl.exe -i -H "User-Agent: ClaudeBot/1.0" `
         -H "Host: site-b.local" `
         "http://localhost:8080/docs/b.html"
```

**Expected:** HTTP 302 Redirect to authorization page.

------

### Test 2.3: Perplexity bot without token

```
curl.exe -i -H "User-Agent: PerplexityBot/1.0" `
         "http://localhost:8080/tech/bar.html"
```

**Expected:** HTTP 302 Redirect.

------

### Test 2.4: View authorization page

```
curl.exe "http://localhost:3000/authorize?url=http://site-a.local/news/foo.html&ua=GPTBot/1.0"
```

**Expected:** HTML page with instructions on how to obtain a token.

------

## 🔐 Test 3: Licensed Bot (Token Flow)

### Test 3.1: Request a token

```
curl.exe -X POST http://localhost:3000/token `
  -H "Content-Type: application/json" `
  -d '{"url":"http://site-a.local/news/foo.html","ua":"GPTBot/1.0","purpose":"inference"}'
```

**Expected:**

```
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_at": "2025-10-27T12:10:00.000Z",
  "expires_in": 600,
  "publisher": "site-a.local",
  "purpose": "inference",
  "cost_per_fetch": 0.002
}
```

------

### Test 3.2: Access content with token (query param)

```
curl.exe -H "User-Agent: GPTBot/1.0" `
         -H "Host: site-a.local" `
         "http://localhost:8080/news/foo.html?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnYXRlaG91c2UtbGljZW5zaW5nIiwiYXVkIjoiZ2F0ZWhvdXNlLWVkZ2UiLCJzdWIiOiJhbm9ueW1vdXMiLCJwdWJsaXNoZXJfaWQiOjEsInB1Ymxpc2hlciI6InNpdGUtYS5sb2NhbCIsInVybCI6Imh0dHA6Ly9zaXRlLWEubG9jYWwvbmV3cy9mb28uaHRtbCIsInB1cnBvc2UiOiJpbmZlcmVuY2UiLCJqdGkiOiI5NWY3ZGZhMi0yOTcwLTQyZTMtODIyZi0yZWU2OTViMzljZTIiLCJpYXQiOjE3NjE1OTgzNzMsImV4cCI6MTc2MTU5ODk3M30.ltPPCuTzCd9WcFcQOw97tQhmCypHA7UOo7QdEdwSswc"
```

**Expected:** HTTP 200, licensed content returned.

------

### Test 3.3: Access content with token (header)

```
curl.exe -H "User-Agent: GPTBot/1.0" `
         -H "X-Agent-Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnYXRlaG91c2UtbGljZW5zaW5nIiwiYXVkIjoiZ2F0ZWhvdXNlLWVkZ2UiLCJzdWIiOiJhbm9ueW1vdXMiLCJwdWJsaXNoZXJfaWQiOjEsInB1Ymxpc2hlciI6InNpdGUtYS5sb2NhbCIsInVybCI6Imh0dHA6Ly9zaXRlLWEubG9jYWwvbmV3cy9mb28uaHRtbCIsInB1cnBvc2UiOiJpbmZlcmVuY2UiLCJqdGkiOiI5NWY3ZGZhMi0yOTcwLTQyZTMtODIyZi0yZWU2OTViMzljZTIiLCJpYXQiOjE3NjE1OTgzNzMsImV4cCI6MTc2MTU5ODk3M30.ltPPCuTzCd9WcFcQOw97tQhmCypHA7UOo7QdEdwSswc" `
         -H "Host: site-a.local" `
         "http://localhost:8080/news/foo.html"
```

**Expected:** HTTP 200, licensed content returned.

------

### Test 3.4: Verify token explicitly

```
curl.exe "http://localhost:3000/verify?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnYXRlaG91c2UtbGljZW5zaW5nIiwiYXVkIjoiZ2F0ZWhvdXNlLWVkZ2UiLCJzdWIiOiJhbm9ueW1vdXMiLCJwdWJsaXNoZXJfaWQiOjEsInB1Ymxpc2hlciI6InNpdGUtYS5sb2NhbCIsInVybCI6Imh0dHA6Ly9zaXRlLWEubG9jYWwvbmV3cy9mb28uaHRtbCIsInB1cnBvc2UiOiJpbmZlcmVuY2UiLCJqdGkiOiIyNjk5YTBjNS02Nzk0LTQ1ZGMtYWJjZi03NWM1YWM5NTBlZmQiLCJpYXQiOjE3NjE1OTkxNzUsImV4cCI6MTc2MTU5OTc3NX0.9CK15kFINd63pva1qwAwEF_w3ID9aJtv_E-XLQ2AFEA&url=http://site-a.local/news/foo.html"
```

**Expected:**

```
{
  "valid": true,
  "publisher_id": 1,
  "client_id": "anonymous",
  "purpose": "inference",
  "jti": "...",
  "expires_at": "..."
}
```

------

## ⚠️ Test 4: Error Cases

### Test 4.1: Invalid token

```
curl.exe -H "User-Agent: GPTBot/1.0" `
         "http://localhost:8080/news/foo.html?token=invalid-token-here"
```

**Expected:** HTTP 403, error message.

------

### Test 4.2: Expired token

After 10 minutes (token expiry) or manual revoke:

```
curl.exe -H "User-Agent: GPTBot/1.0" `
         "http://localhost:8080/news/foo.html?token=EXPIRED_TOKEN"
```

**Expected:** HTTP 403, `"expired"` reason.

------

### Test 4.3: Token for wrong URL

```
curl.exe -H "User-Agent: GPTBot/1.0" `
         "http://localhost:8080/tech/bar.html?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnYXRlaG91c2UtbGljZW5zaW5nIiwiYXVkIjoiZ2F0ZWhvdXNlLWVkZ2UiLCJzdWIiOiJhbm9ueW1vdXMiLCJwdWJsaXNoZXJfaWQiOjEsInB1Ymxpc2hlciI6InNpdGUtYS5sb2NhbCIsInVybCI6Imh0dHA6Ly9zaXRlLWEubG9jYWwvbmV3cy9mb28uaHRtbCIsInB1cnBvc2UiOiJpbmZlcmVuY2UiLCJqdGkiOiI5NWY3ZGZhMi0yOTcwLTQyZTMtODIyZi0yZWU2OTViMzljZTIiLCJpYXQiOjE3NjE1OTgzNzMsImV4cCI6MTc2MTU5ODk3M30.ltPPCuTzCd9WcFcQOw97tQhmCypHA7UOo7QdEdwSswc"
```

**Expected:** HTTP 403, `"url_mismatch"` reason.

------

### Test 4.4: Rate limit exceeded

```
for ($i=1; $i -le 15; $i++) {
  curl.exe -H "User-Agent: GPTBot/1.0" "http://localhost:8080/"
}
```

**Expected:** Later requests return HTTP 429.

------

## 🧑‍💼 Test 5: Admin Endpoints

```
# 5.1 List publishers
curl.exe http://localhost:3000/admin/publishers

# 5.2 List clients
curl.exe http://localhost:3000/admin/clients

# 5.3 List plans
curl.exe http://localhost:3000/admin/plans

# 5.4 Query usage events
curl.exe "http://localhost:3000/usage?publisherId=1&limit=10"

# 5.5 Get access logs
curl.exe "http://localhost:3000/admin/logs?limit=20"
```

**Expected:** Each returns JSON with relevant records.

------

## ⚙️ Test 6: Policy Management

### Test 6.1: Get Publisher A policy

```
curl.exe http://localhost:3000/policies/1
```

**Expected:** JSON policy for Publisher A.

------

### Test 6.2: Get Publisher B policy

```
curl.exe http://localhost:3000/policies/2
```

**Expected:** JSON policy for Publisher B.

------

### Test 6.3: Update policy

```
curl.exe -X PUT http://localhost:3000/policies/1 `
  -H "Content-Type: application/json" `
  -d '{
    "policy": {
      "version": "1.1",
      "publisher": "site-a.local",
      "default": { "allow": false },
      "rules": [
        {
          "agent": "Claude",
          "allow": true,
          "purpose": ["inference"],
          "price_per_fetch": 0.003,
          "token_ttl_seconds": 900
        }
      ]
    }
  }'
```

**Expected:** Success response with updated version.

------

## 🔄 Test 7: Multi-Request Scenarios

### Test 7.1: Bot lifecycle (full flow)

```
# 1️⃣ Bot tries without token → redirect
curl.exe -i -H "User-Agent: TestBot/1.0" -H "Host: site-a.local" "http://localhost:8080/news/foo.html"

# 2️⃣ Bot requests token (PowerShell method)
$body = @{url="http://site-a.local/news/foo.html"; ua="TestBot/1.0"; purpose="inference"} | ConvertTo-Json
$response = Invoke-RestMethod -Uri http://localhost:3000/token -Method POST -ContentType "application/json" -Body $body
$TOKEN = $response.token

# 3️⃣ Bot accesses with token → success
curl.exe -H "User-Agent: TestBot/1.0" -H "Host: site-a.local" "http://localhost:8080/news/foo.html?token=$TOKEN"

# 4️⃣ Check usage was recorded
curl.exe "http://localhost:3000/usage?limit=1"
```

------

### Test 7.2: Multiple bots, different publishers

```
# GPTBot on Publisher A
curl.exe -X POST http://localhost:3000/token `
  -H "Content-Type: application/json" `
  -d '{"url":"http://site-a.local/news/foo.html","ua":"GPTBot/1.0","purpose":"inference"}'

# ClaudeBot on Publisher B
curl.exe -X POST http://localhost:3000/token `
  -H "Content-Type: application/json" `
  -d '{"url":"http://site-b.local/docs/a.html","ua":"ClaudeBot/1.0","purpose":"training"}'
```

**Expected:** Different tokens and pricing per publisher policy.

------

## 🔄 Test 8: URL Library Feature

### Test 8.1: Parse URL and auto-save to library

```
curl.exe -X POST http://localhost:3000/grounding `
  -H "Content-Type: application/json" `
  -d '{
    "url": "http://site-a.local/news/foo.html",
    "userAgent": "TestBot/1.0",
    "purpose": "inference",
    "clientId": "test-client",
    "extractMainContent": true,
    "includeMetadata": true
  }'
```

**Expected:** HTTP 200, URL parsed and automatically saved to library.

------

### Test 8.2: List all URLs in library

```
curl.exe http://localhost:3000/parsed-urls
```

**Expected:**
```json
{
  "success": true,
  "urls": [...],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

------

### Test 8.3: Get library statistics

```
curl.exe http://localhost:3000/parsed-urls/stats/summary
```

**Expected:**
```json
{
  "success": true,
  "stats": {
    "total_urls": "1",
    "unique_domains": "1",
    "total_parses": "1"
  },
  "topDomains": [...]
}
```

------

### Test 8.4: Parse same URL again (increment parse_count)

```
curl.exe -X POST http://localhost:3000/grounding `
  -H "Content-Type: application/json" `
  -d '{
    "url": "http://site-a.local/news/foo.html",
    "userAgent": "TestBot/1.0",
    "purpose": "inference"
  }'
```

**Expected:** parse_count increments to 2 for that URL.

------

### Test 8.5: Search/filter URLs

```
# Filter by domain
curl.exe "http://localhost:3000/parsed-urls?domain=site-a.local"

# Search by text
curl.exe "http://localhost:3000/parsed-urls?search=news"

# Sort by parse count
curl.exe "http://localhost:3000/parsed-urls?sortBy=parse_count&sortOrder=desc"
```

**Expected:** Filtered results matching criteria.

------

### Test 8.6: View URL Library in Dashboard

1. Open dashboard: `http://localhost:5173`
2. Login with Publisher ID: 1
3. Click "📚 URL Library" in sidebar
4. Verify URLs appear in the table
5. Test search and filter functionality
6. Try deleting a URL

**Expected:** All UI operations work correctly.

------

### Test 8.7: Delete URL from library

First, get a URL ID from the list, then:

```
curl.exe -X DELETE http://localhost:3000/parsed-urls/1
```

**Expected:**
```json
{
  "success": true,
  "message": "URL removed from library",
  "url": {...}
}
```

------

## ✅ Verification Checklist

- [ ] Human access unrestricted
- [ ] Bots without tokens → 302 redirects
- [ ] Authorization page visible
- [ ] Token issuance via API works
- [ ] Valid tokens grant content access
- [ ] Invalid / expired tokens rejected
- [ ] URL mismatch detected
- [ ] Rate limiting works
- [ ] Usage events logged
- [ ] Admin endpoints functional
- [ ] Policies retrievable & editable
- [ ] Distinct policies per publisher
- [ ] `/verify` endpoint validates tokens
- [ ] Header & query token forms both work
- [ ] URLs auto-saved to library when parsed
- [ ] URL library API endpoints work
- [ ] URL library UI displays saved URLs
- [ ] Parse count increments on re-parse
- [ ] Search and filter URLs works
- [ ] Delete URLs from library works

------

## 🧹 Cleanup

Stop all services:

```
docker-compose down
```

Reset all data:

```
docker-compose down -v
docker-compose up -d
```