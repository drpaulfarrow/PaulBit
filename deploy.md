# Azure App Service Multi-Container Deployment (Using Docker Hub)

## Step 1: Generate a secure JWT secret
```bash
JWT_SECRET=$(openssl rand -base64 32)
echo "Generated JWT_SECRET (save this securely): $JWT_SECRET"
```

## Step 2: Download compose file
```bash
curl -O https://raw.githubusercontent.com/paulandrewfarrow/MonetizePlus/main/docker-compose.azure.yml
```

## Step 3: Deploy configuration (no ACR needed - using public Docker Hub images)
```bash
az webapp config container set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --multicontainer-config-type compose \
  --multicontainer-config-file docker-compose.azure.yml
```

## Step 4: Set environment variables
```bash
az webapp config appsettings set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --settings \
    REDIS_ENABLED=false \
    NODE_ENV=production \
    DATABASE_URL="postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_ISSUER=monetizeplus \
    JWT_AUDIENCE=monetizeplus-edge
```

## Step 5: Restart
```bash
az webapp restart \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG
```

## Step 6: Monitor logs
```bash
az webapp log tail \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG
```

## Step 7: Initialize the database
Once your app is deployed and running, initialize the database with publishers and policies:

```bash
# Get your app URL
APP_URL=$(az webapp show --name monetizeplusapp --resource-group MonetizePlusRG --query defaultHostName -o tsv)

# Initialize the database
curl -X POST "https://${APP_URL}/admin/init-db"

# Check database status
curl "https://${APP_URL}/admin/db-status"
```

Or visit these URLs directly in your browser:
- Initialize: `https://monetizeplusapp.azurewebsites.net/admin/init-db` (POST request)
- Check status: `https://monetizeplusapp.azurewebsites.net/admin/db-status`

## One-Command Deployment
```bash
JWT_SECRET=$(openssl rand -base64 32) && \
curl -O https://raw.githubusercontent.com/paulandrewfarrow/MonetizePlus/main/docker-compose.azure.yml && \
az webapp config container set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --multicontainer-config-type compose \
  --multicontainer-config-file docker-compose.azure.yml && \
az webapp config appsettings set \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG \
  --settings \
    REDIS_ENABLED=false \
    NODE_ENV=production \
    DATABASE_URL="postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_ISSUER=monetizeplus \
    JWT_AUDIENCE=monetizeplus-edge && \
az webapp restart \
  --name monetizeplusapp \
  --resource-group MonetizePlusRG && \
echo "Deployment complete! JWT_SECRET: $JWT_SECRET" && \
echo "" && \
echo "🔧 Next step: Initialize your database" && \
echo "Visit: https://monetizeplusapp.azurewebsites.net/admin/init-db (POST request)" && \
echo "Or run: curl -X POST https://monetizeplusapp.azurewebsites.net/admin/init-db"
```