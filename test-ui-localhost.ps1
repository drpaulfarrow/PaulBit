#!/usr/bin/env pwsh
# Comprehensive UI Test Suite for Publisher Dashboard (Localhost)
# Tests the UI when running locally on localhost:5173
# Also validates API endpoints that the UI depends on

$API_URL = "http://localhost:3000"
$NEGOTIATION_API_URL = "http://localhost:3003"
$UI_URL = "http://localhost:5173"
$PUBLISHER_ID = 1

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   Publisher Dashboard UI Tests (Localhost)" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan
Write-Host "UI URL: $UI_URL" -ForegroundColor Gray
Write-Host "API URL: $API_URL" -ForegroundColor Gray
Write-Host "Negotiation API: $NEGOTIATION_API_URL" -ForegroundColor Gray
Write-Host ""

$testResults = @{
    Passed = 0
    Failed = 0
    Warnings = 0
    Tests = @()
    StartTime = Get-Date
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [object]$Headers = $null,
        [int]$ExpectedStatus = 200,
        [string]$Description = "",
        [scriptblock]$ValidateResponse = $null
    )
    
    Write-Host "[TEST] $Name" -ForegroundColor Yellow
    if ($Description) {
        Write-Host "       $Description" -ForegroundColor Gray
    }
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            UseBasicParsing = $true
            TimeoutSec = 10
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10 -Compress)
            $params.ContentType = "application/json"
        }
        
        if ($Headers) {
            foreach ($key in $Headers.Keys) {
                $params.Headers[$key] = $Headers[$key]
            }
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        $responseData = $null
        
        # Try to parse JSON response
        try {
            $responseData = $response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        } catch {
            # Not JSON, that's okay
        }
        
        $statusOk = $response.StatusCode -eq $ExpectedStatus
        
        # Run custom validation if provided
        $validationOk = $true
        if ($ValidateResponse -and $responseData) {
            try {
                $validationOk = & $ValidateResponse $responseData $response
            } catch {
                $validationOk = $false
            }
        }
        
        if ($statusOk -and $validationOk) {
            Write-Host "       ✓ PASSED - Status: $($response.StatusCode)" -ForegroundColor Green
            $testResults.Passed++
            $testResults.Tests += @{Name=$Name; Status="PASSED"; Details="Status $($response.StatusCode)"}
            return @{Success=$true; Response=$response; Data=$responseData; StatusCode=$response.StatusCode}
        } else {
            $failureReason = if (-not $statusOk) { "Expected $ExpectedStatus, got $($response.StatusCode)" } else { "Validation failed" }
            Write-Host "       ✗ FAILED - $failureReason" -ForegroundColor Red
            $testResults.Failed++
            $testResults.Tests += @{Name=$Name; Status="FAILED"; Details=$failureReason}
            return @{Success=$false; Response=$response; Data=$responseData; StatusCode=$response.StatusCode}
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = if ($statusCode) { "HTTP $statusCode - $($_.Exception.Message)" } else { $_.Exception.Message }
        Write-Host "       ✗ FAILED - $errorMsg" -ForegroundColor Red
        $testResults.Failed++
        $testResults.Tests += @{Name=$Name; Status="FAILED"; Details=$errorMsg}
        return @{Success=$false; Error=$errorMsg; StatusCode=$statusCode}
    }
}

function Test-UI-Page {
    param(
        [string]$Name,
        [string]$Path,
        [string]$Description = ""
    )
    
    Write-Host "[UI] $Name" -ForegroundColor Yellow
    if ($Description) {
        Write-Host "     $Description" -ForegroundColor Gray
    }
    
    try {
        $url = "$UI_URL$Path"
        $response = Invoke-WebRequest -Uri $url -Method Get -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            # Check if it's the actual page content (not just a redirect)
            $isHtml = $response.Content -match '<html|<!DOCTYPE|id="root"|<div|React'
            
            if ($isHtml) {
                Write-Host "     ✓ PASSED - Page accessible" -ForegroundColor Green
                $testResults.Passed++
                $testResults.Tests += @{Name=$Name; Status="PASSED"; Details="Page accessible"}
                return $true
            } else {
                Write-Host "     ⚠ WARNING - Response received but may not be correct page" -ForegroundColor Yellow
                $testResults.Warnings++
                return $false
            }
        } else {
            Write-Host "     ✗ FAILED - Status: $($response.StatusCode)" -ForegroundColor Red
            $testResults.Failed++
            $testResults.Tests += @{Name=$Name; Status="FAILED"; Details="Status $($response.StatusCode)"}
            return $false
        }
    } catch {
        Write-Host "     ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $testResults.Failed++
        $testResults.Tests += @{Name=$Name; Status="FAILED"; Details=$_.Exception.Message}
        return $false
    }
}

