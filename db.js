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
      const error = new Error('DATABASE_URL environment variable is not set. Please configure it in your Vercel project settings.');
      console.error(error.message);
      throw error;
    }
    
    // Validate DATABASE_URL format
    if (!config.databaseUrl.startsWith('postgresql://') && !config.databaseUrl.startsWith('postgres://')) {
      const error = new Error('DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://');
      console.error(error.message);
      throw error;
    }
    
    console.log('Initializing database connection pool...');
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
    // Check if DATABASE_URL is set before attempting connection
    if (!config.databaseUrl) {
      const error = new Error('DATABASE_URL is not configured. Please set it in your Vercel environment variables.');
      error.code = 'DATABASE_URL_MISSING';
      throw error;
    }
    
    const poolInstance = getPool();
    client = await poolInstance.connect();
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', err);
    console.error('Error code:', err.code);
    console.error('Error message:', err.message);
    console.error('Query:', text);
    console.error('Params:', params);
    
    // Handle specific error types
    if (err.code === 'ENOTFOUND') {
      console.error('DNS resolution failed. Check that DATABASE_URL contains a valid hostname.');
      console.error('Current DATABASE_URL format:', config.databaseUrl ? 'Set (but hostname not resolvable)' : 'Not set');
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check that the database server is running and accessible.');
    } else if (err.code === 'ETIMEDOUT') {
      console.error('Connection timeout. Check network connectivity and firewall settings.');
    } else if (err.code === 'DATABASE_URL_MISSING') {
      console.error('DATABASE_URL environment variable is not set in Vercel.');
    }
    
    // If connection error, reset pool to allow reconnection
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND' || err.message?.includes('connection')) {
      resetPool();
    }
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
}
