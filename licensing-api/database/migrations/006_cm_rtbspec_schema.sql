-- Migration 006: CM RTB Spec Schema
-- Purpose: Create cm_rtbspec v0.1 compliant tables for Content Licensing Console

-- Content table (replaces/extends parsed_urls)
CREATE TABLE IF NOT EXISTS content (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(255) UNIQUE NOT NULL,
  publisher_id INTEGER REFERENCES publishers(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  url TEXT NOT NULL,
  content_origin INTEGER DEFAULT 0, -- 0=Human, 1=AI, 2=Hybrid
  body_word_count INTEGER DEFAULT 0,
  has_third_party_media BOOLEAN DEFAULT false,
  authority_score DECIMAL(3,2),
  originality_score DECIMAL(3,2),
  last_scored_at TIMESTAMP,
  created_ts TIMESTAMP DEFAULT NOW(),
  updated_ts TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  cm_rtbspec_version VARCHAR(10) DEFAULT '0.1',
  UNIQUE(publisher_id, url)
);

-- License options table (replaces/extends policies)
CREATE TABLE IF NOT EXISTS license_options (
  id SERIAL PRIMARY KEY,
  license_id VARCHAR(255) UNIQUE NOT NULL,
  content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
  publisher_id INTEGER REFERENCES publishers(id) ON DELETE CASCADE,
  license_type INTEGER NOT NULL, -- 0=Training+Display, 1=RAG Unrestricted, 2=RAG MaxWords, 3=RAG Attribution, 4=RAG NoDisplay
  price DECIMAL(10,4) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  term_months INTEGER,
  revshare_pct DECIMAL(5,2),
  max_word_count INTEGER,
  attribution_required BOOLEAN DEFAULT false,
  attribution_text TEXT,
  attribution_url TEXT,
  derivative_allowed BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'active', -- draft, active, expired
  created_ts TIMESTAMP DEFAULT NOW(),
  updated_ts TIMESTAMP DEFAULT NOW(),
  ext JSONB DEFAULT '{}',
  cm_rtbspec_version VARCHAR(10) DEFAULT '0.1',
  UNIQUE(content_id, license_type)
);

-- Access endpoints table
CREATE TABLE IF NOT EXISTS access_endpoints (
  id SERIAL PRIMARY KEY,
  license_id INTEGER REFERENCES license_options(id) ON DELETE CASCADE,
  access_type INTEGER NOT NULL, -- 0=HTML, 1=RSS, 2=API, 3=MCP, 4=NLWeb
  endpoint TEXT NOT NULL,
  auth_type VARCHAR(20) DEFAULT 'none', -- none, api_key, oauth2
  rate_limit INTEGER DEFAULT 1000,
  requires_mtls BOOLEAN DEFAULT false,
  scopes TEXT[],
  ext JSONB DEFAULT '{}',
  created_ts TIMESTAMP DEFAULT NOW()
);

-- Audit trail (compliance logging)
CREATE TABLE IF NOT EXISTS audit_trail (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  action VARCHAR(20) NOT NULL, -- create, update, delete
  user_id INTEGER,
  user_email VARCHAR(255),
  changed_fields JSONB,
  old_values JSONB,
  new_values JSONB,
  ts TIMESTAMP DEFAULT NOW()
);

-- Attribution tracking
CREATE TABLE IF NOT EXISTS attribution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id INTEGER REFERENCES license_options(id),
  buyer_id VARCHAR(255),
  content_url TEXT,
  attributed_correctly BOOLEAN,
  attribution_text TEXT,
  detected_at TIMESTAMP DEFAULT NOW()
);

