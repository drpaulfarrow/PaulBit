# MonetizePlus Azure Deployment Script (PowerShell)
# This script deploys MonetizePlus to Azure App Service and initializes the database

Write-Host "🚀 MonetizePlus Azure Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$APP_NAME = "monetizeplusapp"
$RESOURCE_GROUP = "MonetizePlusRG"
$LOCATION = "eastus"

# Step 1: Generate JWT secret
Write-Host "📝 Step 1: Generating JWT secret..." -ForegroundColor Yellow
$JWT_SECRET = [Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
Write-Host "✅ JWT secret generated (save this): $JWT_SECRET" -ForegroundColor Green
Write-Host ""

# Step 2: Create resource group (if it doesn't exist)
Write-Host "📝 Step 2: Ensuring resource group exists..." -ForegroundColor Yellow
try {
    az group show --name $RESOURCE_GROUP 2>$null | Out-Null
    Write-Host "✅ Resource group $RESOURCE_GROUP already exists" -ForegroundColor Green
} catch {
    az group create --name $RESOURCE_GROUP --location $LOCATION
    Write-Host "✅ Resource group created" -ForegroundColor Green
}
Write-Host ""

# Step 3: Create App Service plan (if it doesn't exist)
Write-Host "📝 Step 3: Ensuring App Service plan exists..." -ForegroundColor Yellow
try {
    az appservice plan show --name "${APP_NAME}-plan" --resource-group $RESOURCE_GROUP 2>$null | Out-Null
    Write-Host "✅ App Service plan already exists" -ForegroundColor Green
} catch {
    az appservice plan create `
      --name "${APP_NAME}-plan" `
      --resource-group $RESOURCE_GROUP `
      --is-linux `
      --sku B1
    Write-Host "✅ App Service plan created" -ForegroundColor Green
}
Write-Host ""

# Step 4: Create Web App (if it doesn't exist)
Write-Host "📝 Step 4: Ensuring Web App exists..." -ForegroundColor Yellow
try {
    az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP 2>$null | Out-Null
    Write-Host "✅ Web App already exists" -ForegroundColor Green
} catch {
    az webapp create `
      --name $APP_NAME `
      --resource-group $RESOURCE_GROUP `
      --plan "${APP_NAME}-plan" `
      --multicontainer-config-type compose `
      --multicontainer-config-file docker-compose.azure.yml
    Write-Host "✅ Web App created" -ForegroundColor Green
}
Write-Host ""

# Step 5: Download docker-compose.azure.yml
Write-Host "📝 Step 5: Downloading docker-compose configuration..." -ForegroundColor Yellow
curl.exe -sS -O https://raw.githubusercontent.com/drpaulfarrow/PaulBit/main/docker-compose.azure.yml
Write-Host "✅ Configuration downloaded" -ForegroundColor Green
Write-Host ""

# Step 6: Configure container settings
Write-Host "📝 Step 6: Configuring container settings..." -ForegroundColor Yellow
az webapp config container set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --multicontainer-config-type compose `
  --multicontainer-config-file docker-compose.azure.yml
Write-Host "✅ Container settings configured" -ForegroundColor Green
Write-Host ""

# Step 7: Set environment variables
Write-Host "📝 Step 7: Setting environment variables..." -ForegroundColor Yellow
az webapp config appsettings set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --settings `
    REDIS_ENABLED=false `
    NODE_ENV=production `
    DATABASE_URL="postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus" `
    JWT_SECRET="$JWT_SECRET" `
    JWT_ISSUER=monetizeplus `
    JWT_AUDIENCE=monetizeplus-edge
Write-Host "✅ Environment variables set" -ForegroundColor Green
Write-Host ""

# Step 8: Restart the app
Write-Host "📝 Step 8: Restarting application..." -ForegroundColor Yellow
az webapp restart `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP
Write-Host "✅ Application restarted" -ForegroundColor Green
Write-Host ""

# Step 9: Wait for app to start
Write-Host "📝 Step 9: Waiting for application to start (60 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 60
Write-Host "✅ Application should be running" -ForegroundColor Green
Write-Host ""

# Step 10: Get app URL
$APP_URL = az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv
Write-Host "📝 Step 10: Application URL: https://$APP_URL" -ForegroundColor Yellow
Write-Host ""

# Step 11: Initialize database
Write-Host "📝 Step 11: Initializing database..." -ForegroundColor Yellow
$INIT_RESPONSE = curl.exe -sS -X POST "https://$APP_URL/admin/init-db"
if ($INIT_RESPONSE -match '"success":true') {
    Write-Host "✅ Database initialized successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Database initialization may have failed. Response: $INIT_RESPONSE" -ForegroundColor Red
}
Write-Host ""

# Step 12: Populate database with sample data
Write-Host "📝 Step 12: Populating database with sample data..." -ForegroundColor Yellow
Write-Host "   This will populate all UI sections with test data..." -ForegroundColor Gray
try {
    $POPULATE_RESPONSE = Invoke-RestMethod -Uri "https://$APP_URL/admin/populate-sample-data" -Method POST -ErrorAction Stop
    if ($POPULATE_RESPONSE.success) {
        Write-Host "✅ Sample data populated successfully" -ForegroundColor Green
        Write-Host "   • Negotiations: $($POPULATE_RESPONSE.counts.negotiations)" -ForegroundColor Gray
        Write-Host "   • Notifications: $($POPULATE_RESPONSE.counts.notifications)" -ForegroundColor Gray
        Write-Host "   • Usage Events: $($POPULATE_RESPONSE.counts.usage_events)" -ForegroundColor Gray
        Write-Host "   • Access Endpoints: $($POPULATE_RESPONSE.counts.access_endpoints)" -ForegroundColor Gray
        Write-Host "   • Strategies: $($POPULATE_RESPONSE.counts.strategies)" -ForegroundColor Gray
        Write-Host "   • Parsed URLs: $($POPULATE_RESPONSE.counts.parsed_urls)" -ForegroundColor Gray
        Write-Host "   • Content: $($POPULATE_RESPONSE.counts.content)" -ForegroundColor Gray
        Write-Host "   • Licenses: $($POPULATE_RESPONSE.counts.licenses)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Sample data population may have failed" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Sample data population failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   You can manually populate later with:" -ForegroundColor Gray
    Write-Host "   curl.exe -X POST https://$APP_URL/admin/populate-sample-data" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "🎉 Deployment Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Deployment Summary:" -ForegroundColor White
Write-Host "  • App URL: https://$APP_URL"
Write-Host "  • Dashboard: https://$APP_URL/"
Write-Host "  • Admin Status: https://$APP_URL/admin/db-status"
Write-Host "  • JWT Secret: $JWT_SECRET"
Write-Host ""
Write-Host "✅ Sample Data:" -ForegroundColor Green
Write-Host "  • Database populated with test data for all UI sections"
Write-Host "  • Includes negotiations, notifications, usage logs, and more"
Write-Host ""
Write-Host "🔐 Save your JWT secret securely!" -ForegroundColor Yellow
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor White
Write-Host "  1. Visit https://$APP_URL/ to access the dashboard"
Write-Host "  2. Login with one of the default publishers:"
Write-Host "     - Publisher A News (site-a.local)"
Write-Host "     - Publisher B Documentation (site-b.local)"
Write-Host "  3. All UI sections should now have sample data"
Write-Host ""
Write-Host "📊 View logs:" -ForegroundColor White
Write-Host "  az webapp log tail --name $APP_NAME --resource-group $RESOURCE_GROUP"
Write-Host ""
