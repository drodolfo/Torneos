import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { query } from '../db.js';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_init.sql'), 'utf8');
  await query(sql);

  // Ensure visible column exists in tournaments
  await query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT FALSE`);

  // Ensure rules column exists in tournaments
  await query(`ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS rules TEXT`);

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
