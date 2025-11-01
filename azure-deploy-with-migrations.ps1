# Azure Deployment Script with Automatic Migrations
# This script builds, tags, pushes, and deploys the licensing-api with migration support

$ErrorActionPreference = "Stop"

$DOCKER_USER = "paulandrewfarrow"
$TIMESTAMP = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Azure Deployment with Migrations" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Timestamp: $TIMESTAMP" -ForegroundColor Gray
Write-Host ""

# Step 1: Build the licensing-api image locally
Write-Host "Step 1: Building licensing-api Docker image..." -ForegroundColor Yellow
docker-compose build licensing-api

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green
Write-Host ""

# Step 2: Tag the image with timestamp
Write-Host "Step 2: Tagging image..." -ForegroundColor Yellow
$LOCAL_IMAGE = "tollbit-licensing-api"
$REMOTE_IMAGE = "$DOCKER_USER/monetizeplus-licensing-api"
$REMOTE_TAG = "${REMOTE_IMAGE}:${TIMESTAMP}"

docker tag $LOCAL_IMAGE "${REMOTE_IMAGE}:latest"
docker tag $LOCAL_IMAGE $REMOTE_TAG

Write-Host "✓ Tagged as:" -ForegroundColor Green
Write-Host "  - ${REMOTE_IMAGE}:latest" -ForegroundColor Gray
Write-Host "  - $REMOTE_TAG" -ForegroundColor Gray
Write-Host ""

# Step 3: Push to Docker Hub
Write-Host "Step 3: Pushing to Docker Hub..." -ForegroundColor Yellow
Write-Host "  Pushing latest..." -ForegroundColor Gray
docker push "${REMOTE_IMAGE}:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Push failed!" -ForegroundColor Red
    exit 1
}

Write-Host "  Pushing timestamped version..." -ForegroundColor Gray
docker push $REMOTE_TAG

Write-Host "✓ Pushed successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Update docker-compose.azure.yml
Write-Host "Step 4: Updating docker-compose.azure.yml..." -ForegroundColor Yellow
$composeFile = "docker-compose.azure.yml"
$composeContent = Get-Content $composeFile -Raw

# Replace the licensing-api image tag
$pattern = "image: $REMOTE_IMAGE`:[\S]+"
$composeContent = $composeContent -replace $pattern, "image: $REMOTE_TAG"

$composeContent | Set-Content $composeFile -NoNewline
Write-Host "✓ Updated to use: $REMOTE_TAG" -ForegroundColor Green
Write-Host ""

# Step 5: Display next steps
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Next Steps for Azure Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "The Docker image has been built and pushed with automatic migrations." -ForegroundColor White
Write-Host ""

Write-Host "To deploy to Azure Container Apps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Option A - Update existing deployment:" -ForegroundColor Cyan
Write-Host "  az containerapp update ``" -ForegroundColor Gray
Write-Host "    --name monetizeplusapp ``" -ForegroundColor Gray
Write-Host "    --resource-group MonetizePlusRG ``" -ForegroundColor Gray
Write-Host "    --image $REMOTE_TAG" -ForegroundColor Gray
Write-Host ""

Write-Host "Option B - Full redeployment (if needed):" -ForegroundColor Cyan
Write-Host "  1. Run: .\azure-deploy.ps1" -ForegroundColor Gray
Write-Host "     (This will deploy the updated docker-compose.azure.yml)" -ForegroundColor Gray
Write-Host ""

Write-Host "What will happen on deployment:" -ForegroundColor Yellow
Write-Host "  ✓ New container starts with updated licensing-api" -ForegroundColor Green
Write-Host "  ✓ Migrations run automatically on startup" -ForegroundColor Green
Write-Host "  ✓ Missing tables (license_options, access_endpoints, content) are created" -ForegroundColor Green
Write-Host "  ✓ API endpoints /api/licenses and /api/access will work" -ForegroundColor Green
Write-Host ""

Write-Host "To verify after deployment:" -ForegroundColor Yellow
Write-Host "  curl.exe https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/api/licenses?publisherId=1" -ForegroundColor Gray
Write-Host "  curl.exe https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/api/access?publisherId=1" -ForegroundColor Gray
Write-Host ""

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Image Details" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Latest:     ${REMOTE_IMAGE}:latest" -ForegroundColor White
Write-Host "Versioned:  $REMOTE_TAG" -ForegroundColor White
Write-Host ""
Write-Host "✓ Ready to deploy!" -ForegroundColor Green
Write-Host ""
