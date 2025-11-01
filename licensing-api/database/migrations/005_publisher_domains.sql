-- Migration: Publisher domain management
-- Allows publishers to manage multiple domains

-- Create publisher_domains table
CREATE TABLE IF NOT EXISTS publisher_domains (
  id SERIAL PRIMARY KEY,
  publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(publisher_id, domain)
);

-- Create index for fast domain lookups
CREATE INDEX idx_publisher_domains_domain ON publisher_domains(domain);
CREATE INDEX idx_publisher_domains_publisher ON publisher_domains(publisher_id);

-- Migrate existing publishers - add their hostname as a domain
INSERT INTO publisher_domains (publisher_id, domain, verified)
SELECT id, hostname, true
FROM publishers
WHERE hostname IS NOT NULL
ON CONFLICT (publisher_id, domain) DO NOTHING;

-- Add some example domains for Publisher A (id=1)
INSERT INTO publisher_domains (publisher_id, domain, verified)
VALUES 
  (1, 'example.com', true),
  (1, 'site-a.local', true)
ON CONFLICT (publisher_id, domain) DO NOTHING;
