-- Migration: Add content column to parsed_urls table
-- This allows storing structured content with header/main/footer sections

ALTER TABLE parsed_urls ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{}';
