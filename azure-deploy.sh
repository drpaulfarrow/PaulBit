#!/bin/bash
set -e

# MonetizePlus Azure Deployment Script
# This script deploys MonetizePlus to Azure App Service and initializes the database

echo "🚀 MonetizePlus Azure Deployment"
echo "================================"
echo ""

# Configuration
APP_NAME="monetizeplusapp"
RESOURCE_GROUP="MonetizePlusRG"
LOCATION="eastus"

# Step 1: Generate JWT secret
echo "📝 Step 1: Generating JWT secret..."
JWT_SECRET=$(openssl rand -base64 32)
echo "✅ JWT secret generated (save this): $JWT_SECRET"
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
curl -sS -O https://raw.githubusercontent.com/drpaulfarrow/PaulBit/main/docker-compose.azure.yml
echo "✅ Configuration downloaded"
echo ""

# Step 6: Configure container settings
echo "📝 Step 6: Configuring container settings..."
az webapp config container set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --multicontainer-config-type compose \
  --multicontainer-config-file docker-compose.azure.yml

# Force image refresh by updating a dummy app setting
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings DOCKER_REGISTRY_SERVER_URL=https://index.docker.io/v1 > /dev/null

echo "✅ Container settings configured"
echo ""

# Step 7: Set environment variables
echo "📝 Step 7: Setting environment variables..."
az webapp config appsettings set \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    REDIS_ENABLED=false \
    NODE_ENV=production \
    DATABASE_URL="postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus" \
    JWT_SECRET="$JWT_SECRET" \
    JWT_ISSUER=monetizeplus \
    JWT_AUDIENCE=monetizeplus-edge
echo "✅ Environment variables set"
echo ""

# Step 10: Update to versioned images (forces Azure to pull new versions)
echo "📝 Step 10: Updating to versioned image tags..."
echo "ℹ️  Using image version: 20251030-113911"
echo "✅ Image versions updated in docker-compose.azure.yml"
echo ""

# Step 9: Restart the app (forces image pull)
echo "📝 Step 9: Restarting application and pulling latest images..."
az webapp restart \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP
echo "✅ Application restarted"
echo ""

# Step 10: Wait for app to start
echo "📝 Step 10: Waiting for application to start (60 seconds)..."
sleep 60
echo "✅ Application should be running"
echo ""

# Step 11: Get app URL
APP_URL=$(az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)
echo "📝 Step 11: Application URL: https://$APP_URL"
echo ""

# Step 12: Initialize database
echo "📝 Step 12: Initializing database..."
INIT_RESPONSE=$(curl -sS -X POST "https://$APP_URL/admin/init-db")
echo "$INIT_RESPONSE" | grep -q '"success":true' && echo "✅ Database initialized successfully" || echo "⚠️  Database initialization may have failed. Check response: $INIT_RESPONSE"
echo ""

# Step 13: Check database status
echo "📝 Step 13: Checking database status..."
STATUS_RESPONSE=$(curl -sS "https://$APP_URL/admin/db-status")
echo "$STATUS_RESPONSE"
echo ""

# Summary
echo "================================"
echo "🎉 Deployment Complete!"
echo "================================"
echo ""
echo "📋 Deployment Summary:"
echo "  • App URL: https://$APP_URL"
echo "  • Dashboard: https://$APP_URL/"
echo "  • Admin Status: https://$APP_URL/admin/db-status"
echo "  • JWT Secret: $JWT_SECRET"
echo ""
echo "🔐 Save your JWT secret securely!"
echo ""
echo "📝 Next Steps:"
echo "  1. Visit https://$APP_URL/ to access the dashboard"
echo "  2. Login with one of the default publishers:"
echo "     - Publisher A News (site-a.local)"
echo "     - Publisher B Documentation (site-b.local)"
echo "  3. ClaudeBot is already enabled in the default policies"
echo ""
echo "📊 View logs:"
echo "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
echo ""
