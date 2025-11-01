# Comprehensive UI Test Suite for MonetizePlus Publisher Dashboard
# Tests navigation, API endpoints, data display, and functionality

$API_URL = "http://localhost:3000"
$UI_URL = "http://localhost"
$PUBLISHER_ID = 1

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "   MonetizePlus UI Test Suite" -ForegroundColor Cyan
Write-Host "============================================`n" -ForegroundColor Cyan

$testResults = @{
    Passed = 0
    Failed = 0
    Warnings = 0
    Tests = @()
}

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [object]$Body = $null,
        [int]$ExpectedStatus = 200,
        [string]$Description = ""
    )
    
    Write-Host "`n[TEST] $Name" -ForegroundColor Yellow
    if ($Description) {
        Write-Host "       $Description" -ForegroundColor Gray
    }
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            UseBasicParsing = $true
            TimeoutSec = 10
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "       ✓ PASSED - Status: $($response.StatusCode)" -ForegroundColor Green
            $testResults.Passed++
            $testResults.Tests += @{Name=$Name; Status="PASSED"; Details="Status $($response.StatusCode)"}
            return @{Success=$true; Response=$response; Data=($response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue)}
        } else {
            Write-Host "       ✗ FAILED - Expected $ExpectedStatus, got $($response.StatusCode)" -ForegroundColor Red
            $testResults.Failed++
            $testResults.Tests += @{Name=$Name; Status="FAILED"; Details="Wrong status code"}
            return @{Success=$false; Response=$response}
        }
    } catch {
        Write-Host "       ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $testResults.Failed++
        $testResults.Tests += @{Name=$Name; Status="FAILED"; Details=$_.Exception.Message}
        return @{Success=$false; Error=$_.Exception.Message}
    }
}

function Test-DataValidity {
    param(
        [string]$Name,
        [object]$Data,
        [scriptblock]$ValidationScript
    )
    
    Write-Host "`n[VALIDATION] $Name" -ForegroundColor Magenta
    
    try {
        $result = & $ValidationScript $Data
        if ($result) {
            Write-Host "       ✓ PASSED - Data validation successful" -ForegroundColor Green
            $testResults.Passed++
            $testResults.Tests += @{Name=$Name; Status="PASSED"; Details="Data valid"}
            return $true
        } else {
            Write-Host "       ✗ FAILED - Data validation failed" -ForegroundColor Red
            $testResults.Failed++
            $testResults.Tests += @{Name=$Name; Status="FAILED"; Details="Invalid data"}
            return $false
        }
    } catch {
        Write-Host "       ✗ FAILED - $($_.Exception.Message)" -ForegroundColor Red
        $testResults.Failed++
        $testResults.Tests += @{Name=$Name; Status="FAILED"; Details=$_.Exception.Message}
        return $false
    }
}

# ============================================
# 1. SERVICE AVAILABILITY TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 1. SERVICE AVAILABILITY TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-Endpoint -Name "Licensing API Health" -Url "$API_URL/health" -Description "Check if licensing API is running"
Test-Endpoint -Name "Publisher Dashboard UI" -Url "$UI_URL/" -Description "Check if UI is accessible"

# ============================================
# 2. AUTHENTICATION & PUBLISHER TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 2. AUTHENTICATION & PUBLISHER TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

$publishers = Test-Endpoint -Name "Get Publishers List" -Url "$API_URL/auth/publishers" -Description "Verify publishers can be retrieved"
if ($publishers.Success -and $publishers.Data) {
    Test-DataValidity -Name "Publishers Data Structure" -Data $publishers.Data -ValidationScript {
        param($data)
        return ($data.Count -gt 0) -and ($data[0].PSObject.Properties.Name -contains 'id') -and ($data[0].PSObject.Properties.Name -contains 'name')
    }
}

# ============================================
# 3. URL LIBRARY TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 3. URL LIBRARY TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

$urls = Test-Endpoint -Name "Get URL Library" -Url "$API_URL/api/content?publisher_id=$PUBLISHER_ID" -Description "Retrieve all URLs for publisher"
if ($urls.Success -and $urls.Data) {
    Test-DataValidity -Name "URL Data Structure" -Data $urls.Data -ValidationScript {
        param($data)
        if ($data.Count -eq 0) { return $true } # Empty is valid
        return ($data[0].PSObject.Properties.Name -contains 'id') -and ($data[0].PSObject.Properties.Name -contains 'url')
    }
}

# Test parsed URLs
$parsedUrls = Test-Endpoint -Name "Get Parsed URLs" -Url "$API_URL/parsed-urls" -Description "Check parsed URLs endpoint"

