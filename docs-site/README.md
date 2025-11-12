# PaulBit Documentation Site

## Overview

This is a standalone documentation site that serves all PaulBit documentation as a clean, browsable web interface.

## Features

- ✅ **Publicly Accessible** - No password required (unlike `/demo/`)
- ✅ **Markdown Rendering** - All `.md` files rendered with syntax highlighting
- ✅ **Organized Navigation** - Categorized by topic (Getting Started, Architecture, API, etc.)
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile
- ✅ **Search-Friendly** - Clean URLs and proper headings
- ✅ **Fast Loading** - Static files served by Nginx

## Access

- **Local**: http://localhost/docs
- **Azure**: https://monetizeplusapp-e2ecbddxfjh0djey.westeurope-01.azurewebsites.net/docs

## Architecture

```
docs-site/
├── index.html          # Main documentation viewer
├── nginx.conf          # Nginx configuration
├── Dockerfile          # Local build
├── Dockerfile.docs     # Production build (copies all .md files)
└── README.md          # This file
```

### How It Works

1. **Build Time**: All `.md` files from the repository root are copied into `/usr/share/nginx/html/docs-content/`
2. **Runtime**: Nginx serves the HTML viewer and markdown files
3. **Client Side**: `marked.js` renders markdown to HTML in the browser
4. **Routing**: Nginx proxy at `/docs` routes to the docs-site container

## Documentation Categories

### 📚 Getting Started
- Overview & Quick Start
- Azure Quick Start
- Quick Start Guide

### 🏗️ Architecture & Design
- System Architecture
- Project Summary
- Development Workflow

### ⚙️ Features & Guides
- Negotiation System
- Policy Flow
- URL Library
- Policy Tester

### 🔌 API Reference
- API Reference (CM_RTBSPEC)
- Access Endpoints Guide
- Implementation Details

### 🚢 Deployment
- Deployment Guide
- Dev vs Azure
- Database Migration
- Azure Guides

### 🧪 Testing
- UI Testing
- Negotiation Tests
- Manual Tests

### 📝 Reference
- Changelog
- Accept/Reject Flow
- Policy Creation

## Local Development

### Build and Run
```bash
# Build the docs container
docker build -f docs-site/Dockerfile.docs -t paulandrewfarrow/monetizeplus-docs-site:latest .

# Or use docker-compose
docker-compose up docs-site
```

### Access Locally
```
http://localhost/docs
```

## Deployment

The docs site is automatically deployed as part of the main application stack:

```bash
# Azure deployment includes docs-site service
bash azure-deploy.sh
```

## Adding New Documentation

1. Create a new `.md` file in the repository root
2. Add link to `docs-site/index.html` navigation
3. Rebuild the docker image
4. Deploy

Example:
```html
<div class="nav-section">
    <div class="nav-section-title">My Category</div>
    <a class="nav-link" onclick="loadDoc('MY_NEW_DOC.md')">📄 My New Doc</a>
</div>
```

## Technical Details

### Markdown Rendering
- Library: `marked.js` v11.0.0
- Features: GitHub Flavored Markdown, syntax highlighting, tables
- Security: XSS protection enabled

### Nginx Configuration
- CORS enabled for markdown files
- Content-Type: `text/plain; charset=utf-8`
- Gzip compression enabled
- No caching for fresh content

### Docker Image
- Base: `nginx:alpine`
- Size: ~15MB (lightweight)
- Auto-rebuilds: On each deployment

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers

## Performance

- **Load Time**: <500ms (first load)
- **Markdown Render**: <100ms per document
- **Bundle Size**: ~50KB (HTML + CSS + marked.js)

## Future Enhancements

- [ ] Search functionality
- [ ] Table of contents generation
- [ ] Dark mode toggle
- [ ] Print-friendly CSS
- [ ] PDF export
- [ ] Code syntax highlighting themes

## Troubleshooting

### Docs not loading
1. Check nginx logs: `docker logs <container>`
2. Verify markdown files exist: `docker exec <container> ls /usr/share/nginx/html/docs-content/`
3. Check browser console for JavaScript errors

### 404 errors
- Ensure nginx proxy is configured in `publisher-dashboard/nginx.conf`
- Restart publisher-dashboard container

### Markdown not rendering
- Check browser JavaScript is enabled
- Verify `marked.js` CDN is accessible
- Check browser console for errors

## License

Same as main PaulBit project (MIT).

---

**Built with ❤️ for developers who love good documentation**

