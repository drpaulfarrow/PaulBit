const db = require('../db');

async function create({ publisherId, clientId, status = 'pending', maxRps = 10, expiresAt = null }) {
  const result = await db.query(
    `INSERT INTO licenses (publisher_id, client_id, status, max_rps, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (publisher_id, client_id) DO UPDATE
       SET status = EXCLUDED.status,
           max_rps = EXCLUDED.max_rps,
           expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [publisherId, clientId, status, maxRps, expiresAt]
  );
  return result.rows[0];
}

async function findById(id) {
  const result = await db.query(
    `SELECT l.*, p.name AS publisher_name, c.name AS client_name
     FROM licenses l
     JOIN publishers p ON p.id = l.publisher_id
     JOIN clients c ON c.id = l.client_id
     WHERE l.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function listByPublisher(publisherId, { status } = {}) {
  const params = [publisherId];
  let where = 'WHERE l.publisher_id = $1';
  if (status) {
    params.push(status);
    where += ` AND l.status = $${params.length}`;
  }

  const result = await db.query(
    `SELECT l.*, c.name AS client_name
     FROM licenses l
     JOIN clients c ON c.id = l.client_id
     ${where}
     ORDER BY l.created_at DESC`,
    params
  );
  return result.rows;
}

async function updateStatus(id, status) {
  const result = await db.query(
    `UPDATE licenses
     SET status = $2
     WHERE id = $1
     RETURNING *`,
    [id, status]
  );
  return result.rows[0] || null;
}

module.exports = {
  create,
  findById,
  listByPublisher,
  updateStatus,
};