# ============================================
# 1. SERVICE AVAILABILITY CHECKS
# ============================================
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 1. SERVICE AVAILABILITY" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-Endpoint -Name "Licensing API Health" -Url "$API_URL/health" -Description "Check if licensing API is running" -ExpectedStatus 200
Test-Endpoint -Name "Negotiation API Health" -Url "$NEGOTIATION_API_URL/health" -Description "Check if negotiation API is running" -ExpectedStatus 200
Test-UI-Page -Name "Publisher Dashboard (Root)" -Path "/" -Description "Check if UI is accessible"

# ============================================
# 2. AUTHENTICATION & PUBLISHER DATA
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 2. AUTHENTICATION & PUBLISHER DATA" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

# Test publisher exists (used by Login page)
$publisherPolicy = Test-Endpoint -Name "Get Publisher Policy (Login)" -Url "$API_URL/policies/$PUBLISHER_ID" -Description "Used by Login page to verify publisher"

# Get publishers list (used by various pages)
$publishers = Test-Endpoint -Name "Get Publishers List" -Url "$API_URL/admin/publishers" -Description "Retrieve all publishers"

# Validate publisher data structure
if ($publishers.Success -and $publishers.Data) {
    $pubList = if ($publishers.Data.publishers) { $publishers.Data.publishers } else { $publishers.Data }
    if ($pubList -and $pubList.Count -gt 0) {
        Write-Host "       ✓ Found $($pubList.Count) publisher(s)" -ForegroundColor Green
        $testResults.Passed++
    }
}

# ============================================
# 3. DASHBOARD PAGE DATA
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 3. DASHBOARD PAGE" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "Dashboard Page" -Path "/dashboard" -Description "Main dashboard route"

# Usage data (Dashboard.jsx line 42)
$usageData = Test-Endpoint -Name "Get Usage Logs (Dashboard)" -Url "$API_URL/usage?publisherId=$PUBLISHER_ID&limit=100" -Description "Used by Dashboard for analytics" -ValidateResponse {
    param($data)
    return ($data -ne $null) -and ($data.events -ne $null)
}

# ============================================
# 4. URL LIBRARY PAGE
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 4. URL LIBRARY PAGE" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "URL Library Page" -Path "/urls" -Description "URL library route"

# Licenses for URL assignment (UrlLibrary.jsx line 51)
$licenses = Test-Endpoint -Name "Get Licenses (URL Library)" -Url "$API_URL/api/licenses?publisherId=$PUBLISHER_ID" -Description "Load licenses for URL assignment"

# Access endpoints (UrlLibrary.jsx line 66)
$accessEndpoints = Test-Endpoint -Name "Get Access Endpoints" -Url "$API_URL/api/access?publisherId=$PUBLISHER_ID" -Description "Load access configuration"

# Parsed URLs (UrlLibrary.jsx line 111) - try both endpoints
$parsedUrls = Test-Endpoint -Name "Get Parsed URLs (/parsed-urls)" -Url "$API_URL/parsed-urls?publisher_id=$PUBLISHER_ID" -Description "Load URL library list via parsed-urls"
$urlsApi = Test-Endpoint -Name "Get URLs (/api/urls)" -Url "$API_URL/api/urls?publisher_id=$PUBLISHER_ID" -Description "Load URLs via API endpoint"

# URL Stats (UrlLibrary.jsx line 128)
$urlStats = Test-Endpoint -Name "Get URL Stats" -Url "$API_URL/parsed-urls/stats/summary" -Description "Load URL statistics"

# ============================================
# 5. LICENSE WIZARD PAGE
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 5. LICENSE WIZARD PAGE" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "License Wizard Page" -Path "/licenses" -Description "License management route"

