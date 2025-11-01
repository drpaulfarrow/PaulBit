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
