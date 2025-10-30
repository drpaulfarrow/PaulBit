# Quick script to update just the licensing-api container in Azure
# This forces Azure to pull the new image with init.sql included

Write-Host "Updating licensing-api to version 20251030-121415..." -ForegroundColor Yellow

# Stop the app
Write-Host "`n1. Stopping Azure app..." -ForegroundColor Cyan
az webapp stop --name monetizeplusapp --resource-group MonetizePlusRG

# Update the container image
Write-Host "`n2. Updating licensing-api container image..." -ForegroundColor Cyan
az webapp config container set `
    --name monetizeplusapp `
    --resource-group MonetizePlusRG `
    --multicontainer-config-type compose `
    --multicontainer-config-file docker-compose.azure.yml

# Start the app
Write-Host "`n3. Starting Azure app..." -ForegroundColor Cyan
az webapp start --name monetizeplusapp --resource-group MonetizePlusRG

Write-Host "`n4. Waiting 30 seconds for services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

# Get the app URL
$APP_URL = az webapp show --name monetizeplusapp --resource-group MonetizePlusRG --query defaultHostName -o tsv
Write-Host "`n5. App URL: https://$APP_URL" -ForegroundColor Green

# Initialize the database
Write-Host "`n6. Initializing database..." -ForegroundColor Cyan
$response = curl.exe -s -X POST "https://$APP_URL/admin/init-db"
Write-Host $response

# Check database status
Write-Host "`n7. Checking database status..." -ForegroundColor Cyan
$status = curl.exe -s "https://$APP_URL/admin/db-status"
Write-Host $status

Write-Host "`n✅ Deployment complete! Test at: https://$APP_URL" -ForegroundColor Green
