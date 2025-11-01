-- Populate Azure database with sample data for testing
-- This combines all the sample data inserts

-- Add sample negotiations
INSERT INTO negotiations (publisher_id, client_id, client_name, strategy_id, status, initial_proposal, current_terms, partner_type, partner_name, license_type) 
SELECT 1, 1, 'OpenAI', 21, 'pending', '{"price": 0.005, "term_months": 12}'::jsonb, '{"price": 0.005, "term_months": 12}'::jsonb, 'specific_partner', 'OpenAI', 1
WHERE NOT EXISTS (SELECT 1 FROM negotiations WHERE publisher_id = 1 LIMIT 1);

INSERT INTO negotiations (publisher_id, client_id, client_name, strategy_id, status, initial_proposal, current_terms, partner_type, partner_name, license_type) VALUES 
(1, 2, 'Anthropic', 22, 'pending', '{"price": 0.004, "term_months": 6}'::jsonb, '{"price": 0.004, "term_months": 6}'::jsonb, 'specific_partner', 'Anthropic', 1),
(1, 1, 'OpenAI', 21, 'accepted', '{"price": 0.003, "term_months": 12}'::jsonb, '{"price": 0.003, "term_months": 12}'::jsonb, 'specific_partner', 'OpenAI', 1),
(1, 3, 'Perplexity', 26, 'rejected', '{"price": 0.002, "term_months": 3}'::jsonb, '{"price": 0.002, "term_months": 3}'::jsonb, 'tier1_ai', 'Perplexity', 1)
ON CONFLICT DO NOTHING;

-- Insert mock notifications
INSERT INTO notifications (publisher_id, type, title, message, metadata, related_entity_type, related_entity_id, is_read, created_at) VALUES 
(1, 'negotiation_initiated', 'New negotiation from OpenAI', 'OpenAI (tier1_ai) initiated a negotiation for training use. Proposed price: $0.0150', '{"client_name": "OpenAI", "partner_type": "tier1_ai", "use_case": "training", "proposed_price": 0.015}', 'negotiation', '550e8400-e29b-41d4-a716-446655440001', false, NOW() - INTERVAL '2 hours'),
(1, 'negotiation_round', 'OpenAI - Round 3', 'OpenAI countered with new terms in round 3. Price: $0.0120', '{"client_name": "OpenAI", "round_number": 3, "action": "counter", "proposed_price": 0.012}', 'negotiation', '550e8400-e29b-41d4-a716-446655440001', false, NOW() - INTERVAL '1 hour'),
(1, 'negotiation_accepted', '✅ Negotiation accepted with Anthropic', 'Agreement reached with Anthropic. Final price: $0.0085. License #42 created.', '{"client_name": "Anthropic", "final_price": 0.0085, "license_id": 42}', 'negotiation', '550e8400-e29b-41d4-a716-446655440002', true, NOW() - INTERVAL '5 hours'),
(1, 'negotiation_rejected', '❌ Negotiation rejected with Google', 'Negotiation with Google was rejected. Reason: Price below minimum threshold', '{"client_name": "Google", "reason": "Price below minimum threshold"}', 'negotiation', '550e8400-e29b-41d4-a716-446655440003', true, NOW() - INTERVAL '1 day'),
(1, 'license_created', '📄 New license created for Anthropic', 'License #42 has been created for Anthropic. Price: $0.0085', '{"license_id": 42, "client_name": "Anthropic", "price": 0.0085}', 'license', '42', true, NOW() - INTERVAL '5 hours'),
(1, 'negotiation_timeout', '⏱️ Negotiation timeout with Perplexity', 'Negotiation with Perplexity has timed out without reaching an agreement.', '{"client_name": "Perplexity"}', 'negotiation', '550e8400-e29b-41d4-a716-446655440004', false, NOW() - INTERVAL '3 days'),
(1, 'negotiation_initiated', 'New negotiation from Cohere', 'Cohere (tier2_ai) initiated a negotiation for inference use. Proposed price: $0.0035', '{"client_name": "Cohere", "partner_type": "tier2_ai", "use_case": "inference", "proposed_price": 0.0035}', 'negotiation', '550e8400-e29b-41d4-a716-446655440005', false, NOW() - INTERVAL '30 minutes')
ON CONFLICT DO NOTHING;

