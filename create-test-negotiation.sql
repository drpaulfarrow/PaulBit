-- Create test negotiations for accept/reject testing

-- Anthropic Claude - RAG Display (Max Words)
INSERT INTO negotiations (
  id, 
  publisher_id, 
  client_name, 
  strategy_id,
  license_type, 
  status, 
  current_round, 
  initial_proposal,
  current_terms, 
  initiated_at, 
  last_activity_at
) VALUES (
  gen_random_uuid(), 
  1, 
  'Anthropic Claude', 
  1,
  2, 
  'negotiating', 
  1, 
  '{"price": 0.008, "currency": "USD", "term_months": 24, "max_word_count": 500, "attribution_required": true}'::jsonb,
  '{"price": 0.008, "currency": "USD", "term_months": 24, "max_word_count": 500, "attribution_required": true}'::jsonb, 
  NOW(), 
  NOW()
)
RETURNING id, client_name, license_type, status;

-- Google Gemini - RAG Display (Attribution)  
INSERT INTO negotiations (
  id, 
  publisher_id, 
  client_name, 
  strategy_id,
  license_type, 
  status, 
  current_round, 
  initial_proposal,
  current_terms, 
  initiated_at, 
  last_activity_at
) VALUES (
  gen_random_uuid(), 
  1, 
  'Google Gemini', 
  1,
  3, 
  'negotiating', 
  2, 
  '{"price": 0.006, "currency": "USD", "term_months": 12, "attribution_required": true}'::jsonb,
  '{"price": 0.006, "currency": "USD", "term_months": 12, "attribution_required": true}'::jsonb, 
  NOW(), 
  NOW()
)
RETURNING id, client_name, license_type, status;

-- Meta Llama - Training + Display
INSERT INTO negotiations (
  id, 
  publisher_id, 
  client_name, 
  strategy_id,
  license_type, 
  status, 
  current_round, 
  initial_proposal,
  current_terms, 
  initiated_at, 
  last_activity_at
) VALUES (
  gen_random_uuid(), 
  1, 
  'Meta Llama', 
  1,
  0, 
  'negotiating', 
  0, 
  '{"price": 0.015, "currency": "USD", "term_months": 36}'::jsonb,
  '{"price": 0.015, "currency": "USD", "term_months": 36}'::jsonb, 
  NOW(), 
  NOW()
)
RETURNING id, client_name, license_type, status;
