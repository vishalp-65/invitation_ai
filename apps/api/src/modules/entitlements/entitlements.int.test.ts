/**
 * Integration tests against a real Postgres (money paths). Opt-in: set TEST_DATABASE_URL to a
 * throwaway database with migrations applied (a Neon branch or `docker run postgres:17`).
 * Never point it at production: the test creates and deletes its own user and invitation.
 */
import { createDb, entitlements, eq, events, users, type DbHandle } from '@cardai/db';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));
const { EntitlementsService } = await import('./entitlements.service.js');

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('entitlements (real database)', () => {
  let handle: DbHandle;
  let svc: InstanceType<typeof EntitlementsService>;
  let userId = '';
  let eventId = '';

  beforeAll(async () => {
    handle = createDb(url!, { max: 12 });
    svc = new EntitlementsService(handle.db);
    const [u] = await handle.db.insert(users).values({ email: `int-${Date.now()}@test.invalid`, name: 'Integration' }).returning();
    userId = u!.id;
    const [e] = await handle.db
      .insert(events)
      .values({
        userId,
        slug: `int-test-${Date.now()}`,
        type: 'wedding',
        language: 'en',
        templateId: 'test',
        title: 'Integration',
        content: { headline: 'x', primaryNames: ['A'], primaryDetails: [], body: '' } as never,
        settings: { timezone: 'Asia/Kolkata' } as never,
      })
      .returning();
    eventId = e!.id;
  });

  afterAll(async () => {
    if (userId) await handle.db.delete(users).where(eq(users.id, userId)); // cascades to the event
    await handle?.close();
  });

  it('accumulates credits on repeat purchases', async () => {
    await handle.db.transaction((tx) => svc.grantProduct(tx, eventId, 'ai_clip', null));
    await handle.db.transaction((tx) => svc.grantProduct(tx, eventId, 'ai_clip', null));
    const [row] = await handle.db.select().from(entitlements).where(eq(entitlements.eventId, eventId));
    expect(row!.credits).toBe(2);
  });

  it('never spends below zero, even with concurrent spends', async () => {
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => svc.consumeCredit(eventId, 'ai_clip')));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    const [row] = await handle.db.select().from(entitlements).where(eq(entitlements.eventId, eventId));
    expect(row!.credits).toBe(0);
  });
});
