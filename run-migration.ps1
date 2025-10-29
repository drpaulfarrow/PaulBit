# Run cm_rtbspec database migration
# Usage: .\run-migration.ps1

Write-Host "Running cm_rtbspec v0.1 database migration..." -ForegroundColor Yellow

# Check if Docker is running
$dockerRunning = docker ps 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if postgres container is running
$postgresRunning = docker ps --filter "name=tollbit-postgres" --format "{{.Names}}"
if (-not $postgresRunning) {
    Write-Host "ERROR: PostgreSQL container is not running. Run 'docker-compose up -d' first." -ForegroundColor Red
    exit 1
}

Write-Host "Found PostgreSQL container: $postgresRunning" -ForegroundColor Green

# Run the migration
Write-Host "`nExecuting migration SQL..." -ForegroundColor Yellow
docker exec tollbit-postgres psql -U tollbit -d tollbit -f /docker-entrypoint-initdb.d/migrations/006_cm_rtbspec_schema.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Migration completed successfully!" -ForegroundColor Green
    
    # Verify new tables exist
    Write-Host "`nVerifying new tables..." -ForegroundColor Yellow
    docker exec tollbit-postgres psql -U tollbit -d tollbit -c "\dt content license_options access_endpoints audit_trail"
    
    # Check row counts
    Write-Host "`nChecking data migration..." -ForegroundColor Yellow
    docker exec tollbit-postgres psql -U tollbit -d tollbit -c "SELECT 'content' as table_name, COUNT(*) FROM content UNION ALL SELECT 'license_options', COUNT(*) FROM license_options UNION ALL SELECT 'access_endpoints', COUNT(*) FROM access_endpoints;"
    
} else {
    Write-Host "`n❌ Migration failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎉 cm_rtbspec v0.1 migration complete!" -ForegroundColor Green
