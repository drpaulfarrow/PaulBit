-- Migration 009: AI-to-AI Negotiation System
-- Enables autonomous license negotiation between publisher agents and AI company agents

-- Publisher negotiation strategies table
-- Defines how each publisher wants to negotiate with AI companies
CREATE TABLE IF NOT EXISTS negotiation_strategies (
    id SERIAL PRIMARY KEY,
    publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    strategy_name VARCHAR(255) NOT NULL,
    
    -- Negotiation personality
    negotiation_style VARCHAR(50) DEFAULT 'balanced', -- 'aggressive', 'balanced', 'flexible', 'cooperative'
    
    -- Price boundaries (in micro-dollars)
    min_price_per_fetch_micro INTEGER NOT NULL,
    preferred_price_per_fetch_micro INTEGER NOT NULL,
    max_price_per_fetch_micro INTEGER,
    
    -- Term boundaries
    min_token_ttl_seconds INTEGER DEFAULT 300,
    preferred_token_ttl_seconds INTEGER DEFAULT 600,
    max_token_ttl_seconds INTEGER DEFAULT 3600,
    
    min_burst_rps INTEGER DEFAULT 1,
    preferred_burst_rps INTEGER DEFAULT 10,
    max_burst_rps INTEGER DEFAULT 100,
    
    -- Purpose preferences (what uses are acceptable)
    allowed_purposes TEXT[] DEFAULT ARRAY['inference'],
    preferred_purposes TEXT[] DEFAULT ARRAY['inference'],
    
    -- Deal breakers (JSON array of conditions that auto-reject)
    deal_breakers JSONB DEFAULT '[]',
    
    -- Negotiation limits
    max_rounds INTEGER DEFAULT 10,
    auto_accept_threshold DECIMAL(3,2) DEFAULT 0.95, -- Auto-accept if >= 95% of preferred terms
    timeout_seconds INTEGER DEFAULT 3600,
    
    -- LLM configuration
    llm_provider VARCHAR(50) DEFAULT 'openai', -- 'openai', 'anthropic', 'azure', etc.
    llm_model VARCHAR(100) DEFAULT 'gpt-4',
    llm_temperature DECIMAL(3,2) DEFAULT 0.7,
    system_prompt TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(publisher_id, strategy_name)
);

-- Negotiations table
-- Tracks each negotiation session between a publisher and an AI company
CREATE TABLE IF NOT EXISTS negotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parties
    publisher_id INTEGER NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL, -- Store name even if client_id is null
    
    -- Strategy used
    strategy_id INTEGER NOT NULL REFERENCES negotiation_strategies(id),
    
    -- Current state
    status VARCHAR(50) DEFAULT 'initiated', -- 'initiated', 'negotiating', 'accepted', 'rejected', 'timeout', 'error'
    current_round INTEGER DEFAULT 0,
    
    -- Initial proposal from AI company
    initial_proposal JSONB NOT NULL,
    
    -- Current terms (updated each round)
    current_terms JSONB,
    
    -- Final agreed terms (if accepted)
    final_terms JSONB,
    
    -- Generated policy/license (if completed)
    generated_policy_id INTEGER REFERENCES policies(id) ON DELETE SET NULL,
    
    -- Metadata
    initiated_by VARCHAR(50) DEFAULT 'client', -- 'client' or 'publisher'
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Negotiation context
    context JSONB DEFAULT '{}', -- Additional context like URL patterns, special requirements, etc.
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Negotiation rounds table
-- Logs each round of the negotiation (full audit trail)
CREATE TABLE IF NOT EXISTS negotiation_rounds (
    id SERIAL PRIMARY KEY,
    negotiation_id UUID NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    
    -- Who made this move
    actor VARCHAR(50) NOT NULL, -- 'publisher' or 'client'
    
    -- Action taken
    action VARCHAR(50) NOT NULL, -- 'propose', 'counter', 'accept', 'reject', 'timeout'
    
    -- Terms proposed/countered
    proposed_terms JSONB NOT NULL,
    
    -- Reasoning (from LLM)
    reasoning TEXT,
    
    -- LLM metadata
    llm_model VARCHAR(100),
    llm_tokens_used INTEGER,
    llm_response_time_ms INTEGER,
    
    -- Analysis (why these terms were chosen)
    analysis JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(negotiation_id, round_number)
);

