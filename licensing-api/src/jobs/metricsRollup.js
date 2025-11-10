const PageLog = require('../models/PageLog');
const AggregatedMetric = require('../models/AggregatedMetric');

const HOURLY_INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes process last hour
const DAILY_INTERVAL_MS = 60 * 60 * 1000; // every hour process last day
const RAW_RETENTION_DAYS = parseInt(process.env.PAGE_LOG_RETENTION_DAYS || '30', 10);

function floorToHour(date) {
  const floored = new Date(date);
  floored.setMinutes(0, 0, 0);
  return floored;
}

function floorToDay(date) {
  const floored = new Date(date);
  floored.setHours(0, 0, 0, 0);
  return floored;
}

async function rollupHour() {
  const now = new Date();
  const windowEnd = floorToHour(now);
  const windowStart = new Date(windowEnd.getTime() - 60 * 60 * 1000);

  const rows = await PageLog.aggregateWindow({
    from: windowStart,
    to: windowEnd,
    granularity: 'hour',
  });

  if (!rows.length) {
    return;
  }

  const enriched = [];
  for (const row of rows) {
    const topAgentsRaw = await PageLog.fetchTopAgents({
      publisherId: row.publisher_id,
      from: windowStart,
      to: windowEnd,
    });
    const topCountriesRaw = await PageLog.fetchTopCountries({
      publisherId: row.publisher_id,
      from: windowStart,
      to: windowEnd,
    });
    const topAgents = topAgentsRaw.map((item) => ({
      agent: item.agent,
      count: Number(item.count || 0),
    }));
    const topCountries = topCountriesRaw.map((item) => ({
      country: item.country,
      count: Number(item.count || 0),
    }));

    enriched.push({
      publisher_id: row.publisher_id,
      period_start: row.period_start,
      period_granularity: 'hour',
      total_requests: Number(row.total_requests),
      bot_requests: Number(row.bot_requests || 0),
      unique_hosts: Number(row.unique_hosts || 0),
      avg_latency_ms: row.avg_latency_ms ? Number(row.avg_latency_ms) : null,
      error_count: Number(row.error_count || 0),
      top_agents: topAgents,
      top_countries: topCountries,
    });
  }

  await AggregatedMetric.upsertMany(enriched);
}

async function rollupDay() {
  const now = new Date();
  const windowEnd = floorToDay(now);
  const windowStart = new Date(windowEnd.getTime() - 24 * 60 * 60 * 1000);

  const rows = await PageLog.aggregateWindow({
    from: windowStart,
    to: windowEnd,
    granularity: 'day',
  });

  if (!rows.length) {
    return;
  }

  const enriched = [];
  for (const row of rows) {
    const topAgentsRaw = await PageLog.fetchTopAgents({
      publisherId: row.publisher_id,
      from: windowStart,
      to: windowEnd,
    });
    const topCountriesRaw = await PageLog.fetchTopCountries({
      publisherId: row.publisher_id,
      from: windowStart,
      to: windowEnd,
    });
    const topAgents = topAgentsRaw.map((item) => ({
      agent: item.agent,
      count: Number(item.count || 0),
    }));
    const topCountries = topCountriesRaw.map((item) => ({
      country: item.country,
      count: Number(item.count || 0),
    }));

    enriched.push({
      publisher_id: row.publisher_id,
      period_start: row.period_start,
      period_granularity: 'day',
      total_requests: Number(row.total_requests),
      bot_requests: Number(row.bot_requests || 0),
      unique_hosts: Number(row.unique_hosts || 0),
      avg_latency_ms: row.avg_latency_ms ? Number(row.avg_latency_ms) : null,
      error_count: Number(row.error_count || 0),
      top_agents: topAgents,
      top_countries: topCountries,
    });
  }

  await AggregatedMetric.upsertMany(enriched);
}

async function purgeRawLogs() {
  if (!RAW_RETENTION_DAYS || RAW_RETENTION_DAYS <= 0) {
    return;
  }
  await PageLog.deleteOlderThan(RAW_RETENTION_DAYS);
}

function schedule() {
  setInterval(() => {
    rollupHour().catch((error) => {
      console.error('Hourly rollup failed:', error);
    });
  }, HOURLY_INTERVAL_MS);

  setInterval(() => {
    rollupDay().catch((error) => {
      console.error('Daily rollup failed:', error);
    });
  }, DAILY_INTERVAL_MS);

  // Run daily purge once a day
  setInterval(() => {
    purgeRawLogs().catch((error) => {
      console.error('Raw log purge failed:', error);
    });
  }, 24 * 60 * 60 * 1000);

  // Kick off initial runs shortly after startup
  setTimeout(() => {
    rollupHour().catch(console.error);
    rollupDay().catch(console.error);
  }, 30 * 1000);
}

module.exports = {
  schedule,
  rollupHour,
  rollupDay,
  purgeRawLogs,
};

