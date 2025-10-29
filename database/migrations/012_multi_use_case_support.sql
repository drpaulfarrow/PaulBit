-- Migration 012: Support multiple use cases for strategies and licenses
-- Change from single use_case/purpose to arrays to support multiple purposes

-- 1. Update partner_negotiation_strategies to use array
ALTER TABLE partner_negotiation_strategies 
DROP CONSTRAINT IF EXISTS partner_negotiation_strategies_use_case_check;

ALTER TABLE partner_negotiation_strategies 
ALTER COLUMN use_case TYPE TEXT[] USING ARRAY[use_case]::TEXT[];

ALTER TABLE partner_negotiation_strategies
ADD CONSTRAINT partner_negotiation_strategies_use_case_check 
CHECK (
  use_case <@ ARRAY['training', 'inference', 'search', 'general']::TEXT[] 
  AND array_length(use_case, 1) > 0
);

-- Drop the old unique constraint
ALTER TABLE partner_negotiation_strategies
DROP CONSTRAINT IF EXISTS partner_negotiation_strategies_publisher_id_partner_type_partner_key;

-- Drop and recreate the index for array queries
DROP INDEX IF EXISTS idx_partner_strategies_use_case;
CREATE INDEX idx_partner_strategies_use_case ON partner_negotiation_strategies USING GIN(use_case);

-- Update comment
COMMENT ON COLUMN partner_negotiation_strategies.use_case IS 'Array of use cases: training, inference, search, general. Strategies can support multiple use cases.';

-- 2. Update license_options to use array for purpose
ALTER TABLE license_options
DROP CONSTRAINT IF EXISTS license_options_purpose_check;

-- First convert the column type
ALTER TABLE license_options 
ALTER COLUMN purpose TYPE TEXT[] USING ARRAY[purpose]::TEXT[];

-- Then set the default
ALTER TABLE license_options
ALTER COLUMN purpose SET DEFAULT ARRAY['inference']::TEXT[];

-- Add the check constraint
ALTER TABLE license_options
ADD CONSTRAINT license_options_purpose_check 
CHECK (
  purpose <@ ARRAY['training', 'inference', 'search', 'general']::TEXT[] 
  AND array_length(purpose, 1) > 0
);

-- Drop and recreate the index for array queries
DROP INDEX IF EXISTS idx_license_purpose;
CREATE INDEX idx_license_purpose ON license_options USING GIN(purpose);

-- Update comment
COMMENT ON COLUMN license_options.purpose IS 'Array of use cases this license supports: training, inference, search, general. Licenses can support multiple purposes.';

-- 3. Update negotiations table to use array
ALTER TABLE negotiations
ALTER COLUMN use_case TYPE TEXT[] USING ARRAY[COALESCE(use_case, 'general')]::TEXT[];

DROP INDEX IF EXISTS idx_negotiations_use_case;
CREATE INDEX idx_negotiations_use_case ON negotiations USING GIN(use_case);

COMMENT ON COLUMN negotiations.use_case IS 'Array of use cases requested in the negotiation';

-- 4. Update existing data to sensible defaults
-- Convert any NULL arrays to default values
UPDATE partner_negotiation_strategies SET use_case = ARRAY['general']::TEXT[] WHERE use_case IS NULL OR array_length(use_case, 1) IS NULL;
UPDATE license_options SET purpose = ARRAY['inference']::TEXT[] WHERE purpose IS NULL OR array_length(purpose, 1) IS NULL;
UPDATE negotiations SET use_case = ARRAY['general']::TEXT[] WHERE use_case IS NULL OR array_length(use_case, 1) IS NULL;

-- Some strategies should support multiple use cases by default
-- Tier 1 AI companies often want both training and inference
UPDATE partner_negotiation_strategies 
SET use_case = ARRAY['training', 'inference']::TEXT[]
WHERE partner_type = 'tier1_ai' AND array_length(use_case, 1) = 1 AND use_case[1] IN ('training', 'inference');

-- Training licenses can also support inference
UPDATE license_options
SET purpose = ARRAY['training', 'inference']::TEXT[]
WHERE license_type = 0 AND array_length(purpose, 1) = 1 AND purpose[1] = 'training';
