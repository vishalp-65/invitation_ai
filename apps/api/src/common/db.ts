import type { Database } from '@cardai/db';

/** A transaction handle, as passed to `db.transaction(async (tx) => …)`. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
/** Anything that can run a query: the pool-backed db or an open transaction. */
export type DbExecutor = Database | Tx;

/** Postgres SQLSTATE of the underlying driver error (Drizzle ≥0.44 wraps it in `.cause`). */
export function pgErrorCode(err: unknown): string | undefined {
  const e = err as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = e?.cause?.code ?? e?.code;
  return typeof code === 'string' ? code : undefined;
}

/** True for a unique-constraint violation (SQLSTATE 23505). */
export const isUniqueViolation = (err: unknown) => pgErrorCode(err) === '23505';

/** Runs a query and returns `fallback` instead of throwing on a unique violation (retry loops). */
export async function onUniqueViolation<T>(query: PromiseLike<T>, fallback: T): Promise<T> {
  try {
    return await query;
  } catch (err) {
    if (isUniqueViolation(err)) return fallback;
    throw err;
  }
}
