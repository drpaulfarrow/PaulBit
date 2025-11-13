# Telemetry Integration Guide

Complete guide for integrating CDN and edge platform logs into the MAI Monetize Analytics system.

## 🎯 Overview

The telemetry system ingests access logs from various platforms (Fastly, Cloudflare, Akamai, etc.) and provides:
- **Real-time analytics** dashboard with bot detection, error rates, and latency metrics
- **Aggregated metrics** rolled up by hour/day for trend analysis
- **Anomaly alerts** via webhooks when thresholds are exceeded
- **Top agents and geo data** for traffic insights

---

## 🔑 Authentication

All log ingestion requests must include your **publisher API key** in the header:

```
X-MAI-Monetize-Key: <your-hashed-api-key>
```

### Finding Your API Key

1. **Sign in to the dashboard** at https://your-domain.com/demo/
2. **Navigate to Analytics** page
3. **Copy your API Key Hash** from the "Ingestion Credentials" section

**For local/dev environments:**
- Raw key: `publisher-{id}-ingest`
- The system stores the SHA-256 hash

---

## 📊 Ingestion Endpoint

**POST** `/api/logs/ingest`

### Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-MAI-Monetize-Key` | ✅ Yes | Your publisher's hashed API key |
| `X-MAI-Monetize-Source` | ❌ Optional | Platform name (fastly, cloudflare, etc.) |
| `X-MAI-Monetize-Source-Id` | ❌ Optional | Service ID or config ID |
| `Content-Type` | ✅ Yes | `application/json` or `application/x-ndjson` |

### Request Body

Accepts **JSON array** or **NDJSON** (newline-delimited JSON):

```json
[
  {
    "timestamp": "2025-11-13T12:00:00Z",
    "host": "example.com",
    "url": "https://example.com/article/foo",
    "method": "GET",
    "status": 200,
    "user_agent": "GPTBot/1.0",
    "country": "US",
    "city": "New York",
    "latency_ms": 125.5,
    "referer": "https://google.com",
    "source": "fastly"
  }
]
```

**Field Mappings:**

| Our Field | Aliases (we auto-detect) | Type | Required |
|-----------|--------------------------|------|----------|
| `timestamp` | `time`, `ts`, `datetime`, `request_time` | ISO 8601 string | ✅ |
| `url` | `request`, `path` | String | ✅ |
| `host` | `hostname`, `server` | String | ❌ |
| `method` | `http_method`, `request_method` | String | ❌ |
| `status` | `status_code` | Integer | ❌ |
| `user_agent` | `agent`, `ua`, `request_agent` | String | ❌ |
| `country` | `geo_country`, `geo.country`, `client_country` | ISO 2-letter code | ❌ |
| `city` | `geo_city`, `geo.city`, `client_city` | String | ❌ |
| `latency_ms` | `request_time_ms`, `origin_time_ms`, `latency` | Float | ❌ |
| `referer` | `referrer`, `referer_host` | String | ❌ |

The ingestion API is **flexible** - it will auto-detect and normalize field names from different CDN formats.

### Response

```json
{
  "ingested": 150,
  "publisher_id": 1
}
```

---

## 🌐 Platform Integrations

### **Fastly**

Fastly supports real-time log streaming to custom endpoints.

#### Setup

1. **Go to Fastly Dashboard** → Your Service → Logging
2. **Add Logging Endpoint** → Generic HTTP
3. **Configure:**
   - **URL:** `https://your-domain.com/api/logs/ingest`
   - **Method:** `POST`
   - **Format:** `JSON`
   - **Headers:**
     ```
     X-MAI-Monetize-Key: <your-api-key>
     X-MAI-Monetize-Source: fastly
     Content-Type: application/json
     ```
   - **JSON Format:**
     ```json
     {
       "timestamp": "%{begin:%Y-%m-%dT%H:%M:%S}t",
       "host": "%{req.http.Host}V",
       "url": "%{req.url}V",
       "method": "%{req.method}V",
       "status": %{resp.status}V,
       "user_agent": "%{req.http.User-Agent}V",
       "country": "%{client.geo.country_code}V",
       "city": "%{client.geo.city}V",
       "latency_ms": %{time.elapsed.msec}V,
       "referer": "%{req.http.Referer}V"
     }
     ```

#### Batching

Fastly can batch multiple requests before sending. Configure:
- **Max batch size:** 500 (our API limit)
- **Max batch interval:** 10 seconds

---

### **Cloudflare**

Use Cloudflare Logpush to send logs to our API.

#### Setup via API

```bash
# 1. Create Logpush job
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/logpush/jobs" \
  -H "Authorization: Bearer <cloudflare-api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "MAI Monetize Analytics",
    "destination_conf": "https://your-domain.com/api/logs/ingest?header_X-MAI-Monetize-Key=<your-api-key>&header_X-MAI-Monetize-Source=cloudflare",
    "dataset": "http_requests",
    "enabled": true,
    "logpull_options": "fields=ClientRequestHost,ClientRequestURI,ClientRequestMethod,EdgeResponseStatus,ClientRequestUserAgent,ClientCountry,ClientCity,EdgeTimeToFirstByteMs,ClientRequestReferer&timestamps=rfc3339"
  }'
```

