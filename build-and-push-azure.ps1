# Build and push images for Azure deployment
$dockerUser = "paulandrewfarrow"

Write-Host "Building images for Azure deployment..." -ForegroundColor Cyan

# Build using docker-compose.azure.yml
Write-Host "`nBuilding with docker-compose.azure.yml..." -ForegroundColor Yellow
docker-compose -f docker-compose.azure.yml build

if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Build failed" -ForegroundColor Red
    exit 1
}

# Push images
Write-Host "`nPushing images to Docker Hub..." -ForegroundColor Yellow
docker push "$dockerUser/monetizeplus-licensing-api:latest"
docker push "$dockerUser/monetizeplus-publisher-dashboard:azure"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✓ Successfully built and pushed all Azure images!" -ForegroundColor Green
    Write-Host "`nImages:" -ForegroundColor Cyan
    Write-Host "  licensing-api: $dockerUser/monetizeplus-licensing-api:latest" -ForegroundColor White
    Write-Host "  publisher-dashboard: $dockerUser/monetizeplus-publisher-dashboard:azure" -ForegroundColor White
} else {
    Write-Host "`n✗ Failed to push images" -ForegroundColor Red
    exit 1
}
