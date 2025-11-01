-- Insert sample access endpoints for publisher_id = 1
-- Access endpoints represent different ways clients can access content

INSERT INTO access_endpoints (
  publisher_id,
  name,
  description,
  access_type,
  endpoint,
  auth_type,
  rate_limit,
  requires_mtls,
  request_format,
  response_format,
  sample_request,
  sample_response,
  ext
) VALUES 
-- HTML Access (Type 0)
(
  1,
  'HTML Web Access',
  'Standard web browser access to HTML content',
  0,
  'https://site-a.local/content/{url}',
  'none',
  1000,
  false,
  'html',
  'html',
  'GET https://site-a.local/content/https://example.com/article/ai-trends-2024',
  '<html>...</html>',
  '{"content_type": "text/html", "charset": "utf-8"}'::jsonb
),
-- RSS Feed (Type 1)
(
  1,
  'RSS Feed',
  'RSS/Atom feed syndication endpoint',
  1,
  'https://site-a.local/feed/rss',
  'api_key',
  100,
  false,
  'xml',
  'xml',
  'GET https://site-a.local/feed/rss?api_key=xxx',
  '<?xml version="1.0"?><rss>...</rss>',
  '{"feed_type": "rss", "update_frequency": "hourly"}'::jsonb
),
-- REST API (Type 2)
(
  1,
  'REST API',
  'RESTful API for programmatic access',
  2,
  'https://site-a.local/api/v1/content',
  'api_key',
  500,
  false,
  'json',
  'json',
  'POST https://site-a.local/api/v1/content
Content-Type: application/json
Authorization: Bearer api_key_here

{"url": "https://example.com/article/ai-trends-2024"}',
  '{"content": "...", "metadata": {...}}',
  '{"version": "v1", "supports_batch": true}'::jsonb
),
-- MCP Server (Type 3)
(
  1,
  'MCP Server',
  'Model Context Protocol server endpoint',
  3,
  'https://site-a.local/mcp',
  'oauth2',
  200,
  true,
  'json',
  'json',
  'POST https://site-a.local/mcp
Content-Type: application/json
Authorization: Bearer oauth_token

{"method": "content.fetch", "params": {"url": "https://example.com/article"}}',
  '{"result": {...}, "error": null}',
  '{"mcp_version": "1.0", "capabilities": ["content.fetch", "content.search"]}'::jsonb
),
-- Natural Language Web (Type 4)
(
  1,
  'NLWeb Access',
  'Natural Language Web interface',
  4,
  'https://site-a.local/nlweb',
  'none',
  1000,
  false,
  'text',
  'text',
  'GET https://site-a.local/nlweb?query=latest+AI+news',
  'Here are the latest articles about AI...',
  '{"nl_interface": true, "supports_queries": true}'::jsonb
);

SELECT 'Sample access endpoints added' AS result;

