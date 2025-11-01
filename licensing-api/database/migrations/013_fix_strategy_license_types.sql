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
