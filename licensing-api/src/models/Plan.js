const db = require('../db');

async function listAll() {
  const result = await db.query(
    'SELECT * FROM plans ORDER BY price_per_fetch_micro ASC'
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query('SELECT * FROM plans WHERE id = $1', [id]);
  return result.rows[0] || null;
}

module.exports = {
  listAll,
  findById,
};


