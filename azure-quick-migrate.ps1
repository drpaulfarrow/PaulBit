# Quick Azure Database Migration via Docker Compose
# This connects to the Azure PostgreSQL database from your local Docker setup

$APP_NAME = "monetizeplusapp"
$RESOURCE_GROUP = "MonetizePlusRG"

Write-Host "Azure Database Migration Bundle Generator" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Database connection for Azure
$DB_HOST = "postgres"
$DB_USER = "monetizeplus"
$DB_PASS = "monetizeplus123"
$DB_NAME = "monetizeplus"

Write-Host "Creating migration bundle..." -ForegroundColor Yellow
Write-Host ""

# Get list of migration files
$migrationsDir = "database\migrations"
$migrationFiles = @(
    "006_cm_rtbspec_schema.sql",
    "007_access_endpoints_refactor.sql",
    "008_access_endpoint_formats.sql",
    "009_negotiation_system.sql",
    "010_partner_strategies.sql",
    "011_add_purpose_to_licenses.sql",
    "012_multi_use_case_support.sql",
    "013_fix_strategy_license_types.sql",
    "014_remove_purpose_use_license_type.sql",
    "015_add_license_linking.sql",
    "016_create_notifications.sql",
    "019_add_license_name.sql",
    "020_migrate_purpose_to_license_type.sql"
)

# Build a single migration SQL file
$outputSql = "-- Azure Migration Bundle`n"
$outputSql += "-- Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n`n"
$outputSql += "BEGIN;`n`n"
$outputSql += "-- Create migrations tracking table`n"
$outputSql += "CREATE TABLE IF NOT EXISTS schema_migrations (`n"
$outputSql += "    id SERIAL PRIMARY KEY,`n"
$outputSql += "    migration_name VARCHAR(255) UNIQUE NOT NULL,`n"
$outputSql += "    applied_at TIMESTAMP DEFAULT NOW()`n"
$outputSql += ");`n`n"

foreach ($filename in $migrationFiles) {
    $filePath = Join-Path $migrationsDir $filename
    
    if (Test-Path $filePath) {
        Write-Host "   Including: $filename" -ForegroundColor Gray
        $content = Get-Content -Path $filePath -Raw
        
        $outputSql += "`n-- ============================================================`n"
        $outputSql += "-- Migration: $filename`n"
        $outputSql += "-- ============================================================`n"
        $outputSql += $content
        $outputSql += "`n-- Record migration`n"
        $outputSql += "INSERT INTO schema_migrations (migration_name) VALUES ('$filename') ON CONFLICT DO NOTHING;`n`n"
    } else {
        Write-Host "   Warning: Not found: $filename" -ForegroundColor Yellow
    }
}

$outputSql += "`nCOMMIT;`n`n"
$outputSql += "-- Show all applied migrations`n"
$outputSql += "SELECT migration_name, applied_at FROM schema_migrations ORDER BY id;`n`n"
$outputSql += "-- Verify critical tables exist`n"
$outputSql += "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('license_options', 'access_endpoints', 'content') ORDER BY table_name;`n"

# Save to file
$sqlFile = "azure-migrations-bundle.sql"
$outputSql | Out-File -FilePath $sqlFile -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "Created migration bundle: $sqlFile" -ForegroundColor Green
Write-Host ""

Write-Host "To apply these migrations to Azure:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1 - Via docker-compose.azure.yml (if running locally):" -ForegroundColor Yellow
Write-Host "  docker-compose -f docker-compose.azure.yml exec postgres psql -U $DB_USER -d $DB_NAME < $sqlFile" -ForegroundColor Gray
Write-Host ""
Write-Host "Option 2 - Via Azure Container Apps exec:" -ForegroundColor Yellow
Write-Host "  az containerapp exec --name $APP_NAME --resource-group $RESOURCE_GROUP --command /bin/sh" -ForegroundColor Gray
Write-Host "  Then run: PGPASSWORD=$DB_PASS psql -h $DB_HOST -U $DB_USER -d $DB_NAME" -ForegroundColor Gray
Write-Host "  And paste the SQL from $sqlFile" -ForegroundColor Gray
Write-Host ""

Write-Host "The migration bundle is ready!" -ForegroundColor Green
Write-Host ""
