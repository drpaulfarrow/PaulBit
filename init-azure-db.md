# Initialize Azure Database

After deploying to Azure, you need to initialize the database with the schema and seed data.

## Method 1: Using Azure Cloud Shell (Easiest)

```bash
# Download init.sql from GitHub
curl -O https://raw.githubusercontent.com/paulandrewfarrow/MonetizePlus/main/database/init.sql

# Copy the init.sql content and run it via API
# First, get shell access
az webapp ssh --name monetizeplusapp --resource-group MonetizePlusRG
```

Inside the SSH session:
```bash
# Find the postgres container ID
docker ps | grep postgres

# Run the init script
docker exec -i <postgres-container-id> psql -U monetizeplus -d monetizeplus <<'EOF'
-- Copy the entire contents of database/init.sql here
EOF
```

## Method 2: Using Direct psql Connection (If exposed)

```bash
# If postgres port is exposed, connect directly
psql -h monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net \
     -p 5432 \
     -U monetizeplus \
     -d monetizeplus \
     -f init.sql
```

## Method 3: Using licensing-api to Initialize (Programmatic)

Create an admin endpoint to initialize the database:

```bash
curl -X POST http://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/admin/init-db
```

## Verify Database is Initialized

```bash
# Check if publishers exist
curl http://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/auth/publishers

# Should return:
# {"publishers":[{"id":1,"name":"Publisher A News","hostname":"site-a.local"},{"id":2,"name":"Publisher B Documentation","hostname":"site-b.local"}]}
```

## Quick Test Login

Once database is initialized, you should be able to:
1. Visit the dashboard URL
2. Select "Publisher A (ID: 1)" or "Publisher B (ID: 2)"
3. Click Login
4. It will verify the publisher exists in the database and log you in
