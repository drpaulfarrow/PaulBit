# Dev vs Azure Deployment Differences

This document explains the key differences between local development and Azure production deployments, focusing on **ports** and **relational database** configurations.

## Overview

| Aspect | Local Development | Azure Production |
|--------|------------------|------------------|
| **Database** | Containerized PostgreSQL 16 | Containerized PostgreSQL 15-alpine |
| **Database Persistence** | Docker volume (`pgdata`) | Ephemeral (lost on restart) |
| **Port Exposure** | Multiple ports exposed to host | Only essential ports exposed |
| **Services** | Full stack (5 services) | Minimal stack (4 services) |
| **Redis** | Enabled (in-memory caching) | Disabled |
| **Service Discovery** | Docker service names | Docker service names (same) |

---

## 1. Port Configuration

### Local Development (`docker-compose.yml`)

**Exposed Ports:**
- **80** → `publisher-dashboard` (Nginx)
- **3000** → `licensing-api`
- **3001** → `edge-worker`
- **3003** → `negotiation-agent`
- **5432** → `postgres` (accessible from host)

**Purpose:**
- Full port exposure allows direct access to services during development
- Developers can test individual services independently
- Database accessible from local SQL clients (DBeaver, pgAdmin, etc.)

### Azure Production (`docker-compose.azure.yml`)

**Exposed Ports:**
- **80** → `publisher-dashboard` (Nginx - only external port)
- **3000** → `licensing-api` (internal only)
- **4000** → `urlparser` (internal only)
- **5432** → `postgres` (internal only, but exposed in compose file)

**Purpose:**
- Only port 80 is externally accessible via Azure's load balancer
- Internal services communicate via Docker's internal network
- Database port exposed in compose but Azure blocks external access
- Reduces attack surface and follows security best practices

**Key Difference:**
```
Dev:   localhost:3000 → licensing-api (direct access)
Azure: mai-monetize.com → Nginx (80) → proxies to licensing-api:3000 (internal)
```

---

## 2. Relational Database (PostgreSQL)

### Local Development

**Configuration:**
```yaml
postgres:
  image: postgres:16
  environment:
    POSTGRES_USER: monetizeplus
    POSTGRES_PASSWORD: monetizeplus123
    POSTGRES_DB: monetizeplus
  volumes:
    - pgdata:/var/lib/postgresql/data  # ← Persistent volume
```

**Connection String:**
```
postgres://monetizeplus:monetizeplus123@postgres:5432/monetizeplus
```

**Characteristics:**
- **Version:** PostgreSQL 16 (latest features)
- **Persistence:** Data stored in Docker volume `pgdata`
- **Survival:** Data persists across container restarts
- **Access:** Can connect from host machine on `localhost:5432`
- **Size:** Can grow to use available disk space

### Azure Production

**Configuration:**
```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_USER: monetizeplus
    POSTGRES_PASSWORD: monetizeplus123
    POSTGRES_DB: monetizeplus
  ports:
    - "5432:5432"  # ← Exposed but blocked by Azure
  # NO volumes - data is ephemeral
```

**Connection String:**
```
postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus
```

**Characteristics:**
- **Version:** PostgreSQL 15-alpine (smaller, faster startup)
- **Persistence:** ⚠️ **NO VOLUME** - Data is ephemeral
- **Survival:** Data lost when container restarts/redeploys
- **Access:** Port exposed but Azure App Service blocks external access
- **Size:** Limited by container memory/disk

**⚠️ Important Note:**
Azure App Service containers are **stateless** by default. The PostgreSQL container in Azure will lose all data on:
- Container restart
- App Service restart
- Deployment/redeploy
- Scale operations

**Recommendation for Production:**
Use **Azure Database for PostgreSQL** (managed service) instead of containerized PostgreSQL:

```
# Azure managed PostgreSQL connection string format:
postgresql://username:password@server.postgres.database.azure.com:5432/monetizeplus?sslmode=require
```

---

## 3. Service Differences

### Local Development Services

```yaml
services:
  - postgres        # Database
  - redis           # Caching (enabled)
  - licensing-api   # Main API
  - edge-worker     # Edge processing
  - negotiation-agent  # AI negotiations
  - publisher-dashboard  # UI
```

**Total: 6 services**

### Azure Production Services

