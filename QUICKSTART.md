# 🚀 Quick Start Guide

Get the Content Licensing Gateway running in 5 minutes!

## Prerequisites Check

```powershell
# Check Docker is installed
docker --version

# Check Docker Compose is installed
docker-compose --version

# Check required ports are available
netstat -an | findstr "80 3001 3000 5432 6379"
```

If ports are in use, stop conflicting services or modify `docker-compose.yml`.

## Step 1: Start Services

```powershell
# Navigate to project directory
cd C:\Users\paulfarrow\Documents\Coding\Tollbit

# Start all services in detached mode
docker-compose up -d

# Wait 10 seconds for initialization
Start-Sleep -Seconds 10

# Verify all services are running
docker-compose ps
```

You should see:
- ✓ tollbit-edge
- ✓ tollbit-edge-worker
- ✓ tollbit-licensing-api
- ✓ tollbit-publisher-a
- ✓ tollbit-publisher-b
- ✓ tollbit-postgres
- ✓ tollbit-redis

## Step 2: Run Quick Test

```powershell
# Test 1: Human access (should work)
curl -H "User-Agent: Mozilla/5.0" http://localhost:3001/

# Test 2: Bot without token (should redirect)
curl -i -H "User-Agent: GPTBot/1.0" http://localhost:3001/news/foo.html

# Test 3: Get a token
$response = Invoke-RestMethod -Uri "http://localhost:3000/token" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"url":"http://site-a.local/news/foo.html","ua":"GPTBot/1.0","purpose":"inference"}'

$token = $response.token
Write-Host "Token: $token"

# Test 4: Access with token (should work)
curl -H "User-Agent: GPTBot/1.0" "http://localhost:3001/news/foo.html?token=$token"
```

## Step 3: Run Full Test Suite

```powershell
cd tests
.\run-tests.ps1
```

## Step 4: Explore

### View Authorization Page
Open in browser: http://localhost:3000/authorize?url=http://site-a.local/news/foo.html&ua=GPTBot/1.0

### Check Admin Endpoints
```powershell
# List publishers
curl http://localhost:3000/admin/publishers | ConvertFrom-Json

# List clients
curl http://localhost:3000/admin/clients | ConvertFrom-Json

# View usage
curl http://localhost:3000/usage?limit=10 | ConvertFrom-Json

# View logs
curl http://localhost:3000/admin/logs?limit=10 | ConvertFrom-Json
```

### Access Publisher Sites
- Publisher A: http://localhost:3001/ (news content)
- Publisher B: http://localhost:3001/docs/a.html (documentation)

### Telemetry Ingestion (Optional)

```bash
# Post NDJSON telemetry records (replace X-MAI Monetize-Key with publisher's hashed key)
curl -X POST http://localhost:3000/api/logs/ingest \
  -H "Content-Type: application/json" \
  -H "X-MAI Monetize-Key: <publisher-api-key>" \
  -d '[
    {
      "timestamp": "2025-01-01T12:00:00Z",
      "host": "site-a.local",
      "url": "https://site-a.local/news/foo.html",
      "method": "GET",
      "status": 200,
      "user_agent": "GPTBot/1.0",
      "country": "US",
      "latency_ms": 120,
      "source": "fastly"
    }
  ]'
```

## Common Commands

```powershell
# View logs
docker-compose logs -f edge-worker
docker-compose logs -f licensing-api

# Restart a service
docker-compose restart edge-worker

# Stop everything
docker-compose down

# Stop and remove data
docker-compose down -v

# Rebuild after code changes
docker-compose build
docker-compose up -d
```

## Database Access

```powershell
# Connect to PostgreSQL
docker exec -it tollbit-postgres psql -U tollbit -d tollbit

# Useful queries
SELECT * FROM publishers;
SELECT * FROM policies;
SELECT * FROM usage_events ORDER BY ts DESC LIMIT 10;
```

## Redis Access

```powershell
# Connect to Redis
docker exec -it tollbit-redis redis-cli

# Check keys
KEYS *
KEYS ratelimit:*
KEYS token:*
```

## Troubleshooting

### Port already in use
```powershell
# Find what's using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Service won't start
```powershell
# Check logs
docker-compose logs <service-name>

# Rebuild
docker-compose build <service-name>
docker-compose up -d <service-name>
```

### Database issues
```powershell
# Reset database
docker-compose down -v
docker-compose up -d postgres
Start-Sleep -Seconds 5
docker-compose up -d
```

## Next Steps

1. Read the full [README.md](README.md)
2. Review [Manual Test Cases](tests/MANUAL_TESTS.md)
3. Explore the API with Postman/Insomnia
4. Modify policies and see behavior change
5. Add custom bot detection patterns
6. Create your own publisher site

## Architecture at a Glance

```
Browser/Bot → Edge Worker (:3001)
  → Licensing API (:3000)
    → Publisher A/B (content)

UI: Publisher Dashboard (Nginx :80)
Data: PostgreSQL (policies, usage)
Cache: Redis (rate limits, tokens)
```

## Key Files to Explore

- `docker-compose.yml` - Service definitions
- `edge-worker/src/app.js` - Bot detection & routing
- `licensing-api/src/routes/auth.js` - Token issuance
- `database/init.sql` - Schema & seed data
- `tests/run-tests.ps1` - Automated tests

## Success Criteria

✓ All Docker containers running  
✓ Humans can access content  
✓ Bots get redirected  
✓ Tokens can be obtained  
✓ Valid tokens grant access  
✓ Usage is recorded  

## Getting Help

1. Check `docker-compose logs`
2. Review README troubleshooting section
3. Verify all prerequisites are met
4. Ensure ports are available

---

**Enjoy exploring the Content Licensing Gateway!** 🎉
