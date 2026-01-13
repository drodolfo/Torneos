import 'dotenv/config';

export default {
  sessionSecret: process.env.SESSION_SECRET || 'change-me',
  databaseUrl: process.env.DATABASE_URL,
  adminBootstrapUser: process.env.ADMIN_USER || 'admin',
  adminBootstrapPass: process.env.ADMIN_PASS || 'StrongPassword!123'
};