```yaml
services:
  - postgres        # Database (ephemeral)
  - licensing-api   # Main API
  - urlparser       # URL parsing (replaces edge-worker)
  - publisher-dashboard  # UI
```

**Total: 4 services**

**Missing in Azure:**
- ❌ `redis` - Disabled (set `REDIS_ENABLED=false`)
- ❌ `edge-worker` - Not included (functionality merged into licensing-api)
- ❌ `negotiation-agent` - Not included (can be added if needed)

---

## 4. Database Connection String Differences

### Connection String Format

**Local Development:**
```bash
postgres://monetizeplus:monetizeplus123@postgres:5432/monetizeplus
#                ↑          ↑              ↑
#            username   password    service name (Docker DNS)
```

**Azure Production:**
```bash
postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus
#                ↑          ↑              ↑
#            username   password    service name (Docker DNS)
```

**Note:** Both use the same connection string format. The service name `postgres` resolves via Docker's internal DNS in both environments.

### Database URL Protocol

- **Local:** Uses `postgres://` protocol
- **Azure:** Uses `postgresql://` protocol (both work, but Azure deployment script uses `postgresql://`)

Both are interchangeable - PostgreSQL accepts either format.

---

## 5. Network Architecture

### Local Development

```
┌─────────────────────────────────────────┐
│         Docker Bridge Network           │
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │postgres  │  │  redis   │            │
│  │ :5432    │  │  :6379   │            │
│  └────┬─────┘  └────┬─────┘            │
│       │             │                   │
│       └──────┬──────┘                   │
│              │                          │
│       ┌──────▼──────┐                   │
│       │licensing-api│                   │
│       │   :3000     │                   │
│       └──────┬──────┘                   │
│              │                          │
│  ┌───────────┼──────────┐              │
│  │           │          │               │
│  └───────────┼──────────┘               │
│              │                          │
│  ┌───────────▼──────────┐              │
│  │publisher-dashboard   │              │
│  │   :80                │              │
│  └──────────────────────┘              │
└─────────────────────────────────────────┘
         │
         │ Port 80, 3000, 3001, 3003, 5432 exposed
         ▼
    Host Machine
```

### Azure Production

```
┌─────────────────────────────────────────┐
│      Azure App Service Container        │
│                                         │
│  ┌──────────┐                          │
│  │postgres  │                          │
│  │ :5432    │ (internal only)          │
│  └────┬─────┘                          │
│       │                                │
│       │                                │
│  ┌────▼─────┐  ┌──────────┐           │
│  │licensing │  │urlparser │           │
│  │-api:3000 │  │ :4000    │           │
│  └────┬─────┘  └──────────┘           │
│       │                                │
│       │                                │
│  ┌────▼──────────────┐                │
│  │publisher-dashboard│                │
│  │  :80 (Nginx)      │                │
│  └───────────────────┘                │
└─────────────────────────────────────────┘
         │
         │ Only port 80 exposed externally
         ▼
    Azure Load Balancer
         │
         ▼
    Internet (mai-monetize.com)
```

---

## 6. Environment Variables

### Local Development

```bash
DATABASE_URL=postgres://monetizeplus:monetizeplus123@postgres:5432/monetizeplus
REDIS_URL=redis://redis:6379
REDIS_ENABLED=true  # (default)
```

### Azure Production

```bash
DATABASE_URL=postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus
REDIS_ENABLED=false  # ← Explicitly disabled
# REDIS_URL not set
```

---

## 7. Database Initialization

### Local Development

1. Database starts empty
2. Migrations run automatically on `licensing-api` startup
3. Seed data can be added via SQL scripts or admin endpoints
4. Data persists in `pgdata` volume

### Azure Production

1. Database starts empty (or resets on restart)
2. Migrations run automatically on `licensing-api` startup
3. **Automatic population** via deployment script:
   ```bash
   curl -X POST https://mai-monetize.com/admin/populate-sample-data
   ```
4. ⚠️ Data is lost on container restart (unless using Azure Database for PostgreSQL)

---

## 8. Migration Strategy

### Recommended for Production

**Option 1: Azure Database for PostgreSQL (Recommended)**
- Fully managed service
- Automatic backups
- High availability
- Data persistence guaranteed
- Connection string:
  ```
  postgresql://user:pass@server.postgres.database.azure.com:5432/monetizeplus?sslmode=require
  ```

