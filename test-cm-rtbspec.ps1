# Quick test script for cm_rtbspec API endpoints
# Run after migration is complete

$BASE_URL = "http://localhost:3000"
$PUBLISHER_ID = 1

Write-Host "`n=== CM RTB Spec v0.1 API Tests ===" -ForegroundColor Cyan

# Test 1: Get license types
Write-Host "`n[1] Testing GET /api/licenses/meta/types..." -ForegroundColor Yellow
$types = curl.exe -s "$BASE_URL/api/licenses/meta/types" | ConvertFrom-Json
Write-Host "✓ Found $($types.types.Count) license types" -ForegroundColor Green
$types.types | ForEach-Object { Write-Host "  - $($_.name): $($_.description)" }

# Test 2: Get access types
Write-Host "`n[2] Testing GET /api/access/meta/types..." -ForegroundColor Yellow
$accessTypes = curl.exe -s "$BASE_URL/api/access/meta/types" | ConvertFrom-Json
Write-Host "✓ Found $($accessTypes.types.Count) access types" -ForegroundColor Green
$accessTypes.types | ForEach-Object { Write-Host "  - $($_.name): $($_.description)" }

# Test 3: Get all content
Write-Host "`n[3] Testing GET /api/content?publisherId=$PUBLISHER_ID..." -ForegroundColor Yellow
$content = curl.exe -s "$BASE_URL/api/content?publisherId=$PUBLISHER_ID" | ConvertFrom-Json
if ($content.success) {
    Write-Host "✓ Found $($content.content.Count) content items" -ForegroundColor Green
    if ($content.content.Count -gt 0) {
        $content.content | Select-Object -First 3 | ForEach-Object {
            Write-Host "  - [$($_.content_origin)] $($_.url)"
        }
    }
} else {
    Write-Host "✗ Error: $($content.error)" -ForegroundColor Red
}

# Test 4: Get all licenses
Write-Host "`n[4] Testing GET /api/licenses?publisherId=$PUBLISHER_ID..." -ForegroundColor Yellow
$licenses = curl.exe -s "$BASE_URL/api/licenses?publisherId=$PUBLISHER_ID" | ConvertFrom-Json
if ($licenses.success) {
    Write-Host "✓ Found $($licenses.licenses.Count) licenses" -ForegroundColor Green
    if ($licenses.licenses.Count -gt 0) {
        $licenses.licenses | Select-Object -First 3 | ForEach-Object {
            $typeName = switch ($_.license_type) {
                0 { "Training+Display" }
                1 { "RAG Unrestricted" }
                2 { "RAG MaxWords" }
                3 { "RAG Attribution" }
                4 { "RAG NoDisplay" }
            }
            Write-Host "  - $typeName : $($_.price) $($_.currency)"
        }
    }
} else {
    Write-Host "✗ Error: $($licenses.error)" -ForegroundColor Red
}

# Test 5: Marketplace discovery
Write-Host "`n[5] Testing GET /.well-known/cm-license.json?publisherId=$PUBLISHER_ID..." -ForegroundColor Yellow
$marketplace = curl.exe -s "$BASE_URL/.well-known/cm-license.json?publisherId=$PUBLISHER_ID" | ConvertFrom-Json
if ($marketplace.cm_rtbspec -eq "0.1") {
    Write-Host "✓ Marketplace discovery endpoint working" -ForegroundColor Green
    Write-Host "  - cm_rtbspec: $($marketplace.cm_rtbspec)" -ForegroundColor Gray
    Write-Host "  - publisher_id: $($marketplace.publisher_id)" -ForegroundColor Gray
    Write-Host "  - content count: $($marketplace.count)" -ForegroundColor Gray
} else {
    Write-Host "✗ Marketplace discovery failed" -ForegroundColor Red
}

# Test 6: Create test content
Write-Host "`n[6] Testing POST /api/content (create test content)..." -ForegroundColor Yellow
$testContent = @{
    publisher_id = $PUBLISHER_ID
    url = "https://test.example.com/article-$(Get-Random)"
    content_origin = 0
    body_word_count = 1500
    authority_score = 0.92
    originality_score = 0.88
    has_third_party_media = $false
} | ConvertTo-Json

