-- Migration 006: Add page-level policy support
-- This allows policies to be defined at both publisher-default and page-specific levels
-- Idempotent: can be safely re-run

-- Add url_pattern column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='policies' AND column_name='url_pattern') THEN
        ALTER TABLE policies ADD COLUMN url_pattern TEXT DEFAULT NULL;
    END IF;
END $$;

-- Add name column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='policies' AND column_name='name') THEN
        ALTER TABLE policies ADD COLUMN name VARCHAR(255) DEFAULT 'Default Policy';
    END IF;
END $$;

-- Add description column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='policies' AND column_name='description') THEN
        ALTER TABLE policies ADD COLUMN description TEXT DEFAULT NULL;
    END IF;
END $$;

-- Drop old constraint if it exists
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_publisher_id_version_key;

-- Create unique index for default policies if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_policies_publisher_default') THEN
        CREATE UNIQUE INDEX idx_policies_publisher_default 
        ON policies (publisher_id, version) 
        WHERE url_pattern IS NULL;
    END IF;
END $$;

-- Create unique index for URL-specific policies if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_policies_publisher_url') THEN
        CREATE UNIQUE INDEX idx_policies_publisher_url 
        ON policies (publisher_id, url_pattern, version) 
        WHERE url_pattern IS NOT NULL;
    END IF;
END $$;

-- Create lookup index if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_policies_url_pattern') THEN
        CREATE INDEX idx_policies_url_pattern ON policies (publisher_id, url_pattern) 
        WHERE url_pattern IS NOT NULL;
    END IF;
END $$;

-- Update existing policies to be default policies
UPDATE policies 
SET name = COALESCE(name, 'Default Policy'), 
    description = COALESCE(description, 'Publisher-wide default licensing policy')
WHERE url_pattern IS NULL AND (name IS NULL OR description IS NULL);
