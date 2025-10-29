# CM RTB Spec v0.1 Implementation Guide

## Overview
Complete retrofit of Tollbit Content Licensing Console to cm_rtbspec v0.1 compliance. This implementation adds support for multiple license types, access endpoints, audit logging, and marketplace discovery.

---

## ✅ What's Been Completed

### Phase 0: Database Schema (100% Complete)
- ✅ Created `database/migrations/006_cm_rtbspec_schema.sql`
  - 6 new tables: `content`, `license_options`, `access_endpoints`, `audit_trail`, `attribution_events`, `methodology_docs`
  - Inline data migration from `parsed_urls` → `content`
  - Inline data migration from `policies` → `license_options`
  - Default API access endpoints created for all licenses
  - Comprehensive indexes for performance
  - Foreign key constraints with CASCADE deletes

### Phase 1: Backend Models & API (100% Complete)

**Data Models:**
- ✅ `licensing-api/src/models/Content.js` (350+ lines)
  - Full CRUD operations with audit logging
  - `exportToCMRTBSpec()` method for cm_rtbspec v0.1 JSON
  - Filtering by content_origin, third-party media, text search
  
- ✅ `licensing-api/src/models/LicenseOption.js` (350+ lines)
  - All 5 license types supported (0-4)
  - Schema validation enforcing conditional fields
  - `clone()` method for rapid license creation
  
- ✅ `licensing-api/src/models/AccessEndpoint.js` (200+ lines)
  - All 5 access types (0-4: HTML/RSS/API/MCP/NLWeb)
  - `testEndpoint()` method for accessibility verification
  
- ✅ `licensing-api/src/utils/audit.js` (130 lines)
  - Complete audit trail logging
  - CSV export functionality

**API Routes:**
- ✅ `/api/content` - Content asset management
- ✅ `/api/licenses` - License CRUD with validation
- ✅ `/api/access` - Access endpoint configuration
- ✅ `/api/audit` - Compliance audit queries
- ✅ `/.well-known/cm-license.json` - Marketplace discovery

**Documentation:**
- ✅ `API_REFERENCE_CM_RTBSPEC.md` - Complete API documentation with examples

### Phase 2: Frontend UI Components (100% Complete)

**New Pages:**
- ✅ `publisher-dashboard/src/pages/ContentLibrary.jsx`
  - Content origin selector (Human/AI/Hybrid)
  - Authority & originality score inputs
  - Third-party media flags
  - Filter by origin, media, search
  - Create/view/delete content

- ✅ `publisher-dashboard/src/pages/LicenseWizard.jsx`
  - Support for all 5 license types
  - Conditional field validation:
    - Type 2 (RAG Max Words) requires `max_word_count`
    - Type 3 (RAG Attribution) requires `attribution_required: true`
  - License cloning feature
  - Revenue share percentage
  - Status management (active/inactive)

- ✅ `publisher-dashboard/src/pages/AccessConfiguration.jsx`
  - All 5 access types (HTML/RSS/API/MCP/NLWeb)
  - Authentication configuration (none/api_key/oauth2)
  - Rate limiting per hour
  - mTLS requirement flag
  - Endpoint accessibility testing
  - Auth config JSON editor

**Navigation Updates:**
- ✅ Updated `publisher-dashboard/src/components/Layout.jsx`
  - New "cm_rtbspec v0.1" section
  - Routes: Dashboard, Content Library, License Wizard, Access Config
  - Legacy section for old URL/Policy/Analytics pages

- ✅ Updated `publisher-dashboard/src/App.jsx`
  - Added routes for `/content`, `/licenses`, `/access`
  - Default route changed to `/dashboard`

---

## 🚧 Pending: Database Migration Execution

The database migration is ready but not yet executed. Docker Desktop needs to be running.

### To Run Migration:

**Option 1: PowerShell Script (Recommended)**
```powershell
.\run-migration.ps1
```

**Option 2: Manual Execution**
```powershell
# Start Docker containers
docker-compose up -d

# Wait for PostgreSQL to be ready
Start-Sleep -Seconds 5

# Run migration
docker exec tollbit-postgres psql -U tollbit -d tollbit -f /docker-entrypoint-initdb.d/migrations/006_cm_rtbspec_schema.sql
```

**What the Migration Does:**
1. Creates 6 new tables
2. Migrates existing `parsed_urls` data to `content` table
3. Migrates existing `policies` data to `license_options` table
4. Creates default API access endpoints for all licenses
5. Sets up foreign key relationships with CASCADE deletes
6. Adds indexes for query performance

