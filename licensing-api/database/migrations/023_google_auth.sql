-- Migration 023: Google OAuth Authentication
-- Adds user management and Google OAuth support

-- Users table for Google OAuth
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP DEFAULT NOW()
);

-- User-Publisher mapping (many-to-many)
CREATE TABLE IF NOT EXISTS user_publishers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  publisher_id INTEGER REFERENCES publishers(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'admin', -- admin, editor, viewer
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, publisher_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_publishers_user ON user_publishers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_publishers_publisher ON user_publishers(publisher_id);

-- Comments
COMMENT ON TABLE users IS 'Users authenticated via Google OAuth';
COMMENT ON TABLE user_publishers IS 'Maps users to publishers with roles';
COMMENT ON COLUMN user_publishers.role IS 'User role: admin, editor, or viewer';

-- Sample data: Create a demo user and assign to Publisher 1
-- This allows paulandrewfarrow@gmail.com to access Publisher 1 immediately
INSERT INTO users (google_id, email, name, avatar_url)
VALUES (
  'demo-google-id-replace-after-first-login',
  'demo@example.com',
  'Demo User',
  NULL
) ON CONFLICT (google_id) DO NOTHING;

-- Note: After first Google login, run this to assign yourself to publishers:
-- UPDATE users SET google_id = 'YOUR_ACTUAL_GOOGLE_ID' WHERE email = 'demo@example.com';
-- INSERT INTO user_publishers (user_id, publisher_id, role) 
-- SELECT id, 1, 'admin' FROM users WHERE email = 'paulandrewfarrow@gmail.com';

