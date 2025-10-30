# Azure Database Initialization Guide

## Problem
Your Azure deployment has an empty PostgreSQL database, causing 404 errors on `/policies/:id` and login failures.

## Solution
Use the new `/admin/init-db` endpoint to initialize the database with publishers, policies, and seed data.

## Steps

### 1. Restart your Azure App Service (to get the latest image)
```bash
az webapp restart \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG
```

### 2. Wait for the app to restart (30-60 seconds)
Check logs:
```bash
az webapp log tail \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG
```

### 3. Initialize the database
Using PowerShell:
```powershell
curl.exe -X POST https://monetizeplusapp.azurewebsites.net/admin/init-db
```

Or using Azure Cloud Shell (bash):
```bash
curl -X POST https://monetizeplusapp.azurewebsites.net/admin/init-db
```

### 4. Verify the initialization
```powershell
curl.exe https://monetizeplusapp.azurewebsites.net/admin/db-status
```

Expected output:
```json
{
  "success": true,
  "initialized": true,
  "counts": {
    "publishers": 2,
    "policies": 2,
    "plans": 4,
    "clients": 4
  }
}
```

### 5. Test the login
Visit your dashboard and try logging in:
```
https://monetizeplusapp.azurewebsites.net/
```

Available publishers:
- **Publisher A News** (hostname: `site-a.local`)
- **Publisher B Documentation** (hostname: `site-b.local`)

## What Gets Created

### Publishers (2)
1. Publisher A News - `site-a.local`
2. Publisher B Documentation - `site-b.local`

### Policies (2)
Both publishers have policies that allow:
- **GPTBot** (OpenAI)
- **ClaudeBot** (Anthropic) ✅
- **Perplexity**

### Plans (4)
- Free Tier
- Standard
- Premium
- Enterprise

### Clients (4)
- OpenAI
- Anthropic
- Perplexity
- Anonymous Bots

## Troubleshooting

### If initialization fails
Check the logs:
```bash
az webapp log tail --name monetizeplusapp --resource-group MonetizePlusRG
```

### If you still get 404s
Make sure the app restarted and picked up the new image:
```bash
az webapp restart --name monetizeplusapp --resource-group MonetizePlusRG
```

Wait 30-60 seconds, then try initializing again.

### To re-initialize (if needed)
The endpoint is idempotent - it uses `INSERT ... ON CONFLICT DO NOTHING`, so you can run it multiple times safely.

## Next Steps

After initialization:
1. ✅ Login to the dashboard
2. ✅ ClaudeBot is already enabled in the default policies
3. ✅ Test bot access via the edge worker