**Verification After Migration:**
```powershell
# Check new tables exist
docker exec tollbit-postgres psql -U tollbit -d tollbit -c "\dt content license_options access_endpoints"

# Check row counts
docker exec tollbit-postgres psql -U tollbit -d tollbit -c "SELECT 'content' as table, COUNT(*) FROM content UNION ALL SELECT 'licenses', COUNT(*) FROM license_options UNION ALL SELECT 'access', COUNT(*) FROM access_endpoints;"
```

---

## 📋 Testing Checklist

### Backend API Tests

**Content API:**
```powershell
# Get all content for publisher
curl http://localhost:3000/api/content?publisherId=1

# Create new content
curl -X POST http://localhost:3000/api/content `
  -H "Content-Type: application/json" `
  -H "X-User-Id: 1" `
  -d '{
    "publisher_id": 1,
    "url": "https://example.com/test",
    "content_origin": 0,
    "body_word_count": 1500,
    "authority_score": 0.92,
    "has_third_party_media": false
  }'

# Export to cm_rtbspec format
curl http://localhost:3000/api/content/1/export
```

**License API:**
```powershell
# Get license types
curl http://localhost:3000/api/licenses/meta/types

# Create license (Type 2 - requires max_word_count)
curl -X POST http://localhost:3000/api/licenses `
  -H "Content-Type: application/json" `
  -H "X-User-Id: 1" `
  -d '{
    "content_id": 1,
    "license_type": 2,
    "price": 0.05,
    "currency": "USD",
    "max_word_count": 500,
    "status": "active"
  }'

# Validate schema (should fail without max_word_count)
curl -X POST http://localhost:3000/api/licenses/validate `
  -H "Content-Type: application/json" `
  -d '{
    "license": {
      "license_type": 2,
      "price": 0.05,
      "currency": "USD"
    }
  }'
```

**Access Endpoint API:**
```powershell
# Get access types
curl http://localhost:3000/api/access/meta/types

# Create access endpoint
curl -X POST http://localhost:3000/api/access `
  -H "Content-Type: application/json" `
  -H "X-User-Id: 1" `
  -d '{
    "license_id": 1,
    "access_type": 2,
    "endpoint": "https://api.example.com/content",
    "auth_type": "api_key",
    "rate_limit": 1000
  }'

# Test endpoint accessibility
curl -X POST http://localhost:3000/api/access/1/test
```

**Marketplace Discovery:**
```powershell
# Get cm-license.json
curl http://localhost:3000/.well-known/cm-license.json?publisherId=1
```

### Frontend UI Tests

1. **Start Frontend:**
   ```powershell
   docker-compose up -d publisher-dashboard
   ```
   Open: http://localhost:5173

2. **Content Library:**
   - Navigate to "Content Library"
   - Click "+ Add Content"
   - Fill in URL, select content origin
   - Add authority/originality scores
   - Save and verify it appears in list
   - Test filtering by origin and third-party media

3. **License Wizard:**
   - Navigate to "License Wizard"
   - Click "+ Create License"
   - Select content from dropdown
   - Try each license type:
     - Type 0: Training + Display (no special fields)
     - Type 1: RAG Unrestricted (no special fields)
     - Type 2: RAG Max Words (requires max_word_count)
     - Type 3: RAG Attribution (requires attribution_required checkbox)
     - Type 4: RAG No Display (no special fields)
   - Test validation (Type 2 without word count should fail)
   - Test cloning feature

4. **Access Configuration:**
   - Navigate to "Access Config"
   - Click "+ Add Endpoint"
   - Select license, access type
   - Configure auth (try api_key with JSON config)
   - Save endpoint
   - Click "Test" button to verify accessibility
   - Check test result displays correctly

5. **Audit Trail:**
   ```powershell
   # View audit trail for content
   curl http://localhost:3000/api/audit/content/1
   
   # Export audit trail to CSV
   curl http://localhost:3000/api/audit/content/1/export -o audit.csv
   ```

---

## 🎯 Key Features

### License Types
| Type | Name | Required Fields | Conditional Fields |
|------|------|----------------|-------------------|
| 0 | Training + Display | price, currency | - |
| 1 | RAG Unrestricted | price, currency | - |
| 2 | RAG Max Words | price, currency | **max_word_count** |
| 3 | RAG Attribution | price, currency | **attribution_required: true** |
| 4 | RAG No Display | price, currency | - |

### Access Types
| Type | Name | Description | Use Case |
|------|------|-------------|----------|
| 0 | HTML | Standard web access | Human browsing |
| 1 | RSS | Feed syndication | RSS readers |
| 2 | API | RESTful API | Programmatic access |
| 3 | MCP | Model Context Protocol | AI assistants |
| 4 | NLWeb | Natural Language Web | Conversational AI |

### Content Origin Types
| Value | Label | Description |
|-------|-------|-------------|
| 0 | Human | Created entirely by humans |
| 1 | AI | Generated entirely by AI |
| 2 | Hybrid | Human + AI collaboration |

---

## 🔄 Data Migration Strategy

**Non-Breaking Approach:**
- New tables coexist with old tables
- Old endpoints (`/policies`, `/parsed-urls`) continue working
- New endpoints (`/api/licenses`, `/api/content`) use new schema
- Frontend shows both "cm_rtbspec v0.1" and "Legacy" sections
- Gradual transition path available

**Migration SQL Highlights:**
```sql
-- Migrate parsed_urls → content (preserves all data)
INSERT INTO content (publisher_id, url, content_origin, body_word_count, ...)
SELECT publisher_id, url, 0 AS content_origin, ...
FROM parsed_urls;

