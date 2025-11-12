const express = require('express');
const db = require('../db');
const Publisher = require('../models/Publisher');
const PageLog = require('../models/PageLog');
const LogSource = require('../models/LogSource');
const AggregatedMetric = require('../models/AggregatedMetric');
const Alert = require('../models/Alert');
const agentClassifier = require('../services/agentClassifier');

const router = express.Router();
const MAX_BATCH_SIZE = parseInt(process.env.LOG_INGEST_MAX_BATCH || '500', 10);

/**
 * POST /api/logs/ingest
 * Telemetry ingestion endpoint (NDJSON or JSON array)
 */
router.post('/ingest', async (req, res) => {
  try {
    const ingestKey = req.header('X-MAI-Monetize-Key');
    if (!ingestKey) {
      return res.status(401).json({ error: 'Missing ingestion key header (X-MAI-Monetize-Key)' });
    }

    const publisher = await Publisher.findByApiKey(ingestKey);
    if (!publisher) {
      return res.status(401).json({ error: 'Invalid ingestion key' });
    }

    let records = req.body;
    if (typeof records === 'string') {
      records = records
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch (error) {
            return null;
          }
        })
        .filter(Boolean);
    }
    if (records && !Array.isArray(records) && records.records) {
      records = records.records;
    }

    if (!Array.isArray(records)) {
      return res.status(400).json({ error: 'Request body must be an array or NDJSON string of log objects' });
    }

    if (records.length === 0) {
      return res.json({ ingested: 0 });
    }

    if (records.length > MAX_BATCH_SIZE) {
      return res.status(413).json({ error: `Batch exceeds maximum size of ${MAX_BATCH_SIZE}` });
    }

    const sourceHint = req.header('X-MAI-Monetize-Source') || req.query.source || 'unknown';
    const sourceId = req.header('X-MAI-Monetize-Source-Id') || req.query.source_id;
    const normalized = [];

    for (const record of records) {
      const timestamp =
        record.timestamp ||
        record.time ||
        record.ts ||
        record.datetime ||
        record.request_time ||
        new Date().toISOString();

      const url =
        record.url ||
        record.request ||
        record.path ||
        (record.scheme && record.host && record.uri ? `${record.scheme}://${record.host}${record.uri}` : null);

      const method = record.method || record.http_method || record.request_method || null;
      const status = record.status_code || record.status || null;
      const userAgent = record.user_agent || record.agent || record.ua || record.request_agent || '';
      const classification = agentClassifier.classify(userAgent);

      const latencyMsRaw = record.latency_ms ?? record.request_time_ms ?? record.origin_time_ms ?? record.latency;
      let latencyMs = null;
      if (latencyMsRaw !== undefined && latencyMsRaw !== null) {
        latencyMs = typeof latencyMsRaw === 'number'
          ? latencyMsRaw
          : parseFloat(latencyMsRaw);
      }

      normalized.push({
        publisherId: publisher.id,
        timestamp,
        host: record.host || record.hostname || record.server || null,
        url,
        method,
        status: status !== null && status !== undefined ? Number(status) : null,
        agent: userAgent || null,
        agentType: classification.type,
        country:
          record.country ||
          record.geo_country ||
          record.geo?.country ||
          record.client_country ||
          null,
        city:
          record.city ||
          record.geo_city ||
          record.geo?.city ||
          record.client_city ||
          null,
        latencyMs,
        referer: record.referer || record.referrer || record.referer_host || null,
        source: record.source || sourceHint,
        rawPayload: record,
      });
    }

    await PageLog.insertBatch(normalized);

    if (sourceId) {
      await LogSource.touchLastIngested(sourceId);
    }

    res.json({ ingested: normalized.length, publisher_id: publisher.id });
  } catch (error) {
    console.error('Log ingestion failed:', error);
    res.status(500).json({ error: 'Failed to ingest logs', message: error.message });
  }
});

/**
 * GET /api/logs
 * Get usage logs for a publisher
 */
