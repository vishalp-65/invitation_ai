import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));

const { TokenService } = await import('./token.service.js');

/** One live session (`rt-1`); `consumeRefresh` revokes it on first use, like the real conditional UPDATE. */
function setup() {
  let live = true;
  const revokeAll = vi.fn();
  const db = {
    update: () => ({
      set: () => ({
        where: () => {
          // revokeAll's UPDATE has no .returning(); the rotation's does.
          const p = Promise.resolve(revokeAll());
          return Object.assign(p, {
            returning: async () => {
              revokeAll.mockClear();
              if (!live) return [];
              live = false;
              return [{ userId: 'u1' }];
            },
          });
        },
      }),
    }),
    select: () => ({ from: () => ({ where: async () => [{ userId: 'u1' }] }) }),
  };
  const store = new Map<string, string>();
  const redis = {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string) => (store.set(k, v), 'OK'),
    del: async (k: string) => Number(store.delete(k)),
  };
  const svc = new TokenService({ JWT_ACCESS_SECRET: 'x'.repeat(32) } as never, db as never, redis as never);
  return { svc, revokeAll, store };
}

describe('refresh rotation', () => {
  it('lets a parallel refresh with the just-rotated token through', async () => {
    const { svc, revokeAll } = setup();
    await expect(svc.consumeRefresh('rt-1')).resolves.toBe('u1');
    await expect(svc.consumeRefresh('rt-1')).resolves.toBe('u1');
    expect(revokeAll).not.toHaveBeenCalled();
  });

  it('treats reuse after the grace window as theft', async () => {
    const { svc, revokeAll, store } = setup();
    await svc.consumeRefresh('rt-1');
    store.clear(); // grace entry expired
    await expect(svc.consumeRefresh('rt-1')).rejects.toThrow('Session expired');
    expect(revokeAll).toHaveBeenCalled();
  });

  it('closes the grace window on sign-out everywhere', async () => {
    const { svc } = setup();
    await svc.consumeRefresh('rt-1');
    await new Promise((r) => setTimeout(r, 2));
    await svc.revokeAll('u1');
    await expect(svc.consumeRefresh('rt-1')).rejects.toThrow('Session expired');
  });
});
