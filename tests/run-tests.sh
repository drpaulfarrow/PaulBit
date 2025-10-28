#!/bin/bash

# Tollbit Content Licensing Gateway - Test Suite
# Tests all three flows: Human, Unlicensed Bot, Licensed Bot

echo "=========================================="
echo "Content Licensing Gateway - Test Suite"
echo "=========================================="
echo ""

BASE_URL="http://localhost:8080"
LICENSING_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test and report
test_request() {
    local test_name=$1
    local expected_code=$2
    local response_code=$3
    
    if [ "$response_code" = "$expected_code" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $test_name (got $response_code)"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected $expected_code, got $response_code)"
        ((TESTS_FAILED++))
    fi
}

echo "Waiting for services to be ready..."
sleep 5

echo ""
echo "=========================================="
echo "TEST 1: Human Access (No Restriction)"
echo "=========================================="
echo ""

echo "Testing human access to Publisher A..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    -H "Host: site-a.local" \
    "$BASE_URL/news/foo.html")
test_request "Human access to Publisher A" "200" "$RESPONSE"

echo "Testing human access to Publisher B..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)" \
    -H "Host: site-b.local" \
    "$BASE_URL/docs/a.html")
test_request "Human access to Publisher B" "200" "$RESPONSE"

echo ""
echo "=========================================="
echo "TEST 2: Unlicensed Bot (302 Redirect)"
echo "=========================================="
echo ""

echo "Testing GPTBot without token..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: GPTBot/1.0" \
    -H "Host: site-a.local" \
    "$BASE_URL/news/foo.html")
test_request "GPTBot redirect to authorization" "302" "$RESPONSE"

echo "Testing ClaudeBot without token..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: ClaudeBot/1.0" \
    -H "Host: site-b.local" \
    "$BASE_URL/docs/b.html")
test_request "ClaudeBot redirect to authorization" "302" "$RESPONSE"

echo "Testing Perplexity bot without token..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: PerplexityBot/1.0" \
    -H "Host: site-a.local" \
    "$BASE_URL/tech/bar.html")
test_request "PerplexityBot redirect to authorization" "302" "$RESPONSE"

echo ""
echo "=========================================="
echo "TEST 3: Licensed Bot (Token Flow)"
echo "=========================================="
echo ""

echo "Step 1: Requesting token for Publisher A..."
TOKEN_RESPONSE=$(curl -s -X POST "$LICENSING_URL/token" \
    -H "Content-Type: application/json" \
    -d '{
        "url": "http://site-a.local/news/foo.html",
        "ua": "GPTBot/1.0",
        "purpose": "inference"
    }')

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Token obtained successfully"
    echo "Token: ${TOKEN:0:50}..."
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗${NC} Failed to obtain token"
    echo "Response: $TOKEN_RESPONSE"
    ((TESTS_FAILED++))
fi

echo ""
echo "Step 2: Accessing content with token..."
if [ -n "$TOKEN" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "User-Agent: GPTBot/1.0" \
        -H "Host: site-a.local" \
        "$BASE_URL/news/foo.html?token=$TOKEN")
    test_request "GPTBot access with valid token" "200" "$RESPONSE"
fi

echo ""
echo "Step 3: Testing token verification endpoint..."
if [ -n "$TOKEN" ]; then
    VERIFY_RESPONSE=$(curl -s "$LICENSING_URL/verify?token=$TOKEN&url=http://site-a.local/news/foo.html")
    VALID=$(echo "$VERIFY_RESPONSE" | grep -o '"valid":true')
    
    if [ -n "$VALID" ]; then
        echo -e "${GREEN}✓${NC} Token verification successful"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} Token verification failed"
        echo "Response: $VERIFY_RESPONSE"
        ((TESTS_FAILED++))
    fi
fi

echo ""
echo "=========================================="
echo "TEST 4: Error Cases"
echo "=========================================="
echo ""

echo "Testing access with invalid token..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "User-Agent: GPTBot/1.0" \
    -H "Host: site-a.local" \
    "$BASE_URL/news/foo.html?token=invalid-token-here")
test_request "Invalid token rejection" "403" "$RESPONSE"

echo "Testing token for wrong URL..."
if [ -n "$TOKEN" ]; then
    VERIFY_RESPONSE=$(curl -s "$LICENSING_URL/verify?token=$TOKEN&url=http://site-a.local/different/page.html")
    VALID=$(echo "$VERIFY_RESPONSE" | grep -o '"valid":false')
    
    if [ -n "$VALID" ]; then
        echo -e "${GREEN}✓${NC} URL mismatch detected correctly"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗${NC} URL mismatch not detected"
        ((TESTS_FAILED++))
    fi
fi

echo ""
echo "=========================================="
echo "TEST 5: Admin Endpoints"
echo "=========================================="
echo ""

echo "Testing GET /admin/publishers..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$LICENSING_URL/admin/publishers")
test_request "List publishers" "200" "$RESPONSE"

echo "Testing GET /admin/clients..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$LICENSING_URL/admin/clients")
test_request "List clients" "200" "$RESPONSE"

echo "Testing GET /admin/plans..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$LICENSING_URL/admin/plans")
test_request "List plans" "200" "$RESPONSE"

echo "Testing GET /usage..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$LICENSING_URL/usage?publisherId=1&limit=10")
test_request "Query usage events" "200" "$RESPONSE"

echo ""
echo "=========================================="
echo "TEST 6: Policy Endpoints"
echo "=========================================="
echo ""

echo "Testing GET /policies for Publisher A..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$LICENSING_URL/policies/1")
test_request "Get Publisher A policy" "200" "$RESPONSE"

echo "Testing GET /policies for Publisher B..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$LICENSING_URL/policies/2")
test_request "Get Publisher B policy" "200" "$RESPONSE"

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✓${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
