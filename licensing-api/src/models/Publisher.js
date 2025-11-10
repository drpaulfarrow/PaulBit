const crypto = require('crypto');
const db = require('../db');

const HASH_ALGO = 'sha256';

function hashApiKey(rawKey) {
  return crypto.createHash(HASH_ALGO).update(rawKey, 'utf8').digest('hex');
}

async function findById(id) {
  const result = await db.query(
    `SELECT p.*, plans.name AS plan_name
     FROM publishers p
     LEFT JOIN plans ON plans.id = p.plan_id
     WHERE p.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function findByHostname(hostname) {
  const result = await db.query(
    `SELECT p.*, plans.name AS plan_name
     FROM publishers p
     LEFT JOIN plans ON plans.id = p.plan_id
     WHERE LOWER(p.hostname) = LOWER($1)`,
    [hostname]
  );
  return result.rows[0] || null;
}

async function findByApiKey(rawKey) {
  if (!rawKey) return null;
  const hashed = hashApiKey(rawKey);
  const result = await db.query(
    `SELECT p.*, plans.name AS plan_name
     FROM publishers p
     LEFT JOIN plans ON plans.id = p.plan_id
     WHERE p.api_key_hash = $1`,
    [hashed]
  );
  return result.rows[0] || null;
}

async function listAll() {
  const result = await db.query(
    `SELECT p.*, plans.name AS plan_name
     FROM publishers p
     LEFT JOIN plans ON plans.id = p.plan_id
     ORDER BY p.id ASC`
  );
  return result.rows;
}

async function rotateApiKey(publisherId, newRawKey) {
  const hashed = hashApiKey(newRawKey);
  const result = await db.query(
    `UPDATE publishers
     SET api_key_hash = $1
     WHERE id = $2
     RETURNING *`,
    [hashed, publisherId]
  );
  return { publisher: result.rows[0], apiKeyHash: hashed };
}

module.exports = {
  hashApiKey,
  findById,
  findByHostname,
  findByApiKey,
  listAll,
  rotateApiKey,
};


