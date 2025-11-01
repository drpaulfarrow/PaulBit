const express = require('express');
const db = require('../db');
const redis = require('../redis');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// GET /admin/clients - List all clients
router.get('/clients', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.id, c.name, c.contact_email, c.plan_id, c.created_at, p.name as plan_name
       FROM clients c
       LEFT JOIN plans p ON c.plan_id = p.id
       ORDER BY c.created_at DESC`
    );

    res.json({ clients: result.rows });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

// POST /admin/clients - Create a new client
router.post('/clients', async (req, res) => {
  try {
    const { name, contact_email, plan_id } = req.body;

    if (!name || !contact_email) {
      return res.status(400).json({ error: 'Missing required fields: name, contact_email' });
    }

    const result = await db.query(
      `INSERT INTO clients (name, contact_email, plan_id, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, name, contact_email, plan_id, created_at`,
      [name, contact_email, plan_id]
    );

    res.status(201).json({ client: result.rows[0] });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

// GET /admin/plans - List all pricing plans
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM plans ORDER BY price_per_fetch_micro ASC'
    );

    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /admin/plans - Create a new pricing plan
router.post('/plans', async (req, res) => {
  try {
    const { name, price_per_fetch_micro, token_ttl_seconds, burst_rps, purpose_mask } = req.body;

    if (!name || price_per_fetch_micro === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, price_per_fetch_micro' });
    }

    const result = await db.query(
      `INSERT INTO plans (name, price_per_fetch_micro, token_ttl_seconds, burst_rps, purpose_mask)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, price_per_fetch_micro, token_ttl_seconds || 600, burst_rps || 10, purpose_mask || 'inference']
    );

    res.status(201).json({ plan: result.rows[0] });
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
});

