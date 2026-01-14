import { Pool } from 'pg';
import config from './config.js';

console.log('DATABASE_URL:', process.env.DATABASE_URL);
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required. Set it in your environment variables.');
}

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
