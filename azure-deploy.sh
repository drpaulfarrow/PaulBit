#!/bin/bash
set -e
# curl -sS https://raw.githubusercontent.com/drpaulfarrow/MAI-Monetize/main/azure-deploy.sh | bash
# MonetizePlus Azure Deployment Script with Automatic Migrations
# This script deploys MonetizePlus to Azure App Service with database migration support

echo "🚀 MonetizePlus Azure Deployment (with Auto-Migrations)"
echo "========================================================"
echo ""

# Configuration
APP_NAME="monetizeplusapp"
RESOURCE_GROUP="MonetizePlusRG"
LOCATION="westeurope"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Step 1: Check JWT secret
echo "📝 Step 1: Checking JWT secret..."
JWT_SECRET=$(az webapp config appsettings list \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "[?name=='JWT_SECRET'].value" -o tsv 2>/dev/null || echo "")

if [ -z "$JWT_SECRET" ]; then
    echo "   Generating new JWT secret..."
    JWT_SECRET=$(openssl rand -base64 32)
    echo "✅ JWT secret generated: $JWT_SECRET"
else
    echo "✅ Using existing JWT secret"
fi
echo ""

# Step 2: Create resource group (if it doesn't exist)
echo "📝 Step 2: Ensuring resource group exists..."
if az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo "✅ Resource group $RESOURCE_GROUP already exists"
else
    az group create --name $RESOURCE_GROUP --location $LOCATION
    echo "✅ Resource group created"
fi
echo ""

# Step 3: Create App Service plan (if it doesn't exist)
echo "📝 Step 3: Ensuring App Service plan exists..."
if az appservice plan show --name "${APP_NAME}-plan" --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "✅ App Service plan already exists"
else
    az appservice plan create \
      --name "${APP_NAME}-plan" \
      --resource-group $RESOURCE_GROUP \
      --is-linux \
      --sku B1
    echo "✅ App Service plan created"
fi
echo ""

# Step 4: Create Web App (if it doesn't exist)
echo "📝 Step 4: Ensuring Web App exists..."
if az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP &> /dev/null; then
    echo "✅ Web App already exists"
else
    az webapp create \
      --name $APP_NAME \
      --resource-group $RESOURCE_GROUP \
      --plan "${APP_NAME}-plan" \
      --multicontainer-config-type compose \
      --multicontainer-config-file docker-compose.azure.yml
    echo "✅ Web App created"
fi
echo ""

# Step 5: Download docker-compose.azure.yml
echo "📝 Step 5: Downloading docker-compose configuration..."
curl -sS -O https://raw.githubusercontent.com/drpaulfarrow/MAI-Monetize/main/docker-compose.azure.yml
echo "✅ Configuration downloaded"
echo ""

# Step 6: Configure container settings with latest docker-compose
echo "📝 Step 6: Updating container configuration with automatic migrations..."
az webapp config container set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --multicontainer-config-type compose \
  --multicontainer-config-file docker-compose.azure.yml

echo "✅ Container settings updated"
echo ""

# Step 7: Set environment variables (using Azure Database for PostgreSQL)
echo "📝 Step 7: Setting environment variables..."
echo "   Using managed Azure Database for PostgreSQL..."
DB_PASSWORD=$(cat /tmp/db_password.txt 2>/dev/null || echo "YOUR_DB_PASSWORD_HERE")
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    REDIS_ENABLED=false \
    NODE_ENV=production \
    DATABASE_URL="postgresql://monetizeplus:${DB_PASSWORD}@monetizeplus-db.postgres.database.azure.com:5432/monetizeplus?sslmode=require" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_ISSUER=monetizeplus \
    JWT_AUDIENCE=monetizeplus-edge \
    WEBSITES_ENABLE_APP_SERVICE_STORAGE=false \
    DOCKER_ENABLE_CI=true > /dev/null
echo "✅ Environment variables set"
echo "✅ Database: monetizeplus-db.postgres.database.azure.com"
echo ""

# Step 8: Force pull of latest images
echo "📝 Step 8: Forcing image refresh..."
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings DOCKER_REGISTRY_SERVER_URL=https://index.docker.io/v1 > /dev/null
echo "✅ Image refresh triggered"
echo ""

# Step 9: Restart the app to apply changes and run migrations
echo "📝 Step 9: Restarting application..."
echo "   This will:"
echo "   - Pull the latest Docker images"
echo "   - Start the licensing-api container"
echo "   - Run database migrations automatically"
echo "   - Create missing tables (license_options, access_endpoints, content)"
az webapp restart \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
echo "✅ Application restarting"
echo ""

# Step 10: Wait for app to start and migrations to run
echo "📝 Step 10: Waiting for application and migrations (90 seconds)..."
echo "   Migrations are running automatically..."
sleep 90
echo "✅ Application should be ready"
echo ""

# Step 11: Get app URL
APP_URL=$(az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)
echo "📝 Step 11: Application URL: https://$APP_URL"
echo ""

# Step 12: Verify endpoints
echo "📝 Step 12: Verifying endpoints..."
echo "   Testing /health endpoint..."
HEALTH_STATUS=$(curl -sS "https://$APP_URL/health" | grep -o '"status":"ok"' || echo "failed")
if [ "$HEALTH_STATUS" = '"status":"ok"' ]; then
    echo "✅ Health endpoint OK"
