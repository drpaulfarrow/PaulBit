-- Create default policy for example.com (publisher_id 5) that allows GPTBot
INSERT INTO policies (publisher_id, name, policy_json, version)
VALUES (
  5,
  'Default Policy',
  '{"rules": [{"agent": "GPTBot", "allow": true, "license_type": 1, "price_per_fetch": 0.001}], "default": {"allow": false}}',
  '1.0'
);
