import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

export type Database = NodePgDatabase<typeof schema>;

export interface DbHandle {
  db: Database;
  pool: pg.Pool;
  close: () => Promise<void>;
}

export function createDb(url: string, opts: { max?: number } = {}): DbHandle {
  const pool = new pg.Pool({
    connectionString: url,
    max: opts.max ?? 10,
    idleTimeoutMillis: 30_000,
    // Neon scales to zero; the first connection after idle can take a few seconds.
    connectionTimeoutMillis: 15_000,
  });
  // Neon closes idle connections; don't crash the process on that.
  pool.on('error', (err) => console.warn('pg pool error:', err.message));
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool, close: () => pool.end() };
}
