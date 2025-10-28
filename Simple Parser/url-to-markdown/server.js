const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;
const net = require('net');
const { fetchPage } = require('./lib/fetchPage');
const { htmlToMarkdown } = require('./lib/htmlToMarkdown');
const { extractMetadata } = require('./lib/extractMetadata');

const LOG_PATH = path.join(__dirname, 'logs', 'app.log');
function log(obj) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...obj }) + '\n';
  console.log(line);
  try { fs.appendFileSync(LOG_PATH, line); } catch (e) { /* ignore */ }
}

const app = express();
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
// Gracefully handle malformed JSON bodies
app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    log({ level: 'warn', msg: 'Invalid JSON body', error: err.message });
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  next(err);
});

// CORS: restrict via environment variable or allow none by default
const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));

// Rate limiting: 30 req/min per IP
app.use(rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false }));

function isLocalIP(ip) {
  if (net.isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    if (parts[0] === 10) return true; // 10.0.0.0/8
    if (parts[0] === 127) return true; // 127.0.0.0/8
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
    if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local
    if (parts[0] === 100 && (parts[1] & 0b11000000) === 64) return true; // 100.64.0.0/10
  }
  if (net.isIP(ip) === 6) {
    // IPv6 local checks
    if (ip === '::1') return true;
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique local
  }
  return false;
}

async function isPrivateHostname(hostname) {
  try {
    const records = await dns.lookup(hostname, { all: true });
    for (const r of records) {
      if (isLocalIP(r.address)) return true;
    }
  } catch (err) {
    // treat lookup failure conservatively as non-private
    return false;
  }
  return false;
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.post('/to-markdown', async (req, res) => {
  const start = Date.now();
  const { url, extractMainContent = true, includeMetadata = true } = req.body || {};

  if (!url || typeof url !== 'string') {
    log({ level: 'warn', url, msg: 'Missing or invalid URL' });
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  let parsed;
  try {
    parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('invalid protocol');
  } catch (err) {
    log({ level: 'warn', url, msg: 'URL parse failed' });
    return res.status(400).json({ error: 'Missing or invalid URL' });
  }

  // SSRF protection: disallow localhost/private IPs
  try {
    const isPrivate = await isPrivateHostname(parsed.hostname);
    if (isPrivate) {
      log({ level: 'warn', url, msg: 'Rejected private hostname' });
      return res.status(400).json({ error: 'URL resolves to a private or disallowed address' });
    }
  } catch (err) {
    // proceed on DNS lookup errors but log
    log({ level: 'warn', url, msg: 'DNS lookup error', error: err.message });
  }

  try {
    const fetchStart = Date.now();
    const page = await fetchPage(url);
    const fetchTime = Date.now() - fetchStart;

    const conversionStart = Date.now();
    const { markdown, length } = await htmlToMarkdown(page.html, { url, extractMainContent });
    const conversionTime = Date.now() - conversionStart;

    let metadata = null;
    if (includeMetadata) {
      metadata = extractMetadata(page.html, { url });
    }

    const totalTime = Date.now() - start;

    const result = {
      url,
      status: 200,
      title: metadata && metadata.title ? metadata.title : (page.contentType || null),
      contentType: page.contentType || 'unknown',
      markdown,
      length,
      metadata,
      processingTimeMs: totalTime,
      details: { fetchTimeMs: fetchTime, conversionTimeMs: conversionTime }
    };

    log({ level: 'info', url, fetchMs: fetchTime, outLength: length });
    res.json(result);
  } catch (err) {
    log({ level: 'error', url, error: err.message, httpStatus: err.httpStatus });
    if (err.isFetchError) {
      // Map 404/403 to 404 per spec (not found or blocked)
      if (err.httpStatus === 404 || err.httpStatus === 403) {
        return res.status(404).json({ error: 'URL not found or blocked' });
      }
      return res.status(502).json({ error: 'Upstream fetch failure', details: err.message });
    }
    return res.status(500).json({ error: 'Internal conversion error', details: err.message });
  }
});

// Export app for testing; only start server if run directly
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`url-to-markdown listening on ${PORT}`);
  });
}
