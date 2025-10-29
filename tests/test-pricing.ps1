$url = "http://localhost:3000/grounding"

Write-Host "`n=== Testing Pricing Tiers ===" -ForegroundColor Cyan

# Test GPTBot - should be $0.005
Write-Host "`n1. GPTBot ($0.005 expected):" -ForegroundColor Yellow
$body1 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "GPTBot"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $url -Method Post -Body $body1 -ContentType "application/json"
    Write-Host "  Result: ACCESS GRANTED" -ForegroundColor Green
    Write-Host "  Cost: `$$($response1.license.costPerFetch)" -ForegroundColor Cyan
    Write-Host "  Rule: $($response1.license.rule)" -ForegroundColor Gray
} catch {
    Write-Host "  Result: ACCESS DENIED" -ForegroundColor Red
}

# Test ClaudeBot - should be $0.003
Write-Host "`n2. ClaudeBot ($0.003 expected):" -ForegroundColor Yellow
$body2 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "ClaudeBot"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $url -Method Post -Body $body2 -ContentType "application/json"
    Write-Host "  Result: ACCESS GRANTED" -ForegroundColor Green
    Write-Host "  Cost: `$$($response2.license.costPerFetch)" -ForegroundColor Cyan
    Write-Host "  Rule: $($response2.license.rule)" -ForegroundColor Gray
} catch {
    Write-Host "  Result: ACCESS DENIED" -ForegroundColor Red
}

# Test UnknownBot - should be $0.001 (default)
Write-Host "`n3. UnknownBot ($0.001 expected - default):" -ForegroundColor Yellow
$body3 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "UnknownBot"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri $url -Method Post -Body $body3 -ContentType "application/json"
    Write-Host "  Result: ACCESS GRANTED" -ForegroundColor Green
    Write-Host "  Cost: `$$($response3.license.costPerFetch)" -ForegroundColor Cyan
    Write-Host "  Rule: $($response3.license.rule)" -ForegroundColor Gray
} catch {
    Write-Host "  Result: ACCESS DENIED" -ForegroundColor Red
}

Write-Host "`n=================================`n"
