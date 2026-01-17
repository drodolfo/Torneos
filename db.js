import postgres from 'postgres';
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

// Create a singleton client for serverless environments
let client;

function resetClient() {
  if (client) {
    try {
      client.end();
    } catch (err) {
      console.error('Error ending client:', err);
    }
    client = null;
  }
}

function getClient() {
  if (!client) {
    if (!config.databaseUrl) {
      const error = new Error('DATABASE_URL environment variable is not set. Please configure it in your Vercel project settings.');
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

    // For Drizzle/postgres, use postgres client
    const clientConfig = {
      max: 1, // Limit connections for serverless
      idle_timeout: 20,
      connect_timeout: 10,
    };

    // SSL configuration - required in production for security
    if (process.env.NODE_ENV === 'production') {
      clientConfig.ssl = 'require';
    } else {
      clientConfig.ssl = 'prefer';
    }

    client = postgres(normalizedUrl, clientConfig);

    // Handle client errors
    client.on('error', (err) => {
      console.error('Unexpected error on client', err);
      console.error('Error code:', err.code);
      // Reset client on error to allow reconnection
      resetClient();
    });
  }
  return client;
}

export async function query(text, params) {
  try {
    // Check if DATABASE_URL is set before attempting connection
    if (!config.databaseUrl) {
      const error = new Error('DATABASE_URL is not configured. Please set it in your Vercel environment variables.');
      error.code = 'DATABASE_URL_MISSING';
      throw error;
    }

    const clientInstance = getClient();
    const res = await clientInstance.unsafe(text, params);
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
        console.error('6. Update DATABASE_URL in Vercel and redeploy');
      } else {
        console.error('Current DATABASE_URL format:', config.databaseUrl ? 'Set (but hostname not resolvable)' : 'Not set');
        console.error('Check that the hostname in your connection string is correct and accessible.');
      }
    } else if (err.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check that the database server is running and accessible.');
      if (config.databaseUrl && config.databaseUrl.includes('.supabase.co')) {
        console.error('Supabase: Check that your database allows connections from Vercel IPs');
      }
    } else if (err.code === 'ETIMEDOUT') {
      console.error('Connection timeout. Check network connectivity and firewall settings.');
    } else if (err.code === 'DATABASE_URL_MISSING') {
      console.error('DATABASE_URL environment variable is not set in Vercel.');
      console.error('To fix: Go to Vercel Dashboard → Project → Settings → Environment Variables');
      console.error('Add DATABASE_URL with your Supabase connection string');
    } else if (err.code === '28P01' || err.message?.includes('password authentication')) {
      console.error('Authentication failed. Check that your DATABASE_URL has the correct username and password.');
    } else if (err.code === '3D000' || err.message?.includes('database')) {
      console.error('Database does not exist. Check that the database name in DATABASE_URL is correct.');
    }
    
    // If connection error, reset client to allow reconnection
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND' || err.message?.includes('connection')) {
      resetClient();
    }
    throw err;
  }
}
