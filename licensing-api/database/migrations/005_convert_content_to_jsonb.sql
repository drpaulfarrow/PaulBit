-- Migration: Change content column from TEXT to JSONB for structured storage
-- This migration is idempotent and can be safely re-run

DO $$
BEGIN
    -- Only alter if column is not already JSONB
    IF (SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'parsed_urls' AND column_name = 'content') != 'jsonb' THEN
        
        ALTER TABLE parsed_urls ALTER COLUMN content TYPE JSONB USING 
            CASE 
                WHEN content IS NULL OR content = '' THEN '{}'::jsonb
                WHEN content ~ '^[\s]*\{.*\}[\s]*$' THEN content::jsonb
                ELSE jsonb_build_object('header', '', 'main', content, 'footer', '')
            END;
    END IF;
END $$;

-- Set default value (idempotent)
ALTER TABLE parsed_urls ALTER COLUMN content SET DEFAULT '{}'::jsonb;
