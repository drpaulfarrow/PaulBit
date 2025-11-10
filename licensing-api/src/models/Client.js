const db = require('../db');

async function findById(id) {
  const result = await db.query(
    `SELECT c.*, plans.name AS plan_name
     FROM clients c
     LEFT JOIN plans ON plans.id = c.plan_id
     WHERE c.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function findByApiKeyHash(hash) {
  if (!hash) return null;
  const result = await db.query(
    `SELECT c.*, plans.name AS plan_name
     FROM clients c
     LEFT JOIN plans ON plans.id = c.plan_id
     WHERE c.api_key_hash = $1`,
    [hash]
  );
  return result.rows[0] || null;
}

async function listAll() {
  const result = await db.query(
    `SELECT c.*, plans.name AS plan_name
     FROM clients c
     LEFT JOIN plans ON plans.id = c.plan_id
     ORDER BY c.id ASC`
  );
  return result.rows;
}

module.exports = {
  findById,
  findByApiKeyHash,
  listAll,
};


