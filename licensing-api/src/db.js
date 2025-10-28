const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://tollbit:tollbit123@postgres:5432/tollbit';

let pool = null;

async function initialize() {
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
  });

  // Test connection
  try {
    const client = await pool.connect();
    console.log('Database connection established');
    client.release();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
}

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  initialize,
  getPool,
  query
};
