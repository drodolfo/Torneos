import { Pool } from 'pg';
import config from './config.js';

// Note: DATABASE_URL must be set in environment variables for production

// Create a singleton pool for serverless environments
let pool;

function resetPool() {
  if (pool) {
    try {
      pool.end();
    } catch (err) {
      console.error('Error ending pool:', err);
    }
    pool = null;
  }
}

function getPool() {
  if (!pool) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL is not set in environment variables');
    }
    
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: { rejectUnauthorized: false }, // needed for many hosted Postgres providers
      // Serverless-friendly pool settings
      max: 1, // Limit connections for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      // Reset pool on error to allow reconnection
      resetPool();
    });
  }
  return pool;
}

export async function query(text, params) {
  let client;
  try {
    const poolInstance = getPool();
    client = await poolInstance.connect();
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', err);
    console.error('Query:', text);
    console.error('Params:', params);
    // If connection error, reset pool to allow reconnection
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.message?.includes('connection')) {
      resetPool();
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}
