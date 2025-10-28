# ===============================================
# Test Script for URL Library Feature
# ===============================================
# Tests that URLs are auto-saved when parsed
# and can be managed via the API.
# ===============================================

Clear-Host
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "Testing URL Library Feature" -ForegroundColor Cyan
Write-Host "==============================================="
Write-Host ""

$baseUrl = "http://localhost:3000"
$API_URL = $baseUrl

# ===============================================
# Test 1: Parse a URL via Grounding API
# ===============================================
Write-Host "Test 1: Parse URL via Grounding API (should auto-save to library)" -ForegroundColor Yellow

$body = @{
    url = "http://site-a.local/news/foo.html"
    userAgent = "TestBot/1.0"
    purpose = "inference"
    clientId = "test-client"
    extractMainContent = $true
    includeMetadata = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/grounding" -Method POST -ContentType "application/json" -Body $body
    if ($response.success) {
        Write-Host "✓ URL parsed successfully" -ForegroundColor Green
        Write-Host "  URL: $($response.url)" -ForegroundColor Gray
        Write-Host "  License Status: $($response.license.status)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Parse failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Parse request failed: $_" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# ===============================================
# Test 2: Get URL Library List
# ===============================================
Write-Host "Test 2: Fetch URL library" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$API_URL/parsed-urls"
    if ($response.success) {
        Write-Host "✓ URL library fetched successfully" -ForegroundColor Green
        Write-Host "  Total URLs: $($response.pagination.total)" -ForegroundColor Gray

        if ($response.urls.Count -gt 0) {
            Write-Host "  First URL:" -ForegroundColor Gray
            $firstUrl = $response.urls[0]
            Write-Host "    - ID: $($firstUrl.id)" -ForegroundColor Gray
            Write-Host "    - URL: $($firstUrl.url)" -ForegroundColor Gray
            Write-Host "    - Domain: $($firstUrl.domain)" -ForegroundColor Gray
            Write-Host "    - Title: $($firstUrl.title)" -ForegroundColor Gray
            Write-Host "    - Parse Count: $($firstUrl.parse_count)" -ForegroundColor Gray

            $script:firstUrlId = $firstUrl.id
        }
    } else {
        Write-Host "✗ Fetch failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Fetch request failed: $_" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# ===============================================
# Test 3: Parse Another URL from Different Domain
# ===============================================
Write-Host "Test 3: Parse another URL from different domain" -ForegroundColor Yellow

$body2 = @{
    url = "http://site-b.local/docs/a.html"
    userAgent = "TestBot/1.0"
    purpose = "training"
    clientId = "test-client"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$API_URL/grounding" -Method POST -ContentType "application/json" -Body $body2
    if ($response.success) {
        Write-Host "✓ Second URL parsed successfully" -ForegroundColor Green
    } else {
        Write-Host "✗ Second parse failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Parse failed: $_" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# ===============================================
# Test 4: Get URL Library Statistics
# ===============================================
Write-Host "Test 4: Get URL library statistics" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$API_URL/parsed-urls/stats/summary"
    if ($response.success) {
        Write-Host "✓ Statistics fetched successfully" -ForegroundColor Green
        Write-Host "  Total URLs: $($response.stats.total_urls)" -ForegroundColor Gray
        Write-Host "  Unique Domains: $($response.stats.unique_domains)" -ForegroundColor Gray
        Write-Host "  Total Parses: $($response.stats.total_parses)" -ForegroundColor Gray

        if ($response.topDomains.Count -gt 0) {
            Write-Host "  Top Domains:" -ForegroundColor Gray
            foreach ($domain in $response.topDomains) {
                Write-Host "    - $($domain.domain): $($domain.url_count) URLs" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✗ Stats fetch failed: $($response.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Stats request failed: $_" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# ===============================================
# Test 5: Parse Same URL Again (Increment Count)
# ===============================================
Write-Host "Test 5: Parse same URL again (should increment parse count)" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$API_URL/grounding" -Method POST -ContentType "application/json" -Body $body
    if ($response.success) {
        Write-Host "✓ URL parsed again successfully" -ForegroundColor Green
    }

    Start-Sleep -Seconds 1

    $response = Invoke-RestMethod -Uri "$API_URL/parsed-urls"
    $firstUrl = $response.urls | Where-Object { $_.url -eq "http://site-a.local/news/foo.html" }
    if ($firstUrl.parse_count -gt 1) {
        Write-Host "✓ Parse count incremented to $($firstUrl.parse_count)" -ForegroundColor Green
    } else {
        Write-Host "✗ Parse count did not increment" -ForegroundColor Red
    }
} catch {
    Write-Host "✗ Test failed: $_" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# ===============================================
# Test 6: Search and Filter URLs
# ===============================================
Write-Host "Test 6: Search and filter URLs" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$API_URL/parsed-urls?domain=site-a.local"
    Write-Host "✓ Filter by domain: Found $($response.urls.Count) URLs for site-a.local" -ForegroundColor Green

    $response = Invoke-RestMethod -Uri "$API_URL/parsed-urls?search=news"
    Write-Host "✓ Search by text: Found $($response.urls.Count) URLs matching 'news'" -ForegroundColor Green
} catch {
    Write-Host "✗ Search/filter test failed: $_" -ForegroundColor Red
}

Write-Host ""
Start-Sleep -Seconds 1

# ===============================================
# Test 7: Get Specific URL Details
# ===============================================
Write-Host "Test 7: Get specific URL details" -ForegroundColor Yellow

if ($script:firstUrlId) {
    try {
        $response = Invoke-RestMethod -Uri "$API_URL/parsed-urls/$($script:firstUrlId)"
        if ($response.success) {
            Write-Host "✓ URL details fetched successfully" -ForegroundColor Green
            Write-Host "  URL: $($response.url.url)" -ForegroundColor Gray
            Write-Host "  Status: $($response.url.last_status)" -ForegroundColor Gray
        } else {
            Write-Host "✗ Failed to get URL details: $($response.error)" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Fetch details failed: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⊘ Skipped (no URL ID available)" -ForegroundColor Gray
}

Write-Host ""
Start-Sleep -Seconds 1

# ===============================================
# Test 8: Delete URL (Optional)
# ===============================================
Write-Host "Test 8: Delete URL from library (skipped - uncomment to test)" -ForegroundColor Yellow
Write-Host "  To test deletion, uncomment the code below." -ForegroundColor Gray

# Uncomment to test deletion:
# if ($script:firstUrlId) {
#     try {
#         $response = Invoke-RestMethod -Uri "$API_URL/parsed-urls/$($script:firstUrlId)" -Method DELETE
#         if ($response.success) {
#             Write-Host "✓ URL deleted successfully" -ForegroundColor Green
#         } else {
#             Write-Host "✗ Delete failed: $($response.error)" -ForegroundColor Red
#         }
#     } catch {
#         Write-Host "✗ Delete request failed: $_" -ForegroundColor Red
#     }
# }

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "✅ URL Library Testing Complete!" -ForegroundColor Cyan
Write-Host "==============================================="
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open dashboard: http://localhost:5173" -ForegroundColor White
Write-Host "2. Navigate to 'URL Library' in the sidebar" -ForegroundColor White
Write-Host "3. Verify your parsed URLs appear in the UI" -ForegroundColor White
Write-Host "4. Try searching, filtering, and deleting URLs" -ForegroundColor White
Write-Host ""
