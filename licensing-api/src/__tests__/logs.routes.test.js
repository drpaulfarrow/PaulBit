const request = require('supertest');
const express = require('express');

const Publisher = require('../models/Publisher');
const PageLog = require('../models/PageLog');
const LogSource = require('../models/LogSource');
const AggregatedMetric = require('../models/AggregatedMetric');
const Alert = require('../models/Alert');
const agentClassifier = require('../services/agentClassifier');

process.env.LOG_INGEST_MAX_BATCH = '2';

jest.mock('../models/Publisher');
jest.mock('../models/PageLog');
jest.mock('../models/LogSource');
jest.mock('../models/AggregatedMetric');
jest.mock('../models/Alert');
jest.mock('../services/agentClassifier');

function buildApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use('/api/logs', require('../routes/logs'));
  return app;
}

describe('logs routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    agentClassifier.classify.mockReturnValue({ type: 'unknown' });
    AggregatedMetric.listByPublisher.mockResolvedValue([]);
    Alert.listByPublisher.mockResolvedValue([]);
  });

  describe('POST /api/logs/ingest', () => {
    it('rejects missing ingestion key', async () => {
      const app = buildApp();
      const res = await request(app).post('/api/logs/ingest').send([]);
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Missing ingestion key header (X-MAI-Monetize-Key)' });
      expect(Publisher.findByApiKey).not.toHaveBeenCalled();
    });

    it('rejects invalid ingestion key', async () => {
      const app = buildApp();
      Publisher.findByApiKey.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/logs/ingest')
        .set('X-MAI-Monetize-Key', 'bad-key')
        .send([]);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: 'Invalid ingestion key' });
    });

    it('rejects non-array body', async () => {
      const app = buildApp();
      Publisher.findByApiKey.mockResolvedValue({ id: 1 });

      const res = await request(app)
        .post('/api/logs/ingest')
        .set('X-MAI-Monetize-Key', 'good-key')
        .send({ message: 'not an array' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Request body must be an array/);
    });

    it('rejects batch larger than configured limit', async () => {
      const app = buildApp();
      Publisher.findByApiKey.mockResolvedValue({ id: 1 });

      const payload = [{ timestamp: '2025-01-01T00:00:00Z' }, { timestamp: '2025-01-01T00:05:00Z' }, { timestamp: '2025-01-01T00:10:00Z' }];
      const res = await request(app)
        .post('/api/logs/ingest')
        .set('X-MAI-Monetize-Key', 'good-key')
        .send(payload);

      expect(res.status).toBe(413);
      expect(res.body.error).toMatch(/Batch exceeds maximum size/);
      expect(PageLog.insertBatch).not.toHaveBeenCalled();
    });

    it('ingests records and normalizes data', async () => {
      const app = buildApp();
      Publisher.findByApiKey.mockResolvedValue({ id: 42 });
      PageLog.insertBatch.mockResolvedValue(undefined);
      LogSource.touchLastIngested.mockResolvedValue(undefined);
      agentClassifier.classify.mockReturnValue({ type: 'bot' });

      const entry = {
        timestamp: '2025-01-01T12:00:00Z',
        host: 'site-a.local',
        url: 'https://site-a.local/news/foo.html',
        method: 'GET',
        status: '200',
        user_agent: 'GPTBot/1.0',
        country: 'US',
        latency_ms: '123.4',
      };

      const res = await request(app)
        .post('/api/logs/ingest')
        .set('X-MAI-Monetize-Key', 'valid-key')
        .set('X-PaulBit-Source', 'fastly')
        .set('X-PaulBit-Source-Id', 'abc123')
        .send([entry]);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ingested: 1, publisher_id: 42 });
      expect(PageLog.insertBatch).toHaveBeenCalledTimes(1);
      const [[normalized]] = PageLog.insertBatch.mock.calls[0];
      expect(normalized).toMatchObject({
        publisherId: 42,
        timestamp: entry.timestamp,
        host: entry.host,
        url: entry.url,
        method: entry.method,
        status: 200,
        agent: entry.user_agent,
        agentType: 'bot',
        country: 'US',
        latencyMs: 123.4,
        source: 'fastly',
      });
      expect(normalized.rawPayload).toEqual(entry);
      expect(LogSource.touchLastIngested).toHaveBeenCalledWith('abc123');
    });
  });

  describe('GET /api/logs/summary', () => {
    it('requires publisher_id', async () => {
      const app = buildApp();
      const res = await request(app).get('/api/logs/summary');
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/publisher_id is required/);
    });

    it('returns aggregated metrics from data source', async () => {
      const app = buildApp();
      const metrics = [
        { period_start: '2025-01-01T00:00:00Z', total_requests: 100, bot_requests: 25 },
      ];
      AggregatedMetric.listByPublisher.mockResolvedValue(metrics);

      const res = await request(app).get('/api/logs/summary').query({ publisher_id: 42, granularity: 'hour' });

      expect(res.status).toBe(200);
      expect(AggregatedMetric.listByPublisher).toHaveBeenCalledWith('42', {
        from: undefined,
        to: undefined,
        granularity: 'hour',
        limit: 100,
      });
      expect(res.body).toEqual({ metrics });
    });
  });

  describe('GET /api/logs/alerts', () => {
    it('returns alerts for publisher', async () => {
      const app = buildApp();
      const alerts = [{ id: 1, metric: 'bot_ratio', threshold: 0.3 }];
      Alert.listByPublisher.mockResolvedValue(alerts);

      const res = await request(app).get('/api/logs/alerts').query({ publisher_id: 42 });

      expect(res.status).toBe(200);
      expect(Alert.listByPublisher).toHaveBeenCalledWith('42');
      expect(res.body.alerts).toEqual(alerts);
    });
  });
});

