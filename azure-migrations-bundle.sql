-- Azure Migration Bundle
-- Generated: 2025-10-31 06:05:48

BEGIN;

-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- Migration: 006_cm_rtbspec_schema.sql
-- ============================================================
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

-- Grant permissions
GRANT ALL PRIVILEGES ON TABLE content TO tollbit;
GRANT ALL PRIVILEGES ON TABLE license_options TO tollbit;
GRANT ALL PRIVILEGES ON TABLE access_endpoints TO tollbit;
GRANT ALL PRIVILEGES ON TABLE audit_trail TO tollbit;
GRANT ALL PRIVILEGES ON TABLE attribution_events TO tollbit;
GRANT ALL PRIVILEGES ON TABLE methodology_docs TO tollbit;

GRANT USAGE, SELECT ON SEQUENCE content_id_seq TO tollbit;
GRANT USAGE, SELECT ON SEQUENCE license_options_id_seq TO tollbit;
GRANT USAGE, SELECT ON SEQUENCE access_endpoints_id_seq TO tollbit;
GRANT USAGE, SELECT ON SEQUENCE audit_trail_id_seq TO tollbit;
GRANT USAGE, SELECT ON SEQUENCE methodology_docs_id_seq TO tollbit;

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

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('006_cm_rtbspec_schema.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 007_access_endpoints_refactor.sql
-- ============================================================
-- Migration: Refactor access_endpoints to be publisher-level (not license-level)
-- Access endpoints are generic ways publishers expose their content (APIs, RSS, etc.)
-- They are not tied to specific licenses

-- Drop the license_id foreign key constraint and column
ALTER TABLE access_endpoints 
  DROP CONSTRAINT IF EXISTS access_endpoints_license_id_fkey,
  DROP COLUMN IF EXISTS license_id;

-- Add publisher_id to make endpoints publisher-level
ALTER TABLE access_endpoints
  ADD COLUMN IF NOT EXISTS publisher_id INTEGER REFERENCES publishers(id) ON DELETE CASCADE;

-- Add name/description fields for better identification
ALTER TABLE access_endpoints
  ADD COLUMN IF NOT EXISTS name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add index on publisher_id
CREATE INDEX IF NOT EXISTS idx_access_endpoints_publisher ON access_endpoints(publisher_id);

-- Add access_endpoint_id to parsed_urls to track where URLs came from
ALTER TABLE parsed_urls
  ADD COLUMN IF NOT EXISTS access_endpoint_id INTEGER REFERENCES access_endpoints(id) ON DELETE SET NULL;

-- Add index on access_endpoint_id
CREATE INDEX IF NOT EXISTS idx_parsed_urls_access_endpoint ON parsed_urls(access_endpoint_id);

-- Update existing access endpoints to have publisher_id = 1 (default publisher)
UPDATE access_endpoints SET publisher_id = 1 WHERE publisher_id IS NULL;

-- Make publisher_id NOT NULL after backfilling
ALTER TABLE access_endpoints ALTER COLUMN publisher_id SET NOT NULL;

-- Add comments
COMMENT ON COLUMN access_endpoints.publisher_id IS 'Publisher who owns this access endpoint';
COMMENT ON COLUMN access_endpoints.name IS 'Human-readable name for the access endpoint (e.g., "NYTimes API", "RSS Feed")';
COMMENT ON COLUMN access_endpoints.description IS 'Description of what this endpoint provides';
COMMENT ON COLUMN parsed_urls.access_endpoint_id IS 'Which access endpoint was used to retrieve/add this URL';

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('007_access_endpoints_refactor.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 008_access_endpoint_formats.sql
-- ============================================================
-- Migration 008: Add request/response format fields to access_endpoints
-- This enables the scraper to properly format requests and parse responses

-- Add request/response format columns
ALTER TABLE access_endpoints
ADD COLUMN request_format VARCHAR(50) DEFAULT 'json',
ADD COLUMN response_format VARCHAR(50) DEFAULT 'json',
ADD COLUMN request_headers JSONB DEFAULT '{}',
ADD COLUMN sample_request TEXT,
ADD COLUMN sample_response TEXT;

-- Add comments
COMMENT ON COLUMN access_endpoints.request_format IS 'Format of API requests: json, form-data, xml, graphql, etc.';
COMMENT ON COLUMN access_endpoints.response_format IS 'Format of API responses: json, html, xml, rss, plain, etc.';
COMMENT ON COLUMN access_endpoints.request_headers IS 'Custom headers required for requests (key-value pairs)';
COMMENT ON COLUMN access_endpoints.sample_request IS 'Example request body/payload';
COMMENT ON COLUMN access_endpoints.sample_response IS 'Example response structure';

-- Update existing access endpoints with sensible defaults based on access_type
UPDATE access_endpoints 
SET 
  request_format = CASE 
    WHEN access_type = 0 THEN 'http-get'  -- HTML
    WHEN access_type = 1 THEN 'http-get'  -- RSS
    WHEN access_type = 2 THEN 'json'      -- API
    WHEN access_type = 3 THEN 'json'      -- MCP
    WHEN access_type = 4 THEN 'http-get'  -- NLWeb
    ELSE 'json'
  END,
  response_format = CASE 
    WHEN access_type = 0 THEN 'html'      -- HTML
    WHEN access_type = 1 THEN 'xml'       -- RSS
    WHEN access_type = 2 THEN 'json'      -- API
    WHEN access_type = 3 THEN 'json'      -- MCP
    WHEN access_type = 4 THEN 'html'      -- NLWeb
    ELSE 'json'
  END
WHERE request_format IS NULL OR response_format IS NULL;

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('008_access_endpoint_formats.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 009_negotiation_system.sql
-- ============================================================
-- Migration 009: AI-to-AI Negotiation System
-- Enables autonomous license negotiation between publisher agents and AI company agents

-- Publisher negotiation strategies table
-- Defines how each publisher wants to negotiate with AI companies
CREATE TABLE IF NOT EXISTS negotiation_strategies (
    id SERIAL PRIMARY KEY,
    publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    strategy_name VARCHAR(255) NOT NULL,
    
    -- Negotiation personality
    negotiation_style VARCHAR(50) DEFAULT 'balanced', -- 'aggressive', 'balanced', 'flexible', 'cooperative'
    
    -- Price boundaries (in micro-dollars)
    min_price_per_fetch_micro INTEGER NOT NULL,
    preferred_price_per_fetch_micro INTEGER NOT NULL,
    max_price_per_fetch_micro INTEGER,
    
    -- Term boundaries
    min_token_ttl_seconds INTEGER DEFAULT 300,
    preferred_token_ttl_seconds INTEGER DEFAULT 600,
    max_token_ttl_seconds INTEGER DEFAULT 3600,
    
    min_burst_rps INTEGER DEFAULT 1,
    preferred_burst_rps INTEGER DEFAULT 10,
    max_burst_rps INTEGER DEFAULT 100,
    
    -- Purpose preferences (what uses are acceptable)
    allowed_purposes TEXT[] DEFAULT ARRAY['inference'],
    preferred_purposes TEXT[] DEFAULT ARRAY['inference'],
    
    -- Deal breakers (JSON array of conditions that auto-reject)
    deal_breakers JSONB DEFAULT '[]',
    
    -- Negotiation limits
    max_rounds INTEGER DEFAULT 10,
    auto_accept_threshold DECIMAL(3,2) DEFAULT 0.95, -- Auto-accept if >= 95% of preferred terms
    timeout_seconds INTEGER DEFAULT 3600,
    
    -- LLM configuration
    llm_provider VARCHAR(50) DEFAULT 'openai', -- 'openai', 'anthropic', 'azure', etc.
    llm_model VARCHAR(100) DEFAULT 'gpt-4',
    llm_temperature DECIMAL(3,2) DEFAULT 0.7,
    system_prompt TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(publisher_id, strategy_name)
);

-- Negotiations table
-- Tracks each negotiation session between a publisher and an AI company
CREATE TABLE IF NOT EXISTS negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parties
    publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL, -- Store name even if client_id is null
    
    -- Strategy used
    strategy_id INTEGER NOT NULL REFERENCES negotiation_strategies(id),
    
    -- Current state
    status VARCHAR(50) DEFAULT 'initiated', -- 'initiated', 'negotiating', 'accepted', 'rejected', 'timeout', 'error'
    current_round INTEGER DEFAULT 0,
    
    -- Initial proposal from AI company
    initial_proposal JSONB NOT NULL,
    
    -- Current terms (updated each round)
    current_terms JSONB,
    
    -- Final agreed terms (if accepted)
    final_terms JSONB,
    
    -- Generated policy/license (if completed)
    generated_policy_id INTEGER REFERENCES policies(id) ON DELETE SET NULL,
    
    -- Metadata
    initiated_by VARCHAR(50) DEFAULT 'client', -- 'client' or 'publisher'
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Negotiation context
    context JSONB DEFAULT '{}', -- Additional context like URL patterns, special requirements, etc.
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Negotiation rounds table
-- Logs each round of the negotiation (full audit trail)
CREATE TABLE IF NOT EXISTS negotiation_rounds (
    id SERIAL PRIMARY KEY,
    negotiation_id UUID NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    
    -- Who made this move
    actor VARCHAR(50) NOT NULL, -- 'publisher' or 'client'
    
    -- Action taken
    action VARCHAR(50) NOT NULL, -- 'propose', 'counter', 'accept', 'reject', 'timeout'
    
    -- Terms proposed/countered
    proposed_terms JSONB NOT NULL,
    
    -- Reasoning (from LLM)
    reasoning TEXT,
    
    -- LLM metadata
    llm_model VARCHAR(100),
    llm_tokens_used INTEGER,
    llm_response_time_ms INTEGER,
    
    -- Analysis (why these terms were chosen)
    analysis JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(negotiation_id, round_number)
);

-- Negotiation messages table (optional - for chat-style negotiation)
-- Can be used for more conversational negotiation logs
CREATE TABLE IF NOT EXISTS negotiation_messages (
    id SERIAL PRIMARY KEY,
    negotiation_id UUID NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
    round_id INTEGER REFERENCES negotiation_rounds(id) ON DELETE CASCADE,
    
    sender VARCHAR(50) NOT NULL, -- 'publisher', 'client', 'system'
    message_type VARCHAR(50) DEFAULT 'proposal', -- 'proposal', 'counter', 'question', 'clarification', 'acceptance', 'rejection'
    
    message TEXT NOT NULL,
    structured_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_negotiations_publisher_id ON negotiations(publisher_id);
CREATE INDEX idx_negotiations_client_id ON negotiations(client_id);
CREATE INDEX idx_negotiations_status ON negotiations(status);
CREATE INDEX idx_negotiations_initiated_at ON negotiations(initiated_at DESC);
CREATE INDEX idx_negotiations_last_activity ON negotiations(last_activity_at DESC);

CREATE INDEX idx_negotiation_rounds_negotiation_id ON negotiation_rounds(negotiation_id);
CREATE INDEX idx_negotiation_rounds_round_number ON negotiation_rounds(negotiation_id, round_number);

CREATE INDEX idx_negotiation_messages_negotiation_id ON negotiation_messages(negotiation_id);
CREATE INDEX idx_negotiation_messages_created_at ON negotiation_messages(created_at);

CREATE INDEX idx_negotiation_strategies_publisher_id ON negotiation_strategies(publisher_id);
CREATE INDEX idx_negotiation_strategies_active ON negotiation_strategies(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE negotiation_strategies IS 'Defines how publishers want to negotiate with AI companies';
COMMENT ON TABLE negotiations IS 'Tracks AI-to-AI negotiation sessions for creating licenses';
COMMENT ON TABLE negotiation_rounds IS 'Full audit trail of each negotiation round';
COMMENT ON TABLE negotiation_messages IS 'Optional conversational log of negotiation';

COMMENT ON COLUMN negotiation_strategies.negotiation_style IS 'Personality: aggressive (hard bargaining), balanced (moderate), flexible (accommodating), cooperative (partnership)';
COMMENT ON COLUMN negotiation_strategies.auto_accept_threshold IS 'Auto-accept proposals that meet this % of preferred terms (0.0-1.0)';
COMMENT ON COLUMN negotiation_strategies.deal_breakers IS 'Array of conditions that auto-reject: e.g., [{"field": "purpose", "contains": "training"}]';

COMMENT ON COLUMN negotiations.status IS 'Current state: initiated, negotiating, accepted, rejected, timeout, error';
COMMENT ON COLUMN negotiations.current_terms IS 'Latest proposed terms in the negotiation';
COMMENT ON COLUMN negotiations.final_terms IS 'Agreed terms (only set when status=accepted)';

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_negotiation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_negotiations_timestamp
    BEFORE UPDATE ON negotiations
    FOR EACH ROW
    EXECUTE FUNCTION update_negotiation_timestamp();

CREATE TRIGGER update_negotiation_strategies_timestamp
    BEFORE UPDATE ON negotiation_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_negotiation_timestamp();

-- Seed data: Default negotiation strategy for Publisher A
INSERT INTO negotiation_strategies (
    publisher_id,
    strategy_name,
    negotiation_style,
    min_price_per_fetch_micro,
    preferred_price_per_fetch_micro,
    max_price_per_fetch_micro,
    min_token_ttl_seconds,
    preferred_token_ttl_seconds,
    max_token_ttl_seconds,
    min_burst_rps,
    preferred_burst_rps,
    max_burst_rps,
    allowed_purposes,
    preferred_purposes,
    deal_breakers,
    max_rounds,
    auto_accept_threshold,
    system_prompt
) VALUES (
    1, -- Publisher A
    'Default Strategy',
    'balanced',
    1000, -- Min $0.001
    2000, -- Preferred $0.002
    5000, -- Max $0.005
    300,
    600,
    1800,
    2,
    10,
    50,
    ARRAY['inference', 'training'],
    ARRAY['inference'],
    '[{"field": "price_per_fetch_micro", "operator": "<", "value": 500}]'::jsonb,
    10,
    0.90,
    'You are a professional licensing negotiator representing a premium news publisher. Your goal is to achieve fair compensation for content while maintaining good relationships with AI companies. Be firm on minimum prices but flexible on other terms. Always explain your reasoning clearly.'
) ON CONFLICT (publisher_id, strategy_name) DO NOTHING;

-- Seed data: Default negotiation strategy for Publisher B
INSERT INTO negotiation_strategies (
    publisher_id,
    strategy_name,
    negotiation_style,
    min_price_per_fetch_micro,
    preferred_price_per_fetch_micro,
    max_price_per_fetch_micro,
    min_token_ttl_seconds,
    preferred_token_ttl_seconds,
    max_token_ttl_seconds,
    min_burst_rps,
    preferred_burst_rps,
    max_burst_rps,
    allowed_purposes,
    preferred_purposes,
    deal_breakers,
    max_rounds,
    auto_accept_threshold,
    system_prompt
) VALUES (
    2, -- Publisher B
    'Default Strategy',
    'cooperative',
    500, -- Min $0.0005
    1000, -- Preferred $0.001
    2500, -- Max $0.0025
    300,
    900,
    3600,
    3,
    10,
    100,
    ARRAY['inference', 'training'],
    ARRAY['inference', 'training'],
    '[]'::jsonb,
    15,
    0.85,
    'You are a collaborative licensing negotiator for a technical documentation publisher. Your goal is to maximize access while ensuring fair compensation. Be open to creative solutions and long-term partnerships. Prioritize volume over per-fetch pricing when appropriate.'
) ON CONFLICT (publisher_id, strategy_name) DO NOTHING;

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('009_negotiation_system.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 010_partner_strategies.sql
-- ============================================================
-- Migration 010: Partner-Specific Negotiation Strategies
-- This replaces the generic negotiation_strategies with partner-specific configurations

-- Drop existing generic strategies table
DROP TABLE IF EXISTS negotiation_strategies CASCADE;

-- Create partner-specific strategies table
CREATE TABLE partner_negotiation_strategies (
    id SERIAL PRIMARY KEY,
    publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    
    -- Partner identification
    partner_type VARCHAR(50) NOT NULL CHECK (partner_type IN ('tier1_ai', 'tier2_ai', 'startup', 'research', 'specific_partner')),
    partner_name VARCHAR(255), -- NULL for generic tier rules, specific name for specific partners (e.g., 'OpenAI', 'Anthropic')
    
    -- Use case specification
    use_case VARCHAR(50) NOT NULL CHECK (use_case IN ('training', 'inference', 'search', 'general')),
    
    -- Pricing configuration per partner/use-case
    pricing_model VARCHAR(50) NOT NULL DEFAULT 'per_token',
    min_price DECIMAL(10, 6) NOT NULL,
    max_price DECIMAL(10, 6) NOT NULL,
    preferred_price DECIMAL(10, 6) NOT NULL,
    
    -- Negotiation behavior
    negotiation_style VARCHAR(50) NOT NULL CHECK (negotiation_style IN ('aggressive', 'balanced', 'cooperative')),
    auto_accept_threshold DECIMAL(5, 4) DEFAULT 0.95, -- Auto-accept if offer >= preferred_price * threshold
    
    -- Deal breakers and preferences
    deal_breakers JSONB DEFAULT '[]'::jsonb, -- Array of unacceptable terms
    preferred_terms JSONB DEFAULT '{}'::jsonb, -- Preferred contract terms
    
    -- LLM configuration for this partner/use-case
    llm_provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    llm_model VARCHAR(100) NOT NULL DEFAULT 'gpt-4',
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique combinations
    UNIQUE (publisher_id, partner_type, partner_name, use_case)
);

-- Add indexes for fast lookups
CREATE INDEX idx_partner_strategies_publisher ON partner_negotiation_strategies(publisher_id);
CREATE INDEX idx_partner_strategies_partner ON partner_negotiation_strategies(partner_type, partner_name);
CREATE INDEX idx_partner_strategies_use_case ON partner_negotiation_strategies(use_case);

-- Update negotiations table to track partner and use case
ALTER TABLE negotiations 
    ADD COLUMN IF NOT EXISTS partner_type VARCHAR(50),
    ADD COLUMN IF NOT EXISTS partner_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS use_case VARCHAR(50),
    ADD COLUMN IF NOT EXISTS strategy_id INTEGER REFERENCES partner_negotiation_strategies(id);

CREATE INDEX idx_negotiations_partner ON negotiations(partner_type, partner_name);
CREATE INDEX idx_negotiations_use_case ON negotiations(use_case);

-- Seed data for Publisher 1 (ID 1)
-- Tier 1 AI Companies (OpenAI, Google, Anthropic) - Premium pricing
INSERT INTO partner_negotiation_strategies 
    (publisher_id, partner_type, partner_name, use_case, pricing_model, min_price, max_price, preferred_price, negotiation_style, auto_accept_threshold, llm_provider, llm_model, deal_breakers, preferred_terms)
VALUES
    -- OpenAI specific rules
    (1, 'specific_partner', 'OpenAI', 'training', 'per_token', 0.010, 0.050, 0.025, 'balanced', 0.90, 'openai', 'gpt-4', 
     '["no_resale", "no_synthetic_data"]'::jsonb,
     '{"attribution": true, "audit_rights": true, "data_retention": "6 months"}'::jsonb),
    
    (1, 'specific_partner', 'OpenAI', 'inference', 'per_token', 0.005, 0.020, 0.010, 'balanced', 0.92, 'openai', 'gpt-4',
     '["no_resale"]'::jsonb,
     '{"attribution": true, "usage_reporting": "monthly"}'::jsonb),
    
    -- Anthropic specific rules
    (1, 'specific_partner', 'Anthropic', 'training', 'per_token', 0.008, 0.040, 0.020, 'cooperative', 0.88, 'anthropic', 'claude-3-opus-20240229',
     '["no_resale"]'::jsonb,
     '{"attribution": true, "data_quality_feedback": true}'::jsonb),
    
    (1, 'specific_partner', 'Anthropic', 'inference', 'per_token', 0.004, 0.015, 0.008, 'cooperative', 0.90, 'anthropic', 'claude-3-opus-20240229',
     '[]'::jsonb,
     '{"attribution": true}'::jsonb),
    
    -- Generic Tier 1 (for Google, Microsoft, etc.)
    (1, 'tier1_ai', NULL, 'training', 'per_token', 0.008, 0.040, 0.020, 'balanced', 0.90, 'openai', 'gpt-4',
     '["no_resale"]'::jsonb,
     '{"attribution": true, "audit_rights": true}'::jsonb),
    
    (1, 'tier1_ai', NULL, 'inference', 'per_token', 0.004, 0.015, 0.008, 'balanced', 0.92, 'openai', 'gpt-4',
     '[]'::jsonb,
     '{"attribution": true}'::jsonb),
    
    (1, 'tier1_ai', NULL, 'search', 'per_query', 0.001, 0.010, 0.005, 'balanced', 0.93, 'openai', 'gpt-4',
     '[]'::jsonb,
     '{"attribution": true, "crawl_rate_limit": "10/second"}'::jsonb),
    
    -- Tier 2 AI Companies (Cohere, Mistral, etc.) - Mid-tier pricing
    (1, 'tier2_ai', NULL, 'training', 'per_token', 0.005, 0.025, 0.012, 'balanced', 0.88, 'openai', 'gpt-4',
     '["no_resale"]'::jsonb,
     '{"attribution": true}'::jsonb),
    
    (1, 'tier2_ai', NULL, 'inference', 'per_token', 0.002, 0.010, 0.005, 'balanced', 0.90, 'openai', 'gpt-4',
     '[]'::jsonb,
     '{"attribution": true}'::jsonb),
    
    (1, 'tier2_ai', NULL, 'search', 'per_query', 0.0005, 0.005, 0.002, 'cooperative', 0.92, 'openai', 'gpt-4',
     '[]'::jsonb,
     '{"attribution": true}'::jsonb),
    
    -- Startups - Flexible pricing, more cooperative
    (1, 'startup', NULL, 'training', 'per_token', 0.002, 0.015, 0.006, 'cooperative', 0.85, 'openai', 'gpt-3.5-turbo',
     '[]'::jsonb,
     '{"attribution": true, "startup_discount": "available"}'::jsonb),
    
    (1, 'startup', NULL, 'inference', 'per_token', 0.001, 0.008, 0.003, 'cooperative', 0.88, 'openai', 'gpt-3.5-turbo',
     '[]'::jsonb,
     '{"attribution": true}'::jsonb),
    
    (1, 'startup', NULL, 'general', 'per_token', 0.001, 0.010, 0.004, 'cooperative', 0.87, 'openai', 'gpt-3.5-turbo',
     '[]'::jsonb,
     '{"attribution": true, "volume_discounts": true}'::jsonb),
    
    -- Research institutions - Lower pricing, cooperative
    (1, 'research', NULL, 'training', 'per_token', 0.001, 0.008, 0.003, 'cooperative', 0.82, 'openai', 'gpt-3.5-turbo',
     '[]'::jsonb,
     '{"attribution": true, "academic_use_only": true, "publication_rights": "must_notify"}'::jsonb),
    
    (1, 'research', NULL, 'general', 'per_token', 0.0005, 0.005, 0.002, 'cooperative', 0.85, 'openai', 'gpt-3.5-turbo',
     '[]'::jsonb,
     '{"attribution": true, "academic_use_only": true}'::jsonb);

-- Seed data for Publisher 2 (ID 2) - More aggressive pricing
INSERT INTO partner_negotiation_strategies 
    (publisher_id, partner_type, partner_name, use_case, pricing_model, min_price, max_price, preferred_price, negotiation_style, auto_accept_threshold, llm_provider, llm_model)
VALUES
    (2, 'tier1_ai', NULL, 'training', 'per_token', 0.015, 0.060, 0.035, 'aggressive', 0.92, 'openai', 'gpt-4'),
    (2, 'tier1_ai', NULL, 'inference', 'per_token', 0.008, 0.025, 0.015, 'aggressive', 0.94, 'openai', 'gpt-4'),
    (2, 'tier2_ai', NULL, 'training', 'per_token', 0.008, 0.035, 0.018, 'balanced', 0.90, 'openai', 'gpt-4'),
    (2, 'tier2_ai', NULL, 'inference', 'per_token', 0.004, 0.015, 0.008, 'balanced', 0.91, 'openai', 'gpt-4'),
    (2, 'startup', NULL, 'general', 'per_token', 0.003, 0.012, 0.006, 'balanced', 0.87, 'openai', 'gpt-3.5-turbo');

-- Add comments for documentation
COMMENT ON TABLE partner_negotiation_strategies IS 'Partner-specific negotiation strategies that differentiate by AI company tier, specific partner identity, and use case';
COMMENT ON COLUMN partner_negotiation_strategies.partner_type IS 'Tier classification: tier1_ai (OpenAI, Google), tier2_ai (Cohere, Mistral), startup, research, or specific_partner';
COMMENT ON COLUMN partner_negotiation_strategies.partner_name IS 'Specific partner name for targeted rules (e.g., "OpenAI", "Anthropic"), NULL for generic tier rules';
COMMENT ON COLUMN partner_negotiation_strategies.use_case IS 'How the AI will use the content: training (model training), inference (production queries), search (search engine), general (unspecified)';
COMMENT ON COLUMN partner_negotiation_strategies.auto_accept_threshold IS 'Automatically accept offers >= preferred_price * threshold (e.g., 0.90 means accept if offer is 90% of preferred price)';
COMMENT ON COLUMN partner_negotiation_strategies.deal_breakers IS 'Array of unacceptable terms that will cause immediate rejection';
COMMENT ON COLUMN partner_negotiation_strategies.preferred_terms IS 'JSON object of preferred contract terms and conditions';

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('010_partner_strategies.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 011_add_purpose_to_licenses.sql
-- ============================================================
-- Migration 011: Add purpose field to license_options to align with negotiation use cases
-- This distinguishes between the USE CASE (what the AI will do with the data)
-- and the LICENSE TYPE (what restrictions apply)

-- Add purpose column to license_options
ALTER TABLE license_options 
ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) DEFAULT 'inference' 
CHECK (purpose IN ('training', 'inference', 'search', 'general'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_license_purpose ON license_options(purpose);

-- Update existing licenses with sensible defaults based on license_type
-- Type 0 (Training + Display) â†’ training purpose
UPDATE license_options SET purpose = 'training' WHERE license_type = 0 AND purpose IS NULL;

-- Types 1-4 (RAG variants) â†’ inference purpose (most common for RAG)
UPDATE license_options SET purpose = 'inference' WHERE license_type IN (1, 2, 3, 4) AND purpose IS NULL;

-- Comments
COMMENT ON COLUMN license_options.purpose IS 'How the AI will use the content: training (model training), inference (production queries), search (search engine), general (unspecified)';

-- Note: This aligns license_options with the partner_negotiation_strategies.use_case field
-- Now negotiations can match use_case â†’ purpose, then determine appropriate license_type

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('011_add_purpose_to_licenses.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 012_multi_use_case_support.sql
-- ============================================================
-- Migration 012: Support multiple use cases for strategies and licenses
-- Change from single use_case/purpose to arrays to support multiple purposes

-- 1. Update partner_negotiation_strategies to use array
ALTER TABLE partner_negotiation_strategies 
DROP CONSTRAINT IF EXISTS partner_negotiation_strategies_use_case_check;

ALTER TABLE partner_negotiation_strategies 
ALTER COLUMN use_case TYPE TEXT[] USING ARRAY[use_case]::TEXT[];

ALTER TABLE partner_negotiation_strategies
ADD CONSTRAINT partner_negotiation_strategies_use_case_check 
CHECK (
  use_case <@ ARRAY['training', 'inference', 'search', 'general']::TEXT[] 
  AND array_length(use_case, 1) > 0
);

-- Drop the old unique constraint
ALTER TABLE partner_negotiation_strategies
DROP CONSTRAINT IF EXISTS partner_negotiation_strategies_publisher_id_partner_type_partner_key;

-- Drop and recreate the index for array queries
DROP INDEX IF EXISTS idx_partner_strategies_use_case;
CREATE INDEX idx_partner_strategies_use_case ON partner_negotiation_strategies USING GIN(use_case);

-- Update comment
COMMENT ON COLUMN partner_negotiation_strategies.use_case IS 'Array of use cases: training, inference, search, general. Strategies can support multiple use cases.';

-- 2. Update license_options to use array for purpose
ALTER TABLE license_options
DROP CONSTRAINT IF EXISTS license_options_purpose_check;

-- First convert the column type
ALTER TABLE license_options 
ALTER COLUMN purpose TYPE TEXT[] USING ARRAY[purpose]::TEXT[];

-- Then set the default
ALTER TABLE license_options
ALTER COLUMN purpose SET DEFAULT ARRAY['inference']::TEXT[];

-- Add the check constraint
ALTER TABLE license_options
ADD CONSTRAINT license_options_purpose_check 
CHECK (
  purpose <@ ARRAY['training', 'inference', 'search', 'general']::TEXT[] 
  AND array_length(purpose, 1) > 0
);

-- Drop and recreate the index for array queries
DROP INDEX IF EXISTS idx_license_purpose;
CREATE INDEX idx_license_purpose ON license_options USING GIN(purpose);

-- Update comment
COMMENT ON COLUMN license_options.purpose IS 'Array of use cases this license supports: training, inference, search, general. Licenses can support multiple purposes.';

-- 3. Update negotiations table to use array
ALTER TABLE negotiations
ALTER COLUMN use_case TYPE TEXT[] USING ARRAY[COALESCE(use_case, 'general')]::TEXT[];

DROP INDEX IF EXISTS idx_negotiations_use_case;
CREATE INDEX idx_negotiations_use_case ON negotiations USING GIN(use_case);

COMMENT ON COLUMN negotiations.use_case IS 'Array of use cases requested in the negotiation';

-- 4. Update existing data to sensible defaults
-- Convert any NULL arrays to default values
UPDATE partner_negotiation_strategies SET use_case = ARRAY['general']::TEXT[] WHERE use_case IS NULL OR array_length(use_case, 1) IS NULL;
UPDATE license_options SET purpose = ARRAY['inference']::TEXT[] WHERE purpose IS NULL OR array_length(purpose, 1) IS NULL;
UPDATE negotiations SET use_case = ARRAY['general']::TEXT[] WHERE use_case IS NULL OR array_length(use_case, 1) IS NULL;

-- Some strategies should support multiple use cases by default
-- Tier 1 AI companies often want both training and inference
UPDATE partner_negotiation_strategies 
SET use_case = ARRAY['training', 'inference']::TEXT[]
WHERE partner_type = 'tier1_ai' AND array_length(use_case, 1) = 1 AND use_case[1] IN ('training', 'inference');

-- Training licenses can also support inference
UPDATE license_options
SET purpose = ARRAY['training', 'inference']::TEXT[]
WHERE license_type = 0 AND array_length(purpose, 1) = 1 AND purpose[1] = 'training';

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('012_multi_use_case_support.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 013_fix_strategy_license_types.sql
-- ============================================================
-- Migration 013: Fix negotiation strategies to use license_type instead of use_case
-- This aligns negotiation strategies with the actual license type system (0-4)

BEGIN;

-- Drop the old use_case column and related constraints/indexes
ALTER TABLE partner_negotiation_strategies 
  DROP COLUMN IF EXISTS use_case CASCADE;

-- Add license_type as INTEGER[] to match the license system
ALTER TABLE partner_negotiation_strategies 
  ADD COLUMN license_type INTEGER[] DEFAULT ARRAY[1]::INTEGER[] NOT NULL;

-- Add check constraint to ensure valid license types (0-4)
ALTER TABLE partner_negotiation_strategies
  ADD CONSTRAINT check_license_type_values 
  CHECK (
    license_type <@ ARRAY[0, 1, 2, 3, 4]::INTEGER[]
    AND array_length(license_type, 1) > 0
  );

-- Create GIN index for efficient array queries
CREATE INDEX idx_partner_strategies_license_type ON partner_negotiation_strategies USING GIN (license_type);

-- Add comment
COMMENT ON COLUMN partner_negotiation_strategies.license_type IS 
  'Array of license types this strategy applies to (0=Training+Display, 1=RAG Unrestricted, 2=RAG Max Words, 3=RAG Attribution, 4=RAG No Display)';

-- Reseed with proper license types matching the license system
DELETE FROM partner_negotiation_strategies;

-- OpenAI: Training and RAG Unrestricted
INSERT INTO partner_negotiation_strategies (
  publisher_id, partner_type, partner_name, license_type,
  pricing_model, min_price, preferred_price, max_price,
  negotiation_style, auto_accept_threshold, llm_provider, llm_model
) VALUES 
(1, 'specific_partner', 'OpenAI', ARRAY[0, 1]::INTEGER[], 'per_token', 0.001, 0.005, 0.020, 'balanced', 0.90, 'openai', 'gpt-4'),
(1, 'specific_partner', 'Anthropic', ARRAY[0, 1]::INTEGER[], 'per_token', 0.001, 0.005, 0.020, 'balanced', 0.90, 'openai', 'gpt-4'),
(1, 'specific_partner', 'Google', ARRAY[0, 1]::INTEGER[], 'per_token', 0.001, 0.004, 0.015, 'balanced', 0.90, 'openai', 'gpt-4'),
(1, 'specific_partner', 'Microsoft', ARRAY[0, 1]::INTEGER[], 'per_token', 0.001, 0.005, 0.020, 'cooperative', 0.85, 'openai', 'gpt-4'),
(1, 'specific_partner', 'Meta', ARRAY[0, 1]::INTEGER[], 'per_token', 0.001, 0.004, 0.018, 'balanced', 0.90, 'openai', 'gpt-4');

-- Tier 1 AI: Training and RAG Unrestricted
INSERT INTO partner_negotiation_strategies (
  publisher_id, partner_type, partner_name, license_type,
  pricing_model, min_price, preferred_price, max_price,
  negotiation_style, auto_accept_threshold, llm_provider, llm_model
) VALUES 
(1, 'tier1_ai', NULL, ARRAY[0, 1]::INTEGER[], 'per_token', 0.001, 0.005, 0.020, 'balanced', 0.90, 'openai', 'gpt-4');

-- Tier 2 AI: RAG with restrictions (Max Words, Attribution, No Display)
INSERT INTO partner_negotiation_strategies (
  publisher_id, partner_type, partner_name, license_type,
  pricing_model, min_price, preferred_price, max_price,
  negotiation_style, auto_accept_threshold, llm_provider, llm_model
) VALUES 
(1, 'tier2_ai', NULL, ARRAY[2, 3, 4]::INTEGER[], 'per_token', 0.0005, 0.003, 0.015, 'balanced', 0.85, 'openai', 'gpt-4');

-- Startups: RAG Unrestricted and restricted options
INSERT INTO partner_negotiation_strategies (
  publisher_id, partner_type, partner_name, license_type,
  pricing_model, min_price, preferred_price, max_price,
  negotiation_style, auto_accept_threshold, llm_provider, llm_model
) VALUES 
(1, 'startup', NULL, ARRAY[1, 2, 3]::INTEGER[], 'per_query', 0.0001, 0.001, 0.005, 'cooperative', 0.80, 'openai', 'gpt-4');

-- Research: Training and all RAG options
INSERT INTO partner_negotiation_strategies (
  publisher_id, partner_type, partner_name, license_type,
  pricing_model, min_price, preferred_price, max_price,
  negotiation_style, auto_accept_threshold, llm_provider, llm_model
) VALUES 
(1, 'research', NULL, ARRAY[0, 1, 2, 3]::INTEGER[], 'per_query', 0.00001, 0.0005, 0.003, 'cooperative', 0.75, 'openai', 'gpt-4');

COMMIT;

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('013_fix_strategy_license_types.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 014_remove_purpose_use_license_type.sql
-- ============================================================
-- Migration 014: Remove redundant purpose field from license_options
-- license_type already defines the use case (0-4), so purpose is redundant

BEGIN;

-- Drop the purpose column from license_options
ALTER TABLE license_options 
  DROP COLUMN IF EXISTS purpose CASCADE;

COMMIT;

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('014_remove_purpose_use_license_type.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 015_add_license_linking.sql
-- ============================================================
-- Migration 015: Add license linking and fix negotiations for license_type
-- 1. Add license_id to track auto-created licenses from accepted negotiations
-- 2. Replace use_case with license_type in negotiations table

BEGIN;

-- Add license_id column to link accepted negotiations to their created license
ALTER TABLE negotiations
  ADD COLUMN IF NOT EXISTS license_id INTEGER REFERENCES license_options(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_negotiations_license_id ON negotiations(license_id);

COMMENT ON COLUMN negotiations.license_id IS 'License auto-created when negotiation is accepted';

-- Drop old use_case column
ALTER TABLE negotiations
  DROP COLUMN IF EXISTS use_case CASCADE;

-- Add license_type as INTEGER to match the license system (0-4)
ALTER TABLE negotiations
  ADD COLUMN license_type INTEGER DEFAULT 1 NOT NULL;

-- Add check constraint for valid license types
ALTER TABLE negotiations
  ADD CONSTRAINT check_negotiation_license_type
  CHECK (license_type >= 0 AND license_type <= 4);

CREATE INDEX IF NOT EXISTS idx_negotiations_license_type ON negotiations(license_type);

COMMENT ON COLUMN negotiations.license_type IS 'License type requested (0=Training+Display, 1=RAG Unrestricted, 2=RAG Max Words, 3=RAG Attribution, 4=RAG No Display)';

COMMIT;

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('015_add_license_linking.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 016_create_notifications.sql
-- ============================================================
-- Migration: Create notifications table
-- Purpose: Track publisher notifications for negotiation events

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  related_entity_type VARCHAR(50),
  related_entity_id VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  CONSTRAINT valid_notification_type CHECK (
    type IN (
      'negotiation_initiated',
      'negotiation_round',
      'negotiation_accepted',
      'negotiation_rejected',
      'negotiation_timeout',
      'license_created',
      'strategy_match'
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_notifications_publisher ON notifications(publisher_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(publisher_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

-- Comments
COMMENT ON TABLE notifications IS 'Stores notifications for publishers about negotiation and license events';
COMMENT ON COLUMN notifications.type IS 'Type of notification: negotiation_initiated, negotiation_round, negotiation_accepted, negotiation_rejected, negotiation_timeout, license_created, strategy_match';
COMMENT ON COLUMN notifications.metadata IS 'Additional data about the notification (e.g., terms, client info, prices)';
COMMENT ON COLUMN notifications.related_entity_type IS 'Type of related entity: negotiation, license, strategy';
COMMENT ON COLUMN notifications.related_entity_id IS 'ID of related entity (UUID or integer as string)';

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('016_create_notifications.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 019_add_license_name.sql
-- ============================================================
-- Add name column to license_options table
ALTER TABLE license_options
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add index for searching by name
CREATE INDEX IF NOT EXISTS idx_license_name ON license_options(name);

-- Add comment
COMMENT ON COLUMN license_options.name IS 'Human-readable name for the license (e.g., OpenAI_Training_0.005, Claude_RAG_0.002)';

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('019_add_license_name.sql') ON CONFLICT DO NOTHING;


-- ============================================================
-- Migration: 020_migrate_purpose_to_license_type.sql
-- ============================================================
-- Migration: Replace 'purpose' with 'license_type' in usage_events table
-- This aligns with the license_type system (0-4) instead of text purposes

-- Add license_type column (integer matching license_options.license_type)
ALTER TABLE usage_events 
ADD COLUMN license_type INTEGER DEFAULT 1;

-- Create index for license_type
CREATE INDEX idx_usage_events_license_type ON usage_events(license_type);

-- Optional: Drop purpose column after migration
-- ALTER TABLE usage_events DROP COLUMN purpose;

-- Note: Existing 'purpose' data cannot be automatically mapped to license_type
-- as the purposes were text values like 'inference', 'training', 'rag'
-- New usage events will use license_type (0-4) going forward:
--   0 = Training + Display
--   1 = RAG Display Unrestricted
--   2 = RAG Display Max Words
--   3 = RAG Display Attribution
--   4 = RAG No Display

-- Record migration
INSERT INTO schema_migrations (migration_name) VALUES ('020_migrate_purpose_to_license_type.sql') ON CONFLICT DO NOTHING;


COMMIT;

-- Show all applied migrations
SELECT migration_name, applied_at FROM schema_migrations ORDER BY id;

-- Verify critical tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('license_options', 'access_endpoints', 'content') ORDER BY table_name;
