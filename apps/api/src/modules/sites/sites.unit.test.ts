import { describe, expect, it, vi } from 'vitest';

vi.mock('../../infra/infra.module.js', () => ({
  DB: Symbol('DB'),
  DB_READ: Symbol('DB_READ'),
  REDIS: Symbol('REDIS'),
  STORAGE: Symbol('STORAGE'),
  OPENROUTER: Symbol('OPENROUTER'),
}));

const { SitesService, capSite } = await import('./sites.service.js');

type Mode = 'link' | 'password' | 'guests';
const env = { JWT_ACCESS_SECRET: 'x'.repeat(32) };
const none = {} as never;
const sites = new SitesService(env as never, none, none, none, none, none, none, none, none, none, none);
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

describe('free website visitor limit', () => {
  // db.select(...).from(...).where(...) resolving to one row.
  const withRow = (row: { count: number; n: number | null }) => {
    const db = { select: () => ({ from: () => ({ where: async () => [row] }) }) };
    const s = new SitesService(env as never, db as never, none, none, none, none, none, none, none, none, none);
    return (visitor: string | null) => (s as unknown as { overVisitorLimit: (e: string, v: string | null) => Promise<boolean> }).overVisitorLimit('e1', visitor);
  };

  it('is open below the limit, even for new people', async () => {
    expect(await withRow({ count: 49, n: null })('b:new')).toBe(false);
  });

  it('keeps the first 50 people on the full page after the limit', async () => {
    expect(await withRow({ count: 80, n: 50 })('b:early')).toBe(false);
  });

  it('shows the basics to later and unknown visitors', async () => {
    expect(await withRow({ count: 80, n: 51 })('b:late')).toBe(true);
    expect(await withRow({ count: 50, n: null })(null)).toBe(true);
  });

  it('capped pages keep only who, when and where', () => {
    const page = {
      site: { sections: ['hero', 'story', 'schedule', 'gallery', 'venue', 'rsvp', 'closing'].map((type) => ({ type })) },
      media: { gallery: ['g.jpg'], videoUrl: 'v.mp4', musicUrl: 'm.mp3', photos: ['p.jpg'] },
      features: { rsvp: true, gifts: true, branding: 'bar' },
      updates: [{}],
      wishes: [{}],
      album: ['a.jpg'],
    } as never;
    const capped = capSite(page);
    expect(capped.capped).toBe(true);
    expect(capped.site.sections.map((x) => x.type)).toEqual(['hero', 'schedule', 'venue', 'closing']);
    expect(capped.features.rsvp).toBe(false);
    expect(capped.media.gallery).toEqual([]);
    expect(capped.media.photos).toEqual(['p.jpg']);
    expect(capped.album).toEqual([]);
  });
});
