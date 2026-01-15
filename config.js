export default {
  sessionSecret: process.env.SESSION_SECRET || 'supersecret',
  // DATABASE_URL must be set in environment variables for production
  // Do not use a fallback in production to avoid connection errors
  databaseUrl: process.env.DATABASE_URL,
  adminBootstrapUser: process.env.ADMIN_USER || 'admin',
  adminBootstrapPass: process.env.ADMIN_PASS || 'StrongPassword!123'
};