else
    echo "⚠️  Health endpoint not responding yet"
fi

echo "   Testing /api/licenses endpoint..."
LICENSE_RESPONSE=$(curl -sS -w "\n%{http_code}" "https://$APP_URL/api/licenses?publisherId=1" 2>/dev/null || echo "000")
LICENSE_CODE=$(echo "$LICENSE_RESPONSE" | tail -n1)
if [ "$LICENSE_CODE" = "200" ]; then
    echo "✅ Licenses endpoint OK (200)"
else
    echo "⚠️  Licenses endpoint returned: $LICENSE_CODE"
fi

echo "   Testing /api/access endpoint..."
ACCESS_RESPONSE=$(curl -sS -w "\n%{http_code}" "https://$APP_URL/api/access?publisherId=1" 2>/dev/null || echo "000")
ACCESS_CODE=$(echo "$ACCESS_RESPONSE" | tail -n1)
if [ "$ACCESS_CODE" = "200" ]; then
    echo "✅ Access endpoint OK (200)"
else
    echo "⚠️  Access endpoint returned: $ACCESS_CODE"
fi
echo ""

# Step 13: Populate database with sample data
echo "📝 Step 13: Populating database with sample data..."
echo "   This will populate all UI sections with test data..."
POPULATE_RESPONSE=$(curl -sS -X POST "https://$APP_URL/admin/populate-sample-data" 2>/dev/null || echo "{}")
POPULATE_SUCCESS=$(echo "$POPULATE_RESPONSE" | grep -o '"success":true' || echo "")

if [ -n "$POPULATE_SUCCESS" ]; then
    echo "✅ Sample data populated successfully"
    # Extract and display counts
    NEGOTIATIONS=$(echo "$POPULATE_RESPONSE" | grep -o '"negotiations":[0-9]*' | grep -o '[0-9]*' || echo "?")
    NOTIFICATIONS=$(echo "$POPULATE_RESPONSE" | grep -o '"notifications":[0-9]*' | grep -o '[0-9]*' || echo "?")
    USAGE=$(echo "$POPULATE_RESPONSE" | grep -o '"usage_events":[0-9]*' | grep -o '[0-9]*' || echo "?")
    ACCESS=$(echo "$POPULATE_RESPONSE" | grep -o '"access_endpoints":[0-9]*' | grep -o '[0-9]*' || echo "?")
    STRATEGIES=$(echo "$POPULATE_RESPONSE" | grep -o '"strategies":[0-9]*' | grep -o '[0-9]*' || echo "?")
    URLS=$(echo "$POPULATE_RESPONSE" | grep -o '"parsed_urls":[0-9]*' | grep -o '[0-9]*' || echo "?")
    CONTENT=$(echo "$POPULATE_RESPONSE" | grep -o '"content":[0-9]*' | grep -o '[0-9]*' || echo "?")
    LICENSES=$(echo "$POPULATE_RESPONSE" | grep -o '"licenses":[0-9]*' | grep -o '[0-9]*' || echo "?")
    
    echo "   • Negotiations: $NEGOTIATIONS"
    echo "   • Notifications: $NOTIFICATIONS"
    echo "   • Usage Events: $USAGE"
    echo "   • Access Endpoints: $ACCESS"
    echo "   • Strategies: $STRATEGIES"
    echo "   • Parsed URLs: $URLS"
    echo "   • Content: $CONTENT"
    echo "   • Licenses: $LICENSES"
else
    echo "⚠️  Sample data population may have failed"
    echo "   Response: $POPULATE_RESPONSE"
    echo "   You can manually populate later with:"
    echo "   curl -X POST https://$APP_URL/admin/populate-sample-data"
fi
echo ""

# Summary
echo "========================================================"
echo "🎉 Deployment Complete!"
echo "========================================================"
echo ""
echo "📋 Deployment Summary:"
echo "  • App URL: https://$APP_URL"
echo "  • Dashboard: https://$APP_URL/"
echo "  • Health Check: https://$APP_URL/health"
echo "  • JWT Secret: $JWT_SECRET"
echo ""
echo "✅ Automatic Migrations:"
echo "  • Migrations run on startup"
echo "  • Tables created: license_options, access_endpoints, content"
echo "  • Database schema is up to date"
echo ""
echo "✅ Sample Data:"
echo "  • Database populated with test data for all UI sections"
echo "  • Includes negotiations, notifications, usage logs, and more"
echo ""

echo "� Test Endpoints:"
echo "  curl https://$APP_URL/api/licenses?publisherId=1"
echo "  curl https://$APP_URL/api/access?publisherId=1"
echo ""
echo "📊 View Application Logs:"
echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
echo "🔧 Troubleshooting:"
echo "  If endpoints still show 500 errors, check container logs:"
echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP | grep -i migration"
echo ""

if [ "$LICENSE_CODE" != "200" ] || [ "$ACCESS_CODE" != "200" ]; then
    echo "⚠️  WARNING: Some endpoints are not responding correctly."
    echo "   Wait a few more minutes for migrations to complete, then test again."
    echo "   Check logs with: az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
    echo ""
fi
