import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  // Warn at module load time but don't crash — allows `npm run lint` and
  // `vite build` to complete in CI without a live DB connection.
  // Any actual DB call will fail naturally if this is missing at runtime.
  console.warn('[agentbook/db] WARNING: DATABASE_URL is not set. All database calls will fail.');
}

// Connection pool — postgres.js handles pooling automatically.
// For serverless, limit max connections to avoid exhausting Supabase pool.
const client = postgres(DATABASE_URL || 'postgresql://placeholder', {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
