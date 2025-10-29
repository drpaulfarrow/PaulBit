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