#### Field Mapping

Cloudflare uses different field names:
- `ClientRequestHost` → `host`
- `ClientRequestURI` → `url`  
- `ClientRequestMethod` → `method`
- `EdgeResponseStatus` → `status`
- `ClientRequestUserAgent` → `user_agent`
- `ClientCountry` → `country`
- `EdgeTimeToFirstByteMs` → `latency_ms`

Our API **auto-detects** these!

---

### **Akamai DataStream**

Configure Akamai DataStream to push logs to our endpoint.

#### Setup

1. **Akamai Control Center** → DataStream → Create Stream
2. **Stream Type:** Custom HTTPS
3. **Endpoint Configuration:**
   - **URL:** `https://your-domain.com/api/logs/ingest`
   - **Method:** `POST`
   - **Authentication:** Custom Header
     ```
     X-MAI-Monetize-Key: <your-api-key>
     ```
4. **Data Format:** JSON
5. **Field Selection:**
   - `reqTimeSec` → timestamp
   - `reqHost` → host
   - `reqPath` → url/path
   - `reqMethod` → method
   - `statusCode` → status
   - `UA` → user_agent
   - `country` → country
   - `turnAroundTimeMSec` → latency_ms

---

### **AWS CloudFront**

Use CloudFront Real-Time Logs with Kinesis Firehose.

#### Setup

1. **Create Kinesis Data Stream**
2. **Configure CloudFront Real-Time Logs** → Point to Kinesis
3. **Set up Kinesis Firehose** → HTTP Endpoint Destination
   - **Endpoint URL:** `https://your-domain.com/api/logs/ingest`
   - **Access Key:** Use custom header `X-MAI-Monetize-Key`
4. **Transform logs** using Lambda if needed to match our schema

**Sample Lambda Transform:**
```javascript
exports.handler = async (event) => {
  const output = event.records.map(record => {
    const data = JSON.parse(Buffer.from(record.data, 'base64').toString());
    return {
      recordId: record.recordId,
      result: 'Ok',
      data: Buffer.from(JSON.stringify({
        timestamp: new Date(data['timestamp'] * 1000).toISOString(),
        host: data['c-ip'],
        url: data['cs-uri-stem'],
        method: data['cs-method'],
        status: data['sc-status'],
        user_agent: data['cs(User-Agent)'],
        country: data['c-country'],
        latency_ms: data['time-taken'] * 1000
      })).toString('base64')
    };
  });
  return { records: output };
};
```

---

### **Vercel**

Vercel doesn't natively support custom log shipping. Use:

1. **Vercel Log Drains** (Enterprise plan)
2. **Or** set up middleware to capture and forward logs

#### Vercel Middleware Example

```javascript
// middleware.js
export async function middleware(request) {
  const start = Date.now();
  const response = await next();
  const latency = Date.now() - start;

  // Send to analytics (fire-and-forget)
  fetch('https://your-domain.com/api/logs/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-MAI-Monetize-Key': process.env.MAI_ANALYTICS_KEY
    },
    body: JSON.stringify([{
      timestamp: new Date().toISOString(),
      host: request.headers.get('host'),
      url: request.url,
      method: request.method,
      status: response.status,
      user_agent: request.headers.get('user-agent'),
      country: request.geo?.country,
      city: request.geo?.city,
      latency_ms: latency
    }])
  }).catch(console.error);

  return response;
}
```

---

### **Self-Hosted / Custom Integration**

If you're using custom infrastructure (Nginx, Apache, etc.), you can:

#### Option 1: Log Parsing Script

Use a cron job to parse access logs and POST to our API:

```bash
#!/bin/bash
# parse-and-send-logs.sh

API_KEY="your-api-key-here"
API_URL="https://your-domain.com/api/logs/ingest"
LOG_FILE="/var/log/nginx/access.log"

# Parse nginx logs to JSON and send
tail -n 1000 "$LOG_FILE" | while read line; do
  # Parse log line (customize for your format)
  # ... parsing logic ...
  
  # Send batch every 100 lines
done | jq -s '.' | curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "X-MAI-Monetize-Key: $API_KEY" \
  -H "X-MAI-Monetize-Source: nginx" \
  -d @-
```

#### Option 2: Application Middleware

Capture logs directly in your app:

```javascript
// Express.js example
app.use(async (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      host: req.hostname,
      url: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      user_agent: req.get('user-agent'),
      latency_ms: Date.now() - start
    };

    // Send to analytics API (async, non-blocking)
    sendToAnalytics([logEntry]).catch(console.error);
  });

  next();
});
```

---

## 🧪 Testing Your Integration