router.get('/', async (req, res) => {
  try {
    const { publisher_id, limit = 100, offset = 0, start_date, end_date } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    let query = `
      SELECT ue.*
      FROM usage_events ue
      WHERE ue.publisher_id = $1
    `;
    const params = [publisher_id];

    if (start_date) {
      query += ` AND ue.ts >= $${params.length + 1}`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND ue.ts <= $${params.length + 1}`;
      params.push(end_date);
    }

    query += ` ORDER BY ue.ts DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      logs: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * GET /api/logs/stats
 * Get usage statistics for a publisher
 */
router.get('/stats', async (req, res) => {
  try {
    const { publisher_id, days = 30 } = req.query;
    
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }

    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT ue.client_id) as unique_clients,
        COUNT(DISTINCT ue.url) as accessed_urls,
        COUNT(*) as authorized_requests,
        0 as unauthorized_requests
       FROM usage_events ue
       WHERE ue.publisher_id = $1
       AND ue.ts >= NOW() - INTERVAL '${parseInt(days)} days'`,
      [publisher_id]
    );

    // Get revenue estimate (if available)
    const revenueResult = await db.query(
      `SELECT 
        SUM(ue.cost_micro / 1000000.0) as estimated_revenue
       FROM usage_events ue
       WHERE ue.publisher_id = $1
       AND ue.ts >= NOW() - INTERVAL '${parseInt(days)} days'`,
      [publisher_id]
    );

    res.json({
      total_requests: parseInt(statsResult.rows[0].total_requests) || 0,
      unique_clients: parseInt(statsResult.rows[0].unique_clients) || 0,
      accessed_urls: parseInt(statsResult.rows[0].accessed_urls) || 0,
      authorized_requests: parseInt(statsResult.rows[0].authorized_requests) || 0,
      unauthorized_requests: parseInt(statsResult.rows[0].unauthorized_requests) || 0,
      estimated_revenue: parseFloat(revenueResult.rows[0].estimated_revenue) || 0,
      days: parseInt(days)
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log stats' });
  }
});

/**
 * GET /api/logs/summary
 * Return aggregated metrics for dashboard analytics
 */
router.get('/summary', async (req, res) => {
  try {
    const { publisher_id, from, to, granularity = 'day', limit } = req.query;
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }
    const metrics = await AggregatedMetric.listByPublisher(publisher_id, {
      from,
      to,
      granularity,
      limit: limit ? parseInt(limit, 10) : 100,
    });
    res.json({ metrics });
  } catch (error) {
    console.error('Failed to fetch aggregated metrics:', error);
    res.status(500).json({ error: 'Failed to fetch summary metrics' });
  }
});

/**
 * GET /api/logs/sources
 * List configured ingestion sources for a publisher
 */
router.get('/sources', async (req, res) => {
  try {
    const { publisher_id } = req.query;
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }
    const sources = await LogSource.listByPublisher(publisher_id);
    res.json({ sources });
  } catch (error) {
    console.error('Failed to fetch log sources:', error);
    res.status(500).json({ error: 'Failed to fetch log sources' });
  }
});

/**
 * POST /api/logs/sources
 * Create a new ingestion source
 */
router.post('/sources', async (req, res) => {
  try {
    const { publisher_id, platform, api_key, service_id, status } = req.body;
    if (!publisher_id || !platform) {
      return res.status(400).json({ error: 'publisher_id and platform are required' });
    }
    const source = await LogSource.create({
      publisherId: publisher_id,
      platform,
      apiKey: api_key,
      serviceId: service_id,
      status: status || 'active',
    });
    res.status(201).json({ source });
  } catch (error) {
    console.error('Failed to create log source:', error);
    res.status(500).json({ error: 'Failed to create log source', message: error.message });
  }
});

/**
 * PATCH /api/logs/sources/:id
 * Update log source status
 */
router.patch('/sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }
    const updated = await LogSource.updateStatus(id, status);
    res.json({ source: updated });
  } catch (error) {
    console.error('Failed to update log source:', error);
    res.status(500).json({ error: 'Failed to update log source' });
  }
});

/**
 * GET /api/logs/alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { publisher_id } = req.query;
    if (!publisher_id) {
      return res.status(400).json({ error: 'publisher_id is required' });
    }
    const alerts = await Alert.listByPublisher(publisher_id);
    res.json({ alerts });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

/**
 * POST /api/logs/alerts
 */
router.post('/alerts', async (req, res) => {
  try {
    const { publisher_id, metric, threshold, window_minutes, notification_url, enabled } = req.body;
    if (!publisher_id || !metric || threshold === undefined) {
      return res.status(400).json({ error: 'publisher_id, metric, and threshold are required' });
    }
    const alert = await Alert.create({
      publisherId: publisher_id,
      metric,
      threshold,
      windowMinutes: window_minutes || 60,
      notificationUrl: notification_url,
      enabled: enabled !== undefined ? enabled : true,
    });
    res.status(201).json({ alert });
  } catch (error) {
    console.error('Failed to create alert:', error);
    res.status(500).json({ error: 'Failed to create alert', message: error.message });
  }
});

/**
 * PATCH /api/logs/alerts/:id
 */
router.patch('/alerts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await Alert.update(id, req.body);
    res.json({ alert: updated });
  } catch (error) {
    console.error('Failed to update alert:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

module.exports = router;
