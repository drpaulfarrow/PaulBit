const crypto = require('crypto');
const db = require('../db');

function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

async function storeIssuedToken({
  jti,
  clientId,
  publisherId,
  url,
  purpose = 'inference',
  expiresAt,
  licenseId = null,
  tokenValue,
}) {
  const tokenHash = hashToken(tokenValue);
  const expires =
    expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  const result = await db.query(
    `INSERT INTO tokens (jti, client_id, publisher_id, url_pattern, purpose, expires_at, revoked, license_id, token_value_hash, issued_at)
     VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, NOW())
     RETURNING *`,
    [jti, clientId, publisherId, url, purpose, expires, licenseId, tokenHash]
  );
  return result.rows[0];
}

async function markRevoked(jti) {
  await db.query(
    `UPDATE tokens
     SET revoked = true
     WHERE jti = $1`,
    [jti]
  );
}

async function findByHash(hash) {
  const result = await db.query(
    `SELECT * FROM tokens
     WHERE token_value_hash = $1`,
    [hash]
  );
  return result.rows[0] || null;
}

async function listActiveByLicense(licenseId) {
  const result = await db.query(
    `SELECT *
     FROM tokens
     WHERE license_id = $1
       AND revoked = false
       AND expires_at > NOW()
     ORDER BY expires_at DESC`,
    [licenseId]
  );
  return result.rows;
}

module.exports = {
  hashToken,
  storeIssuedToken,
  markRevoked,
  findByHash,
  listActiveByLicense,
};

