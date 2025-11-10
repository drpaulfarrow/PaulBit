const db = require('../db');

function toTimestamp(value) {
  return value instanceof Date ? value : new Date(value);
}

async function insertBatch(logs = []) {
  if (!logs.length) return;

  const columns = [
    'publisher_id',
    '"timestamp"',
    'host',
    'url',
    'method',
    'status',
    'agent',
    'agent_type',
    'country',
    'city',
    'latency_ms',
    'referer',
    'source',
    'raw_payload'
  ];

  const values = [];
  const params = [];
  let idx = 1;

  logs.forEach((log) => {
    values.push(`(${columns.map(() => `$${idx++}`).join(', ')})`);
    params.push(
      log.publisherId,
      toTimestamp(log.timestamp),
      log.host || null,
      log.url || null,
      log.method || null,
      log.status || null,
      log.agent || null,
      log.agentType || 'unknown',
      log.country || null,
      log.city || null,
      log.latencyMs !== undefined ? Number(log.latencyMs) : null,
      log.referer || null,
      log.source || 'unknown',
      log.rawPayload ? JSON.stringify(log.rawPayload) : null
    );
  });

  const query = `
    INSERT INTO page_logs (
      ${columns.join(', ')}
    )
    VALUES ${values.join(', ')}
  `;

  await db.query(query, params);
}

async function aggregateWindow({ from, to, granularity = 'hour' }) {
  const bucketExpr = granularity === 'day' ? 'day' : 'hour';

  const result = await db.query(
    `
    SELECT
      publisher_id,
      date_trunc($3, "timestamp") AS period_start,
      COUNT(*) AS total_requests,
      SUM(CASE WHEN agent_type = 'bot' THEN 1 ELSE 0 END) AS bot_requests,
      COUNT(DISTINCT host) AS unique_hosts,
      AVG(latency_ms) AS avg_latency_ms,
      SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS error_count
    FROM page_logs
    WHERE "timestamp" >= $1
      AND "timestamp" < $2
    GROUP BY publisher_id, period_start
    `,
    [toTimestamp(from), toTimestamp(to), bucketExpr]
  );

  return result.rows.map((row) => ({
    ...row,
    period_granularity: granularity,
  }));
}

async function fetchTopAgents({ publisherId, from, to, limit = 5 }) {
  const result = await db.query(
    `
    SELECT agent, COUNT(*) AS count
    FROM page_logs
    WHERE publisher_id = $1
      AND "timestamp" >= $2
      AND "timestamp" < $3
      AND agent IS NOT NULL
    GROUP BY agent
    ORDER BY count DESC
    LIMIT $4
    `,
    [publisherId, toTimestamp(from), toTimestamp(to), limit]
  );
  return result.rows;
}

async function fetchTopCountries({ publisherId, from, to, limit = 5 }) {
  const result = await db.query(
    `
    SELECT country, COUNT(*) AS count
    FROM page_logs
    WHERE publisher_id = $1
      AND "timestamp" >= $2
      AND "timestamp" < $3
      AND country IS NOT NULL
    GROUP BY country
    ORDER BY count DESC
    LIMIT $4
    `,
    [publisherId, toTimestamp(from), toTimestamp(to), limit]
  );
  return result.rows;
}

async function deleteOlderThan(days) {
  await db.query(
    `DELETE FROM page_logs
     WHERE "timestamp" < NOW() - ($1::INTERVAL)`,
    [`${days} days`]
  );
}

module.exports = {
  insertBatch,
  aggregateWindow,
  fetchTopAgents,
  fetchTopCountries,
  deleteOlderThan,
};

