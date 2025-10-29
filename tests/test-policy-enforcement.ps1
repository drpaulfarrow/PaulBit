# Quick test to verify policy enforcement
Write-Host "`n=== Testing Policy Enforcement ===" -ForegroundColor Cyan

$API_URL = "http://localhost:3000"

# Test 1: GPTBot (should be blocked if policy blocks it)
Write-Host "`nTest 1: GPTBot access" -ForegroundColor Yellow
$request = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    clientId = "GPTBot"
    purpose = "inference"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/grounding" -Method POST -Body $request -ContentType "application/json"
    Write-Host "  Result: ACCESS GRANTED" -ForegroundColor Green
    if ($response.metadata.licenseStatus) {
        Write-Host "  License Status: $($response.metadata.licenseStatus)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Result: ACCESS DENIED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Test 2: UnknownBot (should follow default policy)
Write-Host "`nTest 2: UnknownBot access" -ForegroundColor Yellow
$request = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    clientId = "UnknownBot"
    purpose = "inference"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/grounding" -Method POST -Body $request -ContentType "application/json"
    Write-Host "  Result: ACCESS GRANTED" -ForegroundColor Green
    if ($response.metadata.licenseStatus) {
        Write-Host "  License Status: $($response.metadata.licenseStatus)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  Result: ACCESS DENIED" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "`n=== Check API logs for debug output ===" -ForegroundColor Cyan
Write-Host "Run: docker logs tollbit-licensing-api --tail 50" -ForegroundColor Gray

Write-Host "`n=== Expected Behavior ===" -ForegroundColor Magenta
Write-Host "If policy BLOCKS GPTBot:" -ForegroundColor White
Write-Host "  - Test 1 should be DENIED" -ForegroundColor White
Write-Host "If policy ALLOWS GPTBot:" -ForegroundColor White
Write-Host "  - Test 1 should be GRANTED" -ForegroundColor White
Write-Host "Default policy determines Test 2 result" -ForegroundColor White
