import express from 'express';
import cookieSession from 'cookie-session';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';
import { query } from './db.js';

// Validate required environment variables at startup
if (!config.databaseUrl) {
  console.error('========================================');
  console.error('ERROR: DATABASE_URL is not set!');
  console.error('========================================');
  console.error('Please set the DATABASE_URL environment variable in your Vercel project:');
  console.error('1. Go to your Vercel project settings');
  console.error('2. Navigate to Environment Variables');
  console.error('3. Add DATABASE_URL with your PostgreSQL connection string');
  console.error('   Format: postgresql://user:password@host:port/database');
  console.error('========================================');
}

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing
app.use(express.urlencoded({ extended: true }));

// Sessions (cookie-based for serverless-friendly usage)
const sessionSecret = config.sessionSecret || 'fallback-secret-change-in-production';
if (!config.sessionSecret) {
  console.warn('WARNING: SESSION_SECRET not set, using fallback secret');
}
app.use(cookieSession({
  name: 'session',
  keys: [sessionSecret],
  httpOnly: true,
  sameSite: 'lax',
  maxAge: 1000 * 60 * 60 * 12 // 12 hours
}));

// Argentina date helper
app.locals.formatDateAR = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Health check endpoint (doesn't require database)
app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    databaseUrl: config.databaseUrl ? 'configured' : 'not configured',
    environment: process.env.NODE_ENV || 'not set',
    vercel: !!process.env.VERCEL
  };
  
  // Add database info if configured (without exposing sensitive data)
  if (config.databaseUrl) {
    try {
      const url = new URL(config.databaseUrl);
      health.database = {
        host: url.hostname,
        port: url.port || '5432',
        database: url.pathname.replace('/', ''),
        isSupabase: url.hostname.includes('.supabase.co'),
        protocol: url.protocol.replace(':', ''),
        username: url.username || 'not set'
      };
      
      // Check if Supabase project might be paused
      if (url.hostname.includes('.supabase.co')) {
        health.database.note = 'If you see ENOTFOUND errors, your Supabase project might be paused. Check Supabase Dashboard.';
      }
    } catch (err) {
      health.database = { error: 'Invalid connection string format' };
    }
  }
  
  res.status(200).json(health);
});

// Database connection test endpoint
app.get('/test-db', async (req, res) => {
  try {
    // Simple query to test connection
    const result = await query('SELECT NOW() as current_time, version() as pg_version');
    res.status(200).json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: new Date().toISOString(),
      database: {
        time: result.rows[0].current_time,
        version: result.rows[0].pg_version.substring(0, 50) + '...'
      }
    });
  } catch (err) {
    const response = {
      status: 'error',
      message: 'Database connection failed',
      error: {
        code: err.code,
        message: err.message,
        hostname: err.hostname || 'unknown'
      },
      troubleshooting: {
        enotfound: 'If code is ENOTFOUND: Your Supabase project might be paused. Go to Supabase Dashboard and restore it.',
        econnrefused: 'If code is ECONNREFUSED: Database server is not accessible. Check firewall settings.',
        etimedout: 'If code is ETIMEDOUT: Connection timeout. Check network connectivity.',
        authentication: 'If authentication error: Check username and password in DATABASE_URL.'
      }
    };
    
    // Special handling for DATABASE_URL_MISSING
    if (err.code === 'DATABASE_URL_MISSING') {
      response.message = 'DATABASE_URL environment variable is not set in Vercel';
      response.fixSteps = {
        step1: 'Go to your Vercel Dashboard: https://vercel.com/dashboard',
        step2: 'Select your project',
        step3: 'Navigate to Settings → Environment Variables',
        step4: 'Click "Add New"',
        step5: {
          name: 'DATABASE_URL',
          value: 'Your PostgreSQL connection string',
          example: 'postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres',
          note: 'Get this from Supabase Dashboard → Settings → Database → Connection string → URI tab'
        },
        step6: 'Select "Production" environment (and Preview/Development if needed)',
        step7: 'Click "Save"',
        step8: 'IMPORTANT: Redeploy your application (Deployments → ⋯ → Redeploy)',
        step9: 'Wait for deployment to complete, then test again'
      };
      response.important = 'The .env file is only for local development. You MUST set DATABASE_URL in Vercel environment variables for production.';
    }
    
    // Special handling for ENOTFOUND (Supabase project paused)
    if (err.code === 'ENOTFOUND' && config.databaseUrl && config.databaseUrl.includes('.supabase.co')) {
      response.message = 'Supabase hostname cannot be resolved (ENOTFOUND)';
      response.mostLikelyCause = 'Your Supabase project is PAUSED. Free tier projects pause after 7 days of inactivity.';
      response.fixSteps = {
        step1: 'Go to Supabase Dashboard: https://app.supabase.com',
        step2: 'Select your project',
        step3: 'Look for "Project Paused" message or "Restore" button',
        step4: 'Click "Restore project" or "Unpause"',
        step5: 'Wait 2-3 minutes for the database to be restored',
        step6: 'Verify the connection string is still correct:',
        substep6a: 'Go to Settings → Database → Connection string',
        substep6b: 'Select "URI" tab (not Connection Pooling)',
        substep6c: 'Copy the connection string',
        step7: 'If connection string changed, update it in Vercel:',
        substep7a: 'Vercel Dashboard → Your Project → Settings → Environment Variables',
        substep7b: 'Edit DATABASE_URL with the new connection string',
        substep7c: 'Save and redeploy',
        step8: 'Test the connection again at /test-db'
      };
      response.alternativeCauses = {
        cause1: 'Project was deleted - Check if project exists in Supabase Dashboard',
        cause2: 'Connection string is incorrect - Get fresh connection string from Supabase',
        cause3: 'Hostname changed - Rare, but get latest connection string from Supabase'
      };
      response.currentHostname = err.hostname || 'unknown';
    }
    
    res.status(500).json(response);
  }
});

// Routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).send('Página no encontrada');
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  console.error('Error stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);
  
  // Don't send error details in production, but log them
  const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error';
  res.status(500).send(errorMessage);
});

// Export for serverless deployment
export default app;

// Local development: start a listener
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
