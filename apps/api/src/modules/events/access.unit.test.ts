import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({ DB: Symbol('DB'), DB_READ: Symbol('DB_READ'), REDIS: Symbol('REDIS'), STORAGE: Symbol('STORAGE'), OPENROUTER: Symbol('OPENROUTER') }));
const { accessAllows, EventsService } = await import('./events.service.js');

/** A tiny fake of the two selects `access()` runs: the event row, then the co-host row. */
function fakeDb(event: { id: string; userId: string } | undefined, member?: { role: string }) {
  const results: unknown[][] = [event ? [event] : [], member ? [member] : []];
  const chain = { from: () => chain, where: () => Promise.resolve(results.shift() ?? []) };
  return { select: () => chain };
}
const svc = (db: unknown) => new EventsService(db as never, {} as never, {} as never, {} as never);

describe('co-host access', () => {
  it('ranks roles', () => {
    expect(accessAllows('viewer', 'view')).toBe(true);
    expect(accessAllows('viewer', 'guests')).toBe(false);
    expect(accessAllows('guests', 'guests')).toBe(true);
    expect(accessAllows('guests', 'edit')).toBe(false);
    expect(accessAllows('editor', 'edit')).toBe(true);
    expect(accessAllows('editor', 'owner')).toBe(false);
    expect(accessAllows('owner', 'owner')).toBe(true);
  });

  it('lets the owner do anything', async () => {
    const r = await svc(fakeDb({ id: 'e', userId: 'u1' })).access({ id: 'u1', role: 'user' }, 'e', 'owner');
    expect(r.access).toBe('owner');
  });

  it('applies the co-host role', async () => {
    await expect(svc(fakeDb({ id: 'e', userId: 'u1' }, { role: 'guests' })).access({ id: 'u2', role: 'user' }, 'e', 'guests')).resolves.toMatchObject({ access: 'guests' });
    await expect(svc(fakeDb({ id: 'e', userId: 'u1' }, { role: 'guests' })).access({ id: 'u2', role: 'user' }, 'e', 'edit')).rejects.toThrow(/co-host role/);
  });

  it('hides events from strangers with a 404', async () => {
    await expect(svc(fakeDb({ id: 'e', userId: 'u1' })).access({ id: 'u2', role: 'user' }, 'e', 'view')).rejects.toThrow('Event not found');
  });

  it('gives admins read-only access on customer routes (changes go through AdminGuard)', async () => {
    await expect(svc(fakeDb({ id: 'e', userId: 'u1' })).access({ id: 'a', role: 'admin' }, 'e', 'view')).resolves.toMatchObject({ access: 'viewer' });
    await expect(svc(fakeDb({ id: 'e', userId: 'u1' })).access({ id: 'a', role: 'admin' }, 'e', 'edit')).rejects.toThrow('Event not found');
  });
});
