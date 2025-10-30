#!/bin/bash
# Direct database initialization for Azure

APP_NAME="monetizeplusapp"
RESOURCE_GROUP="MonetizePlusRG"

echo "🔧 Initializing MonetizePlus Database Directly"
echo "==============================================="
echo ""

# Get the app URL
APP_URL=$(az webapp show --name $APP_NAME --resource-group $RESOURCE_GROUP --query defaultHostName -o tsv)
echo "App URL: https://$APP_URL"
echo ""

# Create a temporary SQL file with the essential seed data
cat > /tmp/init-seed.sql << 'EOF'
-- Insert publishers
INSERT INTO publishers (id, name, hostname) VALUES
    (1, 'Publisher A News', 'site-a.local'),
    (2, 'Publisher B Documentation', 'site-b.local')
ON CONFLICT (hostname) DO NOTHING;

-- Insert pricing plans
INSERT INTO plans (id, name, price_per_fetch_micro, token_ttl_seconds, burst_rps, purpose_mask) VALUES
    (1, 'Free Tier', 0, 300, 5, 'inference'),
    (2, 'Standard', 2000, 600, 10, 'inference'),
    (3, 'Premium', 1500, 900, 20, 'inference,training'),
    (4, 'Enterprise', 1000, 1800, 50, 'inference,training')
ON CONFLICT DO NOTHING;

-- Insert sample clients
INSERT INTO clients (name, contact_email, plan_id) VALUES
    ('OpenAI', 'partners@openai.com', 3),
    ('Anthropic', 'partners@anthropic.com', 3),
    ('Perplexity', 'partners@perplexity.ai', 2),
    ('Anonymous Bots', 'noreply@example.com', 1)
ON CONFLICT DO NOTHING;

-- Insert policies for Publisher A
INSERT INTO policies (publisher_id, policy_json, version, name) VALUES
(1, '{
    "version": "1.0",
    "publisher": "site-a.local",
    "default": { "allow": false, "action": "redirect" },
    "rules": [
        {"agent": "GPTBot", "allow": true, "purpose": ["inference"], "price_per_fetch": 0.002, "token_ttl_seconds": 600, "max_rps": 2},
        {"agent": "ClaudeBot", "allow": true, "purpose": ["inference"], "price_per_fetch": 0.002, "token_ttl_seconds": 600, "max_rps": 2},
        {"agent": "Perplexity", "allow": true, "purpose": ["inference"], "price_per_fetch": 0.002, "token_ttl_seconds": 600, "max_rps": 2},
        {"agent": "*", "allow": false}
    ],
    "redirect_url": "http://licensing-api:3000/authorize"
}'::jsonb, '1.0', 'Default Policy')
ON CONFLICT DO NOTHING;

-- Insert policies for Publisher B  
INSERT INTO policies (publisher_id, policy_json, version, name) VALUES
(2, '{
    "version": "1.0",
    "publisher": "site-b.local",
    "default": { "allow": false, "action": "redirect" },
    "rules": [
        {"agent": "GPTBot", "allow": true, "purpose": ["inference", "training"], "price_per_fetch": 0.001, "token_ttl_seconds": 900, "max_rps": 5},
        {"agent": "ClaudeBot", "allow": true, "purpose": ["inference", "training"], "price_per_fetch": 0.001, "token_ttl_seconds": 900, "max_rps": 5},
        {"agent": "Perplexity", "allow": true, "purpose": ["inference"], "price_per_fetch": 0.0015, "token_ttl_seconds": 600, "max_rps": 3},
        {"agent": "*", "allow": true, "purpose": ["inference"], "price_per_fetch": 0.002, "token_ttl_seconds": 600, "max_rps": 2}
    ],
    "redirect_url": "http://licensing-api:3000/authorize"
}'::jsonb, '1.0', 'Default Policy')
ON CONFLICT DO NOTHING;

SELECT 'Seed data inserted' as status;
EOF

echo "📝 Executing SQL via Azure CLI exec..."
az webapp ssh --name $APP_NAME --resource-group $RESOURCE_GROUP --command "PGPASSWORD=monetizeplus123 psql -h postgres -U monetizeplus -d monetizeplus -f /tmp/init-seed.sql"

echo ""
echo "✅ Database initialized!"
echo ""
echo "🔍 Verifying data..."
curl -sS "https://$APP_URL/auth/publishers"
echo ""
echo ""
echo "Visit: https://$APP_URL/"