-- Methodology documents
CREATE TABLE IF NOT EXISTS methodology_docs (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER REFERENCES publishers(id) ON DELETE CASCADE,
  doc_type VARCHAR(50), -- authority, originality, governance
  content TEXT,
  file_url TEXT,
  refresh_cadence_days INTEGER DEFAULT 30,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_publisher ON content(publisher_id);
CREATE INDEX IF NOT EXISTS idx_content_origin ON content(content_origin);
CREATE INDEX IF NOT EXISTS idx_content_url ON content(url);
CREATE INDEX IF NOT EXISTS idx_license_content ON license_options(content_id);
CREATE INDEX IF NOT EXISTS idx_license_publisher ON license_options(publisher_id);
CREATE INDEX IF NOT EXISTS idx_license_type ON license_options(license_type);
CREATE INDEX IF NOT EXISTS idx_license_status ON license_options(status);
CREATE INDEX IF NOT EXISTS idx_access_license ON access_endpoints(license_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_trail(ts);

-- Grant permissions (removed - using default monetizeplus user)

-- Migrate existing data from parsed_urls to content
INSERT INTO content (
  content_id, publisher_id, title, description, url,
  body_word_count, created_ts, updated_ts, metadata
)
SELECT 
  'content_' || pu.id,
  COALESCE(
    (SELECT pd.publisher_id FROM publisher_domains pd WHERE pd.domain = pu.domain LIMIT 1),
    1
  ),
  pu.title,
  pu.description,
  pu.url,
  0,
  COALESCE(pu.last_parsed_at, NOW()),
  COALESCE(pu.last_parsed_at, NOW()),
  COALESCE(pu.metadata, '{}'::jsonb)
FROM parsed_urls pu
WHERE pu.url IS NOT NULL
ON CONFLICT (publisher_id, url) DO NOTHING;

-- Migrate default policies (publisher-level) to license_options
INSERT INTO license_options (
  license_id, publisher_id, license_type, price,
  status, created_ts, updated_ts
)
SELECT 
  'license_default_' || p.publisher_id,
  p.publisher_id,
  1, -- RAG Display Unrestricted
  0.001,
  'active',
  COALESCE(p.created_at, NOW()),
  COALESCE(p.created_at, NOW())
FROM policies p
WHERE (p.url_pattern IS NULL OR p.url_pattern = '')
ON CONFLICT (license_id) DO NOTHING;

-- Migrate page-specific policies to license_options
INSERT INTO license_options (
  license_id, content_id, publisher_id, license_type, price,
  max_word_count, attribution_required,
  status, created_ts, updated_ts
)
SELECT 
  'license_' || p.id,
  c.id,
  p.publisher_id,
  CASE 
    WHEN (p.policy_json->'rules'->0->>'license_type')::INTEGER IS NOT NULL 
      THEN (p.policy_json->'rules'->0->>'license_type')::INTEGER
    ELSE 1
  END,
  COALESCE(
    (p.policy_json->'rules'->0->>'price_per_fetch')::DECIMAL,
    (p.policy_json->'default'->>'price_per_fetch')::DECIMAL,
    0.001
  ),
  (p.policy_json->'rules'->0->>'max_word_count')::INTEGER,
  COALESCE((p.policy_json->'rules'->0->>'attribution_required')::BOOLEAN, false),
  'active',
  COALESCE(p.created_at, NOW()),
  COALESCE(p.created_at, NOW())
FROM policies p
JOIN content c ON c.url = p.url_pattern
WHERE p.url_pattern IS NOT NULL AND p.url_pattern != ''
ON CONFLICT (content_id, license_type) DO NOTHING;

-- Create default access endpoints for all licenses (API type)
INSERT INTO access_endpoints (license_id, access_type, endpoint, auth_type, rate_limit)
SELECT 
  lo.id,
  2, -- API
  COALESCE(
    c.url,
    'https://api.example.com/content/' || COALESCE(c.content_id, 'unknown-' || lo.id)
  ),
  'api_key',
  1000
FROM license_options lo
LEFT JOIN content c ON c.id = lo.content_id
WHERE c.id IS NOT NULL -- Only create endpoints for licenses with content
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE content IS 'Content assets with cm_rtbspec v0.1 compliance';
COMMENT ON TABLE license_options IS 'License configurations for content (replaces policies table)';
COMMENT ON TABLE access_endpoints IS 'Access endpoints for license consumption (HTML, RSS, API, MCP, NLWeb)';
COMMENT ON TABLE audit_trail IS 'Compliance audit log for all entity changes';
COMMENT ON TABLE attribution_events IS 'Attribution tracking for license type 3 (RAG Display Attribution)';
COMMENT ON TABLE methodology_docs IS 'Authority & Originality methodology documentation';

COMMENT ON COLUMN content.content_origin IS '0=Human, 1=AI, 2=Hybrid';
COMMENT ON COLUMN license_options.license_type IS '0=Training+Display, 1=RAG Unrestricted, 2=RAG MaxWords, 3=RAG Attribution, 4=RAG NoDisplay';
COMMENT ON COLUMN access_endpoints.access_type IS '0=HTML, 1=RSS, 2=API, 3=MCP, 4=NLWeb';