-- Insert sample access endpoints
INSERT INTO access_endpoints (
  publisher_id, name, description, access_type, endpoint, auth_type, rate_limit, requires_mtls,
  request_format, response_format, sample_request, sample_response, ext
) 
SELECT 1, 'HTML Web Access', 'Standard web browser access to HTML content', 0, 'https://site-a.local/content/{url}', 'none', 1000, false, 'html', 'html', 'GET https://site-a.local/content/https://example.com/article/ai-trends-2024', '<html>...</html>', '{"content_type": "text/html", "charset": "utf-8"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM access_endpoints WHERE publisher_id = 1 LIMIT 1);

-- Add more access endpoints
INSERT INTO access_endpoints (
  publisher_id, name, description, access_type, endpoint, auth_type, rate_limit, requires_mtls,
  request_format, response_format, sample_request, sample_response, ext
) VALUES 
(1, 'RSS Feed', 'RSS/Atom feed syndication endpoint', 1, 'https://site-a.local/feed/rss', 'api_key', 100, false, 'xml', 'xml', 'GET https://site-a.local/feed/rss?api_key=xxx', '<?xml version="1.0"?><rss>...</rss>', '{"feed_type": "rss", "update_frequency": "hourly"}'::jsonb),
(1, 'REST API', 'RESTful API for programmatic access', 2, 'https://site-a.local/api/v1/content', 'api_key', 500, false, 'json', 'json', 'POST https://site-a.local/api/v1/content', '{"content": "...", "metadata": {...}}', '{"version": "v1", "supports_batch": true}'::jsonb),
(1, 'MCP Server', 'Model Context Protocol server endpoint', 3, 'https://site-a.local/mcp', 'oauth2', 200, true, 'json', 'json', 'POST https://site-a.local/mcp', '{"result": {...}, "error": null}', '{"mcp_version": "1.0", "capabilities": ["content.fetch", "content.search"]}'::jsonb),
(1, 'NLWeb Access', 'Natural Language Web interface', 4, 'https://site-a.local/nlweb', 'none', 1000, false, 'text', 'text', 'GET https://site-a.local/nlweb?query=latest+AI+news', 'Here are the latest articles about AI...', '{"nl_interface": true, "supports_queries": true}'::jsonb)
ON CONFLICT DO NOTHING;

-- Insert dummy usage logs (only a few for testing)
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '1 hour', 1, 1, 'https://example.com/article/ai-trends-2024', 'GPT-4/1.0', 250000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 hours', 1, 1, 'https://example.com/news/tech-breakthrough', 'GPT-4/1.0', 180000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '6 hours', 1, 2, 'https://example.com/blog/machine-learning', 'Claude/3.0', 320000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '12 hours', 1, 1, 'https://example.com/article/quantum-computing', 'GPT-4/1.0', 290000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day', 1, 2, 'https://example.com/news/space-exploration', 'Claude/3.0', 210000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 hours', 1, 2, 'https://example.com/article/ai-ethics', 'Claude/3.0', 200000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '4 hours', 1, 3, 'https://example.com/article/search-technology', 'PerplexityBot/1.0', 150000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '15 minutes', 1, 1, 'https://example.com/trending/breaking-news', 'GPT-4/1.0', 340000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '20 minutes', 1, 2, 'https://example.com/trending/viral-story', 'Claude/3.0', 280000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '30 minutes', 1, 1, 'https://example.com/premium/expert-analysis', 'GPT-4/1.0', 450000, 'inference')
ON CONFLICT DO NOTHING;