### Step 1: Send Test Request

```bash
curl -X POST https://your-domain.com/api/logs/ingest \
  -H "Content-Type: application/json" \
  -H "X-MAI-Monetize-Key: publisher-1-ingest-hash" \
  -H "X-MAI-Monetize-Source: testing" \
  -d '[
    {
      "timestamp": "2025-11-13T12:00:00Z",
      "host": "example.com",
      "url": "https://example.com/test",
      "method": "GET",
      "status": 200,
      "user_agent": "TestBot/1.0",
      "country": "US",
      "latency_ms": 150
    }
  ]'
```

**Expected Response:**
```json
{
  "ingested": 1,
  "publisher_id": 1
}
```

### Step 2: Verify in Dashboard

1. **Sign in** to https://your-domain.com/demo/
2. **Go to Analytics** page
3. **Check stats** - should see 1 request
4. **View top agents** - should see "TestBot/1.0"

### Step 3: Check Aggregated Metrics

```bash
curl "https://your-domain.com/api/logs/summary?publisher_id=1&granularity=hour&limit=1"
```

Should return hourly rollup with your test data.

---

## 📈 Viewing Your Analytics

Once logs are flowing, view them in the dashboard:

### Analytics Page

- **Traffic Over Time** - Request volume charts
- **Bot Ratio** - Percentage of bot vs human traffic
- **Error Rate** - 4xx/5xx response tracking
- **Latency Trends** - Average response times
- **Top Agents** - Most active user agents
- **Top Countries** - Geographic distribution

### Log Sources

Manage your integrations:
- **Add Source** - Configure new CDN/platform
- **Track Status** - See last ingestion time
- **Pause/Resume** - Control data flow

### Anomaly Alerts

Set up webhook alerts for:
- **Bot Ratio** - Alert when bots exceed threshold (e.g., >30%)
- **Error Rate** - Alert when errors spike (e.g., >5%)
- **Traffic Drop** - Alert when traffic drops significantly
- **Latency Spike** - Alert when latency exceeds threshold

**Example Alert Setup:**
```json
{
  "metric": "bot_ratio",
  "threshold": 0.35,
  "window_minutes": 60,
  "notification_url": "https://your-webhook.com/alerts"
}
```

---

## 🔧 Advanced Configuration

### Batch Size Optimization

Our API accepts up to **500 records per request**. For optimal performance:
- **Recommended batch size:** 100-200 records
- **Batch interval:** 5-10 seconds
- **Retry logic:** Exponential backoff on failures

### Rate Limiting

No hard rate limits, but recommended:
- **Max 100 requests/minute** per publisher
- **Max 50,000 records/minute**

Exceeding these may result in temporary throttling.

### Data Retention

- **Raw logs:** Retained for 30 days (configurable via `PAGE_LOG_RETENTION_DAYS`)
- **Aggregated metrics:** Retained indefinitely
- **Alerts history:** 90 days

---

## 🐛 Troubleshooting

### Common Issues

**❌ 401 Unauthorized**
- Check API key is correct
- Verify key is the **hashed** version, not raw
- Ensure header is `X-MAI-Monetize-Key` (not `X-PaulBit-Key`)

**❌ 400 Bad Request**
- Check JSON is valid
- Verify Content-Type header
- Ensure timestamp is ISO 8601 format

**❌ 413 Payload Too Large**
- Reduce batch size to <500 records
- Split large batches into multiple requests

**❌ Data Not Appearing in Dashboard**
- Wait 15 minutes for hourly rollup
- Check `/api/logs/summary` endpoint directly
- Verify publisher_id matches your account

### Debug Mode

Check recent raw ingestion:

```bash
curl "https://your-domain.com/api/logs?publisher_id=1&limit=10"
```

This shows the last 10 ingested records before aggregation.

---

## 📚 API Reference

### Ingestion Endpoints

- `POST /api/logs/ingest` - Ingest raw logs
- `GET /api/logs/summary` - Get aggregated metrics
- `GET /api/logs/sources` - List configured sources
- `POST /api/logs/sources` - Add new source
- `GET /api/logs/alerts` - List alerts
- `POST /api/logs/alerts` - Create alert

### Example: Create Alert

```bash
curl -X POST https://your-domain.com/api/logs/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "publisher_id": 1,
    "metric": "error_rate",
    "threshold": 0.05,
    "window_minutes": 60,
    "notification_url": "https://hooks.slack.com/your-webhook",
    "enabled": true
  }'
```

---

## 🚀 Next Steps

1. **Set up your first integration** (Cloudflare recommended for ease)
2. **Send test data** to verify ingestion
3. **Configure alerts** for critical metrics
4. **Monitor your dashboard** for real-time insights

For support or advanced configurations, consult the main [README](README.md) or check the [API Reference](API_REFERENCE_CM_RTBSPEC.md).

---

**Last Updated:** November 13, 2025  
**Version:** 1.0
