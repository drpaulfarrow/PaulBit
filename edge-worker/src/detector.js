const redis = require('redis');

// Bot detection patterns
const BOT_PATTERNS = [
  /GPTBot/i,
  /Claude-Web/i,
  /ClaudeBot/i,
  /Perplexity/i,
  /CCBot/i,
  /Google-Extended/i,
  /bingbot/i,
  /Googlebot/i,
  /anthropic-ai/i,
  /cohere-ai/i,
  /AI2Bot/i,
  /TestBot/i
];

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60; // seconds
const RATE_LIMIT_MAX = 10; // max requests per window

let redisClient = null;

// Initialize Redis client
async function initRedis() {
  if (redisClient) return redisClient;
  
  const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
  redisClient = redis.createClient({ url: REDIS_URL });
  
  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });
  
  await redisClient.connect();
  console.log('Redis connected for rate limiting');
  return redisClient;
}

// Detect if User-Agent matches bot patterns
function detectBot(userAgent) {
  if (!userAgent) return false;
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

// Get rate limit key for IP + UA combination
function getRateLimitKey(ip, ua) {
  // Simple hash of UA for grouping similar bots
  const uaHash = ua.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
  return `ratelimit:${ip}:${uaHash}`;
}

// Check rate limit using Redis
async function checkRateLimit(key) {
  try {
    const client = await initRedis();
    
    // Increment counter
    const count = await client.incr(key);
    
    // Set expiry on first request
    if (count === 1) {
      await client.expire(key, RATE_LIMIT_WINDOW);
    }
    
    // Check if over limit
    return count <= RATE_LIMIT_MAX;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if Redis is down
    return true;
  }
}

module.exports = {
  detectBot,
  getRateLimitKey,
  checkRateLimit
};