# Licenses list (LicenseWizard.jsx line 31)
$licenseList = Test-Endpoint -Name "Get All Licenses" -Url "$API_URL/api/licenses?publisherId=$PUBLISHER_ID" -Description "Load license templates"

# License types/meta (LicenseWizard.jsx line 32)
$licenseTypes = Test-Endpoint -Name "Get License Types Meta" -Url "$API_URL/api/licenses/meta/types" -Description "Load license type metadata"

# ============================================
# 6. NOTIFICATIONS PAGE
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 6. NOTIFICATIONS PAGE" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "Notifications Page" -Path "/notifications" -Description "Notifications route"

# Notifications list (Notifications.jsx line 73)
$notifications = Test-Endpoint -Name "Get Notifications" -Url "$API_URL/api/notifications?publisher_id=$PUBLISHER_ID" -Description "Load notifications"

# Unread count (Notifications.jsx line 88, Layout.jsx line 31)
$unreadCount = Test-Endpoint -Name "Get Unread Count" -Url "$API_URL/api/notifications/unread-count?publisher_id=$PUBLISHER_ID" -Description "Load unread notification count"

# ============================================
# 7. USAGE LOGS PAGE
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 7. USAGE LOGS PAGE" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "Usage Logs Page" -Path "/logs" -Description "Usage logs route"

# Usage logs (UsageLogs.jsx line 14)
$usageLogs = Test-Endpoint -Name "Get Usage Logs" -Url "$API_URL/api/logs?publisher_id=$PUBLISHER_ID&limit=50" -Description "Load usage event logs"

# ============================================
# 8. NEGOTIATIONS PAGES
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 8. NEGOTIATIONS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "Active Negotiations Page" -Path "/negotiations" -Description "Negotiations list route"
Test-UI-Page -Name "Strategy Config Page" -Path "/negotiations/strategy" -Description "Strategy configuration route"

# Negotiation strategies (negotiationApi.js line 8)
$strategies = Test-Endpoint -Name "Get Negotiation Strategies" -Url "$API_URL/api/negotiations/strategies?publisher_id=$PUBLISHER_ID" -Description "Load negotiation strategies"

# Active negotiations (negotiationApi.js line 57)
$activeNegotiations = Test-Endpoint -Name "Get Active Negotiations" -Url "$API_URL/api/negotiations/publisher/$PUBLISHER_ID?limit=10" -Description "Load active negotiations"

# If we have negotiations, test detail endpoint
if ($activeNegotiations.Success -and $activeNegotiations.Data) {
    $negotiationsList = if ($activeNegotiations.Data.negotiations) { $activeNegotiations.Data.negotiations } else { $activeNegotiations.Data }
    if ($negotiationsList -and $negotiationsList.Count -gt 0) {
        $negId = $negotiationsList[0].id
        Test-Endpoint -Name "Get Negotiation Detail" -Url "$API_URL/api/negotiations/$negId" -Description "Load negotiation details"
    }
}

# ============================================
# 9. ACCESS CONFIGURATION PAGE
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 9. ACCESS CONFIGURATION PAGE" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "Access Configuration Page" -Path "/access" -Description "Access configuration route"

# Access configurations (AccessConfiguration.jsx line 37)
$accessConfigs = Test-Endpoint -Name "Get Access Configurations" -Url "$API_URL/api/access?publisherId=$PUBLISHER_ID" -Description "Load access configurations"

# Access types meta (AccessConfiguration.jsx line 38)
$accessTypes = Test-Endpoint -Name "Get Access Types Meta" -Url "$API_URL/api/access/meta/types" -Description "Load access type metadata"

# ============================================
# 10. GROUNDING PAGE
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 10. GROUNDING PAGE" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-UI-Page -Name "Grounding Page" -Path "/grounding" -Description "Grounding/content parsing route"

# Grounding endpoint (Grounding.jsx line 57) - uses /grounding not /api/grounding
Test-Endpoint -Name "Grounding Endpoint (POST)" -Url "$API_URL/grounding" -Method "POST" -Body @{
    url = "https://example.com/test"
    userAgent = "TestBot"
} -Description "Test grounding/content parsing" -ExpectedStatus 200

# ============================================
# 11. DATA INTEGRITY CHECKS
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 11. DATA INTEGRITY CHECKS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "[VALIDATION] Checking data consistency..." -ForegroundColor Yellow

