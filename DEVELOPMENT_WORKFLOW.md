# Development Workflow: Dev vs Production

## ✅ Your Understanding is Correct

**Yes, you can make changes that will work in both dev and production!** The codebase is designed to automatically adapt to the environment.

---

## How It Works

### 1. Same Source Code

All your application code (React components, API routes, database queries) is **identical** for both environments:

```
publisher-dashboard/src/          ← Same code for dev & production
licensing-api/src/                ← Same code for dev & production
```

### 2. Automatic Environment Detection

The code automatically detects which environment it's running in:

**Frontend (`apiConfig.js`):**
```javascript
// Automatically detects:
// - localhost:5173 → Dev (Vite dev server)
// - Everything else → Production (Docker/Azure)
```

**Behavior:**
- **Dev (localhost:5173)**: Uses absolute URLs (`http://localhost:3000`)
- **Production (Docker/Azure)**: Uses relative URLs (goes through Nginx proxy)

### 3. Environment-Specific Configuration

Only **configuration files** differ between environments:

| File | Dev | Production |
|------|-----|------------|
| `docker-compose.yml` | Full stack (6 services) | N/A |
| `docker-compose.azure.yml` | N/A | Minimal stack (4 services) |
| `nginx.conf` | Dev proxy rules | N/A |
| `nginx.azure.conf` | N/A | Azure proxy rules |
| Environment Variables | `REDIS_ENABLED=true` | `REDIS_ENABLED=false` |

**Key Point:** Your application **code** doesn't need to know which config is being used.

---

## Development Workflow

### Typical Development Cycle

1. **Make Code Changes**
   ```bash
   # Edit files in:
   - publisher-dashboard/src/
   - licensing-api/src/
   ```

2. **Test Locally**
   ```bash
   # Option 1: Docker (closest to production)
   docker-compose up -d
   # Visit http://localhost
   
   # Option 2: Dev server (faster iteration)
   cd publisher-dashboard
   npm run dev
   # Visit http://localhost:5173
   ```

3. **Verify It Works**
   - Test your changes locally
   - The same code will work in production

4. **Deploy to Production** (when ready)
   ```bash
   ./azure-deploy.sh
   # Your changes are automatically included
   ```

---

## What Changes Work in Both Environments

### ✅ These Work Automatically:

1. **React Components** (`publisher-dashboard/src/pages/`)
   - All UI changes
   - New pages/routes
   - Component updates

2. **API Routes** (`licensing-api/src/routes/`)
   - New endpoints
   - Route modifications
   - Business logic changes

3. **Database Queries** (`licensing-api/src/`)
   - SQL queries
   - Database migrations
   - Model changes

4. **Styling** (`publisher-dashboard/src/`)
   - CSS/Tailwind changes
   - UI improvements

### ⚠️ Watch Out For:

1. **Hard-coded URLs**
   ```javascript
   // ❌ DON'T DO THIS
   const api = 'http://localhost:3000';
   
   // ✅ DO THIS (uses apiConfig.js)
   import { LICENSING_API } from '../utils/apiConfig';
   const api = `${LICENSING_API}/endpoint`;
   ```

2. **Environment-Specific Code**
   ```javascript
   // ❌ DON'T DO THIS
   if (window.location.hostname === 'localhost') {
     // special dev code
   }
   
   // ✅ DO THIS (if needed)
   if (import.meta.env.MODE === 'development') {
     // dev-only code
   }
   ```

3. **Port Assumptions**
   ```javascript
   // ❌ DON'T DO THIS
   fetch('http://localhost:3003/socket.io');
   
   // ✅ DO THIS (uses apiConfig.js)
   const socketUrl = getSocketUrl();
   if (socketUrl) {
     connect(socketUrl);
   }
   ```

---

## Testing Strategy

### Local Testing (Recommended)

**Why test locally first:**
- ✅ Faster iteration (no deployment needed)
- ✅ Easy debugging (logs, dev tools)
- ✅ No production impact
- ✅ Can test with same Docker setup as production

**What to test:**
- All UI changes
- API endpoint changes
- Database migrations
- New features

### Production Testing

**When to deploy:**
- ✅ Local tests pass
- ✅ Ready for real-world testing
- ✅ Need to verify Azure-specific behavior

**What to verify:**
- UI works through Nginx proxy
- API endpoints accessible
- Database migrations ran
- Sample data populated (if needed)

---

## Code Changes That Require Rebuild

### Frontend Changes

