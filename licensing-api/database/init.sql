-- MonetizePlus Content Licensing Gateway Database Schema

-- Publishers table
CREATE TABLE IF NOT EXISTS publishers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    hostname VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pricing plans table
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price_per_fetch_micro INTEGER NOT NULL, -- Price in micro-dollars (millionths of USD)
    token_ttl_seconds INTEGER DEFAULT 600,
    burst_rps INTEGER DEFAULT 10,
    purpose_mask VARCHAR(50) DEFAULT 'inference',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients (AI companies/bots) table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    api_key_hash VARCHAR(255),
    plan_id INTEGER REFERENCES plans(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Publisher policies table
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    policy_json JSONB NOT NULL,
    version VARCHAR(10) DEFAULT '1.0',
    url_pattern TEXT DEFAULT NULL,
    name VARCHAR(255) DEFAULT 'Default Policy',
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tokens table
CREATE TABLE IF NOT EXISTS tokens (
    jti UUID PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id),
    publisher_id INTEGER NOT NULL REFERENCES publishers(id),
    url_pattern TEXT NOT NULL,
    purpose VARCHAR(50) DEFAULT 'inference',
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage events table
CREATE TABLE IF NOT EXISTS usage_events (
    id UUID PRIMARY KEY,
    ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    publisher_id INTEGER NOT NULL REFERENCES publishers(id),
    client_id INTEGER REFERENCES clients(id),
    url TEXT NOT NULL,
    agent_ua TEXT,
    cost_micro INTEGER NOT NULL,
    token_id UUID,
    bytes_sent INTEGER,
    purpose VARCHAR(50) DEFAULT 'inference'
);

-- Parsed URLs table (URL Library feature)
CREATE TABLE IF NOT EXISTS parsed_urls (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    domain VARCHAR(255) NOT NULL,
    title TEXT,
    description TEXT,
    content JSONB DEFAULT '{}',
    first_parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_parsed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parse_count INTEGER DEFAULT 1,
    last_status VARCHAR(50) DEFAULT 'success',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tokens_expires_at ON tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_tokens_revoked ON tokens(revoked);
CREATE INDEX IF NOT EXISTS idx_usage_events_ts ON usage_events(ts DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_publisher_id ON usage_events(publisher_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_client_id ON usage_events(client_id);
CREATE INDEX IF NOT EXISTS idx_policies_publisher_id ON policies(publisher_id);

-- Policy indexes for page-level and default policies
CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_publisher_default 
ON policies (publisher_id, version) 
WHERE url_pattern IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_policies_publisher_url 
ON policies (publisher_id, url_pattern, version) 
WHERE url_pattern IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_policies_url_pattern 
ON policies (publisher_id, url_pattern) 
WHERE url_pattern IS NOT NULL;

-- Indexes for parsed_urls table
CREATE INDEX IF NOT EXISTS idx_parsed_urls_domain ON parsed_urls(domain);
CREATE INDEX IF NOT EXISTS idx_parsed_urls_last_parsed ON parsed_urls(last_parsed_at DESC);
CREATE INDEX IF NOT EXISTS idx_parsed_urls_search ON parsed_urls USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Seed data

-- Insert publishers
INSERT INTO publishers (name, hostname) VALUES
    ('Publisher A News', 'site-a.local'),
    ('Publisher B Documentation', 'site-b.local')
ON CONFLICT (hostname) DO NOTHING;

-- Insert pricing plans
INSERT INTO plans (name, price_per_fetch_micro, token_ttl_seconds, burst_rps, purpose_mask) VALUES
    ('Free Tier', 0, 300, 5, 'inference'),
    ('Standard', 2000, 600, 10, 'inference'),
    ('Premium', 1500, 900, 20, 'inference,training'),
    ('Enterprise', 1000, 1800, 50, 'inference,training')
ON CONFLICT DO NOTHING;

-- Insert sample clients
INSERT INTO clients (name, contact_email, plan_id) VALUES
    ('OpenAI', 'partners@openai.com', 3),
    ('Anthropic', 'partners@anthropic.com', 3),
    ('Perplexity', 'partners@perplexity.ai', 2),
    ('Anonymous Bots', 'noreply@example.com', 1)
ON CONFLICT DO NOTHING;

-- Insert policies for publishers
INSERT INTO policies (publisher_id, policy_json, version, url_pattern, name, description) VALUES
    (
        1, -- Publisher A
        '{
            "version": "1.0",
            "publisher": "site-a.local",
            "default": { "allow": false, "action": "redirect" },
            "rules": [
                {
                    "agent": "GPTBot",
                    "allow": true,
                    "purpose": ["inference"],
                    "price_per_fetch": 0.002,
                    "token_ttl_seconds": 600,
                    "max_rps": 2
                },
                {
                    "agent": "ClaudeBot",
                    "allow": true,
                    "purpose": ["inference"],
                    "price_per_fetch": 0.002,
                    "token_ttl_seconds": 600,
                    "max_rps": 2
                },
                {
                    "agent": "Perplexity",
                    "allow": true,
                    "purpose": ["inference"],
                    "price_per_fetch": 0.002,
                    "token_ttl_seconds": 600,
                    "max_rps": 2
                },
                {
                    "agent": "*",
                    "allow": false
                }
            ],
            "redirect_url": "http://licensing-api:3000/authorize"
        }'::jsonb,
        '1.0',
        NULL,
        'Default Policy',
        'Publisher-wide default licensing policy'
    ),
    (
        2, -- Publisher B
        '{
            "version": "1.0",
            "publisher": "site-b.local",
            "default": { "allow": false, "action": "redirect" },
            "rules": [
                {
                    "agent": "GPTBot",
                    "allow": true,
                    "purpose": ["inference", "training"],
                    "price_per_fetch": 0.001,
                    "token_ttl_seconds": 900,
                    "max_rps": 5
                },
                {
                    "agent": "ClaudeBot",
                    "allow": true,
                    "purpose": ["inference", "training"],
                    "price_per_fetch": 0.001,
                    "token_ttl_seconds": 900,
                    "max_rps": 5
                },
                {
                    "agent": "Perplexity",
                    "allow": true,
                    "purpose": ["inference"],
                    "price_per_fetch": 0.0015,
                    "token_ttl_seconds": 600,
                    "max_rps": 3
                },
                {
                    "agent": "*",
                    "allow": true,
                    "purpose": ["inference"],
                    "price_per_fetch": 0.002,
                    "token_ttl_seconds": 600,
                    "max_rps": 2
                }
            ],
            "redirect_url": "http://licensing-api:3000/authorize"
        }'::jsonb,
        '1.0',
        NULL,
        'Default Policy',
        'Publisher-wide default licensing policy'
    )
ON CONFLICT DO NOTHING;

-- Grant permissions (if needed for specific user)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO monetizeplus;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO monetizeplus;
