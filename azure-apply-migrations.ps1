# Apply Migrations to Azure Container App Database
# This script connects to the running Azure container and applies migrations

$APP_NAME = "monetizeplusapp"
$RESOURCE_GROUP = "MonetizePlusRG"

Write-Host "Azure Database Migration" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host ""

# Check if migration bundle exists
if (-not (Test-Path "azure-migrations-bundle.sql")) {
    Write-Host "Error: azure-migrations-bundle.sql not found!" -ForegroundColor Red
    Write-Host "Run azure-quick-migrate.ps1 first to generate it." -ForegroundColor Yellow
    exit 1
}

# Read the SQL content
$sqlContent = Get-Content -Path "azure-migrations-bundle.sql" -Raw

Write-Host "Connecting to Azure Container App..." -ForegroundColor Yellow
Write-Host ""

# Create a temporary script to run inside the container
$scriptContent = @"
#!/bin/sh
# Azure migration script

# Save SQL to temp file
cat > /tmp/migrations.sql << 'SQLEOF'
$sqlContent
SQLEOF

# Run the migration
echo "Applying migrations..."
PGPASSWORD=monetizeplus123 psql -h postgres -U monetizeplus -d monetizeplus -f /tmp/migrations.sql

# Show results
echo ""
echo "Verifying tables..."
PGPASSWORD=monetizeplus123 psql -h postgres -U monetizeplus -d monetizeplus -c "\dt license_options; \dt access_endpoints; \dt content;"

# Clean up
rm /tmp/migrations.sql

echo ""
echo "Migration complete!"
"@

# Save script to temp file
$tempScript = "azure-migrate-exec.sh"
$scriptContent | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline

Write-Host "Executing migration on Azure..." -ForegroundColor Yellow
Write-Host ""

# Execute via Azure Container Apps
try {
    # Upload and execute the script
    $command = Get-Content $tempScript -Raw
    
    Write-Host "Running migrations..." -ForegroundColor Gray
    az containerapp exec `
        --name $APP_NAME `
        --resource-group $RESOURCE_GROUP `
        --command "/bin/sh -c `"$command`""
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "SUCCESS: Migrations applied!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "WARNING: Command exited with code $LASTEXITCODE" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
}

# Clean up
Remove-Item -Path $tempScript -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
