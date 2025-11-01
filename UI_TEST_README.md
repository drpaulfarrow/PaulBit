# UI Test Suite for Publisher Dashboard (Localhost)

This test suite validates the Publisher Dashboard UI when running locally on `localhost:5173`. It tests both UI accessibility and the underlying API endpoints that the UI depends on.

## Overview

The test suite checks:
- **UI Page Accessibility** - All routes are accessible and return valid HTML
- **API Endpoints** - All API endpoints used by the UI are working correctly
- **Data Integrity** - Data structures and relationships are valid
- **Error Handling** - Invalid requests are handled gracefully

## Prerequisites

1. **Start all services** (via Docker Compose):
   ```bash
   docker-compose up -d
   ```

2. **Start the UI in development mode**:
   ```bash
   cd publisher-dashboard
   npm install  # if needed
   npm run dev
   ```

   The UI should be accessible at `http://localhost:5173`

3. **Verify services are running**:
   - Licensing API: `http://localhost:3000`
   - Negotiation API: `http://localhost:3003`
   - Publisher Dashboard UI: `http://localhost:5173`

## Running the Tests

### PowerShell (Windows)

```powershell
.\test-ui-localhost.ps1
```

### Bash (Mac/Linux)

```bash
./test-ui-localhost.sh
```

## What Gets Tested

### 1. Service Availability
- Licensing API health check
- Negotiation API health check
- UI root page accessibility

### 2. Authentication & Publisher Data
- Publisher policy endpoint (used by Login page)
- Publishers list endpoint
- Data structure validation

### 3. Dashboard Page
- Dashboard route accessibility
- Usage logs endpoint (`/usage?publisherId=1&limit=100`)
- Data structure validation

### 4. URL Library Page
- URL Library route accessibility
- Licenses endpoint (for URL assignment)
- Access endpoints configuration
- Parsed URLs list
- URL statistics

### 5. License Wizard Page
- License Wizard route accessibility
- All licenses endpoint
- License types metadata

### 6. Notifications Page
- Notifications route accessibility
- Notifications list endpoint
- Unread count endpoint

### 7. Usage Logs Page
- Usage Logs route accessibility
- Usage logs endpoint

### 8. Negotiations Pages
- Active Negotiations route
- Strategy Config route
- Negotiation strategies endpoint
- Active negotiations list
- Individual negotiation details (if available)

### 9. Access Configuration Page
- Access Configuration route
- Access configurations endpoint
- Access types metadata

### 10. Grounding Page
- Grounding route accessibility
- Grounding/content parsing endpoint (POST)

### 11. Data Integrity Checks
- License ID references in URLs
- Notification data structure validation

### 12. Error Handling
- Invalid publisher ID (should return 404)
- Invalid negotiation ID (should return 404)

## Test Output

The test suite provides:
- ✓ **Passed** - Test succeeded
- ✗ **Failed** - Test failed (see details)
- ⚠ **Warning** - Test passed but with concerns

At the end, you'll get:
- Total test count
- Passed/Failed/Warning counts
- Duration
- List of failed tests (if any)
- Recommendations for fixing issues

## Understanding Test Failures

### Common Issues

#### 1. "Licensing API Health" fails
- **Cause**: Licensing API is not running or not accessible
- **Fix**: Check `docker-compose ps` and ensure `licensing-api` service is up
- **Verify**: `curl http://localhost:3000/health`

#### 2. "Publisher Dashboard (Root)" fails
- **Cause**: UI dev server is not running
- **Fix**: Run `npm run dev` in the `publisher-dashboard` directory
- **Verify**: Open `http://localhost:5173` in browser

#### 3. API endpoints return 404 or 500
- **Cause**: Database migrations not run or API endpoints changed
- **Fix**: 
  - Check database migrations: `docker-compose logs licensing-api`
  - Verify API routes match what the UI expects
  - Check API documentation in README.md

#### 4. "Invalid Publisher ID" doesn't return 404
- **Cause**: API error handling not working correctly
- **Fix**: Check API route handlers for proper error responses

#### 5. Data structure validation fails
- **Cause**: API response format changed or database schema changed
- **Fix**: 
  - Check API response format matches UI expectations
  - Verify database schema matches API models
  - Check for recent migrations that might have changed structure

### Debugging Tips

1. **Check service logs**:
   ```bash
   docker-compose logs licensing-api
   docker-compose logs negotiation-agent
   ```

2. **Verify database connectivity**:
   ```bash
   docker exec -it monetizeplus-postgres-1 psql -U monetizeplus -d monetizeplus
   ```

3. **Check API responses manually**:
   ```bash
   curl http://localhost:3000/api/licenses?publisherId=1 | jq
   ```

4. **Inspect UI network requests**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Navigate through UI pages
   - Check which API calls fail

5. **Check for CORS issues**:
   - If API calls fail in browser but work in curl, check CORS settings
   - Localhost development should use direct API calls (no proxy needed)

## Test Results File

Test results are saved to `test-ui-localhost-results-TIMESTAMP.json` for further analysis.

Example:
```json
{
  "Passed": 45,
  "Failed": 2,
  "Warnings": 1,
  "Tests": [
    {
      "Name": "Get Licenses",
      "Status": "PASSED",
      "Details": "Status 200"
    }
  ]
}
```

## Integration with CI/CD

You can integrate these tests into your CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
- name: Start services
  run: docker-compose up -d

- name: Start UI dev server
  run: |
    cd publisher-dashboard
    npm install
    npm run dev &
    
- name: Wait for services
  run: sleep 10

- name: Run UI tests
  run: ./test-ui-localhost.sh
```

## Notes

- These tests are designed for **localhost development** only
- For Azure deployment testing, use separate test suites
- Tests assume default publisher ID of `1`
- Some tests may fail if database is empty (warnings only)
- Tests use HTTP timeouts of 10 seconds

## Troubleshooting "Funky" Database/API Issues

If the user mentioned the database/API has become "funky", these tests help identify:

1. **Missing endpoints** - Tests will fail if endpoints don't exist
2. **Response format changes** - Data structure validation will catch this
3. **Database connectivity** - API health checks will fail
4. **Data integrity** - License/URL relationships will be flagged
5. **Incomplete migrations** - Missing tables/columns will cause failures

Run these tests first to identify which areas need attention.

## Contributing

When adding new UI pages or API endpoints:
1. Add corresponding tests to the appropriate section
2. Follow the existing test patterns
3. Include data validation where applicable
4. Update this README if adding new test categories