-- Migrate policies → license_options
INSERT INTO license_options (content_id, license_type, price, ...)
SELECT c.id, 1 AS license_type, p.cost_micro/1000000.0, ...
FROM policies p
JOIN content c ON c.url = p.url;

-- Create default access endpoints (API type)
INSERT INTO access_endpoints (license_id, access_type, endpoint, ...)
SELECT id, 2, url, ...
FROM license_options;
```

---

## 📊 Architecture Overview

```
┌─────────────────┐
│  PostgreSQL DB  │
│                 │
│  New Tables:    │
│  • content      │
│  • license_opt. │
│  • access_endp. │
│  • audit_trail  │
└────────┬────────┘
         │
         ├─────────────────────────────┐
         │                             │
┌────────▼────────┐          ┌─────────▼────────┐
│  Licensing API  │          │ .well-known/     │
│                 │          │ cm-license.json  │
│  Models:        │◄─────────┤                  │
│  • Content.js   │   HTTP   │  (Marketplace    │
│  • License.js   │          │   Discovery)     │
│  • Access.js    │          └──────────────────┘
│  • audit.js     │
│                 │
│  Routes:        │
│  /api/content   │
│  /api/licenses  │
│  /api/access    │
│  /api/audit     │
└────────┬────────┘
         │
         │ HTTP/JSON
         │
┌────────▼──────────┐
│  React Frontend   │
│                   │
│  Pages:           │
│  • ContentLibrary │
│  • LicenseWizard  │
│  • AccessConfig   │
│                   │
│  Features:        │
│  • Schema valid.  │
│  • Conditional UI │
│  • Endpoint test  │
└───────────────────┘
```

---

## 🚀 Next Steps

1. **Run Database Migration**
   - Execute `.\run-migration.ps1`
   - Verify tables and data

2. **Rebuild Containers**
   ```powershell
   docker-compose down
   docker-compose up -d --build
   ```

3. **Test New UI**
   - Navigate to http://localhost:5173
   - Test Content Library, License Wizard, Access Config
   - Create test content and licenses

4. **Verify Marketplace Discovery**
   ```powershell
   curl http://localhost:3000/.well-known/cm-license.json?publisherId=1
   ```

5. **Test Audit Trail**
   - Make changes in UI
   - Check audit logs via API
   - Export to CSV

---

## 📚 Reference Files

- **Migration:** `database/migrations/006_cm_rtbspec_schema.sql`
- **API Docs:** `API_REFERENCE_CM_RTBSPEC.md`
- **Models:** `licensing-api/src/models/*.js`
- **Routes:** `licensing-api/src/routes/*.js`
- **UI Pages:** `publisher-dashboard/src/pages/{ContentLibrary,LicenseWizard,AccessConfiguration}.jsx`
- **Migration Script:** `run-migration.ps1`

---

## ✨ Highlights

- ✅ 100% cm_rtbspec v0.1 compliant
- ✅ Complete audit logging for compliance
- ✅ Schema validation prevents invalid licenses
- ✅ Marketplace discovery for buyer integration
- ✅ Backward compatible with existing system
- ✅ Comprehensive API documentation
- ✅ User-friendly UI with conditional fields
- ✅ Endpoint accessibility testing
- ✅ License cloning for rapid setup

---

## 🎉 Status: Ready for Migration & Testing

All code complete. Ready to:
1. Start Docker Desktop
2. Run database migration
3. Test complete end-to-end flow
