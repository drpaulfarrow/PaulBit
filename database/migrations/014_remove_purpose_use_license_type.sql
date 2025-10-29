-- Migration 014: Remove redundant purpose field from license_options
-- license_type already defines the use case (0-4), so purpose is redundant

BEGIN;

-- Drop the purpose column from license_options
ALTER TABLE license_options 
  DROP COLUMN IF EXISTS purpose CASCADE;

COMMIT;
