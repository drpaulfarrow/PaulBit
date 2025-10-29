$url = "http://localhost:3000/grounding"

Write-Host "`n=== Testing Policy Enforcement ===" -ForegroundColor Cyan

# Test 1: GPTBot (should be DENIED)
Write-Host "`nTest 1: GPTBot access" -ForegroundColor Yellow
$body1 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "GPTBot"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $url -Method Post -Body $body1 -ContentType "application/json"
    Write-Host "  Result: ACCESS GRANTED" -ForegroundColor Green
    Write-Host "  License Status: $($response1.license.status)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        Write-Host "  Result: ACCESS DENIED (403)" -ForegroundColor Red
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Message: $($errorBody.message)" -ForegroundColor Red
    } else {
        Write-Host "  Error: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 2: UnknownBot (should follow default policy)
Write-Host "`nTest 2: UnknownBot access" -ForegroundColor Yellow
$body2 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "UnknownBot"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $url -Method Post -Body $body2 -ContentType "application/json"
    Write-Host "  Result: ACCESS GRANTED" -ForegroundColor Green
    Write-Host "  License Status: $($response2.license.status)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        Write-Host "  Result: ACCESS DENIED (403)" -ForegroundColor Red
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "  Message: $($errorBody.message)" -ForegroundColor Red
    } else {
        Write-Host "  Error: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=================================`n"
