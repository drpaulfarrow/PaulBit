-- Migration 023: Google Auth User Management
-- Links Google accounts to publishers and enables user management

-- Create table to link Google users to publishers
CREATE TABLE IF NOT EXISTS google_users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  picture_url VARCHAR(500),
  publisher_id INTEGER REFERENCES publishers(id) ON DELETE SET NULL,
  role VARCHAR(50) DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_google_users_google_id ON google_users(google_id);
CREATE INDEX IF NOT EXISTS idx_google_users_email ON google_users(email);
CREATE INDEX IF NOT EXISTS idx_google_users_publisher_id ON google_users(publisher_id);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_google_users_updated_at ON google_users;
CREATE TRIGGER trg_google_users_updated_at
BEFORE UPDATE ON google_users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Create pending publisher requests table (for users without publishers)
CREATE TABLE IF NOT EXISTS publisher_requests (
  id SERIAL PRIMARY KEY,
  google_user_id INTEGER REFERENCES google_users(id) ON DELETE CASCADE,
  requested_name VARCHAR(255) NOT NULL,
  requested_hostname VARCHAR(255) NOT NULL,
  business_description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_publisher_requests_status ON publisher_requests(status);
CREATE INDEX IF NOT EXISTS idx_publisher_requests_google_user ON publisher_requests(google_user_id);

COMMENT ON TABLE google_users IS 'Links Google OAuth accounts to publishers';
COMMENT ON TABLE publisher_requests IS 'Publisher creation requests from Google users';
