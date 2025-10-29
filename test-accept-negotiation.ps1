# Test Accept Negotiation API

$negotiationId = "f84706be-0bf2-4c51-9498-65b70f7d2b1b"
$publisherId = 1

Write-Host "Testing Accept Negotiation API..." -ForegroundColor Yellow
Write-Host "Negotiation ID: $negotiationId" -ForegroundColor Cyan

# Accept the negotiation
$body = @{
    publisherId = $publisherId
} | ConvertTo-Json

Write-Host "`nCalling POST /api/negotiations/$negotiationId/accept..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3003/api/negotiations/$negotiationId/accept" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing

    Write-Host "`nSuccess! Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "`nResponse:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10

    Write-Host "`n✓ Negotiation accepted successfully!" -ForegroundColor Green
    Write-Host "A new license has been created." -ForegroundColor Green
    
    # Check the database
    Write-Host "`nChecking database..." -ForegroundColor Yellow
    docker exec tollbit-postgres psql -U tollbit -d tollbit -c "SELECT id, status, license_id, completed_at FROM negotiations WHERE id = '$negotiationId';"
    
    Write-Host "`nCreated license:" -ForegroundColor Yellow
    docker exec tollbit-postgres psql -U tollbit -d tollbit -c "SELECT id, license_type, price, currency, status FROM license_options ORDER BY created_at DESC LIMIT 1;"
    
} catch {
    Write-Host "`n✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Error details: $errorBody" -ForegroundColor Red
    }
}
