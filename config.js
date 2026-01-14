console.log('process.env.DATABASE_URL:', process.env.DATABASE_URL);

export default {
  sessionSecret: process.env.SESSION_SECRET || 'change-me',
  databaseUrl: process.env.DATABASE_URL,
  adminBootstrapUser: process.env.ADMIN_USER || 'admin',
  adminBootstrapPass: process.env.ADMIN_PASS || 'StrongPassword!123'
};
