# Content Licensing Gateway - Helper Commands
# Run: .\helpers.ps1 <command>

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Show-Help {
    Write-Host "`n=== Content Licensing Gateway - Helper Commands ===" -ForegroundColor Cyan
    Write-Host "`nUsage: .\helpers.ps1 <command>`n"
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host "  start       - Start all services"
    Write-Host "  stop        - Stop all services"
    Write-Host "  restart     - Restart all services"
    Write-Host "  logs        - Show logs (all services)"
    Write-Host "  logs-edge   - Show edge worker logs"
    Write-Host "  logs-api    - Show licensing API logs"
    Write-Host "  test        - Run automated tests"
    Write-Host "  status      - Show service status"
    Write-Host "  clean       - Stop and remove all data"
    Write-Host "  rebuild     - Rebuild and restart all services"
    Write-Host "  db          - Connect to PostgreSQL"
    Write-Host "  redis       - Connect to Redis"
    Write-Host "  usage       - Show recent usage events"
    Write-Host "  publishers  - List all publishers"
    Write-Host "  help        - Show this help message"
    Write-Host ""
}

function Start-Services {
    Write-Host "Starting all services..." -ForegroundColor Green
    docker-compose up -d
    Write-Host "`nWaiting for services to initialize..."
    Start-Sleep -Seconds 10
    docker-compose ps
    Write-Host "`nServices started! Access at http://localhost:8080" -ForegroundColor Green
}

function Stop-Services {
    Write-Host "Stopping all services..." -ForegroundColor Yellow
    docker-compose down
    Write-Host "Services stopped." -ForegroundColor Green
}

function Restart-Services {
    Write-Host "Restarting all services..." -ForegroundColor Yellow
    docker-compose restart
    Start-Sleep -Seconds 5
    docker-compose ps
}

function Show-Logs {
    docker-compose logs -f
}

function Show-EdgeLogs {
    docker-compose logs -f edge-worker
}

function Show-ApiLogs {
    docker-compose logs -f licensing-api
}

function Run-Tests {
    Write-Host "Running automated tests..." -ForegroundColor Green
    & ".\tests\run-tests.ps1"
}

function Show-Status {
    Write-Host "`n=== Service Status ===" -ForegroundColor Cyan
    docker-compose ps
    Write-Host "`n=== Port Check ===" -ForegroundColor Cyan
    $ports = @(8080, 3000, 5432, 6379)
    foreach ($port in $ports) {
        $listener = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($listener) {
            Write-Host "Port $port : LISTENING" -ForegroundColor Green
        } else {
            Write-Host "Port $port : NOT LISTENING" -ForegroundColor Red
        }
    }
}

function Clean-Everything {
    Write-Host "Stopping and removing all containers and data..." -ForegroundColor Red
    $confirm = Read-Host "This will delete all data. Continue? (y/N)"
    if ($confirm -eq 'y') {
        docker-compose down -v
        Write-Host "Cleanup complete." -ForegroundColor Green
    } else {
        Write-Host "Cancelled."
    }
}

function Rebuild-Services {
    Write-Host "Rebuilding all services..." -ForegroundColor Yellow
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    Write-Host "`nWaiting for services..."
    Start-Sleep -Seconds 10
    docker-compose ps
    Write-Host "Rebuild complete!" -ForegroundColor Green
}

function Connect-Database {
    Write-Host "Connecting to PostgreSQL..." -ForegroundColor Green
    docker exec -it monetizeplus-postgres psql -U monetizeplus -d monetizeplus
}

function Connect-Redis {
    Write-Host "Connecting to Redis..." -ForegroundColor Green
    docker exec -it monetizeplus-redis redis-cli
}

function Show-Usage {
    Write-Host "`n=== Recent Usage Events ===" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "http://localhost:3000/usage?limit=10" -ErrorAction SilentlyContinue
    if ($response) {
        $response.events | Format-Table -Property ts, publisher_id, url, agent_ua, cost_micro -AutoSize
        Write-Host "`nSummary:" -ForegroundColor Yellow
        Write-Host "Total Requests: $($response.summary.total_requests)"
        Write-Host "Total Cost: `$$($response.summary.total_cost_usd)"
    } else {
        Write-Host "Could not fetch usage data. Is the API running?" -ForegroundColor Red
    }
}

function Show-Publishers {
    Write-Host "`n=== Publishers ===" -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "http://localhost:3000/admin/publishers" -ErrorAction SilentlyContinue
    if ($response) {
        $response.publishers | Format-Table -Property id, name, hostname -AutoSize
    } else {
        Write-Host "Could not fetch publishers. Is the API running?" -ForegroundColor Red
    }
}

# Command router
switch ($Command.ToLower()) {
    "start" { Start-Services }
    "stop" { Stop-Services }
    "restart" { Restart-Services }
    "logs" { Show-Logs }
    "logs-edge" { Show-EdgeLogs }
    "logs-api" { Show-ApiLogs }
    "test" { Run-Tests }
    "status" { Show-Status }
    "clean" { Clean-Everything }
    "rebuild" { Rebuild-Services }
    "db" { Connect-Database }
    "redis" { Connect-Redis }
    "usage" { Show-Usage }
    "publishers" { Show-Publishers }
    "help" { Show-Help }
    default { 
        Write-Host "Unknown command: $Command" -ForegroundColor Red
        Show-Help 
    }
}
