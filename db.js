import { Pool } from 'pg';
import config from './config.js';

// Note: DATABASE_URL must be set in environment variables for production

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false } // needed for many hosted Postgres providers
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}
