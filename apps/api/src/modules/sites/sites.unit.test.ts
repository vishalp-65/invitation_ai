import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({
  DB: Symbol('DB'),
  DB_READ: Symbol('DB_READ'),
  REDIS: Symbol('REDIS'),
  STORAGE: Symbol('STORAGE'),
  OPENROUTER: Symbol('OPENROUTER'),
}));

const { SitesService } = await import('./sites.service.js');

type Mode = 'link' | 'password' | 'guests';
const env = { JWT_ACCESS_SECRET: 'x'.repeat(32) };
const none = {} as never;
const sites = new SitesService(env as never, none, none, none, none, none, none, none, none, none);
const event = { id: 'e1', sitePasswordHash: 'scrypt$salt$hash' } as never;
const doc = (mode: Mode) => ({ access: { mode } }) as never;
const guest = { id: 'g1' } as never;
// The access rule every public side endpoint (updates, wishes, album, RSVP, QR, calendar) goes through.
const canOpen = (mode: Mode, g: unknown, key?: string, ev = event) =>
  (sites as unknown as { canOpen: (e: unknown, d: unknown, g: unknown, k?: string) => boolean }).canOpen(ev, doc(mode), g, key);

describe('private site access', () => {
  const key = sites.unlockKey(event)!;

  it('open sites need nothing', () => {
    expect(canOpen('link', null)).toBe(true);
  });

  it('a personal guest link opens any private site', () => {
    expect(canOpen('guests', guest)).toBe(true);
    expect(canOpen('password', guest)).toBe(true);
  });

  it('password sites need the unlock key', () => {
    expect(canOpen('password', null)).toBe(false);
    expect(canOpen('password', null, 'wrong')).toBe(false);
    expect(canOpen('password', null, key)).toBe(true);
  });

  it('guests-only sites never open with a key alone', () => {
    expect(canOpen('guests', null, key)).toBe(false);
  });

  it('changing the password invalidates old keys', () => {
    expect(canOpen('password', null, key, { id: 'e1', sitePasswordHash: 'scrypt$new$hash' } as never)).toBe(false);
  });
});
