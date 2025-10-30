# MonetizePlus Azure Update Script
# Updates the Azure app with new versioned Docker images

$APP_NAME = "monetizeplusapp"
$RESOURCE_GROUP = "MonetizePlusRG"

Write-Host "🔄 Updating MonetizePlus on Azure" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Update Docker Compose configuration
Write-Host "📝 Step 1: Updating Docker Compose configuration..." -ForegroundColor Yellow
az webapp config container set `
  --name $APP_NAME `
  --resource-group $RESOURCE_GROUP `
  --multicontainer-config-type compose `
  --multicontainer-config-file docker-compose.azure.yml
Write-Host "✅ Configuration updated" -ForegroundColor Green
Write-Host ""

# Step 2: Restart the app
Write-Host "📝 Step 2: Restarting app to pull new images..." -ForegroundColor Yellow
az webapp restart --name $APP_NAME --resource-group $RESOURCE_GROUP
Write-Host "✅ App restarted" -ForegroundColor Green
Write-Host ""

# Step 3: Wait for app to be ready
Write-Host "📝 Step 3: Waiting for app to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 30
Write-Host "✅ App should be ready" -ForegroundColor Green
Write-Host ""

# Step 4: Get app URL
$APP_URL = az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv
Write-Host "🌐 App URL: https://$APP_URL" -ForegroundColor Green
Write-Host ""

# Step 5: Initialize database
Write-Host "📝 Step 4: Initializing database..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "https://$APP_URL/admin/init-db" -Method POST -ErrorAction Stop
    Write-Host "✅ Database initialized successfully!" -ForegroundColor Green
    Write-Host "   Publishers: $($response.publishers)" -ForegroundColor Gray
    Write-Host "   Policies: $($response.policies)" -ForegroundColor Gray
    Write-Host "   Plans: $($response.plans)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Database initialization failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Try running: curl.exe -X POST https://$APP_URL/admin/init-db" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "Dashboard: https://$APP_URL" -ForegroundColor Green
Write-Host ""
