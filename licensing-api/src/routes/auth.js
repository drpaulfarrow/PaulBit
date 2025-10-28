const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const redis = require('../redis');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_ISSUER = process.env.JWT_ISSUER || 'gatehouse-licensing';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'gatehouse-edge';

// GET /authorize - Display authorization page
router.get('/authorize', async (req, res) => {
  const { url, ua } = req.query;
  
  if (!url) {
    return res.status(400).send('<h1>Error</h1><p>Missing required parameter: url</p>');
  }

  // Parse URL to get publisher
  let hostname;
  try {
    const urlObj = new URL(url);
    hostname = urlObj.hostname;
  } catch (e) {
    hostname = 'unknown';
  }

  // Get publisher info
  const publisherResult = await db.query(
    'SELECT id, name, hostname FROM publishers WHERE hostname = $1',
    [hostname]
  );
  
  const publisher = publisherResult.rows[0] || { name: hostname, hostname };

  // HTML response with authorization info
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Content Licensing Gateway</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 { color: #333; }
        .info {
          background: #e3f2fd;
          padding: 15px;
          border-radius: 4px;
          margin: 20px 0;
        }
        .code {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          font-family: monospace;
          overflow-x: auto;
        }
        button {
          background: #2196F3;
          color: white;
          border: none;
          padding: 12px 24px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        button:hover {
          background: #1976D2;
        }
        .details {
          margin: 20px 0;
          font-size: 14px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 AI Bot Access Request</h1>
        
        <div class="info">
          <strong>Publisher:</strong> ${publisher.name || hostname}<br>
          <strong>Requested URL:</strong> ${url}<br>
          <strong>Your User-Agent:</strong> ${ua || 'Unknown'}
        </div>

        <p>This content requires a license for AI bot access. To proceed:</p>
        
        <ol>
          <li>Request a temporary access token using the API below</li>
          <li>Include the token in your request (query param or header)</li>
          <li>Access will be granted for the duration of the token validity</li>
        </ol>

        <h3>Request Token via API:</h3>
        <div class="code">
curl -X POST ${req.protocol}://${req.get('host')}/token \\
  -H 'Content-Type: application/json' \\
  -d '{
    "url": "${url}",
    "ua": "${ua || 'YourBot/1.0'}",
    "purpose": "inference"
  }'
        </div>

        <h3>Then access with token:</h3>
        <div class="code">
curl -H "User-Agent: ${ua || 'YourBot/1.0'}" \\
  "${url}?token=YOUR_TOKEN_HERE"
        </div>

        <div class="details">
          <strong>Pricing:</strong> $0.002 per fetch (example rate)<br>
          <strong>Token TTL:</strong> 10 minutes<br>
          <strong>Rate Limit:</strong> 2 requests/second per token
        </div>

        <p><small>This is an educational MVP demonstrating content licensing for AI bots.</small></p>
      </div>
    </body>
    </html>
  `);
});

// POST /token - Issue a new access token
router.post('/token', async (req, res) => {
  try {
    const { url, ua, purpose = 'inference', client_id = null } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'Missing required field: url' });
    }

    // Parse URL to get publisher
    let hostname;
    try {
      const urlObj = new URL(url);
      hostname = urlObj.hostname;
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Get publisher and policy (latest version)
    const publisherResult = await db.query(
      `SELECT p.id, p.name, p.hostname, pol.policy_json 
       FROM publishers p 
       LEFT JOIN policies pol ON p.id = pol.publisher_id 
       WHERE p.hostname = $1 
       ORDER BY pol.created_at DESC 
       LIMIT 1`,
      [hostname]
    );

    if (publisherResult.rows.length === 0) {
      return res.status(404).json({ error: 'Publisher not found' });
    }

    const publisher = publisherResult.rows[0];
    const policy = publisher.policy_json || { default: { allow: true } };

    // Check policy rules
    const allowed = checkPolicy(policy, ua, purpose);
    
    if (!allowed.allow) {
      return res.status(403).json({ 
        error: 'Access denied by publisher policy',
        reason: allowed.reason 
      });
    }

    // Generate JWT token
    const jti = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    const ttl = allowed.token_ttl_seconds || 600; // 10 minutes default
    const exp = now + ttl;

    const tokenPayload = {
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      sub: client_id || 'anonymous',
      publisher_id: publisher.id,
      publisher: hostname,
      url: url,
      purpose: purpose,
      jti: jti,
      iat: now,
      exp: exp
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET);

    // Add to Redis allowlist
    await redis.addTokenToAllowlist(jti, ttl);

    // Store token in database
    await db.query(
      `INSERT INTO tokens (jti, client_id, publisher_id, url_pattern, purpose, expires_at, revoked)
       VALUES ($1, $2, $3, $4, $5, to_timestamp($6), false)`,
      [jti, client_id, publisher.id, url, purpose, exp]
    );

    res.json({
      token: token,
      expires_at: new Date(exp * 1000).toISOString(),
      expires_in: ttl,
      publisher: hostname,
      purpose: purpose,
      cost_per_fetch: allowed.price_per_fetch || 0.002
    });

  } catch (error) {
    console.error('Token issuance error:', error);
    res.status(500).json({ error: 'Failed to issue token', message: error.message });
  }
});

// GET /verify - Verify a token
router.get('/verify', async (req, res) => {
  try {
    const { token, url } = req.query;

    if (!token) {
      return res.status(400).json({ valid: false, reason: 'missing_token' });
    }

    // Verify JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, {
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE
      });
    } catch (error) {
      return res.json({ 
        valid: false, 
        reason: error.name === 'TokenExpiredError' ? 'expired' : 'invalid_signature' 
      });
    }

    // Check if token is in allowlist (not revoked)
    const inAllowlist = await redis.isTokenInAllowlist(decoded.jti);
    if (!inAllowlist) {
      return res.json({ valid: false, reason: 'revoked' });
    }

    // Check URL match if provided
    if (url && decoded.url !== url) {
      return res.json({ valid: false, reason: 'url_mismatch' });
    }

    // Token is valid
    res.json({
      valid: true,
      publisher_id: decoded.publisher_id,
      client_id: decoded.sub,
      purpose: decoded.purpose,
      jti: decoded.jti,
      expires_at: new Date(decoded.exp * 1000).toISOString()
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, reason: 'verification_error' });
  }
});

// Helper function to check policy
function checkPolicy(policy, ua, purpose) {
  // Default policy
  let result = { 
    allow: policy.default?.allow || false, 
    reason: 'default_deny',
    token_ttl_seconds: 600,
    price_per_fetch: 0.002
  };

  // Check rules
  if (policy.rules && Array.isArray(policy.rules)) {
    for (const rule of policy.rules) {
      const agentMatch = rule.agent === '*' || ua.includes(rule.agent);
      const purposeMatch = !rule.purpose || rule.purpose.includes(purpose);

      if (agentMatch && purposeMatch) {
        result.allow = rule.allow;
        result.reason = rule.allow ? 'policy_match' : 'policy_deny';
        result.token_ttl_seconds = rule.token_ttl_seconds || 600;
        result.price_per_fetch = rule.price_per_fetch || 0.002;
        result.max_rps = rule.max_rps;
        break;
      }
    }
  }

  return result;
}

module.exports = router;
