export default {
  sessionSecret: process.env.SESSION_SECRET || 'supersecret',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:muKcif-9wijty-doghub@db.mfxfqopjvmcygjcyuhqo.supabase.co:5432/postgres',
  adminBootstrapUser: process.env.ADMIN_USER || 'admin',
  adminBootstrapPass: process.env.ADMIN_PASS || 'StrongPassword!123'
};