-- Negotiation messages table (optional - for chat-style negotiation)
-- Can be used for more conversational negotiation logs
CREATE TABLE IF NOT EXISTS negotiation_messages (
    id SERIAL PRIMARY KEY,
    negotiation_id UUID NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
    round_id INTEGER REFERENCES negotiation_rounds(id) ON DELETE CASCADE,
    
    sender VARCHAR(50) NOT NULL, -- 'publisher', 'client', 'system'
    message_type VARCHAR(50) DEFAULT 'proposal', -- 'proposal', 'counter', 'question', 'clarification', 'acceptance', 'rejection'
    
    message TEXT NOT NULL,
    structured_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_negotiations_publisher_id ON negotiations(publisher_id);
CREATE INDEX idx_negotiations_client_id ON negotiations(client_id);
CREATE INDEX idx_negotiations_status ON negotiations(status);
CREATE INDEX idx_negotiations_initiated_at ON negotiations(initiated_at DESC);
CREATE INDEX idx_negotiations_last_activity ON negotiations(last_activity_at DESC);

CREATE INDEX idx_negotiation_rounds_negotiation_id ON negotiation_rounds(negotiation_id);
CREATE INDEX idx_negotiation_rounds_round_number ON negotiation_rounds(negotiation_id, round_number);

CREATE INDEX idx_negotiation_messages_negotiation_id ON negotiation_messages(negotiation_id);
CREATE INDEX idx_negotiation_messages_created_at ON negotiation_messages(created_at);

CREATE INDEX idx_negotiation_strategies_publisher_id ON negotiation_strategies(publisher_id);
CREATE INDEX idx_negotiation_strategies_active ON negotiation_strategies(is_active) WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE negotiation_strategies IS 'Defines how publishers want to negotiate with AI companies';
COMMENT ON TABLE negotiations IS 'Tracks AI-to-AI negotiation sessions for creating licenses';
COMMENT ON TABLE negotiation_rounds IS 'Full audit trail of each negotiation round';
COMMENT ON TABLE negotiation_messages IS 'Optional conversational log of negotiation';

COMMENT ON COLUMN negotiation_strategies.negotiation_style IS 'Personality: aggressive (hard bargaining), balanced (moderate), flexible (accommodating), cooperative (partnership)';
COMMENT ON COLUMN negotiation_strategies.auto_accept_threshold IS 'Auto-accept proposals that meet this % of preferred terms (0.0-1.0)';
COMMENT ON COLUMN negotiation_strategies.deal_breakers IS 'Array of conditions that auto-reject: e.g., [{"field": "purpose", "contains": "training"}]';

COMMENT ON COLUMN negotiations.status IS 'Current state: initiated, negotiating, accepted, rejected, timeout, error';
COMMENT ON COLUMN negotiations.current_terms IS 'Latest proposed terms in the negotiation';
COMMENT ON COLUMN negotiations.final_terms IS 'Agreed terms (only set when status=accepted)';

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_negotiation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_negotiations_timestamp
    BEFORE UPDATE ON negotiations
    FOR EACH ROW
    EXECUTE FUNCTION update_negotiation_timestamp();

CREATE TRIGGER update_negotiation_strategies_timestamp
    BEFORE UPDATE ON negotiation_strategies
    FOR EACH ROW
    EXECUTE FUNCTION update_negotiation_timestamp();

-- Seed data: Default negotiation strategy for Publisher A
INSERT INTO negotiation_strategies (
    publisher_id,
    strategy_name,
    negotiation_style,
    min_price_per_fetch_micro,
    preferred_price_per_fetch_micro,
    max_price_per_fetch_micro,
    min_token_ttl_seconds,
    preferred_token_ttl_seconds,
    max_token_ttl_seconds,
    min_burst_rps,
    preferred_burst_rps,
    max_burst_rps,
    allowed_purposes,
    preferred_purposes,
    deal_breakers,
    max_rounds,
    auto_accept_threshold,
    system_prompt
) VALUES (
    1, -- Publisher A
    'Default Strategy',
    'balanced',
    1000, -- Min $0.001
    2000, -- Preferred $0.002
    5000, -- Max $0.005
    300,
    600,
    1800,
    2,
    10,
    50,
    ARRAY['inference', 'training'],
    ARRAY['inference'],
    '[{"field": "price_per_fetch_micro", "operator": "<", "value": 500}]'::jsonb,
    10,
    0.90,
    'You are a professional licensing negotiator representing a premium news publisher. Your goal is to achieve fair compensation for content while maintaining good relationships with AI companies. Be firm on minimum prices but flexible on other terms. Always explain your reasoning clearly.'
) ON CONFLICT (publisher_id, strategy_name) DO NOTHING;

-- Seed data: Default negotiation strategy for Publisher B
INSERT INTO negotiation_strategies (
    publisher_id,
    strategy_name,
    negotiation_style,
    min_price_per_fetch_micro,
    preferred_price_per_fetch_micro,
    max_price_per_fetch_micro,
    min_token_ttl_seconds,
    preferred_token_ttl_seconds,
    max_token_ttl_seconds,
    min_burst_rps,
    preferred_burst_rps,
    max_burst_rps,
    allowed_purposes,
    preferred_purposes,
    deal_breakers,
    max_rounds,
    auto_accept_threshold,
    system_prompt
) VALUES (
    2, -- Publisher B
    'Default Strategy',
    'cooperative',
    500, -- Min $0.0005
    1000, -- Preferred $0.001
    2500, -- Max $0.0025
    300,
    900,
    3600,
    3,
    10,
    100,
    ARRAY['inference', 'training'],
    ARRAY['inference', 'training'],
    '[]'::jsonb,
    15,
    0.85,
    'You are a collaborative licensing negotiator for a technical documentation publisher. Your goal is to maximize access while ensuring fair compensation. Be open to creative solutions and long-term partnerships. Prioritize volume over per-fetch pricing when appropriate.'
) ON CONFLICT (publisher_id, strategy_name) DO NOTHING;
