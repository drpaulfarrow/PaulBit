const express = require('express');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { detectBot, getRateLimitKey, checkRateLimit } = require('./detector');
const { getOriginUrl } = require('./router');

const app = express();
const PORT = process.env.PORT || 3001;
const LICENSING_API_URL = process.env.LICENSING_API_URL || 'http://licensing-api:3000';

// Middleware to parse JSON
app.use(express.json());

// Main request handler
app.all('*', async (req, res) => {
  try {
    const ua = req.get('User-Agent') || '';
    const host = req.get('Host') || req.hostname;
    const ip = req.get('X-Real-IP') || req.ip;
    const originalUrl = req.originalUrl;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${originalUrl} - UA: ${ua.substring(0, 50)}... - IP: ${ip}`);

    // Detect if request is from a bot
    const isBot = detectBot(ua);

    // If human, proxy directly to origin
    if (!isBot) {
      console.log(`  → Human traffic detected, proxying to origin`);
      return proxyToOrigin(req, res, host);
    }

    console.log(`  → Bot traffic detected: ${ua}`);

    // Check for token in query params or header
    const token = req.query.token || req.get('X-Agent-Token');

    // Bot with token - verify it
    if (token) {
      console.log(`  → Token provided, verifying...`);
      const verification = await verifyToken(token, req, host);
      
      if (verification.valid) {
        console.log(`  → Token valid, proxying to origin with metering`);
        return proxyToOrigin(req, res, host, { meterAs: 'bot', verification });
      } else {
        console.log(`  → Token invalid: ${verification.reason}`);
        return res.status(403).json({
          error: 'Invalid or expired token',
          reason: verification.reason
        });
      }
    }

    // Bot without token - check rate limit
    const rateLimitKey = getRateLimitKey(ip, ua);
    const rateLimitOk = await checkRateLimit(rateLimitKey);
    
    if (!rateLimitOk) {
      console.log(`  → Rate limit exceeded`);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please obtain a valid token.'
      });
    }

    // Bot without token - redirect to authorization
    const absoluteUrl = `${req.protocol}://${host}${originalUrl}`;
    const redirectUrl = `${LICENSING_API_URL}/authorize?url=${encodeURIComponent(absoluteUrl)}&ua=${encodeURIComponent(ua)}`;
    
    console.log(`  → Redirecting to licensing gateway: ${redirectUrl}`);
    return res.redirect(302, redirectUrl);

  } catch (error) {
    console.error('Error in edge worker:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token with licensing API
async function verifyToken(token, req, host) {
  try {
    const absoluteUrl = `${req.protocol}://${host}${req.originalUrl.split('?')[0]}`;
    const response = await axios.get(`${LICENSING_API_URL}/verify`, {
      params: { token, url: absoluteUrl },
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('Token verification error:', error.message);
    return { valid: false, reason: 'verification_failed' };
  }
}

// Proxy request to origin publisher
function proxyToOrigin(req, res, host, options = {}) {
  const originUrl = getOriginUrl(host);
  
  if (!originUrl) {
    return res.status(404).json({ error: 'Unknown publisher host' });
  }

  // If metering is enabled, record the access
  if (options.meterAs === 'bot' && options.verification) {
    recordUsage(req, host, options.verification).catch(err => {
      console.error('Failed to record usage:', err.message);
    });
  }

  // Create proxy middleware and handle this request
  const proxy = createProxyMiddleware({
    target: originUrl,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
      // Add custom header to indicate licensed bot access
      if (options.meterAs === 'bot') {
        proxyReq.setHeader('X-Licensed-Bot', 'true');
      }
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      res.status(502).json({ error: 'Bad gateway' });
    }
  });

  proxy(req, res);
}

// Record usage event to licensing API
async function recordUsage(req, host, verification) {
  try {
    await axios.post(`${LICENSING_API_URL}/usage`, {
      publisher_id: verification.publisher_id,
      client_id: verification.client_id,
      url: `${req.protocol}://${host}${req.originalUrl.split('?')[0]}`,
      agent_ua: req.get('User-Agent'),
      purpose: verification.purpose,
      token_id: verification.jti
    }, { timeout: 3000 });
  } catch (error) {
    throw new Error(`Usage recording failed: ${error.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`Edge Worker listening on port ${PORT}`);
  console.log(`Licensing API: ${LICENSING_API_URL}`);
});
