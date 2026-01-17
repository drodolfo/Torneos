import { execSync } from 'child_process';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import config from '../config.js';

(async () => {
  // Run Drizzle migrations
  try {
    execSync('npm run db:migrate', { stdio: 'inherit' });
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  // Drizzle migration handles schema, but ensure any additional setup

  const { rows } = await query('SELECT * FROM admins WHERE username = $1', [config.adminBootstrapUser]);
  if (rows.length === 0) {
    const hash = await bcrypt.hash(config.adminBootstrapPass, 12);
    await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [
      config.adminBootstrapUser, hash
    ]);
    console.log('Admin user created:', config.adminBootstrapUser);
  } else {
    console.log('Admin user exists:', config.adminBootstrapUser);
  }
  process.exit(0);
})();
