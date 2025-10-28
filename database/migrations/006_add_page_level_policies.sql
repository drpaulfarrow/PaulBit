-- Migration 006: Add page-level policy support
-- This allows policies to be defined at both publisher-default and page-specific levels

-- Add url_pattern column to policies table
-- NULL = default publisher-level policy
-- Non-NULL = page-specific policy (matches exact URL or pattern)
ALTER TABLE policies 
ADD COLUMN url_pattern TEXT DEFAULT NULL;

-- Add name/description for easier management
ALTER TABLE policies
ADD COLUMN name VARCHAR(255) DEFAULT 'Default Policy',
ADD COLUMN description TEXT DEFAULT NULL;

-- Update the unique constraint to include url_pattern
-- This allows multiple policies per publisher (one default + multiple page-specific)
ALTER TABLE policies 
DROP CONSTRAINT IF EXISTS policies_publisher_id_version_key;

-- New unique constraint: one default policy per publisher, and unique URL patterns per publisher
CREATE UNIQUE INDEX idx_policies_publisher_default 
ON policies (publisher_id, version) 
WHERE url_pattern IS NULL;

CREATE UNIQUE INDEX idx_policies_publisher_url 
ON policies (publisher_id, url_pattern, version) 
WHERE url_pattern IS NOT NULL;

-- Index for faster lookups
CREATE INDEX idx_policies_url_pattern ON policies (publisher_id, url_pattern) 
WHERE url_pattern IS NOT NULL;

-- Update existing policies to be default policies
UPDATE policies 
SET name = 'Default Policy', 
    description = 'Publisher-wide default licensing policy'
WHERE url_pattern IS NULL;
