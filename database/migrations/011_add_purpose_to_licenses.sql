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
-- Type 0 (Training + Display) → training purpose
UPDATE license_options SET purpose = 'training' WHERE license_type = 0 AND purpose IS NULL;

-- Types 1-4 (RAG variants) → inference purpose (most common for RAG)
UPDATE license_options SET purpose = 'inference' WHERE license_type IN (1, 2, 3, 4) AND purpose IS NULL;

-- Comments
COMMENT ON COLUMN license_options.purpose IS 'How the AI will use the content: training (model training), inference (production queries), search (search engine), general (unspecified)';

-- Note: This aligns license_options with the partner_negotiation_strategies.use_case field
-- Now negotiations can match use_case → purpose, then determine appropriate license_type
