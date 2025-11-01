# Systematic UI Test Suite for Publisher Dashboard
# Tests all major functionality and reports issues

$API_URL = "http://localhost:3000"
$DASHBOARD_URL = "http://localhost:5173"
$PUBLISHER_ID = "1"

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Publisher Dashboard - Systematic Test Suite" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$script:totalTests = 0
$script:passedTests = 0
$script:failedTests = 0
$script:issues = @()

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [string]$ExpectedStatus = "200"
    )
    
    $script:totalTests++
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            UseBasicParsing = $true
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "  PASS - Status: $($response.StatusCode)" -ForegroundColor Green
            $script:passedTests++
            return $true
        } else {
            Write-Host "  FAIL - Expected: $ExpectedStatus, Got: $($response.StatusCode)" -ForegroundColor Red
            $script:failedTests++
            $script:issues += "[$Name] Unexpected status code: $($response.StatusCode)"
            return $false
        }
    }
    catch {
        Write-Host "  FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:failedTests++
        $script:issues += "[$Name] $($_.Exception.Message)"
        return $false
    }
}

function Test-JsonEndpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$ExpectedProperty
    )
    
    $script:totalTests++
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 10
        
        if ($ExpectedProperty -and -not ($response.PSObject.Properties.Name -contains $ExpectedProperty)) {
            Write-Host "  FAIL - Missing property: $ExpectedProperty" -ForegroundColor Red
            $script:failedTests++
            $script:issues += "[$Name] Missing expected property: $ExpectedProperty"
            return $false
        }
        
        Write-Host "  PASS - Valid JSON response" -ForegroundColor Green
        $script:passedTests++
        return $true
    }
    catch {
        Write-Host "  FAIL - Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:failedTests++
        $script:issues += "[$Name] $($_.Exception.Message)"
        return $false
    }
}

Write-Host "PHASE 1: Service Availability" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

Test-Endpoint -Name "Frontend Available" -Url $DASHBOARD_URL
Test-Endpoint -Name "API Available" -Url "$API_URL/health"

Write-Host ""
Write-Host "PHASE 2: Authentication & Publisher Data" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

Test-JsonEndpoint -Name "Get Publisher Info" -Url "$API_URL/api/publishers/$PUBLISHER_ID" -ExpectedProperty "publisher_id"

Write-Host ""
Write-Host "PHASE 3: URL Library Endpoints" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

Test-JsonEndpoint -Name "Get URLs" -Url "$API_URL/api/urls?publisher_id=$PUBLISHER_ID" -ExpectedProperty "urls"
Test-Endpoint -Name "Get URL Stats" -Url "$API_URL/api/urls/stats?publisher_id=$PUBLISHER_ID"

Write-Host ""
Write-Host "PHASE 4: License Manager Endpoints" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

Test-JsonEndpoint -Name "Get Licenses" -Url "$API_URL/api/licenses?publisher_id=$PUBLISHER_ID" -ExpectedProperty "licenses"
Test-Endpoint -Name "Get License Stats" -Url "$API_URL/api/licenses/stats?publisher_id=$PUBLISHER_ID"

Write-Host ""
Write-Host "PHASE 5: Access Configuration Endpoints" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Test-JsonEndpoint -Name "Get Access Rules" -Url "$API_URL/api/access?publisher_id=$PUBLISHER_ID" -ExpectedProperty "rules"
Test-Endpoint -Name "Get Default Policy" -Url "$API_URL/api/access/default-policy?publisher_id=$PUBLISHER_ID"

Write-Host ""
Write-Host "PHASE 6: Negotiation System Endpoints" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Test-JsonEndpoint -Name "Get Negotiations" -Url "$API_URL/api/negotiations?publisher_id=$PUBLISHER_ID" -ExpectedProperty "negotiations"
Test-JsonEndpoint -Name "Get Strategy Configs" -Url "$API_URL/api/negotiations/strategies?publisher_id=$PUBLISHER_ID" -ExpectedProperty "strategies"
Test-JsonEndpoint -Name "Get Notifications" -Url "$API_URL/api/notifications?publisher_id=$PUBLISHER_ID" -ExpectedProperty "notifications"
Test-JsonEndpoint -Name "Get Unread Count" -Url "$API_URL/api/notifications/unread-count?publisher_id=$PUBLISHER_ID" -ExpectedProperty "unread_count"

Write-Host ""
Write-Host "PHASE 7: Usage Logs & Analytics" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Test-JsonEndpoint -Name "Get Usage Logs" -Url "$API_URL/api/logs?publisher_id=$PUBLISHER_ID" -ExpectedProperty "logs"
Test-Endpoint -Name "Get Usage Stats" -Url "$API_URL/api/logs/stats?publisher_id=$PUBLISHER_ID"

Write-Host ""
Write-Host "PHASE 8: Scraper/Grounding Tool" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Test-Endpoint -Name "Scraper Health" -Url "$API_URL/api/scraper/health"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests: $script:totalTests" -ForegroundColor White
Write-Host "Passed: $script:passedTests" -ForegroundColor Green
Write-Host "Failed: $script:failedTests" -ForegroundColor Red
Write-Host ""

if ($script:failedTests -gt 0) {
    Write-Host "ISSUES FOUND:" -ForegroundColor Red
    Write-Host "=============" -ForegroundColor Red
    foreach ($issue in $script:issues) {
        Write-Host "  - $issue" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "ACTION REQUIRED: Fix the above issues" -ForegroundColor Red
    exit 1
} else {
    Write-Host "ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "The UI and API are functioning correctly." -ForegroundColor Green
    exit 0
}
