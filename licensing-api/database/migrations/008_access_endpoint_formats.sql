-- Migration 008: Add request/response format fields to access_endpoints
-- This enables the scraper to properly format requests and parse responses

-- Add request/response format columns
ALTER TABLE access_endpoints
ADD COLUMN request_format VARCHAR(50) DEFAULT 'json',
ADD COLUMN response_format VARCHAR(50) DEFAULT 'json',
ADD COLUMN request_headers JSONB DEFAULT '{}',
ADD COLUMN sample_request TEXT,
ADD COLUMN sample_response TEXT;

-- Add comments
COMMENT ON COLUMN access_endpoints.request_format IS 'Format of API requests: json, form-data, xml, graphql, etc.';
COMMENT ON COLUMN access_endpoints.response_format IS 'Format of API responses: json, html, xml, rss, plain, etc.';
COMMENT ON COLUMN access_endpoints.request_headers IS 'Custom headers required for requests (key-value pairs)';
COMMENT ON COLUMN access_endpoints.sample_request IS 'Example request body/payload';
COMMENT ON COLUMN access_endpoints.sample_response IS 'Example response structure';

-- Update existing access endpoints with sensible defaults based on access_type
UPDATE access_endpoints 
SET 
  request_format = CASE 
    WHEN access_type = 0 THEN 'http-get'  -- HTML
    WHEN access_type = 1 THEN 'http-get'  -- RSS
    WHEN access_type = 2 THEN 'json'      -- API
    WHEN access_type = 3 THEN 'json'      -- MCP
    WHEN access_type = 4 THEN 'http-get'  -- NLWeb
    ELSE 'json'
  END,
  response_format = CASE 
    WHEN access_type = 0 THEN 'html'      -- HTML
    WHEN access_type = 1 THEN 'xml'       -- RSS
    WHEN access_type = 2 THEN 'json'      -- API
    WHEN access_type = 3 THEN 'json'      -- MCP
    WHEN access_type = 4 THEN 'html'      -- NLWeb
    ELSE 'json'
  END
WHERE request_format IS NULL OR response_format IS NULL;
