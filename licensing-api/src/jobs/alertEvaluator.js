const axios = require('axios');
const Alert = require('../models/Alert');
const db = require('../db');

const INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

async function fetchCounts(publisherId, windowMinutes) {
  const result = await db.query(
    `
    SELECT
      SUM(CASE WHEN agent_type = 'bot' THEN 1 ELSE 0 END) AS bot_requests,
      SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) AS error_requests,
      COUNT(*) AS total_requests,
      AVG(latency_ms) AS avg_latency_ms
    FROM page_logs
    WHERE publisher_id = $1
      AND "timestamp" >= NOW() - ($2::INTERVAL)
    `,
    [publisherId, `${windowMinutes} minutes`]
  );
  return result.rows[0] || { bot_requests: 0, error_requests: 0, total_requests: 0, avg_latency_ms: null };
}

async function fetchCountsForWindow(publisherId, windowMinutes, offsetMultiplier = 1) {
  const result = await db.query(
    `
    SELECT COUNT(*) AS total_requests
    FROM page_logs
    WHERE publisher_id = $1
      AND "timestamp" >= NOW() - ($2::INTERVAL) * $3
      AND "timestamp" < NOW() - ($2::INTERVAL) * ($3 - 1)
    `,
    [publisherId, `${windowMinutes} minutes`, offsetMultiplier]
  );
  return Number(result.rows[0]?.total_requests || 0);
}

async function evaluateAlert(alert) {
  const { publisher_id, metric, threshold, window_minutes, notification_url } = alert;
  const windowMinutes = window_minutes || 60;

  const counts = await fetchCounts(publisher_id, windowMinutes);
  const total = Number(counts.total_requests || 0);

  let value = 0;
  let triggered = false;

  switch (metric) {
    case 'bot_ratio': {
      if (total === 0) return null;
      value = Number(counts.bot_requests || 0) / total;
      triggered = value >= threshold;
      break;
    }
    case 'error_rate': {
      if (total === 0) return null;
      value = Number(counts.error_requests || 0) / total;
      triggered = value >= threshold;
      break;
    }
    case 'latency_spike': {
      if (counts.avg_latency_ms === null) return null;
      value = Number(counts.avg_latency_ms);
      triggered = value >= threshold;
      break;
    }
    case 'traffic_drop': {
      const current = total;
      const previous = await fetchCountsForWindow(publisher_id, windowMinutes, 2);
      if (previous === 0) return null;
      value = current / previous;
      triggered = value <= threshold;
      break;
    }
    default:
      console.warn(`Unknown alert metric: ${metric}`);
      return null;
  }

  if (!triggered || !notification_url) {
    return { triggered: false, value };
  }

  try {
    await axios.post(notification_url, {
      alert_id: alert.id,
      publisher_id: publisher_id,
      metric,
      window_minutes: windowMinutes,
      threshold,
      value,
      triggered_at: new Date().toISOString(),
    }, {
      timeout: 5000,
    });
    console.log(`Alert ${alert.id} dispatched (metric=${metric}, value=${value})`);
  } catch (error) {
    console.error(`Failed to deliver alert ${alert.id}:`, error.message);
  }

  return { triggered: true, value };
}

function schedule() {
  setInterval(async () => {
    try {
      const alerts = await Alert.listEnabled();
      await Promise.all(alerts.map(evaluateAlert));
    } catch (error) {
      console.error('Alert evaluation failed:', error);
    }
  }, INTERVAL_MS);
}

module.exports = {
  schedule,
  evaluateAlert,
};


