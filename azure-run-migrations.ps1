# Azure Database Migration Script
# This script runs all pending migrations on the Azure PostgreSQL database

$APP_NAME = "monetizeplusapp"
$RESOURCE_GROUP = "MonetizePlusRG"

Write-Host "🔧 Running Database Migrations on Azure" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if azure CLI is logged in
$account = az account show 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Please log in to Azure CLI first:" -ForegroundColor Red
    Write-Host "   az login --scope https://management.core.windows.net//.default" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Azure CLI authenticated" -ForegroundColor Green
Write-Host ""

# Get database connection details from the container app
Write-Host "📊 Getting database connection..." -ForegroundColor Yellow
$dbUrl = az containerapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query "properties.template.containers[0].env[?name=='DATABASE_URL'].value" -o tsv

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host "⚠️  Could not retrieve DATABASE_URL from container app" -ForegroundColor Yellow
    $dbUrl = "postgresql://monetizeplus:monetizeplus123@postgres:5432/monetizeplus"
    Write-Host "   Using default: $dbUrl" -ForegroundColor Gray
}

Write-Host "✓ Database URL: $dbUrl" -ForegroundColor Green
Write-Host ""

# Read all migration files in order
$migrationsDir = "database\migrations"
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

Write-Host "📂 Found $($migrationFiles.Count) migration files" -ForegroundColor Cyan
Write-Host ""

# Create a combined migration script
$combinedSql = @"
-- Combined Migration Script for Azure
-- Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

BEGIN;

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
);

"@

foreach ($file in $migrationFiles) {
    $migrationName = $file.Name
    Write-Host "   📄 Including: $migrationName" -ForegroundColor Gray
    
    $sqlContent = Get-Content -Path $file.FullName -Raw
    
    $combinedSql += @"

-- ========================================
-- Migration: $migrationName
-- ========================================

-- Check if migration already applied
DO `$`$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE migration_name = '$migrationName') THEN
        -- Apply migration
        $sqlContent

        -- Record migration
        INSERT INTO schema_migrations (migration_name) VALUES ('$migrationName');
        RAISE NOTICE 'Applied migration: $migrationName';
    ELSE
        RAISE NOTICE 'Skipping already applied migration: $migrationName';
    END IF;
END `$`$;

"@
}

$combinedSql += @"

COMMIT;

-- Show applied migrations
SELECT migration_name, applied_at FROM schema_migrations ORDER BY id;
"@

# Save to temporary file
$tempFile = [System.IO.Path]::GetTempFileName() + ".sql"
$combinedSql | Out-File -FilePath $tempFile -Encoding UTF8
Write-Host ""
Write-Host "✓ Combined migration script created: $tempFile" -ForegroundColor Green
Write-Host ""

# Run the migration using Azure Container Apps exec
Write-Host "🚀 Executing migrations on Azure database..." -ForegroundColor Cyan
Write-Host ""

# Upload the SQL file to the container
Write-Host "   1. Copying SQL file to container..." -ForegroundColor Yellow
$sqlContent = Get-Content -Path $tempFile -Raw

# Execute the SQL directly using psql via container exec
$psqlCommand = @"
PGPASSWORD=monetizeplus123 psql -h postgres -U monetizeplus -d monetizeplus -v ON_ERROR_STOP=1 << 'EOSQL'
$sqlContent
EOSQL
"@

try {
    Write-Host "   2. Running migrations..." -ForegroundColor Yellow
    az containerapp exec --name $APP_NAME --resource-group $RESOURCE_GROUP --command "/bin/sh -c `"$psqlCommand`""
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migrations completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
        Write-Host "   Check the output above for errors" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error executing migrations: $_" -ForegroundColor Red
}

# Clean up temp file
Remove-Item -Path $tempFile -Force

Write-Host ""
Write-Host "🔍 Verifying tables..." -ForegroundColor Cyan
Write-Host ""

# Verify tables exist
$verifyCommand = @"
PGPASSWORD=monetizeplus123 psql -h postgres -U monetizeplus -d monetizeplus -c "\dt license_options; \dt access_endpoints; \dt content;"
"@

az containerapp exec --name $APP_NAME --resource-group $RESOURCE_GROUP --command "/bin/sh -c `"$verifyCommand`""

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
