#!/bin/bash
# Azure Diagnostic Script for MonetizePlus

APP_NAME="monetizeplusapp"
RESOURCE_GROUP="MonetizePlusRG"

echo "🔍 MonetizePlus Azure Diagnostics"
echo "=================================="
echo ""

# 1. Check if app exists
echo "📝 1. Checking if app exists..."
az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "{name:name,state:state,defaultHostName:defaultHostName}" -o table
echo ""

# 2. Get app URL
echo "📝 2. Getting app URL..."
APP_URL=$(az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)
echo "App URL: https://$APP_URL"
echo ""

# 3. Check container status
echo "📝 3. Checking container logs (last 50 lines)..."
az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP --provider application &
sleep 5
echo ""

# 4. Check if database is initialized
echo "📝 4. Checking database status..."
DB_STATUS=$(curl -sS "https://$APP_URL/admin/db-status")
echo "$DB_STATUS"
echo ""

# 5. Test publishers endpoint
echo "📝 5. Testing /auth/publishers endpoint..."
PUBLISHERS=$(curl -sS "https://$APP_URL/auth/publishers")
echo "$PUBLISHERS"
echo ""

# 6. Test policy endpoint
echo "📝 6. Testing /policies/1 endpoint..."
POLICY=$(curl -sS "https://$APP_URL/policies/1")
echo "$POLICY"
echo ""

# 7. Check environment variables
echo "📝 7. Checking environment variables..."
az webapp config appsettings list --name $APP_NAME --resource-group $RESOURCE_GROUP --query "[?name=='DATABASE_URL' || name=='REDIS_ENABLED' || name=='NODE_ENV'].{name:name, value:value}" -o table
echo ""

# 8. Check if licensing-api is responding
echo "📝 8. Testing licensing API health..."
API_HEALTH=$(curl -sS -w "\nHTTP Status: %{http_code}\n" "https://$APP_URL/health" 2>&1 || echo "No health endpoint")
echo "$API_HEALTH"
echo ""

# 9. Try to initialize database
echo "📝 9. Attempting to initialize database..."
INIT_RESULT=$(curl -sS -X POST "https://$APP_URL/admin/init-db")
echo "$INIT_RESULT"
echo ""

# 10. Recheck database status after init
echo "📝 10. Rechecking database status..."
DB_STATUS_AFTER=$(curl -sS "https://$APP_URL/admin/db-status")
echo "$DB_STATUS_AFTER"
echo ""

# 11. Check deployment logs
echo "📝 11. Checking recent deployment logs..."
az webapp log download --name $APP_NAME --resource-group $RESOURCE_GROUP --log-file deployment-logs.zip 2>/dev/null || echo "Log download not available"
echo ""

echo "=================================="
echo "🔍 Diagnostics Complete"
echo "=================================="
echo ""
echo "📋 Summary:"
echo "  • App URL: https://$APP_URL"
echo "  • Check logs above for errors"
echo "  • If database not initialized, run: curl -X POST https://$APP_URL/admin/init-db"
echo ""
