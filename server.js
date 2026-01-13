import express from 'express';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

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

// Sessions (cookie-only store for serverless-friendly usage)
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 12
  }
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

// Routes
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// Export for Vercel
export default app;

// Local development: start a listener
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  const port = process.env.PORT || 3001;
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