**Option 2: Keep Containerized PostgreSQL**
- ⚠️ Add persistent volume (if Azure supports it)
- ⚠️ Or accept ephemeral data and re-seed on each deployment
- ✅ Current approach: Auto-populate via deployment script

---

## 9. Testing Differences

### Local Development

```bash
# Direct access to all services
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3003/health
curl http://localhost/api/licenses

# Direct database access
psql -h localhost -p 5432 -U monetizeplus -d monetizeplus
```

### Azure Production

```bash
# Only UI is accessible externally
curl https://mai-monetize.com/

# All API calls go through Nginx proxy
curl https://mai-monetize.com/api/licenses

# No direct database access (blocked by Azure)
# psql -h mai-monetize.com -p 5432  # ❌ Blocked
```

---

## Summary Table

| Feature | Local Dev | Azure Production |
|---------|-----------|------------------|
| **PostgreSQL Version** | 16 | 15-alpine |
| **Database Persistence** | ✅ Volume | ❌ Ephemeral |
| **External Ports** | 80, 3000, 3001, 3003, 5432 | 80 only |
| **Internal Ports** | Same | Same |
| **Redis** | ✅ Enabled | ❌ Disabled |
| **Service Count** | 6 services | 4 services |
| **Database Connection** | `postgres://...` | `postgresql://...` |
| **Data Survival** | ✅ Persistent | ❌ Lost on restart |
| **Auto-Populate** | Manual | ✅ Automatic (deploy script) |
| **External DB Access** | ✅ Yes (localhost:5432) | ❌ No (blocked) |

---

## Best Practices

### For Development
- ✅ Use local Docker Compose with volumes
- ✅ Enable Redis for caching
- ✅ Expose all ports for debugging
- ✅ Use PostgreSQL 16 for latest features

### For Production (Azure)
- ✅ Use Azure Database for PostgreSQL (managed service)
- ✅ Disable Redis or use Azure Cache for Redis
- ✅ Minimize exposed ports (80 only)
- ✅ Use PostgreSQL 15-alpine for smaller image
- ✅ Auto-populate sample data on deployment
- ✅ Use connection pooling
- ✅ Enable SSL for database connections

---

## Quick Reference

### Switch Between Configurations

**Local Development:**
```bash
docker-compose up -d
```

**Test Azure Configuration Locally:**
```bash
docker-compose -f docker-compose.azure.yml up -d
```

**Deploy to Azure:**
```bash
./azure-deploy.sh  # or azure-deploy.ps1
```

---

## Troubleshooting

### Database Connection Issues

**Local:**
- Check if postgres container is running: `docker ps | grep postgres`
- Check logs: `docker-compose logs postgres`
- Verify connection string uses service name `postgres` not `localhost`

**Azure:**
- Database is ephemeral - may need to re-run migrations
- Check Azure App Service logs for connection errors
- Verify `DATABASE_URL` environment variable is set correctly
- Consider migrating to Azure Database for PostgreSQL for persistence

### Port Access Issues

**Local:**
- Ensure ports aren't already in use
- Check Docker port mappings: `docker ps`

**Azure:**
- Only port 80 is externally accessible
- Internal services communicate via Docker network
- Use Nginx proxy rules in `nginx.azure.conf` for routing

---

## Migration Path: Container DB → Managed DB

When ready to move to persistent database:

1. **Create Azure Database for PostgreSQL:**
   ```bash
   az postgres server create \
     --resource-group MonetizePlusRG \
     --name monetizeplus-db \
     --location westeurope \
     --admin-user monetizeplus \
     --admin-password YourSecurePassword123! \
     --sku-name B_Gen5_1
   ```

2. **Update Connection String:**
   ```bash
   az webapp config appsettings set \
     --name monetizeplusapp \
     --resource-group MonetizePlusRG \
     --settings \
     DATABASE_URL="postgresql://monetizeplus@monetizeplus-db:YourSecurePassword123!@monetizeplus-db.postgres.database.azure.com:5432/monetizeplus?sslmode=require"
   ```

3. **Remove Postgres Container:**
   - Edit `docker-compose.azure.yml` to remove postgres service
   - Redeploy

4. **Run Migrations:**
   - Migrations will run automatically on next deployment
   - Or manually: `curl -X POST https://mai-monetize.com/admin/init-db`

---

*Last updated: 2025-01-01*

