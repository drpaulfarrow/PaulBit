$url = "http://localhost:3000/grounding"

Write-Host "`n=== Testing ClaudeBot Access ===" -ForegroundColor Cyan

$body = @{
    url = "https://www.bbc.co.uk/news/articles/cq503p7yjypo"
    purpose = "inference"
    clientId = "ClaudeBot"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
    Write-Host "Result: ACCESS GRANTED" -ForegroundColor Green
    Write-Host "License Status: $($response.license.status)"
    Write-Host "Policy Name: $($response.license.policyName)"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 403) {
        Write-Host "Result: ACCESS DENIED (403)" -ForegroundColor Red
        $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Message: $($errorBody.message)" -ForegroundColor Red
    } else {
        Write-Host "Error: $statusCode - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=================================`n"
