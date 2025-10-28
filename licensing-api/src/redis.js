const redis = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

let client = null;

async function initialize() {
  client = redis.createClient({ url: REDIS_URL });
  
  client.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });
  
  await client.connect();
  console.log('Redis connected');
}

function getClient() {
  if (!client) {
    throw new Error('Redis not initialized');
  }
  return client;
}

// Token allowlist operations
async function addTokenToAllowlist(jti, ttl) {
  await client.setEx(`token:${jti}`, ttl, '1');
}

async function isTokenInAllowlist(jti) {
  const exists = await client.exists(`token:${jti}`);
  return exists === 1;
}

async function revokeToken(jti) {
  await client.del(`token:${jti}`);
}

module.exports = {
  initialize,
  getClient,
  addTokenToAllowlist,
  isTokenInAllowlist,
  revokeToken
};
