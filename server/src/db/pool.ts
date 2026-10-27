import { Pool } from 'pg';
import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});
