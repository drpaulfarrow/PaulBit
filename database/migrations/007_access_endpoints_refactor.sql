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