# Check if license IDs referenced in URLs exist
if ($parsedUrls.Success -and $parsedUrls.Data -and $licenseList.Success -and $licenseList.Data) {
    $urls = if ($parsedUrls.Data.urls) { $parsedUrls.Data.urls } else { $parsedUrls.Data }
    $licenses = if ($licenseList.Data.licenses) { $licenseList.Data.licenses } else { $licenseList.Data }
    
    if ($urls -and $licenses) {
        $licenseIds = $licenses | ForEach-Object { $_.id }
        $urlsWithInvalidLicenses = $urls | Where-Object { $_.license_id -and $_.license_id -notin $licenseIds }
        
        if ($urlsWithInvalidLicenses) {
            Write-Host "       ⚠ WARNING - Found URLs with invalid license IDs" -ForegroundColor Yellow
            $testResults.Warnings++
        } else {
            Write-Host "       ✓ License references are valid" -ForegroundColor Green
            $testResults.Passed++
        }
    }
}

# Check notification data structure
if ($notifications.Success -and $notifications.Data) {
    $notifList = if ($notifications.Data.notifications) { $notifications.Data.notifications } else { $notifications.Data }
    if ($notifList -is [array]) {
        $validNotifications = $notifList | Where-Object { $_.id -and $_.type -and $_.title }
        if ($validNotifications.Count -eq $notifList.Count) {
            Write-Host "       ✓ Notifications have required fields" -ForegroundColor Green
            $testResults.Passed++
        }
    }
}

# ============================================
# 12. ERROR HANDLING
# ============================================
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 12. ERROR HANDLING" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

# Test invalid publisher ID
Test-Endpoint -Name "Invalid Publisher ID" -Url "$API_URL/policies/9999" -Description "Should handle invalid publisher gracefully" -ExpectedStatus 404

# Test invalid negotiation ID
Test-Endpoint -Name "Invalid Negotiation ID" -Url "$API_URL/api/negotiations/00000000-0000-0000-0000-000000000000" -Description "Should handle invalid negotiation gracefully" -ExpectedStatus 404

# ============================================
# TEST SUMMARY
# ============================================
$endTime = Get-Date
$duration = ($endTime - $testResults.StartTime).TotalSeconds

Write-Host "`n" -NoNewline
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "`nTotal Tests: $($testResults.Passed + $testResults.Failed)" -ForegroundColor White
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red
Write-Host "Warnings: $($testResults.Warnings)" -ForegroundColor Yellow
Write-Host "Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Gray

if ($testResults.Failed -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $testResults.Tests | Where-Object { $_.Status -eq "FAILED" } | ForEach-Object {
        Write-Host "  • $($_.Name): $($_.Details)" -ForegroundColor Red
    }
}

if ($testResults.Warnings -gt 0) {
    Write-Host "`nWarnings:" -ForegroundColor Yellow
    $testResults.Tests | Where-Object { $_.Status -eq "WARNING" } | ForEach-Object {
        Write-Host "  • $($_.Name): $($_.Details)" -ForegroundColor Yellow
    }
}

# Export results to JSON
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$resultsFile = "test-ui-localhost-results-$timestamp.json"
$testResults | ConvertTo-Json -Depth 10 | Out-File $resultsFile
Write-Host "`nTest results saved to $resultsFile" -ForegroundColor Cyan

# Recommendations
Write-Host "`n══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "   RECOMMENDATIONS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

if ($testResults.Failed -eq 0 -and $testResults.Warnings -eq 0) {
    Write-Host "✓ All tests passed! UI and API are working correctly." -ForegroundColor Green
} else {
    Write-Host "⚠ Issues detected. Check the following:" -ForegroundColor Yellow
    Write-Host "  1. Ensure all services are running (docker-compose up)" -ForegroundColor White
    Write-Host "  2. Verify UI is running on localhost:5173 (npm run dev)" -ForegroundColor White
    Write-Host "  3. Check API endpoints are accessible on localhost:3000" -ForegroundColor White
    Write-Host "  4. Review database connection and data integrity" -ForegroundColor White
    Write-Host "  5. Check browser console for JavaScript errors" -ForegroundColor White
}

Write-Host "`n============================================`n" -ForegroundColor Cyan

# Return exit code based on results
if ($testResults.Failed -eq 0) {
    exit 0
} else {
    exit 1
}

