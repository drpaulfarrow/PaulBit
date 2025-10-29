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
