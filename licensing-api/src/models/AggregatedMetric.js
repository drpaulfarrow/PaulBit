const db = require('../db');

async function upsertMany(rows = []) {
  if (!rows.length) return;

  const values = [];
  const params = [];
  let idx = 1;

  rows.forEach((row) => {
    values.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
    params.push(
      row.publisher_id,
      row.period_start,
      row.period_granularity || 'hour',
      row.total_requests,
      row.bot_requests || 0,
      row.unique_hosts || 0,
      row.avg_latency_ms,
      row.error_count || 0,
      row.top_agents ? JSON.stringify(row.top_agents) : null,
      row.top_countries ? JSON.stringify(row.top_countries) : null,
      row.created_at || new Date()
    );
  });

  const query = `
    INSERT INTO aggregated_metrics (
      publisher_id,
      period_start,
      period_granularity,
      total_requests,
      bot_requests,
      unique_hosts,
      avg_latency_ms,
      error_count,
      top_agents,
      top_countries,
      created_at
    ) VALUES ${values.join(', ')}
    ON CONFLICT (publisher_id, period_start, period_granularity) DO UPDATE
      SET total_requests = EXCLUDED.total_requests,
          bot_requests = EXCLUDED.bot_requests,
          unique_hosts = EXCLUDED.unique_hosts,
          avg_latency_ms = EXCLUDED.avg_latency_ms,
          error_count = EXCLUDED.error_count,
          top_agents = EXCLUDED.top_agents,
          top_countries = EXCLUDED.top_countries,
          created_at = NOW();
  `;

  await db.query(query, params);
}

async function listByPublisher(publisherId, { from, to, granularity = 'day', limit = 100 } = {}) {
  const params = [publisherId];
  let where = 'WHERE publisher_id = $1';

  if (from) {
    params.push(from);
    where += ` AND period_start >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND period_start <= $${params.length}`;
  }
  if (granularity) {
    params.push(granularity);
    where += ` AND period_granularity = $${params.length}`;
  }

  params.push(limit);

  const result = await db.query(
    `SELECT *
     FROM aggregated_metrics
     ${where}
     ORDER BY period_start DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows;
}

module.exports = {
  upsertMany,
  listByPublisher,
};


