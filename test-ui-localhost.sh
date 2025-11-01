#!/bin/bash
# Comprehensive UI Test Suite for Publisher Dashboard (Localhost)
# Tests the UI when running locally on localhost:5173
# Also validates API endpoints that the UI depends on

API_URL="http://localhost:3000"
NEGOTIATION_API_URL="http://localhost:3003"
UI_URL="http://localhost:5173"
PUBLISHER_ID=1

PASSED=0
FAILED=0
WARNINGS=0
START_TIME=$(date +%s)
RESULTS=()

echo ""
echo "============================================"
echo "   Publisher Dashboard UI Tests (Localhost)"
echo "============================================"
echo ""
echo "UI URL: $UI_URL"
echo "API URL: $API_URL"
echo "Negotiation API: $NEGOTIATION_API_URL"
echo ""

test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local body=$4
    local expected_status=${5:-200}
    local description=$6
    
    echo "[TEST] $name"
    if [ -n "$description" ]; then
        echo "       $description"
    fi
    
    local curl_args=(-s -w "\n%{http_code}" -X "$method" --max-time 10)
    
    if [ -n "$body" ]; then
        curl_args+=(-H "Content-Type: application/json" -d "$body")
    fi
    
    local response=$(curl "${curl_args[@]}" "$url" 2>&1)
    local status_code=$(echo "$response" | tail -n1)
    local content=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "       ✓ PASSED - Status: $status_code"
        PASSED=$((PASSED + 1))
        RESULTS+=("PASSED:$name")
        return 0
    else
        echo "       ✗ FAILED - Expected $expected_status, got $status_code"
        FAILED=$((FAILED + 1))
        RESULTS+=("FAILED:$name")
        return 1
    fi
}

test_ui_page() {
    local name=$1
    local path=$2
    local description=$3
    
    echo "[UI] $name"
    if [ -n "$description" ]; then
        echo "     $description"
    fi
    
    local url="$UI_URL$path"
    local response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>&1)
    
    if [ "$response" = "200" ]; then
        echo "     ✓ PASSED - Page accessible"
        PASSED=$((PASSED + 1))
        RESULTS+=("PASSED:$name")
        return 0
    else
        echo "     ✗ FAILED - Status: $response"
        FAILED=$((FAILED + 1))
        RESULTS+=("FAILED:$name")
        return 1
    fi
}

# ============================================
# 1. SERVICE AVAILABILITY CHECKS
# ============================================
echo "══════════════════════════════════════════"
echo " 1. SERVICE AVAILABILITY"
echo "══════════════════════════════════════════"

test_endpoint "Licensing API Health" "$API_URL/health" "GET" "" 200 "Check if licensing API is running"
test_endpoint "Negotiation API Health" "$NEGOTIATION_API_URL/health" "GET" "" 200 "Check if negotiation API is running"
test_ui_page "Publisher Dashboard (Root)" "/" "Check if UI is accessible"

# ============================================
# 2. AUTHENTICATION & PUBLISHER DATA
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 2. AUTHENTICATION & PUBLISHER DATA"
echo "══════════════════════════════════════════"

test_endpoint "Get Publisher Policy (Login)" "$API_URL/policies/$PUBLISHER_ID" "GET" "" 200 "Used by Login page to verify publisher"
test_endpoint "Get Publishers List" "$API_URL/admin/publishers" "GET" "" 200 "Retrieve all publishers"

# ============================================
# 3. DASHBOARD PAGE DATA
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 3. DASHBOARD PAGE"
echo "══════════════════════════════════════════"

test_ui_page "Dashboard Page" "/dashboard" "Main dashboard route"
test_endpoint "Get Usage Logs (Dashboard)" "$API_URL/usage?publisherId=$PUBLISHER_ID&limit=100" "GET" "" 200 "Used by Dashboard for analytics"

# ============================================
# 4. URL LIBRARY PAGE
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 4. URL LIBRARY PAGE"
echo "══════════════════════════════════════════"

test_ui_page "URL Library Page" "/urls" "URL library route"
test_endpoint "Get Licenses (URL Library)" "$API_URL/api/licenses?publisherId=$PUBLISHER_ID" "GET" "" 200 "Load licenses for URL assignment"
test_endpoint "Get Access Endpoints" "$API_URL/api/access?publisherId=$PUBLISHER_ID" "GET" "" 200 "Load access configuration"
test_endpoint "Get Parsed URLs (/parsed-urls)" "$API_URL/parsed-urls?publisher_id=$PUBLISHER_ID" "GET" "" 200 "Load URL library list via parsed-urls"
test_endpoint "Get URLs (/api/urls)" "$API_URL/api/urls?publisher_id=$PUBLISHER_ID" "GET" "" 200 "Load URLs via API endpoint"
test_endpoint "Get URL Stats" "$API_URL/parsed-urls/stats/summary" "GET" "" 200 "Load URL statistics"

