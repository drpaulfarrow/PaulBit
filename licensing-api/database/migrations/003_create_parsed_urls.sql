-- Migration: Create parsed_urls table to store user's URL library
-- This table tracks all URLs that have been parsed via the grounding API

CREATE TABLE IF NOT EXISTS parsed_urls (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    domain VARCHAR(255) NOT NULL,
    title TEXT,
    description TEXT,
    content TEXT,
    first_parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parse_count INTEGER DEFAULT 1,
    last_status VARCHAR(50) DEFAULT 'success',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_parsed_urls_domain ON parsed_urls(domain);

-- Index for sorting by last parsed
CREATE INDEX IF NOT EXISTS idx_parsed_urls_last_parsed ON parsed_urls(last_parsed_at DESC);

-- Index for full-text search on title/description
CREATE INDEX IF NOT EXISTS idx_parsed_urls_search ON parsed_urls USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));
