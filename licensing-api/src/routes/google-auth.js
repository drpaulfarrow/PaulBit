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
    
    // Check if users table exists (migration may not have run yet)
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.status(503).json({ 
        success: false, 
        error: 'Google OAuth tables not yet created. Run migration 023_google_auth.sql first.' 
      });
    }
    
    // Check if user exists or create
    const userResult = await db.query(
      `INSERT INTO users (google_id, email, name, avatar_url, last_login)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (google_id) 
       DO UPDATE SET 
         name = EXCLUDED.name,
         avatar_url = EXCLUDED.avatar_url,
         last_login = NOW()
       RETURNING id, email, name, avatar_url`,
      [googleId, email, name, picture]
    );
    
    const user = userResult.rows[0];
    
    // Get user's publishers
    const publishersResult = await db.query(
      `SELECT p.id, p.name, p.hostname, up.role
       FROM publishers p
       JOIN user_publishers up ON p.id = up.publisher_id
       WHERE up.user_id = $1
       ORDER BY p.id`,
      [user.id]
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

module.exports = router;

