-- Migration: Change content column from TEXT to JSONB for structured storage
-- Converts existing text content to JSONB format

-- First, update existing text content to JSONB format
UPDATE parsed_urls 
SET content = jsonb_build_object(
    'header', '',
    'main', COALESCE(content, ''),
    'footer', ''
)
WHERE content IS NOT NULL AND content != '';

-- Change column type to JSONB
ALTER TABLE parsed_urls ALTER COLUMN content TYPE JSONB USING 
    CASE 
        WHEN content IS NULL OR content = '' THEN '{}'::jsonb
        ELSE jsonb_build_object('header', '', 'main', content, 'footer', '')
    END;

-- Set default value
ALTER TABLE parsed_urls ALTER COLUMN content SET DEFAULT '{}'::jsonb;
