import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './drizzle/schema.js';
import config from './config.js';

// Create a connection for serverless environments
let client;
let db;

function getDb() {
  if (!db) {
    if (!config.databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }

    // For serverless, create a new connection each time or use a pool
    // Drizzle with postgres-js handles connection pooling
    client = postgres(config.databaseUrl, {
      max: 1, // Limit connections for serverless
      idle_timeout: 20,
      connect_timeout: 10,
    });

    db = drizzle(client, { schema });
  }
  return db;
}

// Export the database instance
export { getDb as db };

// For queries that need direct access, but since we're migrating to Drizzle,
// the query function might be replaced with direct db operations.

// If you need raw queries, you can use client.sql`...` but prefer Drizzle methods.