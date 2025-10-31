# Azure Database Migration - Manual Steps

## Problem
The Azure deployment is missing critical database tables (`license_options`, `access_endpoints`, `content`) causing 500 errors when accessing:
- `/api/licenses?publisherId=1`
- `/api/access?publisherId=1`

## Solution
Run the database migrations that create these tables.

## Steps

### Step 1: Generate the Migration Bundle (Already Done)
The file `azure-migrations-bundle.sql` has been generated with all necessary migrations.

### Step 2: Apply Migrations to Azure

#### Option A: Via Azure Portal (Easiest if you have portal access)
1. Go to Azure Portal > Container Apps > monetizeplusapp
2. Open "Console" tab
3. Connect to the container
4. Run these commands:

```bash
# Create the SQL file
cat > /tmp/migrate.sql << 'EOF'
# Then paste the entire content of azure-migrations-bundle.sql here
# (Copy from your local file)
EOF

# Run the migration
PGPASSWORD=monetizeplus123 psql -h postgres -U monetizeplus -d monetizeplus -f /tmp/migrate.sql

# Verify tables were created
PGPASSWORD=monetizeplus123 psql -h postgres -U monetizeplus -d monetizeplus -c "\dt"
```

#### Option B: Via Azure CLI (If authentication works)
```powershell
# First, authenticate with the right scope
az login --scope https://management.core.windows.net//.default

# Then run the migration script
.\azure-apply-migrations.ps1
```

#### Option C: Via Local Connection (If you can connect directly)
If the Azure PostgreSQL is accessible from your local machine:

```powershell
# Get the connection details and run:
psql -h <azure-postgres-host> -U monetizeplus -d monetizeplus < azure-migrations-bundle.sql
```

#### Option D: Rebuild with Migrations Included
Update the Docker image to run migrations on startup:

1. Add a migration script to licensing-api
2. Rebuild and push the image
3. Redeploy to Azure

### Step 3: Verify

After migrations are applied, test the endpoints:

```powershell
# Test licenses endpoint
curl.exe https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/api/licenses?publisherId=1

# Test access endpoint  
curl.exe https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/api/access?publisherId=1
```

Both should return successful responses instead of 500 errors.

## What the Migrations Do

The bundle includes these migrations:
- `006_cm_rtbspec_schema.sql` - Creates `content`, `license_options`, `access_endpoints` tables
- `007_access_endpoints_refactor.sql` - Refactors access endpoints to be publisher-level
- `008_access_endpoint_formats.sql` - Adds request/response format fields
- `009-020` - Various enhancements for negotiations, licensing, etc.

## Root Cause

The original `database/init.sql` only creates the basic schema with `publishers`, `plans`, `clients`, `policies`, etc.

The newer tables (`license_options`, `access_endpoints`, `content`) were added via migrations but these migrations were never run on the Azure database.

The local development database has these migrations applied, which is why it works locally but fails in Azure.
