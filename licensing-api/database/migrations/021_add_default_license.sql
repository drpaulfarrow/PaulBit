-- Migration 021: Add default non-deletable parent license
-- Purpose: Create a default parent license template that cannot be deleted

BEGIN;

-- Create default license for publisher_id = 1 if it doesn't exist
-- This is a parent license (content_id IS NULL) named 'default'
INSERT INTO license_options (
  license_id,
  publisher_id,
  content_id,
  name,
  license_type,
  price,
  currency,
  status,
  attribution_required,
  derivative_allowed
)
SELECT 
  'default',
  1,
  NULL, -- NULL content_id means it's a parent/template license
  'default',
  1, -- License type 1: RAG Display (Unrestricted) - most common default
  0.002, -- Default price
  'USD',
  'active',
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM license_options 
  WHERE license_id = 'default' AND publisher_id = 1
);

COMMENT ON COLUMN license_options.content_id IS 'NULL means this is a parent/template license. Non-NULL means it is assigned to specific content.';
COMMENT ON COLUMN license_options.name IS 'Human-readable name. Name="default" with content_id=NULL indicates a non-deletable parent license template.';

COMMIT;

