$url = "http://localhost:3000/grounding"

Write-Host "`n=== Testing License Type Metadata ===" -ForegroundColor Cyan

# Test GPTBot - should show RAG Max Words (150)
Write-Host "`n1. GPTBot (RAG Max Words):" -ForegroundColor Yellow
$body1 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "GPTBot"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri $url -Method Post -Body $body1 -ContentType "application/json"
    Write-Host "  Cost: `$$($response1.license.costPerFetch)" -ForegroundColor Cyan
    Write-Host "  License Type: $($response1.license.licenseType) - $($response1.license.licenseTypeName)" -ForegroundColor Green
    Write-Host "  Max Word Count: $($response1.license.maxWordCount)" -ForegroundColor Magenta
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test ClaudeBot - should show RAG Attribution Required
Write-Host "`n2. ClaudeBot (RAG Attribution):" -ForegroundColor Yellow
$body2 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "ClaudeBot"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri $url -Method Post -Body $body2 -ContentType "application/json"
    Write-Host "  Cost: `$$($response2.license.costPerFetch)" -ForegroundColor Cyan
    Write-Host "  License Type: $($response2.license.licenseType) - $($response2.license.licenseTypeName)" -ForegroundColor Green
    Write-Host "  Attribution Required: $($response2.license.attributionRequired)" -ForegroundColor Magenta
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test UnknownBot - should show RAG Unrestricted (default)
Write-Host "`n3. UnknownBot (RAG Unrestricted - default):" -ForegroundColor Yellow
$body3 = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "UnknownBot"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri $url -Method Post -Body $body3 -ContentType "application/json"
    Write-Host "  Cost: `$$($response3.license.costPerFetch)" -ForegroundColor Cyan
    Write-Host "  License Type: $($response3.license.licenseType) - $($response3.license.licenseTypeName)" -ForegroundColor Green
} catch {
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=================================`n"
