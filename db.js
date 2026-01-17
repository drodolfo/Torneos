import { Pool } from 'pg';
import config from './config.js';

// Note: DATABASE_URL must be set in environment variables for production

// Helper function to validate and normalize connection string
function normalizeConnectionString(connectionString) {
  if (!connectionString) {
    return null;
  }
  
  // If the connection string contains unencoded special characters in password,
  // we should handle it, but typically Supabase provides properly encoded strings
  // Just validate the format
  if (!connectionString.startsWith('postgresql://') && !connectionString.startsWith('postgres://')) {
    return null;
  }
  
  return connectionString;
}

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
  if (!client) {
    if (!config.databaseUrl) {
      const error = new Error('DATABASE_URL environment variable is not set. Please configure it in your deployment environment settings.');
      console.error(error.message);
      throw error;
    }

    // Normalize and validate DATABASE_URL format
    const normalizedUrl = normalizeConnectionString(config.databaseUrl);
    if (!normalizedUrl) {
      const error = new Error('DATABASE_URL must be a valid PostgreSQL connection string starting with postgresql:// or postgres://');
      console.error(error.message);
      console.error('Current DATABASE_URL format is invalid');
      throw error;
    }

    // Parse connection string to check if it's Supabase
    const isSupabase = config.databaseUrl.includes('.supabase.co');

    console.log('Initializing database connection...');
    console.log('Database provider:', isSupabase ? 'Supabase' : 'Other');

    // Supabase requires SSL and specific connection settings
    const poolConfig = {
      connectionString: normalizedUrl,
      // Serverless-friendly pool settings
      max: 1, // Limit connections for serverless
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    // SSL configuration - required for Supabase and most cloud providers
    if (isSupabase) {
      // Supabase requires SSL with specific settings
      poolConfig.ssl = {
        rejectUnauthorized: false, // Supabase uses self-signed certificates
        require: true
      };
    } else {
      // Other providers might also need SSL
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    pool = new Pool(poolConfig);

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      console.error('Error code:', err.code);
      // Reset pool on error to allow reconnection
      resetPool();
    });
  }
  return pool;
}

export async function query(text, params) {
  try {
    // Check if DATABASE_URL is set before attempting connection
    if (!config.databaseUrl) {
      const error = new Error('DATABASE_URL is not configured. Please set it in your environment variables.');
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
      console.error('========================================');
      console.error('DNS resolution failed (ENOTFOUND)');
      console.error('The hostname in DATABASE_URL cannot be resolved.');
      console.error('========================================');
      
      if (config.databaseUrl && config.databaseUrl.includes('.supabase.co')) {
        console.error('Supabase ENOTFOUND - Common causes:');
        console.error('1. Supabase project is PAUSED (free tier pauses after inactivity)');
        console.error('   → Go to Supabase Dashboard and RESTORE/UNPAUSE your project');
        console.error('2. Connection string is incorrect or outdated');
        console.error('   → Get fresh connection string from Supabase Dashboard → Settings → Database → Connection string → URI');
        console.error('3. Supabase project was deleted');
        console.error('   → Check if project still exists in Supabase Dashboard');
        console.error('4. Hostname changed (rare)');
        console.error('   → Get the latest connection string from Supabase');
        console.error('');
        console.error('Current hostname:', err.hostname || 'unknown');
        console.error('To fix:');
        console.error('1. Go to https://app.supabase.com');
        console.error('2. Select your project');
        console.error('3. If paused, click "Restore project"');
        console.error('4. Go to Settings → Database → Connection string');
        console.error('5. Copy the URI connection string');
        console.error('6. Update DATABASE_URL in your deployment environment and redeploy');
      } else {
        console.error('Current DATABASE_URL format:', config.databaseUrl ? 'Set (but hostname not resolvable)' : 'Not set');
        console.error('Check that the hostname in your connection string is correct and accessible.');
      }
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check that the database server is running and accessible.');
      if (config.databaseUrl && config.databaseUrl.includes('.supabase.co')) {
        console.error('Supabase: Check that your database allows connections from your deployment IPs');
      }
    } else if (err.code === 'ETIMEDOUT') {
      console.error('Connection timeout. Check network connectivity and firewall settings.');
    } else if (err.code === 'DATABASE_URL_MISSING') {
      console.error('DATABASE_URL environment variable is not set.');
      console.error('To fix: Set DATABASE_URL in your environment variables');
      console.error('Add DATABASE_URL with your Supabase connection string');
    } else if (err.code === '28P01' || err.message?.includes('password authentication')) {
      console.error('Authentication failed. Check that your DATABASE_URL has the correct username and password.');
    } else if (err.code === '3D000' || err.message?.includes('database')) {
      console.error('Database does not exist. Check that the database name in DATABASE_URL is correct.');
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
