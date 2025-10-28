# URL Library Feature - Setup & Testing Guide

## 🎯 Feature Overview

The URL Library automatically saves all URLs you parse via the Grounding API, creating a searchable collection with:
- Automatic URL tracking with metadata
- Parse count tracking (increments on re-parse)
- Full-text search across titles and descriptions
- Filter by domain
- Sort by last parsed, first parsed, or parse count
- Delete URLs from your library
- Statistics dashboard

---

## 🚀 Quick Start

### 1. Restart Docker Services

The database schema has been updated to include the `parsed_urls` table:

```powershell
# Stop and remove existing containers
docker-compose down -v

# Rebuild and start all services
docker-compose up -d --build

# Wait ~10 seconds for services to initialize
Start-Sleep -Seconds 10
```

### 2. Verify Services Running

```powershell
# Check all containers are healthy
docker-compose ps

# Expected: All services should be "Up"
# - postgres
# - redis
# - licensing-api
# - edge-worker
# - publisher-a
# - publisher-b
# - publisher-dashboard
# - url-parser
```

### 3. Run URL Library Tests

```powershell
# Run automated test suite
.\tests\test-url-library.ps1
```

This will:
✓ Parse URLs via Grounding API
✓ Verify auto-save to library
✓ Check parse count increments
✓ Test search/filter functionality
✓ Validate statistics endpoints

### 4. Access the Dashboard

1. Open your browser to: **http://localhost:5173**
2. Login with Publisher ID: **1**
3. Click **"📚 URL Library"** in the left sidebar
4. You should see your parsed URLs!

---

## 📡 API Endpoints

### Parse URL & Auto-Save
```bash
POST http://localhost:3000/grounding
Content-Type: application/json

{
  "url": "http://site-a.local/news/foo.html",
  "userAgent": "TestBot/1.0",
  "purpose": "inference",
  "clientId": "test-client"
}
```

### List URLs
```bash
GET http://localhost:3000/parsed-urls
GET http://localhost:3000/parsed-urls?domain=site-a.local
GET http://localhost:3000/parsed-urls?search=news
GET http://localhost:3000/parsed-urls?sortBy=parse_count&sortOrder=desc
```

### Get Statistics
```bash
GET http://localhost:3000/parsed-urls/stats/summary
```

### Get Specific URL
```bash
GET http://localhost:3000/parsed-urls/:id
```

### Delete URL
```bash
DELETE http://localhost:3000/parsed-urls/:id
```

---

## 🧪 Testing Workflow

### Automated Testing
```powershell
.\tests\test-url-library.ps1
```

### Manual Testing
See `tests/MANUAL_TESTS.md` section **Test 8: URL Library Feature** for detailed manual test cases.

### UI Testing
1. Parse multiple URLs via the Grounding API test page
2. Navigate to URL Library
3. Verify all parsed URLs appear
4. Test search: enter "news" in search box
5. Test filter: select a domain from dropdown
6. Test sort: change sort order
7. Test delete: click trash icon on a URL

---

## 🗂️ Database Schema

### parsed_urls Table
```sql
CREATE TABLE parsed_urls (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    domain VARCHAR(255) NOT NULL,
    title TEXT,
    description TEXT,
    first_parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parse_count INTEGER DEFAULT 1,
    last_status VARCHAR(50) DEFAULT 'success',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Key Features
- **UNIQUE constraint** on URL prevents duplicates
- **ON CONFLICT** handling increments parse_count
- **JSONB metadata** stores flexible data
- **Full-text search** index on title/description
- **Indexes** for fast domain and date queries

---

## 🎨 UI Components

### URL Library Page Features
- **Stats Cards**: Total URLs, Unique Domains, Total Parses
- **Search Bar**: Full-text search across URL, title, description
- **Domain Filter**: Filter by specific domains
- **Sort Options**: Last parsed, first parsed, parse count
- **URL Table**: 
  - Clickable URLs (open in new tab)
  - Title and description display
  - Parse count badge
  - Last parsed timestamp
  - Delete button
- **Auto-refresh**: Manual refresh button available

---

## 🔧 Troubleshooting

### URLs Not Appearing in Library

**Check API is saving:**
```powershell
curl.exe http://localhost:3000/parsed-urls
```

**Check database directly:**
```powershell
docker-compose exec postgres psql -U tollbit -d tollbit -c "SELECT * FROM parsed_urls;"
```

### Database Table Missing

**Recreate database with new schema:**
```powershell
docker-compose down -v
docker-compose up -d
```

### Dashboard Not Loading Library

**Check browser console** for API errors
**Verify API is accessible:**
```powershell
curl.exe http://localhost:3000/parsed-urls/stats/summary
```

### Parse Count Not Incrementing

This might happen if:
- URL is different (even slightly - trailing slash, query params)
- Database constraint violation

Check logs:
```powershell
docker-compose logs licensing-api
```

---

## 📊 Expected Results

After parsing a few URLs, you should see:

### API Response
```json
{
  "success": true,
  "urls": [
    {
      "id": 1,
      "url": "http://site-a.local/news/foo.html",
      "domain": "site-a.local",
      "title": "Example News Article",
      "description": "This is a sample article",
      "parse_count": 2,
      "last_parsed_at": "2025-10-27T12:00:00.000Z",
      "first_parsed_at": "2025-10-27T11:30:00.000Z",
      "last_status": "success"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### UI Display
- Clean table with all parsed URLs
- Working search/filter controls
- Statistics showing accurate counts
- Delete functionality working

---

## ✅ Success Criteria

- [ ] Docker containers all running
- [ ] Database table `parsed_urls` exists
- [ ] API endpoint `/parsed-urls` returns data
- [ ] URLs auto-save when parsed via `/grounding`
- [ ] Parse count increments on re-parse
- [ ] Dashboard displays URL Library page
- [ ] Search functionality works
- [ ] Domain filter works
- [ ] Sort options work
- [ ] Delete functionality works
- [ ] Statistics display correctly
- [ ] No console errors in browser

---

## 📝 Next Steps

Once the feature is working:

1. **Add More Features**:
   - Export URLs to CSV
   - Bulk delete
   - Tags/categories for URLs
   - Notes/annotations per URL

2. **Enhance UI**:
   - Preview pane for markdown
   - Pagination for large collections
   - Advanced filters (date range, status)

3. **Add Analytics**:
   - Most parsed URLs report
   - Parsing trends over time
   - Domain breakdown charts

---

## 🆘 Support

If you encounter issues:

1. Check Docker logs: `docker-compose logs -f`
2. Review manual tests: `tests/MANUAL_TESTS.md`
3. Run automated tests: `.\tests\test-url-library.ps1`
4. Check database state: `docker-compose exec postgres psql -U tollbit -d tollbit`

---

**Happy URL Parsing! 🎉**
