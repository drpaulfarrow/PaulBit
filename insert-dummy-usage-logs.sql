-- Insert dummy usage logs for analytics and logs pages
-- Creates realistic test data with various bots, purposes, costs, and timestamps

-- Helper data:
-- publisher_id: 1
-- client_ids: 1 (OpenAI), 2 (Anthropic), 3 (Perplexity), 4 (Anonymous Bots)
-- purposes: 0 (Training + Display), 1 (RAG Display Unrestricted), 2 (RAG Display Max Words), 3 (RAG Display Attribution), 4 (RAG No Display), 'inference'

-- OpenAI GPT-4 accesses (last 7 days)
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '1 hour', 1, 1, 'https://example.com/article/ai-trends-2024', 'GPT-4/1.0', 250000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 hours', 1, 1, 'https://example.com/news/tech-breakthrough', 'GPT-4/1.0', 180000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '6 hours', 1, 1, 'https://example.com/blog/machine-learning', 'GPT-4/1.0', 320000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '12 hours', 1, 1, 'https://example.com/article/quantum-computing', 'GPT-4/1.0', 290000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day', 1, 1, 'https://example.com/news/space-exploration', 'GPT-4/1.0', 210000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 5 hours', 1, 1, 'https://example.com/article/climate-change', 'GPT-4/1.0', 275000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 days', 1, 1, 'https://example.com/blog/cybersecurity', 'GPT-4/1.0', 195000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 days 8 hours', 1, 1, 'https://example.com/news/economic-outlook', 'GPT-4/1.0', 240000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 days', 1, 1, 'https://example.com/article/renewable-energy', 'GPT-4/1.0', 310000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '4 days', 1, 1, 'https://example.com/blog/future-of-work', 'GPT-4/1.0', 220000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '5 days', 1, 1, 'https://example.com/news/healthcare-innovation', 'GPT-4/1.0', 265000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '6 days', 1, 1, 'https://example.com/article/education-reform', 'GPT-4/1.0', 235000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '7 days', 1, 1, 'https://example.com/blog/digital-transformation', 'GPT-4/1.0', 285000, 'inference');

-- Anthropic Claude accesses
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '2 hours', 1, 2, 'https://example.com/article/ai-ethics', 'Claude/3.0', 200000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '5 hours', 1, 2, 'https://example.com/news/technology-policy', 'Claude/3.0', 175000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '10 hours', 1, 2, 'https://example.com/blog/data-privacy', 'Claude/3.0', 225000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 2 hours', 1, 2, 'https://example.com/article/sustainable-tech', 'Claude/3.0', 190000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 days 3 hours', 1, 2, 'https://example.com/news/innovation-trends', 'Claude/3.0', 245000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 days 6 hours', 1, 2, 'https://example.com/blog/ai-research', 'Claude/3.0', 215000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '4 days 12 hours', 1, 2, 'https://example.com/article/quantum-ai', 'Claude/3.0', 280000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '5 days 8 hours', 1, 2, 'https://example.com/news/startup-ecosystem', 'Claude/3.0', 195000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '6 days 4 hours', 1, 2, 'https://example.com/blog/automation-trends', 'Claude/3.0', 230000, 'inference');

-- Perplexity accesses
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '4 hours', 1, 3, 'https://example.com/article/search-technology', 'PerplexityBot/1.0', 150000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '8 hours', 1, 3, 'https://example.com/news/information-retrieval', 'PerplexityBot/1.0', 165000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '15 hours', 1, 3, 'https://example.com/blog/semantic-search', 'PerplexityBot/1.0', 180000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 10 hours', 1, 3, 'https://example.com/article/knowledge-graphs', 'PerplexityBot/1.0', 170000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 days 14 hours', 1, 3, 'https://example.com/news/web-indexing', 'PerplexityBot/1.0', 155000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 days 18 hours', 1, 3, 'https://example.com/blog/query-understanding', 'PerplexityBot/1.0', 190000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '5 days 6 hours', 1, 3, 'https://example.com/article/answer-generation', 'PerplexityBot/1.0', 175000, 'inference');

-- Google Gemini accesses
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '3 hours', 1, NULL, 'https://example.com/article/multimodal-ai', 'Google-Extended/1.0', 300000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '7 hours', 1, NULL, 'https://example.com/news/ai-hardware', 'Google-Extended/1.0', 275000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '14 hours', 1, NULL, 'https://example.com/blog/neural-networks', 'Google-Extended/1.0', 320000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 16 hours', 1, NULL, 'https://example.com/article/deep-learning', 'Google-Extended/1.0', 290000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 days 4 hours', 1, NULL, 'https://example.com/news/ai-applications', 'Google-Extended/1.0', 310000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '4 days 20 hours', 1, NULL, 'https://example.com/blog/transformer-models', 'Google-Extended/1.0', 285000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '6 days 12 hours', 1, NULL, 'https://example.com/article/llm-architecture', 'Google-Extended/1.0', 305000, 'inference');

