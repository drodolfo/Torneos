import { Pool } from 'pg';
import config from './config.js';

// Note: DATABASE_URL must be set in environment variables for production

// Create a singleton pool for serverless environments
let pool;

function getPool() {
  if (!pool) {
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
    });
  }
  return pool;
}

export async function query(text, params) {
  const client = await getPool().connect();
  try {
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error('Database query error:', err);
    throw err;
  } finally {
    client.release();
  }
}
