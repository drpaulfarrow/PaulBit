# 🚨 URGENT: Restore Service

Your app is currently down with 502 errors. Here's how to fix it immediately:

## Quick Fix (5 minutes)

### Option 1: Rollback to Working Version

If you have the old licensing-api image still in Docker Hub, rollback:

```bash
# Check Docker Hub for previous image tags
# Then update Azure to use old tag

az webapp config appsettings set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --settings \
    DOCKER_CUSTOM_IMAGE_NAME="paulandrewfarrow/monetizeplus-licensing-api:old-tag"

az webapp restart --name monetizeplusapp --resource-group MonetizePlusRG
```

### Option 2: Remove Google OAuth Files (Fastest)

```bash
cd /Users/pfarrow/Coding/PaulBit/licensing-api

# Temporarily remove Google OAuth route
rm src/routes/google-auth.js

# Remove from package.json
# Edit licensing-api/package.json and remove: "google-auth-library": "^9.0.0",

# Rebuild
docker build -t paulandrewfarrow/monetizeplus-licensing-api:latest .
docker push paulandrewfarrow/monetizeplus-licensing-api:latest

# Restart Azure
az webapp restart --name monetizeplusapp --resource-group MonetizePlusRG
```

### Option 3: Check What's Actually Wrong

The issue might not be Google OAuth at all. Check Azure logs:

```bash
# Stream logs to see what's failing
az webapp log tail \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG
```

## What I Recommend

Since we can't see Azure logs easily, the safest is:

1. **Delete the Google OAuth files** I created (they're all new, won't break existing code)
2. **Rebuild and deploy**
3. **Get your app working again**
4. **Then debug Google OAuth separately**

## Files to Remove for Quick Fix

```bash
rm licensing-api/src/routes/google-auth.js
rm licensing-api/database/migrations/023_google_auth.sql
rm publisher-dashboard/src/components/GoogleLogin.jsx
rm publisher-dashboard/src/components/PublisherSelector.jsx
```

Then revert changes to:
- `licensing-api/package.json` (remove google-auth-library)
- `licensing-api/src/server.js` (remove google-auth imports)
- `publisher-dashboard/package.json` (remove @react-oauth/google and jwt-decode)
- `publisher-dashboard/src/App.jsx` (revert to original)

## Current Status

- ✅ Dashboard page loads (200 OK)
- ❌ API endpoints (502 Bad Gateway)
- ❌ Your app is unusable

**Action needed**: Choose Option 1, 2, or 3 above to restore service.

Sorry for the disruption! Once we get it working, we can add Google OAuth more carefully.

