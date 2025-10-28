# Tollbit Content Licensing Gateway - Test Suite (PowerShell)
# Tests all three flows: Human, Unlicensed Bot, Licensed Bot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Content Licensing Gateway - Test Suite" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$BASE_URL = "http://localhost:8080"
$LICENSING_URL = "http://localhost:3000"

# Test counters
$TESTS_PASSED = 0
$TESTS_FAILED = 0

# Function to test and report
function Test-Request {
    param(
        [string]$TestName,
        [int]$ExpectedCode,
        [int]$ActualCode
    )
    
    if ($ActualCode -eq $ExpectedCode) {
        Write-Host "✓ PASS: $TestName (got $ActualCode)" -ForegroundColor Green
        $script:TESTS_PASSED++
    } else {
        Write-Host "✗ FAIL: $TestName (expected $ExpectedCode, got $ActualCode)" -ForegroundColor Red
        $script:TESTS_FAILED++
    }
}

Write-Host "Waiting for services to be ready..."
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST 1: Human Access (No Restriction)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing human access to Publisher A..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/news/foo.html" `
        -Headers @{"User-Agent"='Mozilla/5.0 (Windows NT 10.0; Win64; x64)'; "Host"="site-a.local"} `
        -UseBasicParsing -ErrorAction SilentlyContinue
    Test-Request "Human access to Publisher A" 200 $response.StatusCode
} catch {
    if ($_.Exception.Response.StatusCode.value__) {
        Test-Request "Human access to Publisher A" 200 $_.Exception.Response.StatusCode.value__
    } else {
        Write-Host "✗ FAIL: Could not reach service" -ForegroundColor Red
        $script:TESTS_FAILED++
    }
}

Write-Host "Testing human access to Publisher B..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/docs/a.html" `
        -Headers @{"User-Agent"='Mozilla/5.0 (Macintosh; Intel Mac OS X)'; "Host"="site-b.local"} `
        -UseBasicParsing -ErrorAction SilentlyContinue
    Test-Request "Human access to Publisher B" 200 $response.StatusCode
} catch {
    if ($_.Exception.Response.StatusCode.value__) {
        Test-Request "Human access to Publisher B" 200 $_.Exception.Response.StatusCode.value__
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST 2: Unlicensed Bot (302 Redirect)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing GPTBot without token..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/news/foo.html" `
        -Headers @{"User-Agent"="GPTBot/1.0"; "Host"="site-a.local"} `
        -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
    Test-Request "GPTBot redirect to authorization" 302 $response.StatusCode
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Test-Request "GPTBot redirect to authorization" 302 302
    }
}

Write-Host "Testing ClaudeBot without token..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/docs/b.html" `
        -Headers @{"User-Agent"="ClaudeBot/1.0"; "Host"="site-b.local"} `
        -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
    Test-Request "ClaudeBot redirect to authorization" 302 $response.StatusCode
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 302) {
        Test-Request "ClaudeBot redirect to authorization" 302 302
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST 3: Licensed Bot (Token Flow)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Requesting token for Publisher A..."
$tokenBody = @{
    url = "http://site-a.local/news/foo.html"
    ua = "GPTBot/1.0"
    purpose = "inference"
} | ConvertTo-Json

try {
    $tokenResponse = Invoke-RestMethod -Uri "$LICENSING_URL/token" `
        -Method Post `
        -ContentType "application/json" `
        -Body $tokenBody `
        -UseBasicParsing
    
    if ($tokenResponse.token) {
        Write-Host "✓ Token obtained successfully" -ForegroundColor Green
        $token = $tokenResponse.token
        Write-Host "Token: $($token.Substring(0, [Math]::Min(50, $token.Length)))..."
        $script:TESTS_PASSED++
    }
} catch {
    Write-Host "✗ Failed to obtain token" -ForegroundColor Red
    Write-Host $_.Exception.Message
    $script:TESTS_FAILED++
}

if ($token) {
    Write-Host ""
    Write-Host "Step 2: Accessing content with token..."
    try {
        $response = Invoke-WebRequest -Uri "$BASE_URL/news/foo.html?token=$token" `
            -Headers @{"User-Agent"="GPTBot/1.0"; "Host"="site-a.local"} `
            -UseBasicParsing -ErrorAction SilentlyContinue
        Test-Request "GPTBot access with valid token" 200 $response.StatusCode
    } catch {
        if ($_.Exception.Response.StatusCode.value__) {
            Test-Request "GPTBot access with valid token" 200 $_.Exception.Response.StatusCode.value__
        }
    }

    Write-Host ""
    Write-Host "Step 3: Testing token verification endpoint..."
    try {
        $verifyResponse = Invoke-RestMethod -Uri "$LICENSING_URL/verify?token=$token&url=http://site-a.local/news/foo.html" `
            -UseBasicParsing
        
        if ($verifyResponse.valid -eq $true) {
            Write-Host "✓ Token verification successful" -ForegroundColor Green
            $script:TESTS_PASSED++
        } else {
            Write-Host "✗ Token verification failed" -ForegroundColor Red
            $script:TESTS_FAILED++
        }
    } catch {
        Write-Host "✗ Token verification request failed" -ForegroundColor Red
        $script:TESTS_FAILED++
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST 4: Error Cases" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing access with invalid token..."
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/news/foo.html?token=invalid-token" `
        -Headers @{"User-Agent"="GPTBot/1.0"; "Host"="site-a.local"} `
        -UseBasicParsing -ErrorAction SilentlyContinue
    Test-Request "Invalid token rejection" 403 $response.StatusCode
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Test-Request "Invalid token rejection" 403 403
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST 5: Admin Endpoints" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Testing GET /admin/publishers..."
try {
    $response = Invoke-WebRequest -Uri "$LICENSING_URL/admin/publishers" -UseBasicParsing
    Test-Request "List publishers" 200 $response.StatusCode
} catch {
    Test-Request "List publishers" 200 0
}

Write-Host "Testing GET /admin/clients..."
try {
    $response = Invoke-WebRequest -Uri "$LICENSING_URL/admin/clients" -UseBasicParsing
    Test-Request "List clients" 200 $response.StatusCode
} catch {
    Test-Request "List clients" 200 0
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tests Passed: $TESTS_PASSED" -ForegroundColor Green
Write-Host "Tests Failed: $TESTS_FAILED" -ForegroundColor Red
Write-Host ""

if ($TESTS_FAILED -eq 0) {
    Write-Host "All tests passed! ✓" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some tests failed." -ForegroundColor Red
    exit 1
}