**After changing React code:**
```bash
# Rebuild Docker image
cd publisher-dashboard
docker build -t paulandrewfarrow/monetizeplus-publisher-dashboard:azure \
  --build-arg NGINX_CONFIG=nginx.azure.conf .

# Push to Docker Hub
docker push paulandrewfarrow/monetizeplus-publisher-dashboard:azure

# Deploy
./azure-deploy.sh
```

**Note:** For local dev server (`npm run dev`), changes are hot-reloaded automatically.

### Backend Changes

**After changing API code:**
```bash
# Rebuild Docker image
cd licensing-api
docker build -t paulandrewfarrow/monetizeplus-licensing-api:latest .

# Push to Docker Hub
docker push paulandrewfarrow/monetizeplus-licensing-api:latest

# Deploy
./azure-deploy.sh
```

---

## Environment Differences (Handled Automatically)

### Database

| Aspect | Dev | Production |
|--------|-----|------------|
| Connection String | `postgres://...@postgres:5432/...` | `postgresql://...@postgres:5432/...` |
| Persistence | Docker volume (persistent) | Ephemeral (lost on restart) |
| Schema | Same | Same |
| Migrations | Auto-run on startup | Auto-run on startup |

**✅ Your Code:** Doesn't need to know - same queries work everywhere

### API URLs

| Aspect | Dev | Production |
|--------|-----|------------|
| Frontend Access | `http://localhost:5173` | `https://mai-monetize.com` |
| API Access (Dev) | `http://localhost:3000` (direct) | N/A |
| API Access (Prod) | N/A | `/api/*` (via Nginx proxy) |

**✅ Your Code:** Uses `apiConfig.js` - automatically handles both

### Redis

| Aspect | Dev | Production |
|--------|-----|------------|
| Enabled | ✅ Yes | ❌ No |
| Code Impact | None - gracefully handles unavailable Redis | Same |

**✅ Your Code:** Checks `REDIS_ENABLED` env var - works both ways

---

## Recommended Development Workflow

### Step 1: Make Changes

Edit your code normally:
```bash
# Example: Add new feature to Dashboard
code publisher-dashboard/src/pages/Dashboard.jsx
```

### Step 2: Test Locally (Fast Iteration)

**Option A: Vite Dev Server** (fastest for UI changes)
```bash
cd publisher-dashboard
npm run dev
# Changes hot-reload automatically
```

**Option B: Docker** (closest to production)
```bash
docker-compose up -d
# Test at http://localhost
```

### Step 3: Verify Functionality

- ✅ Test all affected features
- ✅ Check for console errors
- ✅ Verify API calls work
- ✅ Test database changes (if any)

### Step 4: Commit & Push

```bash
git add .
git commit -m "Add new feature"
git push
```

### Step 5: Deploy to Production (When Ready)

```bash
# Rebuild and push images
./build-and-push-azure.ps1  # or manually

# Deploy
./azure-deploy.sh
```

---

## Quick Reference: What to Change

### ✅ Safe to Change (Works Everywhere)

- React components in `publisher-dashboard/src/pages/`
- API routes in `licensing-api/src/routes/`
- Database queries in `licensing-api/src/`
- Styling in `publisher-dashboard/src/`
- Business logic anywhere

### ⚠️ Requires Rebuild

- Adding new npm packages
- Changing `package.json`
- Modifying Dockerfiles
- Nginx configuration changes

### ⚠️ Environment-Specific

- `docker-compose.yml` (dev only)
- `docker-compose.azure.yml` (Azure only)
- `nginx.conf` vs `nginx.azure.conf`
- Environment variables

### ❌ Don't Hardcode

- URLs (use `apiConfig.js`)
- Ports (use environment detection)
- Service names (use relative URLs or config)

---

## Summary

**Your Workflow is Correct:**

1. ✅ **Make changes** → Same code for dev & production
2. ✅ **Test locally** → Verify it works in dev
3. ✅ **Deploy** → Same code runs in production automatically

**The only differences are:**
- Configuration files (docker-compose, nginx)
- Environment variables
- Which services run

**Your application code doesn't need to care about these differences.**

---

## Troubleshooting

### "It works locally but not in production"

**Check:**
1. Did you rebuild and push Docker images?
2. Did you deploy after pushing images?
3. Are you using `apiConfig.js` for API URLs?
4. Are there any hard-coded localhost URLs?

### "Code works in dev but breaks in Docker"

**Check:**
1. Are you using relative URLs in production?
2. Is Redis gracefully handled (if disabled)?
3. Are database connection strings correct?
4. Check Nginx proxy configuration

### "Need to test production behavior locally"

**Use Azure docker-compose:**
```bash
docker-compose -f docker-compose.azure.yml up -d
# Tests production-like configuration locally
```

---

*Last updated: 2025-01-01*