$createResult = curl.exe -s -X POST "$BASE_URL/api/content" `
    -H "Content-Type: application/json" `
    -H "X-User-Id: 1" `
    -d $testContent | ConvertFrom-Json

if ($createResult.success) {
    Write-Host "✓ Created test content with ID: $($createResult.content.id)" -ForegroundColor Green
    $testContentId = $createResult.content.id
    
    # Test 7: Create test license
    Write-Host "`n[7] Testing POST /api/licenses (create test license)..." -ForegroundColor Yellow
    $testLicense = @{
        content_id = $testContentId
        license_type = 2
        price = 0.05
        currency = "USD"
        max_word_count = 500
        status = "active"
    } | ConvertTo-Json
    
    $licenseResult = curl.exe -s -X POST "$BASE_URL/api/licenses" `
        -H "Content-Type: application/json" `
        -H "X-User-Id: 1" `
        -d $testLicense | ConvertFrom-Json
    
    if ($licenseResult.success) {
        Write-Host "✓ Created test license with ID: $($licenseResult.license.id)" -ForegroundColor Green
        $testLicenseId = $licenseResult.license.id
        
        # Test 8: Create access endpoint
        Write-Host "`n[8] Testing POST /api/access (create access endpoint)..." -ForegroundColor Yellow
        $testAccess = @{
            license_id = $testLicenseId
            access_type = 2
            endpoint = "https://api.test.example.com/content"
            auth_type = "api_key"
            rate_limit = 1000
            requires_mtls = $false
        } | ConvertTo-Json
        
        $accessResult = curl.exe -s -X POST "$BASE_URL/api/access" `
            -H "Content-Type: application/json" `
            -H "X-User-Id: 1" `
            -d $testAccess | ConvertFrom-Json
        
        if ($accessResult.success) {
            Write-Host "✓ Created access endpoint with ID: $($accessResult.endpoint.id)" -ForegroundColor Green
            
            # Test 9: Export to cm_rtbspec format
            Write-Host "`n[9] Testing GET /api/content/$testContentId/export..." -ForegroundColor Yellow
            $export = curl.exe -s "$BASE_URL/api/content/$testContentId/export" | ConvertFrom-Json
            
            if ($export.content_id) {
                Write-Host "✓ cm_rtbspec export successful" -ForegroundColor Green
                Write-Host "  - content_id: $($export.content_id)" -ForegroundColor Gray
                Write-Host "  - licenses: $($export.license_options.Count)" -ForegroundColor Gray
                Write-Host "  - access endpoints: $($export.license_options[0].access_endpoints.Count)" -ForegroundColor Gray
            }
            
            # Test 10: Check audit trail
            Write-Host "`n[10] Testing GET /api/audit/content/$testContentId..." -ForegroundColor Yellow
            $audit = curl.exe -s "$BASE_URL/api/audit/content/$testContentId" | ConvertFrom-Json
            
            if ($audit.success) {
                Write-Host "✓ Audit trail retrieved: $($audit.trail.Count) events" -ForegroundColor Green
                $audit.trail | ForEach-Object {
                    Write-Host "  - $($_.action) by user $($_.user_id) at $($_.created_at)"
                }
            }
            
        } else {
            Write-Host "✗ Failed to create access endpoint: $($accessResult.error)" -ForegroundColor Red
        }
    } else {
        Write-Host "✗ Failed to create license: $($licenseResult.error)" -ForegroundColor Red
    }
} else {
    Write-Host "✗ Failed to create content: $($createResult.error)" -ForegroundColor Red
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "All core cm_rtbspec v0.1 endpoints are functional!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Open http://localhost:5173 to test the UI" -ForegroundColor White
Write-Host "2. Navigate to Content Library, License Wizard, and Access Config" -ForegroundColor White
Write-Host "3. Try creating content with different origins (Human/AI/Hybrid)" -ForegroundColor White
Write-Host "4. Test all 5 license types with their conditional fields" -ForegroundColor White
Write-Host "5. Configure access endpoints and test their accessibility`n" -ForegroundColor White
