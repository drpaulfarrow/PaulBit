-- Add sample negotiations
INSERT INTO negotiations (publisher_id, client_id, client_name, strategy_id, status, initial_proposal, current_terms, partner_type, partner_name, license_type) VALUES 
(1, 1, 'OpenAI', 21, 'pending', '{"price": 0.005, "term_months": 12}'::jsonb, '{"price": 0.005, "term_months": 12}'::jsonb, 'specific_partner', 'OpenAI', 1),
(1, 2, 'Anthropic', 22, 'pending', '{"price": 0.004, "term_months": 6}'::jsonb, '{"price": 0.004, "term_months": 6}'::jsonb, 'specific_partner', 'Anthropic', 1),
(1, 1, 'OpenAI', 21, 'accepted', '{"price": 0.003, "term_months": 12}'::jsonb, '{"price": 0.003, "term_months": 12}'::jsonb, 'specific_partner', 'OpenAI', 1),
(1, 3, 'Perplexity', 26, 'rejected', '{"price": 0.002, "term_months": 3}'::jsonb, '{"price": 0.002, "term_months": 3}'::jsonb, 'tier1_ai', 'Perplexity', 1);

SELECT 'Sample negotiations added' AS result;
