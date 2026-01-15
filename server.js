import express from 'express';
import cookieSession from 'cookie-session';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

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
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    databaseUrl: config.databaseUrl ? 'configured' : 'not configured'
  });
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

// Export for Vercel (serverless function)
export default app;

// Local development: start a listener
// Vercel sets NODE_ENV to 'production', so this won't run in production
if (!process.env.VERCEL && process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
