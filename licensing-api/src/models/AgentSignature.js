const db = require('../db');

async function listAll() {
  const result = await db.query(
    'SELECT * FROM agent_signatures ORDER BY category ASC, name ASC'
  );
  return result.rows;
}

async function upsert({ name, regexPattern, category = 'ai' }) {
  const result = await db.query(
    `INSERT INTO agent_signatures (name, regex_pattern, category)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE
       SET regex_pattern = EXCLUDED.regex_pattern,
           category = EXCLUDED.category,
           last_updated = NOW()
     RETURNING *`,
    [name, regexPattern, category]
  );
  return result.rows[0];
}

module.exports = {
  listAll,
  upsert,
};