// GET /admin/publishers - List all publishers
router.get('/publishers', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM publishers ORDER BY name ASC'
    );

    res.json({ publishers: result.rows });
  } catch (error) {
    console.error('Error fetching publishers:', error);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

// POST /admin/tokens/:jti/revoke - Revoke a token
router.post('/tokens/:jti/revoke', async (req, res) => {
  try {
    const { jti } = req.params;

    // Mark as revoked in database
    await db.query(
      'UPDATE tokens SET revoked = true WHERE jti = $1',
      [jti]
    );

    // Remove from Redis allowlist
    await redis.revokeToken(jti);

    res.json({ success: true, message: 'Token revoked' });
  } catch (error) {
    console.error('Error revoking token:', error);
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

// GET /admin/logs - Get recent access logs
router.get('/logs', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const result = await db.query(
      `SELECT ue.*, p.name as publisher_name, c.name as client_name
       FROM usage_events ue
       LEFT JOIN publishers p ON ue.publisher_id = p.id
       LEFT JOIN clients c ON ue.client_id = c.id
       ORDER BY ue.ts DESC
       LIMIT $1`,
      [parseInt(limit)]
    );

    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// POST /admin/init-db - Initialize database with schema and seed data
router.post('/init-db', async (req, res) => {
  try {
    console.log('🔧 Starting database initialization...');

    // Read the init.sql file
    const initSqlPath = path.join(__dirname, '../../../database/init.sql');
    
    if (!fs.existsSync(initSqlPath)) {
      return res.status(500).json({
        success: false,
        error: 'init.sql file not found',
        path: initSqlPath
      });
    }

    const initSql = fs.readFileSync(initSqlPath, 'utf8');

    // Execute the SQL
    await db.query(initSql);

    console.log('✅ Database initialized successfully');

    // Verify data was created
    const publisherCount = await db.query('SELECT COUNT(*) FROM publishers');
    const policyCount = await db.query('SELECT COUNT(*) FROM policies');
    const planCount = await db.query('SELECT COUNT(*) FROM plans');

    res.json({
      success: true,
      message: 'Database initialized successfully',
      data: {
        publishers: parseInt(publisherCount.rows[0].count),
        policies: parseInt(policyCount.rows[0].count),
        plans: parseInt(planCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// GET /admin/db-status - Check database status
router.get('/db-status', async (req, res) => {
  try {
    const publisherCount = await db.query('SELECT COUNT(*) FROM publishers');
    const policyCount = await db.query('SELECT COUNT(*) FROM policies');
    const planCount = await db.query('SELECT COUNT(*) FROM plans');
    const clientCount = await db.query('SELECT COUNT(*) FROM clients');

    res.json({
      success: true,
      initialized: parseInt(publisherCount.rows[0].count) > 0,
      counts: {
        publishers: parseInt(publisherCount.rows[0].count),
        policies: parseInt(policyCount.rows[0].count),
        plans: parseInt(planCount.rows[0].count),
        clients: parseInt(clientCount.rows[0].count)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      initialized: false
    });
  }
});

// POST /admin/populate-sample-data - Populate database with sample data for testing
router.post('/populate-sample-data', async (req, res) => {
  try {
    console.log('🔧 Starting comprehensive sample data population...');

    // Comprehensive inline SQL for all UI sections
    const sampleDataSql = `
      -- ============================================
      -- 1. NEGOTIATION STRATEGIES (PartnerStrategies page)
      -- ============================================
      INSERT INTO partner_negotiation_strategies (
        publisher_id, partner_type, partner_name, license_type,
        pricing_model, min_price, preferred_price, max_price,
        negotiation_style, auto_accept_threshold, llm_provider, llm_model, deal_breakers, preferred_terms
      ) 
      SELECT 1, 'tier1_ai', NULL, ARRAY[0, 1]::INTEGER[],
       'per_token', 0.001, 0.005, 0.020, 'balanced', 0.90, 'openai', 'gpt-4',
       '[]'::jsonb, '{"attribution": true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM partner_negotiation_strategies WHERE publisher_id = 1 AND partner_type = 'tier1_ai' AND partner_name IS NULL LIMIT 1);
      
      INSERT INTO partner_negotiation_strategies (
        publisher_id, partner_type, partner_name, license_type,
        pricing_model, min_price, preferred_price, max_price,
        negotiation_style, auto_accept_threshold, llm_provider, llm_model, deal_breakers, preferred_terms
      ) 
      SELECT 1, 'specific_partner', 'OpenAI', ARRAY[0, 1]::INTEGER[],
       'per_token', 0.003, 0.008, 0.015, 'balanced', 0.85, 'openai', 'gpt-4',
       '["no_resale"]'::jsonb, '{"attribution": true, "audit_rights": true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM partner_negotiation_strategies WHERE publisher_id = 1 AND partner_type = 'specific_partner' AND partner_name = 'OpenAI' LIMIT 1);
      
      INSERT INTO partner_negotiation_strategies (
        publisher_id, partner_type, partner_name, license_type,
        pricing_model, min_price, preferred_price, max_price,
        negotiation_style, auto_accept_threshold, llm_provider, llm_model, deal_breakers, preferred_terms
      ) 
      SELECT 1, 'specific_partner', 'Anthropic', ARRAY[0, 1]::INTEGER[],
       'per_token', 0.002, 0.006, 0.012, 'cooperative', 0.88, 'anthropic', 'claude-3-opus-20240229',
       '[]'::jsonb, '{"attribution": true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM partner_negotiation_strategies WHERE publisher_id = 1 AND partner_type = 'specific_partner' AND partner_name = 'Anthropic' LIMIT 1);
      
      INSERT INTO partner_negotiation_strategies (
        publisher_id, partner_type, partner_name, license_type,
        pricing_model, min_price, preferred_price, max_price,
        negotiation_style, auto_accept_threshold, llm_provider, llm_model, deal_breakers, preferred_terms
      ) 
      SELECT 1, 'tier2_ai', NULL, ARRAY[1, 2]::INTEGER[],
       'per_token', 0.002, 0.005, 0.010, 'balanced', 0.90, 'openai', 'gpt-4',
       '[]'::jsonb, '{"attribution": true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM partner_negotiation_strategies WHERE publisher_id = 1 AND partner_type = 'tier2_ai' AND partner_name IS NULL LIMIT 1);

      -- ============================================
      -- 2. NEGOTIATIONS (ActiveNegotiations page)
      -- ============================================
      INSERT INTO negotiations (publisher_id, client_id, client_name, strategy_id, status, initial_proposal, current_terms, partner_type, partner_name, license_type, created_at) 
      SELECT 1, 1, 'OpenAI', 21, 'pending', '{"price": 0.005, "term_months": 12}'::jsonb, '{"price": 0.005, "term_months": 12}'::jsonb, 'specific_partner', 'OpenAI', 1, NOW() - INTERVAL '2 hours'
      WHERE NOT EXISTS (SELECT 1 FROM negotiations WHERE publisher_id = 1 AND client_name = 'OpenAI' AND status = 'pending' LIMIT 1);
      
      INSERT INTO negotiations (publisher_id, client_id, client_name, strategy_id, status, initial_proposal, current_terms, partner_type, partner_name, license_type, created_at) 
      SELECT 1, 2, 'Anthropic', 22, 'pending', '{"price": 0.004, "term_months": 6}'::jsonb, '{"price": 0.004, "term_months": 6}'::jsonb, 'specific_partner', 'Anthropic', 1, NOW() - INTERVAL '1 hour'
      WHERE NOT EXISTS (SELECT 1 FROM negotiations WHERE publisher_id = 1 AND client_name = 'Anthropic' AND status = 'pending' LIMIT 1);
      
      INSERT INTO negotiations (publisher_id, client_id, client_name, strategy_id, status, initial_proposal, current_terms, partner_type, partner_name, license_type, created_at) 
      SELECT 1, 1, 'OpenAI', 21, 'accepted', '{"price": 0.003, "term_months": 12}'::jsonb, '{"price": 0.003, "term_months": 12}'::jsonb, 'specific_partner', 'OpenAI', 1, NOW() - INTERVAL '1 day'
      WHERE NOT EXISTS (SELECT 1 FROM negotiations WHERE publisher_id = 1 AND client_name = 'OpenAI' AND status = 'accepted' LIMIT 1);
      
      INSERT INTO negotiations (publisher_id, client_id, client_name, strategy_id, status, initial_proposal, current_terms, partner_type, partner_name, license_type, created_at) 
      SELECT 1, 3, 'Perplexity', 26, 'rejected', '{"price": 0.002, "term_months": 3}'::jsonb, '{"price": 0.002, "term_months": 3}'::jsonb, 'tier1_ai', 'Perplexity', 1, NOW() - INTERVAL '3 days'
      WHERE NOT EXISTS (SELECT 1 FROM negotiations WHERE publisher_id = 1 AND client_name = 'Perplexity' AND status = 'rejected' LIMIT 1);

      INSERT INTO negotiations (publisher_id, client_name, strategy_id, license_type, status, current_round, initial_proposal, current_terms, initiated_at, last_activity_at) 
      SELECT 1, 'Anthropic Claude', 1, 2, 'negotiating', 1, '{"price": 0.008, "currency": "USD", "term_months": 24, "max_word_count": 500, "attribution_required": true}'::jsonb,
      '{"price": 0.008, "currency": "USD", "term_months": 24, "max_word_count": 500, "attribution_required": true}'::jsonb, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM negotiations WHERE publisher_id = 1 AND client_name = 'Anthropic Claude' LIMIT 1);

      -- ============================================
      -- 3. NOTIFICATIONS (Notifications page)
      -- ============================================
      INSERT INTO notifications (publisher_id, type, title, message, metadata, related_entity_type, related_entity_id, is_read, created_at) 
      SELECT 1, 'negotiation_initiated', 'New negotiation from OpenAI', 'OpenAI (tier1_ai) initiated a negotiation for training use. Proposed price: $0.0150', 
      '{"client_name": "OpenAI", "partner_type": "tier1_ai", "use_case": "training", "proposed_price": 0.015}'::jsonb, 
      'negotiation', '550e8400-e29b-41d4-a716-446655440001', false, NOW() - INTERVAL '2 hours'
      WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE publisher_id = 1 AND type = 'negotiation_initiated' AND related_entity_id = '550e8400-e29b-41d4-a716-446655440001' LIMIT 1);
      
      INSERT INTO notifications (publisher_id, type, title, message, metadata, related_entity_type, related_entity_id, is_read, created_at) 
      SELECT 1, 'negotiation_round', 'OpenAI - Round 3', 'OpenAI countered with new terms in round 3. Price: $0.0120', 
      '{"client_name": "OpenAI", "round_number": 3, "action": "counter", "proposed_price": 0.012}'::jsonb, 
      'negotiation', '550e8400-e29b-41d4-a716-446655440001', false, NOW() - INTERVAL '1 hour'
      WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE publisher_id = 1 AND type = 'negotiation_round' AND related_entity_id = '550e8400-e29b-41d4-a716-446655440001' LIMIT 1);
      
      INSERT INTO notifications (publisher_id, type, title, message, metadata, related_entity_type, related_entity_id, is_read, created_at) 
      SELECT 1, 'negotiation_accepted', '✅ Negotiation accepted with Anthropic', 'Agreement reached with Anthropic. Final price: $0.0085. License #42 created.', 
      '{"client_name": "Anthropic", "final_price": 0.0085, "license_id": 42}'::jsonb, 
      'negotiation', '550e8400-e29b-41d4-a716-446655440002', true, NOW() - INTERVAL '5 hours'
      WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE publisher_id = 1 AND type = 'negotiation_accepted' AND related_entity_id = '550e8400-e29b-41d4-a716-446655440002' LIMIT 1);
      
      INSERT INTO notifications (publisher_id, type, title, message, metadata, related_entity_type, related_entity_id, is_read, created_at) 
      SELECT 1, 'license_created', '📄 New license created for Anthropic', 'License #42 has been created for Anthropic. Price: $0.0085', 
      '{"license_id": 42, "client_name": "Anthropic", "price": 0.0085}'::jsonb, 
      'license', '42', true, NOW() - INTERVAL '5 hours'
      WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE publisher_id = 1 AND type = 'license_created' AND related_entity_id = '42' LIMIT 1);
      
      INSERT INTO notifications (publisher_id, type, title, message, metadata, related_entity_type, related_entity_id, is_read, created_at) 
      SELECT 1, 'negotiation_initiated', 'New negotiation from Cohere', 'Cohere (tier2_ai) initiated a negotiation for inference use. Proposed price: $0.0035', 
      '{"client_name": "Cohere", "partner_type": "tier2_ai", "use_case": "inference", "proposed_price": 0.0035}'::jsonb, 
      'negotiation', '550e8400-e29b-41d4-a716-446655440005', false, NOW() - INTERVAL '30 minutes'
      WHERE NOT EXISTS (SELECT 1 FROM notifications WHERE publisher_id = 1 AND type = 'negotiation_initiated' AND related_entity_id = '550e8400-e29b-41d4-a716-446655440005' LIMIT 1);

      -- ============================================
      -- 4. ACCESS ENDPOINTS (AccessConfiguration page)
      -- ============================================
      INSERT INTO access_endpoints (publisher_id, name, description, access_type, endpoint, auth_type, rate_limit, requires_mtls, request_format, response_format, sample_request, sample_response, ext) 
      SELECT 1, 'HTML Web Access', 'Standard web browser access to HTML content', 0, 'https://site-a.local/content/{url}', 'none', 1000, false, 'html', 'html', 
      'GET https://site-a.local/content/https://example.com/article/ai-trends-2024', '<html>...</html>', 
      '{"content_type": "text/html", "charset": "utf-8"}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM access_endpoints WHERE publisher_id = 1 AND name = 'HTML Web Access' LIMIT 1);
      
      INSERT INTO access_endpoints (publisher_id, name, description, access_type, endpoint, auth_type, rate_limit, requires_mtls, request_format, response_format, sample_request, sample_response, ext) 
      SELECT 1, 'RSS Feed', 'RSS/Atom feed syndication endpoint', 1, 'https://site-a.local/feed/rss', 'api_key', 100, false, 'xml', 'xml', 
      'GET https://site-a.local/feed/rss?api_key=xxx', '<?xml version="1.0"?><rss>...</rss>', 
      '{"feed_type": "rss", "update_frequency": "hourly"}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM access_endpoints WHERE publisher_id = 1 AND name = 'RSS Feed' LIMIT 1);
      
      INSERT INTO access_endpoints (publisher_id, name, description, access_type, endpoint, auth_type, rate_limit, requires_mtls, request_format, response_format, sample_request, sample_response, ext) 
      SELECT 1, 'REST API', 'RESTful API for programmatic access', 2, 'https://site-a.local/api/v1/content', 'api_key', 500, false, 'json', 'json', 
      'POST https://site-a.local/api/v1/content', '{"content": "...", "metadata": {...}}', 
      '{"version": "v1", "supports_batch": true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM access_endpoints WHERE publisher_id = 1 AND name = 'REST API' LIMIT 1);
      
      INSERT INTO access_endpoints (publisher_id, name, description, access_type, endpoint, auth_type, rate_limit, requires_mtls, request_format, response_format, sample_request, sample_response, ext) 
      SELECT 1, 'MCP Server', 'Model Context Protocol server endpoint', 3, 'https://site-a.local/mcp', 'oauth2', 200, true, 'json', 'json', 
      'POST https://site-a.local/mcp', '{"result": {...}, "error": null}', 
      '{"mcp_version": "1.0", "capabilities": ["content.fetch", "content.search"]}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM access_endpoints WHERE publisher_id = 1 AND name = 'MCP Server' LIMIT 1);
      
      INSERT INTO access_endpoints (publisher_id, name, description, access_type, endpoint, auth_type, rate_limit, requires_mtls, request_format, response_format, sample_request, sample_response, ext) 
      SELECT 1, 'NLWeb Access', 'Natural Language Web interface', 4, 'https://site-a.local/nlweb', 'none', 1000, false, 'text', 'text', 
      'GET https://site-a.local/nlweb?query=latest+AI+news', 'Here are the latest articles about AI...', 
      '{"nl_interface": true, "supports_queries": true}'::jsonb
      WHERE NOT EXISTS (SELECT 1 FROM access_endpoints WHERE publisher_id = 1 AND name = 'NLWeb Access' LIMIT 1);

      -- ============================================
      -- 5. USAGE EVENTS (Dashboard/Analytics/UsageLogs pages)
      -- ============================================
      INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) 
      SELECT gen_random_uuid(), NOW() - INTERVAL '1 hour', 1, 1, 'https://example.com/article/ai-trends-2024', 'GPT-4/1.0', 250000, 'inference'
      WHERE NOT EXISTS (SELECT 1 FROM usage_events WHERE publisher_id = 1 AND ts > NOW() - INTERVAL '2 hours' LIMIT 1);
      
      INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
      (gen_random_uuid(), NOW() - INTERVAL '3 hours', 1, 1, 'https://example.com/news/tech-breakthrough', 'GPT-4/1.0', 180000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '6 hours', 1, 2, 'https://example.com/blog/machine-learning', 'Claude/3.0', 320000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '12 hours', 1, 1, 'https://example.com/article/quantum-computing', 'GPT-4/1.0', 290000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '1 day', 1, 2, 'https://example.com/news/space-exploration', 'Claude/3.0', 210000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '2 days', 1, 3, 'https://example.com/article/search-technology', 'PerplexityBot/1.0', 150000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '15 minutes', 1, 1, 'https://example.com/trending/breaking-news', 'GPT-4/1.0', 340000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '20 minutes', 1, 2, 'https://example.com/trending/viral-story', 'Claude/3.0', 280000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '30 minutes', 1, 1, 'https://example.com/premium/expert-analysis', 'GPT-4/1.0', 450000, 'inference'),
      (gen_random_uuid(), NOW() - INTERVAL '2 hours', 1, 2, 'https://example.com/article/ai-ethics', 'Claude/3.0', 200000, 'inference')
      ON CONFLICT DO NOTHING;

      -- ============================================
      -- 6. PARSED URLS / URL LIBRARY (UrlLibrary page)
      -- ============================================
      INSERT INTO parsed_urls (url, domain, title, description, content, first_parsed_at, last_parsed_at, parse_count, last_status) 
      SELECT 'https://example.com/article/ai-trends-2024', 'example.com', 'AI Trends in 2024', 'Comprehensive analysis of artificial intelligence trends', 
      '{"markdown": "# AI Trends in 2024\\n\\nComprehensive analysis...", "word_count": 1250}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour', 5, 'success'
      WHERE NOT EXISTS (SELECT 1 FROM parsed_urls WHERE url = 'https://example.com/article/ai-trends-2024' LIMIT 1);
      
      INSERT INTO parsed_urls (url, domain, title, description, content, first_parsed_at, last_parsed_at, parse_count, last_status) VALUES
      ('https://example.com/news/tech-breakthrough', 'example.com', 'Major Tech Breakthrough', 'Revolutionary technology announcement', '{"markdown": "# Tech News...", "word_count": 850}'::jsonb, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 hours', 3, 'success'),
      ('https://example.com/blog/machine-learning', 'example.com', 'Machine Learning Explained', 'Deep dive into ML concepts', '{"markdown": "# ML Guide...", "word_count": 2100}'::jsonb, NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 hours', 8, 'success'),
      ('https://example.com/article/quantum-computing', 'example.com', 'Quantum Computing Future', 'The future of quantum technology', '{"markdown": "# Quantum...", "word_count": 1650}'::jsonb, NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours', 2, 'success'),
      ('https://example.com/news/space-exploration', 'example.com', 'Space Exploration Updates', 'Latest space mission updates', '{"markdown": "# Space News...", "word_count": 980}'::jsonb, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', 12, 'success'),
      ('https://example.com/blog/cybersecurity', 'example.com', 'Cybersecurity Best Practices', 'Essential security guidelines', '{"markdown": "# Security...", "word_count": 1450}'::jsonb, NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days', 6, 'success'),
      ('https://example.com/article/climate-change', 'example.com', 'Climate Change Solutions', 'Innovative approaches to climate', '{"markdown": "# Climate...", "word_count": 1950}'::jsonb, NOW() - INTERVAL '10 days', NOW() - INTERVAL '1 day 5 hours', 4, 'success'),
      ('https://example.com/premium/expert-analysis', 'example.com', 'Expert Analysis', 'Premium content analysis', '{"markdown": "# Analysis...", "word_count": 3200}'::jsonb, NOW() - INTERVAL '1 day', NOW() - INTERVAL '30 minutes', 1, 'success'),
      ('https://example.com/trending/breaking-news', 'example.com', 'Breaking News', 'Latest breaking news story', '{"markdown": "# Breaking...", "word_count": 650}'::jsonb, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '15 minutes', 15, 'success')
      ON CONFLICT (url) DO UPDATE SET last_parsed_at = EXCLUDED.last_parsed_at, parse_count = parsed_urls.parse_count + 1;

      -- ============================================
      -- 7. CONTENT (ContentLibrary page)
      -- ============================================
      INSERT INTO content (content_id, publisher_id, url, title, description, content_origin, body_word_count, created_ts, updated_ts) 
      SELECT 'content-001', 1, 'https://example.com/article/ai-trends-2024', 'AI Trends in 2024', 
      'Comprehensive analysis of artificial intelligence trends and developments', 0, 1250, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 hour'
      WHERE NOT EXISTS (SELECT 1 FROM content WHERE content_id = 'content-001' LIMIT 1);
      
      INSERT INTO content (content_id, publisher_id, url, title, description, content_origin, body_word_count, created_ts, updated_ts) VALUES
      ('content-002', 1, 'https://example.com/news/tech-breakthrough', 'Major Tech Breakthrough', 'Revolutionary technology announcement', 0, 850, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 hours'),
      ('content-003', 1, 'https://example.com/blog/machine-learning', 'Machine Learning Explained', 'Deep dive into ML concepts', 0, 2100, NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 hours'),
      ('content-004', 1, 'https://example.com/article/quantum-computing', 'Quantum Computing Future', 'The future of quantum technology', 0, 1650, NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours'),
      ('content-005', 1, 'https://example.com/news/space-exploration', 'Space Exploration Updates', 'Latest space mission updates', 0, 980, NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day')
      ON CONFLICT (content_id) DO NOTHING;

      -- ============================================
      -- 8. ADDITIONAL LICENSES (LicenseWizard page)
      -- ============================================
      INSERT INTO license_options (license_id, publisher_id, license_type, price, currency, status, name, content_id) 
      SELECT 'license-rag-001', 1, 1, 0.002, 'USD', 'active', 'RAG Display License', 
      (SELECT id FROM content WHERE content_id = 'content-001' LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM license_options WHERE license_id = 'license-rag-001' LIMIT 1);
      
      INSERT INTO license_options (license_id, publisher_id, license_type, price, currency, term_months, status, name, content_id) 
      SELECT 'license-training-001', 1, 0, 0.010, 'USD', 12, 'active', 'Training + Display License', 
      (SELECT id FROM content WHERE content_id = 'content-002' LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM license_options WHERE license_id = 'license-training-001' LIMIT 1);
      
      INSERT INTO license_options (license_id, publisher_id, license_type, price, currency, max_word_count, attribution_required, status, name, content_id) 
      SELECT 'license-rag-limited-001', 1, 2, 0.003, 'USD', 500, true, 'active', 'RAG Display (Max 500 Words)', 
      (SELECT id FROM content WHERE content_id = 'content-003' LIMIT 1)
      WHERE NOT EXISTS (SELECT 1 FROM license_options WHERE license_id = 'license-rag-limited-001' LIMIT 1);
    `;
    
    await db.query(sampleDataSql);

    // Get counts for all sections
    const negotiationCount = await db.query('SELECT COUNT(*) FROM negotiations WHERE publisher_id = 1');
    const notificationCount = await db.query('SELECT COUNT(*) FROM notifications WHERE publisher_id = 1');
    const usageCount = await db.query('SELECT COUNT(*) FROM usage_events WHERE publisher_id = 1');
    const accessCount = await db.query('SELECT COUNT(*) FROM access_endpoints WHERE publisher_id = 1');
    const strategyCount = await db.query('SELECT COUNT(*) FROM partner_negotiation_strategies WHERE publisher_id = 1');
    const parsedUrlCount = await db.query('SELECT COUNT(*) FROM parsed_urls');
    const contentCount = await db.query('SELECT COUNT(*) FROM content WHERE publisher_id = 1');
    const licenseCount = await db.query('SELECT COUNT(*) FROM license_options WHERE publisher_id = 1');

    console.log('✅ Comprehensive sample data populated successfully');

    res.json({
      success: true,
      message: 'Comprehensive sample data populated successfully for all UI sections',
      counts: {
        negotiations: parseInt(negotiationCount.rows[0].count),
        notifications: parseInt(notificationCount.rows[0].count),
        usage_events: parseInt(usageCount.rows[0].count),
        access_endpoints: parseInt(accessCount.rows[0].count),
        strategies: parseInt(strategyCount.rows[0].count),
        parsed_urls: parseInt(parsedUrlCount.rows[0].count),
        content: parseInt(contentCount.rows[0].count),
        licenses: parseInt(licenseCount.rows[0].count)
      }
    });
  } catch (error) {
    console.error('❌ Sample data population failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

module.exports = router;