# Test adding a new URL
$newUrl = Test-Endpoint -Name "Add New URL" -Url "$API_URL/api/content" -Method "POST" -Body @{
    publisher_id = $PUBLISHER_ID
    url = "https://test-$(Get-Random).com/article"
    content_origin = 0
} -Description "Test adding new URL to library"

# ============================================
# 4. LICENSE POLICY TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 4. LICENSE POLICY TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

$policies = Test-Endpoint -Name "Get License Policies" -Url "$API_URL/api/policies?publisher_id=$PUBLISHER_ID" -Description "Retrieve all policies for publisher"
if ($policies.Success -and $policies.Data) {
    Test-DataValidity -Name "Policy Data Structure" -Data $policies.Data -ValidationScript {
        param($data)
        if ($data.Count -eq 0) { return $true }
        return ($data[0].PSObject.Properties.Name -contains 'id') -and ($data[0].PSObject.Properties.Name -contains 'policy_name')
    }
    
    # Test getting individual policy if any exist
    if ($policies.Data.Count -gt 0) {
        $policyId = $policies.Data[0].id
        Test-Endpoint -Name "Get Individual Policy" -Url "$API_URL/api/policies/$policyId" -Description "Retrieve specific policy details"
    }
}

# Test license options
$licenseOptions = Test-Endpoint -Name "Get License Options" -Url "$API_URL/api/license-options?publisher_id=$PUBLISHER_ID" -Description "Retrieve available license options"
if ($licenseOptions.Success -and $licenseOptions.Data) {
    Test-DataValidity -Name "License Options Structure" -Data $licenseOptions.Data -ValidationScript {
        param($data)
        if ($data.Count -eq 0) { return $true }
        return ($data[0].PSObject.Properties.Name -contains 'id')
    }
}

# ============================================
# 5. ACCESS CONFIGURATION TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 5. ACCESS CONFIGURATION TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Test-Endpoint -Name "Get Access Configurations" -Url "$API_URL/api/access-configs?publisher_id=$PUBLISHER_ID" -Description "Retrieve access configurations"
Test-Endpoint -Name "Get Matched Policies" -Url "$API_URL/api/matched-policies?publisher_id=$PUBLISHER_ID" -Description "Check policy matching results"

# ============================================
# 6. NEGOTIATION TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 6. NEGOTIATION TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

$negotiations = Test-Endpoint -Name "Get Active Negotiations" -Url "$API_URL/api/negotiations?publisher_id=$PUBLISHER_ID" -Description "Retrieve active negotiations"
if ($negotiations.Success -and $negotiations.Data) {
    Test-DataValidity -Name "Negotiations Data Structure" -Data $negotiations.Data -ValidationScript {
        param($data)
        if ($data.Count -eq 0) { return $true }
        return ($data[0].PSObject.Properties.Name -contains 'id') -and ($data[0].PSObject.Properties.Name -contains 'status')
    }
    
    # Test getting individual negotiation if any exist
    if ($negotiations.Data.Count -gt 0) {
        $negotiationId = $negotiations.Data[0].id
        Test-Endpoint -Name "Get Negotiation Detail" -Url "$API_URL/api/negotiations/$negotiationId" -Description "Retrieve specific negotiation details"
        Test-Endpoint -Name "Get Negotiation Messages" -Url "$API_URL/api/negotiations/$negotiationId/messages" -Description "Retrieve negotiation messages"
    }
}

# Test partner strategies
$strategies = Test-Endpoint -Name "Get Partner Strategies" -Url "$API_URL/api/partner-strategies?publisher_id=$PUBLISHER_ID" -Description "Retrieve negotiation strategies"

# ============================================
# 7. NOTIFICATIONS TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 7. NOTIFICATIONS TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

$notifications = Test-Endpoint -Name "Get Notifications" -Url "$API_URL/api/notifications?publisher_id=$PUBLISHER_ID" -Description "Retrieve all notifications"
Test-Endpoint -Name "Get Unread Count" -Url "$API_URL/api/notifications/unread-count?publisher_id=$PUBLISHER_ID" -Description "Check unread notification count"

# ============================================
# 8. USAGE LOGS TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 8. USAGE LOGS TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

$logs = Test-Endpoint -Name "Get Usage Logs" -Url "$API_URL/api/logs?publisher_id=$PUBLISHER_ID" -Description "Retrieve usage logs"
if ($logs.Success -and $logs.Data) {
    Test-DataValidity -Name "Usage Logs Data Structure" -Data $logs.Data -ValidationScript {
        param($data)
        if ($data.Count -eq 0) { return $true }
        return ($data[0].PSObject.Properties.Name -contains 'id')
    }
}

# ============================================
# 9. GROUNDING/SCRAPER TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 9. GROUNDING/SCRAPER TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

