# URL → Markdown Conversion API

REST API service that fetches a URL, converts HTML to clean Markdown, and returns structured JSON with metadata.

## Features

- **POST /to-markdown** – Convert any public URL to Markdown
- **GET /health** – Health check endpoint
- URL validation with SSRF protection (blocks private/local IPs)
- Main content extraction via Mozilla Readability
- Metadata extraction (title, author, published date)
- Rate limiting: 30 requests/min per IP
- Structured logging to console and `logs/app.log`
- 15s fetch timeout, follows up to 5 redirects

## Installation

```powershell
npm install
```

## Usage

### Start the server

```powershell
npm start
```

Server listens on port **4000** by default (override with `PORT` environment variable).

### Example request

```powershell
curl.exe -X POST http://localhost:4000/to-markdown `
  -H "Content-Type: application/json" `
  -d '{"url":"https://example.com"}'
```

### Request body options

```json
{
  "url": "https://example.com/article",
  "extractMainContent": true,
  "includeMetadata": true
}
```

### Response

```json
{
  "url": "https://example.com/article",
  "status": 200,
  "title": "Article Title",
  "contentType": "text/html; charset=utf-8",
  "markdown": "# Article Title\n\nContent here...",
  "length": 1024,
  "metadata": {
    "title": "Article Title",
    "author": "John Doe",
    "published": "2025-10-27T00:00:00Z",
    "canonical": "https://example.com/article"
  },
  "processingTimeMs": 415,
  "details": {
    "fetchTimeMs": 320,
    "conversionTimeMs": 95
  }
}
```

## Error codes

| Status | Message |
|--------|---------|
| 400 | Missing or invalid URL |
| 400 | URL resolves to a private or disallowed address |
| 404 | URL not found or blocked |
| 500 | Internal conversion error |
| 502 | Upstream fetch failure |

## Environment variables

- `PORT` – Server port (default: 4000)
- `CORS_ORIGINS` – Comma-separated allowed origins (default: none)

## Testing

```powershell
npm test
```

## Architecture

```
┌────────────────┐
│  Client/Agent  │
└───────┬────────┘
        │ POST /to-markdown
        ▼
┌────────────────┐
│ Express Server │
│ - validate URL │
│ - rate limit   │
└───────┬────────┘
        ▼
┌────────────────┐
│ Fetcher        │
│ (axios)        │
└───────┬────────┘
        ▼
┌────────────────┐
│ Parser         │
│ (Readability+  │
│  Turndown)     │
└───────┬────────┘
        ▼
┌────────────────┐
│ JSON Response  │
└────────────────┘
```

## Security

- Rejects URLs resolving to private/reserved IP ranges (SSRF protection)
- Validates URL format and protocol (http/https only)
- Rate limiting per IP
- Helmet security headers
- CORS restrictions

## License

MIT
