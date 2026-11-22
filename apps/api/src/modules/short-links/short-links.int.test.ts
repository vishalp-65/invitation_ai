/**
 * Custom-link collisions against a real Postgres. Opt-in: set TEST_DATABASE_URL to a throwaway
 * database with migrations applied. Never point it at production.
 */
import { createDb, eq, events, guests, users, type DbHandle } from '@cardai/db';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));
const { ShortLinksService } = await import('./short-links.service.js');

const url = process.env.TEST_DATABASE_URL;
const memRedis = () => {
  const m = new Map<string, string>();
  return { get: async (k: string) => m.get(k) ?? null, set: async (k: string, v: string) => void m.set(k, v), del: async (...k: string[]) => k.forEach((x) => m.delete(x)) };
};

describe.skipIf(!url)('custom links (real database)', () => {
  let handle: DbHandle;
  let svc: InstanceType<typeof ShortLinksService>;
  let userId = '';
  const ids: string[] = [];
  const stamp = Date.now().toString(36);

  async function newEvent(n: number) {
    const [e] = await handle.db
      .insert(events)
      .values({
        userId,
        slug: `int-link-${stamp}-${n}`,
        type: 'wedding',
        language: 'en',
        templateId: 'test',
        title: 'Integration',
        content: { headline: 'x', primaryNames: ['A'], primaryDetails: [], body: '' } as never,
        settings: { timezone: 'Asia/Kolkata' } as never,
      })
      .returning();
    ids.push(e!.id);
    return e!;
  }

  beforeAll(async () => {
    handle = createDb(url!, { max: 6 });
    svc = new ShortLinksService({ APP_URL: 'https://noyta.test' } as never, handle.db, memRedis() as never);
    const [u] = await handle.db.insert(users).values({ email: `int-link-${stamp}@test.invalid`, name: 'Integration' }).returning();
    userId = u!.id;
  });
  afterAll(async () => {
    if (userId) await handle.db.delete(users).where(eq(users.id, userId));
    await handle?.close();
  });

  it('takes a 2-letter name, resolves it in any case, and lets only one event have it', async () => {
    const a = await newEvent(1);
    const b = await newEvent(2);
    const name = `z${stamp.slice(-1)}`;
    await expect(svc.setAlias(a.id, name)).resolves.toBe(name);
    expect((await svc.resolve(name.toUpperCase())).slug).toBe(a.slug);
    const check = await svc.checkAlias(b.id, name);
    expect(check.available).toBe(false);
    expect(check.suggestions.length).toBeGreaterThan(0);
    await expect(svc.setAlias(b.id, name)).rejects.toThrow();
    // Two hosts racing for one fresh name: exactly one wins.
    const race = `race-${stamp}`;
    const results = await Promise.allSettled([svc.setAlias(a.id, race), svc.setAlias(b.id, race)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('refuses a name that reads the same as an existing code', async () => {
    const e = await newEvent(3);
    const [g] = await handle.db.insert(guests).values({ eventId: e.id, name: 'G', token: `tok${stamp}`, shortCode: `Ab${stamp.slice(-5).padEnd(5, 'x')}`.slice(0, 7) }).returning();
    const check = await svc.checkAlias(e.id, g!.shortCode!.toLowerCase());
    expect(check.available).toBe(false);
  });

  it('refuses reserved words', async () => {
    const e = await newEvent(4);
    expect((await svc.checkAlias(e.id, 'pricing')).available).toBe(false);
    expect((await svc.checkAlias(e.id, 'wedding-invitation')).available).toBe(false);
  });
});