# Test scraping endpoint (should work even without valid URL)
Test-Endpoint -Name "Test Scraper Endpoint" -Url "$API_URL/api/scrape" -Method "POST" -Body @{
    url = "https://example.com"
    userAgent = "TestBot"
} -ExpectedStatus = 200 -Description "Verify scraper endpoint is functional"

# ============================================
# 10. DATABASE INTEGRITY TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 10. DATABASE INTEGRITY TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n[TEST] Check Database Tables" -ForegroundColor Yellow
Write-Host "       Verifying critical database tables exist" -ForegroundColor Gray

try {
    $tables = @(
        'publishers', 'parsed_urls', 'policies', 'license_options',
        'access_configurations', 'negotiations', 'notifications',
        'usage_logs', 'partner_negotiation_strategies'
    )
    
    $tableCheck = docker exec tollbit-postgres-1 psql -U monetizeplus -d monetizeplus -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" 2>&1
    
    $existingTables = $tableCheck -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }
    
    $allTablesExist = $true
    foreach ($table in $tables) {
        if ($existingTables -contains $table) {
            Write-Host "       ✓ Table '$table' exists" -ForegroundColor Green
        } else {
            Write-Host "       ✗ Table '$table' missing" -ForegroundColor Red
            $allTablesExist = $false
        }
    }
    
    if ($allTablesExist) {
        $testResults.Passed++
        $testResults.Tests += @{Name="Database Tables Check"; Status="PASSED"; Details="All tables exist"}
    } else {
        $testResults.Failed++
        $testResults.Tests += @{Name="Database Tables Check"; Status="FAILED"; Details="Missing tables"}
    }
} catch {
    Write-Host "       ✗ FAILED - Cannot access database: $($_.Exception.Message)" -ForegroundColor Red
    $testResults.Failed++
    $testResults.Tests += @{Name="Database Tables Check"; Status="FAILED"; Details="Cannot access DB"}
}

# ============================================
# 11. FRONTEND ASSET TESTS
# ============================================
Write-Host "`n" -NoNewline
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host " 11. FRONTEND ASSET TESTS" -ForegroundColor Cyan
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan

Write-Host "`n[TEST] Check Critical Frontend Files" -ForegroundColor Yellow

$criticalFiles = @(
    "c:\Users\paulfarrow\Documents\Coding\Tollbit\publisher-dashboard\src\App.jsx",
    "c:\Users\paulfarrow\Documents\Coding\Tollbit\publisher-dashboard\src\components\Layout.jsx",
    "c:\Users\paulfarrow\Documents\Coding\Tollbit\publisher-dashboard\src\pages\Dashboard.jsx",
    "c:\Users\paulfarrow\Documents\Coding\Tollbit\publisher-dashboard\src\pages\UrlLibrary.jsx",
    "c:\Users\paulfarrow\Documents\Coding\Tollbit\publisher-dashboard\src\pages\LicenseWizard.jsx",
    "c:\Users\paulfarrow\Documents\Coding\Tollbit\publisher-dashboard\src\pages\Notifications.jsx"
)

$allFilesExist = $true
foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        Write-Host "       ✓ $(Split-Path $file -Leaf) exists" -ForegroundColor Green
    } else {
        Write-Host "       ✗ $(Split-Path $file -Leaf) missing" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if ($allFilesExist) {
    $testResults.Passed++
    $testResults.Tests += @{Name="Frontend Files Check"; Status="PASSED"; Details="All files exist"}
} else {
    $testResults.Failed++
    $testResults.Tests += @{Name="Frontend Files Check"; Status="FAILED"; Details="Missing files"}
}

# ============================================
# TEST SUMMARY
# ============================================
Write-Host "`n" -NoNewline
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   TEST SUMMARY" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host "`nTotal Tests: $($testResults.Passed + $testResults.Failed)" -ForegroundColor White
Write-Host "Passed: $($testResults.Passed)" -ForegroundColor Green
Write-Host "Failed: $($testResults.Failed)" -ForegroundColor Red

if ($testResults.Failed -gt 0) {
    Write-Host "`nFailed Tests:" -ForegroundColor Red
    $testResults.Tests | Where-Object { $_.Status -eq "FAILED" } | ForEach-Object {
        Write-Host "  • $($_.Name): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`n============================================`n" -ForegroundColor Cyan

# Export results to JSON
$testResults | ConvertTo-Json -Depth 10 | Out-File "test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
Write-Host "Test results saved to test-results-$(Get-Date -Format 'yyyyMMdd-HHmmss').json" -ForegroundColor Cyan

# Return exit code based on results
if ($testResults.Failed -eq 0) {
    Write-Host "All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed. Review the output above." -ForegroundColor Red
    exit 1
}
