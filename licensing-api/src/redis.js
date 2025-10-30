const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const REDIS_ENABLED = process.env.REDIS_ENABLED === 'true';

let client = null;
let redisAvailable = false;

async function initialize() {
  if (!REDIS_ENABLED) {
    console.log('ℹ️  Redis disabled by configuration (REDIS_ENABLED=false)');
    return;
  }

  try {
    client = redis.createClient({ 
      url: REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: false
      }
    });
    
    // Only log errors once during initialization
    let errorLogged = false;
    client.on('error', (err) => {
      if (!errorLogged) {
        console.error('Redis Client Error:', err.message);
        errorLogged = true;
      }
      redisAvailable = false;
    });
    
    await client.connect();
    redisAvailable = true;
    console.log('✅ Redis connected');
  } catch (error) {
    console.warn('⚠️  Redis connection failed, running without cache:', error.message);
    redisAvailable = false;
    client = null;
  }
}

function getClient() {
  if (!client) {
    throw new Error('Redis not initialized');
  }
  return client;
}

function isAvailable() {
  return redisAvailable && client !== null;
}

// Token allowlist operations
async function addTokenToAllowlist(jti, ttl) {
  if (!isAvailable()) {
    console.log('Redis unavailable, skipping token allowlist');
    return;
  }
  await client.setEx(`token:${jti}`, ttl, '1');
}

async function isTokenInAllowlist(jti) {
  if (!isAvailable()) {
    // If Redis is unavailable, assume token is valid (fail open)
    return true;
  }
  const exists = await client.exists(`token:${jti}`);
  return exists === 1;
}

async function revokeToken(jti) {
  if (!isAvailable()) {
    console.log('Redis unavailable, cannot revoke token');
    return;
  }
  await client.del(`token:${jti}`);
}

module.exports = {
  initialize,
  getClient,
  isAvailable,
  addTokenToAllowlist,
  isTokenInAllowlist,
  revokeToken
};
