# Test the complete URL Library -> Policy creation flow
Write-Host "`n=== Testing URL Library to Policy Creation Flow ===" -ForegroundColor Cyan

$API_URL = "http://localhost:3000"

Write-Host "`n1. Simulating grounding API call (this adds URL to library)..." -ForegroundColor Yellow
$groundingRequest = @{
    url = "http://site-a.local/news/special-report"
    clientId = "OpenAI"
    purpose = "inference"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/grounding" -Method POST -Body $groundingRequest -ContentType "application/json"
    Write-Host "   Success: URL added to library via grounding API" -ForegroundColor Green
    Write-Host "   License Type: $($response.rate.licenseType)" -ForegroundColor Gray
    Write-Host "   Price: $($response.rate.priceMicros / 1000000) $($response.rate.currency)" -ForegroundColor Gray
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Checking URL Library..." -ForegroundColor Yellow
try {
    $urls = Invoke-RestMethod -Uri "$API_URL/parsed-urls" -Method GET
    $targetUrl = $urls.urls | Where-Object { $_.url -eq "http://site-a.local/news/special-report" }
    
    if ($targetUrl) {
        Write-Host "   Success: URL found in library" -ForegroundColor Green
        Write-Host "   ID: $($targetUrl.id)" -ForegroundColor Gray
        Write-Host "   Title: $($targetUrl.title)" -ForegroundColor Gray
        Write-Host "   Parse Count: $($targetUrl.parse_count)" -ForegroundColor Gray
    } else {
        Write-Host "   Warning: URL not found in library" -ForegroundColor Red
    }
} catch {
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3. Next steps (manual):" -ForegroundColor Yellow
Write-Host "   a) Open dashboard: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   b) Navigate to 'URL Library' tab" -ForegroundColor Cyan
Write-Host "   c) Find the URL: http://site-a.local/news/special-report" -ForegroundColor Cyan
Write-Host "   d) Click the purple '+' icon to create a page-specific policy" -ForegroundColor Cyan
Write-Host "   e) The Policy Management page should open with URL pre-filled" -ForegroundColor Cyan
Write-Host "   f) Configure the policy and save" -ForegroundColor Cyan
Write-Host "   g) Return to URL Library - the URL should now show 'Page-Specific' policy indicator" -ForegroundColor Cyan

Write-Host "`n4. Alternative: Create policy directly in Policy Management tab" -ForegroundColor Yellow
Write-Host "   - Click 'Page-Specific Policy' button" -ForegroundColor Cyan
Write-Host "   - Manually enter the URL pattern" -ForegroundColor Cyan
Write-Host "   - Configure and save" -ForegroundColor Cyan

Write-Host "`n=== Flow Diagram ===" -ForegroundColor Magenta
Write-Host "   Grounding API to URL Library to Click + icon to Policy Editor URL pre-filled to Save to Policy Indicator" -ForegroundColor White
Write-Host "   Alternative: Policy Management tab to Manual entry to Save to Policy Indicator" -ForegroundColor White

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
