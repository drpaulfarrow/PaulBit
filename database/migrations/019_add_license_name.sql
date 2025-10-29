-- Add name column to license_options table
ALTER TABLE license_options
ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add index for searching by name
CREATE INDEX IF NOT EXISTS idx_license_name ON license_options(name);

-- Add comment
COMMENT ON COLUMN license_options.name IS 'Human-readable name for the license (e.g., OpenAI_Training_0.005, Claude_RAG_0.002)';
