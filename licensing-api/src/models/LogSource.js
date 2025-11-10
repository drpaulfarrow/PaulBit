const db = require('../db');

async function listByPublisher(publisherId) {
  const result = await db.query(
    `SELECT *
     FROM log_sources
     WHERE publisher_id = $1
     ORDER BY created_at DESC`,
    [publisherId]
  );
  return result.rows;
}

async function create({ publisherId, platform, apiKey = null, serviceId = null, status = 'active' }) {
  const result = await db.query(
    `INSERT INTO log_sources (publisher_id, platform, api_key, service_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [publisherId, platform, apiKey, serviceId, status]
  );
  return result.rows[0];
}

async function updateStatus(id, status) {
  const result = await db.query(
    `UPDATE log_sources
     SET status = $2
     WHERE id = $1
     RETURNING *`,
    [id, status]
  );
  return result.rows[0] || null;
}

async function touchLastIngested(id) {
  await db.query(
    `UPDATE log_sources
     SET last_ingested_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  listByPublisher,
  create,
  updateStatus,
  touchLastIngested,
};