# ============================================
# 5. LICENSE WIZARD PAGE
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 5. LICENSE WIZARD PAGE"
echo "══════════════════════════════════════════"

test_ui_page "License Wizard Page" "/licenses" "License management route"
test_endpoint "Get All Licenses" "$API_URL/api/licenses?publisherId=$PUBLISHER_ID" "GET" "" 200 "Load license templates"
test_endpoint "Get License Types Meta" "$API_URL/api/licenses/meta/types" "GET" "" 200 "Load license type metadata"

# ============================================
# 6. NOTIFICATIONS PAGE
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 6. NOTIFICATIONS PAGE"
echo "══════════════════════════════════════════"

test_ui_page "Notifications Page" "/notifications" "Notifications route"
test_endpoint "Get Notifications" "$API_URL/api/notifications?publisher_id=$PUBLISHER_ID" "GET" "" 200 "Load notifications"
test_endpoint "Get Unread Count" "$API_URL/api/notifications/unread-count?publisher_id=$PUBLISHER_ID" "GET" "" 200 "Load unread notification count"

# ============================================
# 7. USAGE LOGS PAGE
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 7. USAGE LOGS PAGE"
echo "══════════════════════════════════════════"

test_ui_page "Usage Logs Page" "/logs" "Usage logs route"
test_endpoint "Get Usage Logs" "$API_URL/api/logs?publisher_id=$PUBLISHER_ID&limit=50" "GET" "" 200 "Load usage event logs"

# ============================================
# 8. NEGOTIATIONS PAGES
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 8. NEGOTIATIONS"
echo "══════════════════════════════════════════"

test_ui_page "Active Negotiations Page" "/negotiations" "Negotiations list route"
test_ui_page "Strategy Config Page" "/negotiations/strategy" "Strategy configuration route"
test_endpoint "Get Negotiation Strategies" "$API_URL/api/negotiations/strategies?publisher_id=$PUBLISHER_ID" "GET" "" 200 "Load negotiation strategies"
test_endpoint "Get Active Negotiations" "$API_URL/api/negotiations/publisher/$PUBLISHER_ID?limit=10" "GET" "" 200 "Load active negotiations"

# ============================================
# 9. ACCESS CONFIGURATION PAGE
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 9. ACCESS CONFIGURATION PAGE"
echo "══════════════════════════════════════════"

test_ui_page "Access Configuration Page" "/access" "Access configuration route"
test_endpoint "Get Access Configurations" "$API_URL/api/access?publisherId=$PUBLISHER_ID" "GET" "" 200 "Load access configurations"
test_endpoint "Get Access Types Meta" "$API_URL/api/access/meta/types" "GET" "" 200 "Load access type metadata"

# ============================================
# 10. GROUNDING PAGE
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 10. GROUNDING PAGE"
echo "══════════════════════════════════════════"

test_ui_page "Grounding Page" "/grounding" "Grounding/content parsing route"
test_endpoint "Grounding Endpoint (POST)" "$API_URL/grounding" "POST" '{"url":"https://example.com/test","userAgent":"TestBot"}' 200 "Test grounding/content parsing"

# ============================================
# 11. ERROR HANDLING
# ============================================
echo ""
echo "══════════════════════════════════════════"
echo " 11. ERROR HANDLING"
echo "══════════════════════════════════════════"

test_endpoint "Invalid Publisher ID" "$API_URL/policies/9999" "GET" "" 404 "Should handle invalid publisher gracefully"
test_endpoint "Invalid Negotiation ID" "$API_URL/api/negotiations/00000000-0000-0000-0000-000000000000" "GET" "" 404 "Should handle invalid negotiation gracefully"

# ============================================
# TEST SUMMARY
# ============================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "============================================"
echo "   TEST SUMMARY"
echo "============================================"
echo ""
echo "Total Tests: $((PASSED + FAILED))"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Warnings: $WARNINGS"
echo "Duration: ${DURATION} seconds"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "Failed Tests:"
    for result in "${RESULTS[@]}"; do
        if [[ $result == FAILED:* ]]; then
            echo "  • ${result#FAILED:}"
        fi
    done
    echo ""
fi

# Recommendations
echo "══════════════════════════════════════════"
echo "   RECOMMENDATIONS"
echo "══════════════════════════════════════════"
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✓ All tests passed! UI and API are working correctly."
else
    echo "⚠ Issues detected. Check the following:"
    echo "  1. Ensure all services are running (docker-compose up)"
    echo "  2. Verify UI is running on localhost:5173 (npm run dev)"
    echo "  3. Check API endpoints are accessible on localhost:3000"
    echo "  4. Review database connection and data integrity"
    echo "  5. Check browser console for JavaScript errors"
fi

echo ""
echo "============================================"
echo ""

# Return exit code based on results
if [ $FAILED -eq 0 ]; then
    exit 0
else
    exit 1
fi

