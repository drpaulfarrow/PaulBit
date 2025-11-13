const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Only initialize OAuth client if Google credentials are configured
let client = null;
let OAuth2Client = null;

if (GOOGLE_CLIENT_ID) {
  try {
    const googleAuth = require('google-auth-library');
    OAuth2Client = googleAuth.OAuth2Client;
    client = new OAuth2Client(GOOGLE_CLIENT_ID);
  } catch (error) {
    console.warn('Google Auth Library not available:', error.message);
  }
}

/**
 * POST /api/auth/google
 * Verify Google ID token and create session
 */
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    
    if (!credential) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing credential' 
      });
    }

    if (!GOOGLE_CLIENT_ID || !client) {
      return res.status(503).json({ 
        success: false, 
        error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID environment variable.' 
      });
    }
    
    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;
    
    console.log(`Google auth successful: ${email} (${googleId})`);
    
    // Check if google_users table exists (migration may not have run yet)
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'google_users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(503).json({ 
        success: false, 
        error: 'Google OAuth tables not yet created. Run migration 023 first.' 
      });
    }
    
    // Check if user exists or create
    const userResult = await db.query(
      `INSERT INTO google_users (google_id, email, name, picture_url, last_login, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (google_id) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         picture_url = EXCLUDED.picture_url,
         last_login = NOW(),
         updated_at = NOW()
       RETURNING id, email, name, picture_url, publisher_id, role`,
      [googleId, email, name, picture]
    );
    
    const user = userResult.rows[0];
    
    // If user has no publisher, return setup flow
    if (!user.publisher_id) {
      return res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          picture_url: user.picture_url
        },
        needsPublisherSetup: true,
        message: 'Please create or select a publisher to continue'
      });
    }
    
    // Get user's publisher info
    const publisherResult = await db.query(
      `SELECT p.id, p.name, p.hostname
       FROM publishers p
       WHERE p.id = $1`,
      [user.publisher_id]
    );
    
    // Create JWT session token
    const sessionToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        googleId: googleId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar_url
      },
      publishers: publishersResult.rows,
      token: sessionToken
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ 
      success: false, 
      error: 'Authentication failed',
      message: error.message 
    });
  }
});

/**
 * GET /api/auth/verify
 * Verify JWT session token
 */
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ valid: false });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get fresh user data
    const userResult = await db.query(
      'SELECT id, email, name, avatar_url FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ valid: false });
    }
    
    // Get publishers
    const publishersResult = await db.query(
      `SELECT p.id, p.name, p.hostname, up.role
       FROM publishers p
       JOIN user_publishers up ON p.id = up.publisher_id
       WHERE up.user_id = $1`,
      [decoded.userId]
    );
    
    res.json({ 
      valid: true, 
      user: {
        ...userResult.rows[0],
        publishers: publishersResult.rows
      }
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ valid: false });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client-side can delete token)
 */
router.post('/logout', async (req, res) => {
  res.json({ success: true });
});

/**
 * POST /api/auth/google/link-publisher
 * Link current Google user to a publisher
 */
router.post('/google/link-publisher', async (req, res) => {
  try {
    const { publisher_id } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Update user's publisher association
    await db.query(
      'UPDATE google_users SET publisher_id = $1, updated_at = NOW() WHERE id = $2',
      [publisher_id, decoded.userId]
    );
    
    res.json({ success: true, publisher_id });
  } catch (error) {
    console.error('Error linking publisher:', error);
    res.status(500).json({ error: 'Failed to link publisher' });
  }
});

/**
 * POST /api/auth/google/request-publisher
 * Submit publisher creation request
 */
router.post('/google/request-publisher', async (req, res) => {
  try {
    const { requested_name, requested_hostname, business_description } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Create publisher request
    await db.query(
      `INSERT INTO publisher_requests (google_user_id, requested_name, requested_hostname, business_description)
       VALUES ($1, $2, $3, $4)`,
      [decoded.userId, requested_name, requested_hostname, business_description]
    );
    
    res.json({ success: true, message: 'Request submitted for review' });
  } catch (error) {
    console.error('Error submitting publisher request:', error);
    res.status(500).json({ error: 'Failed to submit request' });
  }
});

module.exports = router;

