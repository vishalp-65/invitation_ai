import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { appErrors } from './schema.js';

export interface AppErrorInput {
  source: 'web' | 'api' | 'worker';
  message: string;
  stack?: string | null;
  url?: string | null;
}

/** Ids, numbers and hex runs vary per occurrence; strip them so one bug is one row. */
function normalise(text: string): string {
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    .replace(/\b[0-9a-f]{16,}\b/gi, '<hex>')
    .replace(/\d+/g, '<n>')
    .slice(0, 300);
}

export function errorFingerprint(e: AppErrorInput): string {
  // First stack frame that is our code, without line/column numbers (they move between builds).
  const frame = (e.stack ?? '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('at ') && !l.includes('node_modules') && !l.includes('node:'));
  const where = frame?.replace(/:\d+:\d+\)?$/, '').replace(/\?[^)\s]*/g, '') ?? '';
  return createHash('sha1').update(`${e.source}|${normalise(e.message)}|${where}`).digest('hex');
}

/**
 * Records an error, grouped by fingerprint: a repeat bumps the count and re-opens a resolved
 * group. Never throws (error tracking must not cause errors).
 */
export async function recordAppError(db: Database, e: AppErrorInput): Promise<void> {
  try {
    await db
      .insert(appErrors)
      .values({
        fingerprint: errorFingerprint(e),
        source: e.source,
        message: e.message.slice(0, 1000),
        stack: e.stack?.slice(0, 8000) ?? null,
        url: e.url?.slice(0, 500) ?? null,
      })
      .onConflictDoUpdate({
        target: appErrors.fingerprint,
        set: {
          count: sql`${appErrors.count} + 1`,
          lastSeenAt: sql`now()`,
          resolvedAt: null,
          url: sql`coalesce(excluded.url, ${appErrors.url})`,
          stack: sql`coalesce(excluded.stack, ${appErrors.stack})`,
        },
      });
  } catch {
    /* swallow */
  }
}
