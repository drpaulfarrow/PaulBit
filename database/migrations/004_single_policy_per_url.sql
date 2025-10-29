-- Migration: Single policy per URL pattern (remove versioning from uniqueness)
-- This allows only one active policy per URL pattern per publisher

-- Drop the existing unique constraint that includes version
DROP INDEX IF EXISTS idx_policies_publisher_url;

-- Create new unique constraint without version
-- This prevents duplicate URL patterns for the same publisher
CREATE UNIQUE INDEX idx_policies_publisher_url_unique 
ON policies (publisher_id, url_pattern) 
WHERE url_pattern IS NOT NULL;

-- For default policies (url_pattern IS NULL), keep the existing constraint
-- but make it simpler (one default per publisher, regardless of version)
DROP INDEX IF EXISTS idx_policies_publisher_default;

CREATE UNIQUE INDEX idx_policies_publisher_default_unique 
ON policies (publisher_id) 
WHERE url_pattern IS NULL;
