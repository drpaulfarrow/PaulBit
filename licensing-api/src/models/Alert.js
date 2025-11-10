const db = require('../db');

async function listByPublisher(publisherId) {
  const result = await db.query(
    `SELECT *
     FROM alerts
     WHERE publisher_id = $1
     ORDER BY created_at DESC`,
    [publisherId]
  );
  return result.rows;
}

async function listEnabled() {
  const result = await db.query(
    `SELECT *
     FROM alerts
     WHERE enabled = true`
  );
  return result.rows;
}

async function create({ publisherId, metric, threshold, windowMinutes = 60, notificationUrl = null, enabled = true }) {
  const result = await db.query(
    `INSERT INTO alerts (publisher_id, metric, threshold, window_minutes, notification_url, enabled)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [publisherId, metric, threshold, windowMinutes, notificationUrl, enabled]
  );
  return result.rows[0];
}

async function update(id, data = {}) {
  const fields = [];
  const values = [];
  let idx = 1;

  Object.entries(data).forEach(([key, value]) => {
    fields.push(`${key} = $${idx++}`);
    values.push(value);
  });

  if (!fields.length) {
    const result = await db.query('SELECT * FROM alerts WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  values.push(id);
  const result = await db.query(
    `UPDATE alerts
     SET ${fields.join(', ')}, created_at = created_at
     WHERE id = $${values.length}
     RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

module.exports = {
  listByPublisher,
  listEnabled,
  create,
  update,
};

