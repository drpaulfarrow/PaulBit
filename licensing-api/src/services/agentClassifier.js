const redis = require('../redis');
const AgentSignature = require('../models/AgentSignature');

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REDIS_CACHE_KEY = 'agent-signatures:v1';

let compiledSignatures = [];
let refreshTimer = null;

function compile(signatures) {
  return signatures
    .map((sig) => {
      try {
        const pattern = new RegExp(sig.regex_pattern, 'i');
        return {
          name: sig.name,
          category: sig.category || 'ai',
          regex: pattern,
        };
      } catch (error) {
        console.warn(`Invalid agent regex for ${sig.name}: ${error.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

async function loadFromDatabase() {
  const signatures = await AgentSignature.listAll();
  compiledSignatures = compile(signatures);
  return signatures;
}

async function hydrateRedis(signatures) {
  if (!redis.isAvailable()) {
    return;
  }
  const client = redis.getClient();
  await client.set(REDIS_CACHE_KEY, JSON.stringify(signatures));
}

async function loadFromRedis() {
  if (!redis.isAvailable()) {
    return null;
  }
  const client = redis.getClient();
  const cache = await client.get(REDIS_CACHE_KEY);
  if (!cache) return null;
  try {
    const parsed = JSON.parse(cache);
    compiledSignatures = compile(parsed);
    return parsed;
  } catch (error) {
    console.warn('Failed to parse agent signature cache:', error.message);
    return null;
  }
}

async function refresh() {
  // Attempt to load from database
  const signatures = await loadFromDatabase();
  await hydrateRedis(signatures);
  console.log(`Agent classifier refreshed (${signatures.length} signatures).`);
}

function scheduleRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  refreshTimer = setInterval(() => {
    refresh().catch((error) => {
      console.error('Agent classifier refresh failed:', error);
    });
  }, REFRESH_INTERVAL_MS);
}

async function initialize() {
  const cache = await loadFromRedis();
  if (!cache) {
    await refresh();
  }
  scheduleRefresh();
}

function classify(userAgent = '') {
  if (!userAgent || typeof userAgent !== 'string') {
    return { type: 'unknown', signature: null };
  }

  const ua = userAgent.toLowerCase();
  for (const signature of compiledSignatures) {
    if (signature.regex.test(ua)) {
      return {
        type: signature.category === 'human' ? 'human' : 'bot',
        signature: signature.name,
      };
    }
  }

  return { type: 'unknown', signature: null };
}

function listLoadedSignatures() {
  return compiledSignatures.map((sig) => ({
    name: sig.name,
    category: sig.category,
  }));
}

module.exports = {
  initialize,
  refresh,
  classify,
  listLoadedSignatures,
};