-- Cohere accesses
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '5 hours', 1, NULL, 'https://example.com/article/nlp-advances', 'Cohere-AI/1.0', 160000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '11 hours', 1, NULL, 'https://example.com/news/language-models', 'Cohere-AI/1.0', 145000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 8 hours', 1, NULL, 'https://example.com/blog/text-generation', 'Cohere-AI/1.0', 175000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 days 20 hours', 1, NULL, 'https://example.com/article/embeddings', 'Cohere-AI/1.0', 155000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '4 days 16 hours', 1, NULL, 'https://example.com/news/semantic-similarity', 'Cohere-AI/1.0', 165000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '6 days 8 hours', 1, NULL, 'https://example.com/blog/classification-models', 'Cohere-AI/1.0', 170000, 'inference');

-- Meta Llama accesses
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '6 hours', 1, NULL, 'https://example.com/article/open-source-ai', 'Meta-ExternalAgent/1.0', 185000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '13 hours', 1, NULL, 'https://example.com/news/ai-democratization', 'Meta-ExternalAgent/1.0', 195000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 18 hours', 1, NULL, 'https://example.com/blog/model-fine-tuning', 'Meta-ExternalAgent/1.0', 205000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 days 12 hours', 1, NULL, 'https://example.com/article/instruction-following', 'Meta-ExternalAgent/1.0', 190000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '5 days 20 hours', 1, NULL, 'https://example.com/news/ai-safety', 'Meta-ExternalAgent/1.0', 200000, 'inference');

-- Various other bot accesses (generic crawlers, research bots)
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '9 hours', 1, 4, 'https://example.com/article/web-scraping', 'GenericBot/2.0', 80000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 4 hours', 1, 4, 'https://example.com/news/content-discovery', 'ResearchBot/1.5', 95000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 days 10 hours', 1, 4, 'https://example.com/blog/data-collection', 'CrawlerBot/3.0', 70000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '3 days 22 hours', 1, 4, 'https://example.com/article/indexing-strategies', 'IndexBot/1.0', 85000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '5 days 14 hours', 1, 4, 'https://example.com/news/search-algorithms', 'SeekBot/2.1', 90000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '6 days 20 hours', 1, 4, 'https://example.com/blog/web-standards', 'StandardsBot/1.0', 75000, 'inference');

-- Add some higher-cost RAG usage with different purposes
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '30 minutes', 1, 1, 'https://example.com/premium/expert-analysis', 'GPT-4/1.0', 450000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 hours 30 minutes', 1, 2, 'https://example.com/premium/research-report', 'Claude/3.0', 380000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '5 hours 45 minutes', 1, 1, 'https://example.com/premium/market-insights', 'GPT-4/1.0', 420000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '1 day 3 hours', 1, NULL, 'https://example.com/premium/technical-guide', 'Google-Extended/1.0', 500000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '2 days 7 hours', 1, 2, 'https://example.com/premium/industry-analysis', 'Claude/3.0', 395000, 'inference');

-- Recent spike in activity (last few hours) for more interesting analytics
INSERT INTO usage_events (id, ts, publisher_id, client_id, url, agent_ua, cost_micro, purpose) VALUES
(gen_random_uuid(), NOW() - INTERVAL '15 minutes', 1, 1, 'https://example.com/trending/breaking-news', 'GPT-4/1.0', 340000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '20 minutes', 1, 2, 'https://example.com/trending/viral-story', 'Claude/3.0', 280000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '25 minutes', 1, 3, 'https://example.com/trending/hot-topic', 'PerplexityBot/1.0', 210000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '35 minutes', 1, 1, 'https://example.com/trending/latest-update', 'GPT-4/1.0', 305000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '40 minutes', 1, NULL, 'https://example.com/trending/developing-story', 'Google-Extended/1.0', 365000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '50 minutes', 1, 2, 'https://example.com/trending/major-announcement', 'Claude/3.0', 295000, 'inference'),
(gen_random_uuid(), NOW() - INTERVAL '55 minutes', 1, 1, 'https://example.com/trending/live-coverage', 'GPT-4/1.0', 330000, 'inference');
