# Azure Container Apps Deployment Fix

## Problem
Your application is failing to deploy to Azure Container Apps because:
1. **Redis is not available** - Azure Container Apps doesn't support Redis as a sidecar
2. **Service discovery doesn't work** - Docker Compose service names (like `licensing-api`, `url-parser`) don't resolve in Azure

## Solutions Implemented

### 1. Made Redis Optional
Modified `licensing-api/src/redis.js` to:
- Gracefully handle Redis being unavailable
- Log warnings instead of crashing
- Fail open for token validation when Redis is down
- Set `REDIS_ENABLED=false` environment variable for Azure deployment

### 2. Fixed Service Discovery
Modified `publisher-dashboard/nginx.conf` to:
- Use `127.0.0.1` (localhost) instead of service names
- This works because Azure Container Apps runs all containers on localhost

### 3. Created Azure-Specific Configuration
Created `docker-compose.azure.yml` with:
- Only essential services (postgres, licensing-api, url-parser, publisher-dashboard)
- Redis disabled
- Production-ready settings

## Deployment Steps

### Option A: Deploy Without Redis (Quickest)

1. **Set Environment Variable in Azure**
   ```
   REDIS_ENABLED=false
   ```

2. **Update Your Azure Container App Configuration**
   - Ensure all containers can communicate via localhost (127.0.0.1)
   - Set PORT=3000 for licensing-api
   - Set PORT=4000 for url-parser

3. **Use Azure Database for PostgreSQL** (Recommended)
   Instead of running Postgres in a container, use Azure's managed service:
   - Create Azure Database for PostgreSQL
   - Update DATABASE_URL environment variable
   - Format: `postgresql://username:password@server.postgres.database.azure.com:5432/monetizeplus?sslmode=require`

### Option B: Add Azure Cache for Redis (Production Ready)

1. **Provision Azure Cache for Redis**
   ```bash
   az redis create \
     --name monetizeplus-redis \
     --resource-group your-resource-group \
     --location eastus \
     --sku Basic \
     --vm-size c0
   ```

2. **Get Connection String**
   ```bash
   az redis list-keys --name monetizeplus-redis --resource-group your-resource-group
   ```

3. **Set Environment Variable**
   ```
   REDIS_URL=rediss://monetizeplus-redis.redis.cache.windows.net:6380?password=YOUR_KEY
   REDIS_ENABLED=true
   ```

## Azure Container Apps Specific Configuration

### Container Configuration

**licensing-api container:**
```yaml
environment:
  - name: NODE_ENV
    value: production
  - name: PORT
    value: "3000"
  - name: DATABASE_URL
    value: "postgresql://user:pass@your-postgres.postgres.database.azure.com:5432/monetizeplus?sslmode=require"
  - name: REDIS_ENABLED
    value: "false"
  - name: JWT_SECRET
    secretRef: jwt-secret
resources:
  cpu: 0.5
  memory: 1Gi
```

**url-parser container:**
```yaml
environment:
  - name: NODE_ENV
    value: production
  - name: PORT
    value: "4000"
resources:
  cpu: 0.25
  memory: 0.5Gi
```

**publisher-dashboard container:**
```yaml
environment:
  - name: NGINX_PORT
    value: "80"
resources:
  cpu: 0.25
  memory: 0.5Gi
```

### Networking Configuration

In Azure Container Apps, all containers in the same app communicate via localhost:
- licensing-api: `http://127.0.0.1:3000`
- url-parser: `http://127.0.0.1:4000`
- publisher-dashboard: `http://127.0.0.1:80`

## Testing Locally

Test the Azure configuration locally:

```powershell
# Start with Azure configuration
docker-compose -f docker-compose.azure.yml up -d

# Check logs
docker-compose -f docker-compose.azure.yml logs -f

# Test endpoints
curl http://localhost:3000/health
curl http://localhost:4000/health
curl http://localhost/
```

## Rebuild and Push Updated Images

```powershell
# Build with Azure configuration
docker-compose -f docker-compose.azure.yml build

# Tag for Docker Hub
docker tag tollbit-licensing-api:latest paulandrewfarrow/monetizeplus-licensing-api:azure
docker tag tollbit-url-parser:latest paulandrewfarrow/monetizeplus-url-parser:azure
docker tag tollbit-publisher-dashboard:latest paulandrewfarrow/monetizeplus-publisher-dashboard:azure

# Push to Docker Hub
docker push paulandrewfarrow/monetizeplus-licensing-api:azure
docker push paulandrewfarrow/monetizeplus-url-parser:azure
docker push paulandrewfarrow/monetizeplus-publisher-dashboard:azure
```

## Alternative: Simplified Architecture for Azure

Consider this simpler architecture:

1. **Azure Container App** - licensing-api + publisher-dashboard (combined)
2. **Azure Database for PostgreSQL** - Managed database
3. **Azure Cache for Redis** (Optional) - Managed cache
4. **Azure Container Instances** - url-parser (if needed separately)

This reduces complexity and uses Azure's managed services.

## Troubleshooting

### If containers still can't connect:

1. **Check Azure Container App logs:**
   ```bash
   az containerapp logs show --name your-app --resource-group your-rg
   ```

2. **Verify environment variables are set**

3. **Check that all containers are in the same Container App**

4. **Ensure DATABASE_URL points to Azure PostgreSQL, not localhost**

### If Redis errors persist:

- Verify `REDIS_ENABLED=false` is set
- Check application logs for Redis connection attempts
- Consider removing Redis client initialization entirely if not needed

## Next Steps

1. Apply the Redis optional changes (already done in your local code)
2. Test locally with `docker-compose.azure.yml`
3. Rebuild and push images with `:azure` tag
4. Update Azure Container App to use new images
5. Set `REDIS_ENABLED=false` environment variable in Azure
6. Deploy and test

## Production Recommendations

For production deployment:

1. ✅ Use Azure Database for PostgreSQL (not container)
2. ✅ Use Azure Cache for Redis (if needed)
3. ✅ Use Azure Key Vault for secrets (JWT_SECRET, DB passwords)
4. ✅ Enable Application Insights for monitoring
5. ✅ Set up Azure Front Door for CDN and WAF
6. ✅ Use managed identity instead of connection strings where possible
