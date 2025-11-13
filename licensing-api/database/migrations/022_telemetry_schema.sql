-- Migration 022: Telemetry & Analytics foundation schema
-- Adds ingestion, aggregation, and alerting tables plus supporting columns.

-- 1. Publishers enrichment (Azure-compatible - no pgcrypto extension)
ALTER TABLE publishers
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS api_key_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill plan_id for existing publishers (default to Standard plan if available)
UPDATE publishers
SET plan_id = COALESCE(
  (SELECT id FROM plans WHERE name = 'Standard' LIMIT 1),
  (SELECT id FROM plans ORDER BY id LIMIT 1)
)
WHERE plan_id IS NULL;

-- Backfill api_key_hash placeholders for existing publishers (simple concatenation for Azure compatibility)
UPDATE publishers
SET api_key_hash = 'publisher-' || id || '-ingest-hash'
WHERE api_key_hash IS NULL;

-- Add uniqueness & lookup indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_publishers_api_key_hash
  ON publishers(api_key_hash)
  WHERE api_key_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_publishers_hostname
  ON publishers(hostname);

CREATE INDEX IF NOT EXISTS idx_publishers_plan_id
  ON publishers(plan_id);

-- Maintain updated_at via trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_publishers_updated_at ON publishers;
CREATE TRIGGER trg_publishers_updated_at
BEFORE UPDATE ON publishers
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Clients unique API key constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_clients_api_key_hash
  ON clients(api_key_hash)
  WHERE api_key_hash IS NOT NULL;

-- 3. Licenses table (publisher ↔ client agreements)
CREATE TABLE IF NOT EXISTS licenses (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('active', 'revoked', 'pending')),
  max_rps INTEGER DEFAULT 10,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_licenses_pub_client
  ON licenses(publisher_id, client_id);

CREATE INDEX IF NOT EXISTS idx_licenses_status
  ON licenses(status);

-- 4. Tokens table enrichment (link to licenses & hashed values)
ALTER TABLE tokens
  ADD COLUMN IF NOT EXISTS license_id INTEGER REFERENCES licenses(id),
  ADD COLUMN IF NOT EXISTS token_value_hash CHAR(64),
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_token_value_hash
  ON tokens(token_value_hash)
  WHERE token_value_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tokens_license_id_expires
  ON tokens(license_id, expires_at);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_type_enum') THEN
    CREATE TYPE agent_type_enum AS ENUM ('human', 'bot', 'unknown');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_platform_enum') THEN
    CREATE TYPE log_platform_enum AS ENUM (
      'fastly','cloudflare','akamai','aws','gcp','azure','vercel','datadome','wordpress','other'
    );
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'log_source_status_enum') THEN
    CREATE TYPE log_source_status_enum AS ENUM ('active','paused','revoked');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metrics_granularity_enum') THEN
    CREATE TYPE metrics_granularity_enum AS ENUM ('hour','day');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_metric_enum') THEN
    CREATE TYPE alert_metric_enum AS ENUM ('bot_ratio','error_rate','traffic_drop','latency_spike');
  END IF;
END$$;

-- 6. Agent signatures dictionary
CREATE TABLE IF NOT EXISTS agent_signatures (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  regex_pattern TEXT NOT NULL,
  category TEXT DEFAULT 'ai'
    CHECK (category IN ('ai','crawler','monitoring','human')),
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_signatures_category
  ON agent_signatures(category);

-- Seed common signatures
INSERT INTO agent_signatures (name, regex_pattern, category)
VALUES
  ('GPTBot', 'gptbot', 'ai'),
  ('ClaudeBot', 'claudebot', 'ai'),
  ('Perplexity', 'perplexity', 'ai'),
  ('Googlebot', 'googlebot', 'crawler'),
  ('Bingbot', 'bingbot', 'crawler')
ON CONFLICT (name) DO NOTHING;

-- 7. Log sources configuration
CREATE TABLE IF NOT EXISTS log_sources (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  platform log_platform_enum NOT NULL,
  api_key VARCHAR(255),
  service_id VARCHAR(255),
  status log_source_status_enum DEFAULT 'active',
  last_ingested_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_log_sources_publisher
  ON log_sources(publisher_id);

-- 8. Raw page logs
CREATE TABLE IF NOT EXISTS page_logs (
  id BIGSERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  "timestamp" TIMESTAMP NOT NULL,
  host VARCHAR(255),
  url TEXT,
  method VARCHAR(10),
  status INTEGER,
  agent TEXT,
  agent_type agent_type_enum DEFAULT 'unknown',
  country VARCHAR(64),
  city VARCHAR(128),
  latency_ms DOUBLE PRECISION,
  referer TEXT,
  source VARCHAR(32) DEFAULT 'unknown',
  raw_payload JSONB,
  ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_page_logs_pub_time
  ON page_logs (publisher_id, "timestamp");

CREATE INDEX IF NOT EXISTS idx_page_logs_status
  ON page_logs (status);

CREATE INDEX IF NOT EXISTS idx_page_logs_agent_type
  ON page_logs (agent_type);

CREATE INDEX IF NOT EXISTS idx_page_logs_source
  ON page_logs (source);

CREATE INDEX IF NOT EXISTS gin_idx_page_logs_payload
  ON page_logs USING GIN (raw_payload);

-- 9. Aggregated metrics rollups
CREATE TABLE IF NOT EXISTS aggregated_metrics (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  period_start TIMESTAMP NOT NULL,
  period_granularity metrics_granularity_enum NOT NULL DEFAULT 'day',
  total_requests BIGINT NOT NULL,
  bot_requests BIGINT DEFAULT 0,
  unique_hosts INTEGER,
  avg_latency_ms DOUBLE PRECISION,
  error_count BIGINT DEFAULT 0,
  top_agents JSONB,
  top_countries JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (publisher_id, period_start, period_granularity)
);

CREATE INDEX IF NOT EXISTS idx_aggregated_metrics_pub_period
  ON aggregated_metrics(publisher_id, period_start);

-- 10. Alerts configuration
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  metric alert_metric_enum NOT NULL,
  threshold DOUBLE PRECISION NOT NULL,
  window_minutes INTEGER NOT NULL DEFAULT 60,
  notification_url TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_alerts_publisher_metric
  ON alerts(publisher_id, metric);


