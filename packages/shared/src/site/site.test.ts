import { describe, expect, it } from 'vitest';
import {
  applySiteTier,
  autoCharacter,
  defaultSiteDoc,
  eventFunctionInputSchema,
  lockedInDoc,
  newSection,
  siteDocSchema,
  siteExpiresAt,
  siteTier,
  updateGuestSchema,
} from '../index.js';

describe('defaultSiteDoc', () => {
  it('builds a valid wedding page with the couple pre-filled', () => {
    const doc = defaultSiteDoc({ eventType: 'wedding', community: 'bengali', primaryNames: ['Rahul', 'Priya'] });
    expect(() => siteDocSchema.parse(doc)).not.toThrow();
    expect(doc.sections[0]!.type).toBe('hero');
    expect(doc.sections.at(-1)!.type).toBe('closing');
    const couple = doc.sections.find((s) => s.type === 'couple');
    expect(couple?.type === 'couple' && couple.people.map((p) => p.name)).toEqual(['Rahul', 'Priya']);
    expect(doc.character.attire).toBe('bengali');
    expect(doc.opening.kind).toBe('doors');
    // Royale extras start hidden so a new page isn't full of empty sections.
    expect(doc.sections.find((s) => s.type === 'livestream')?.hidden).toBe(true);
  });

  it('fits every occasion', () => {
    for (const t of ['birthday', 'griha-pravesh', 'corporate', 'puja', 'naming-ceremony']) {
      const doc = defaultSiteDoc({ eventType: t });
      expect(() => siteDocSchema.parse(doc)).not.toThrow();
      expect(new Set(doc.sections.map((s) => s.id)).size).toBe(doc.sections.length);
    }
    expect(defaultSiteDoc({ eventType: 'corporate' }).sections.some((s) => s.type === 'couple')).toBe(false);
    expect(autoCharacter('birthday')).toBe('cake');
    expect(autoCharacter('griha-pravesh')).toBe('house');
  });
});

describe('plans', () => {
  const doc = defaultSiteDoc({ eventType: 'wedding', primaryNames: ['A', 'B'] });
  doc.access.mode = 'password';
  doc.sections.find((s) => s.type === 'gallery')!.audience = ['Family'];

  it('derives the tier from features', () => {
    expect(siteTier([])).toBe('free');
    expect(siteTier(['website_premium', 'rsvp'])).toBe('premium');
    expect(siteTier(['website_premium', 'website_royale'])).toBe('royale');
  });

  it('free page drops paid sections, openings and private access', () => {
    const free = applySiteTier(doc, 'free');
    const types = free.sections.map((s) => s.type);
    expect(types).toContain('schedule');
    expect(types).not.toContain('story');
    expect(types).not.toContain('travel');
    expect(free.opening.kind).toBe('envelope'); // doors are Premium
    expect(free.access.mode).toBe('link');
  });

  it('premium keeps story & gallery but strips Royale-only options', () => {
    const premium = applySiteTier(doc, 'premium');
    expect(premium.opening.kind).toBe('doors');
    expect(premium.sections.some((s) => s.type === 'story')).toBe(true);
    expect(premium.sections.some((s) => s.type === 'travel')).toBe(false);
    expect(premium.sections.find((s) => s.type === 'gallery')!.audience).toEqual([]);
    expect(premium.access.mode).toBe('link');
  });

  it('royale keeps everything', () => {
    const royale = applySiteTier(doc, 'royale');
    expect(royale.sections.length).toBe(doc.sections.length);
    expect(royale.access.mode).toBe('password');
    expect(lockedInDoc(doc, 'royale')).toEqual([]);
    expect(lockedInDoc(doc, 'free').length).toBeGreaterThan(0);
  });

  it('expiry grows with plan and extra years', () => {
    const last = new Date('2026-12-12T00:00:00Z');
    expect(siteExpiresAt(last, 'free')!.toISOString().slice(0, 10)).toBe('2026-12-27');
    expect(siteExpiresAt(last, 'premium', 1)!.getTime() - last.getTime()).toBe((365 + 365) * 86_400_000);
    expect(siteExpiresAt(null, 'royale')).toBeNull();
  });
});

describe('schema guards', () => {
  it('new sections get unique ids', () => {
    const s = newSection('custom', ['custom', 'custom-2']);
    expect(s.id).toBe('custom-3');
  });

  it('rejects a bad UPI id', () => {
    const doc = defaultSiteDoc({ eventType: 'wedding' });
    const gifts = doc.sections.find((s) => s.type === 'gifts')!;
    expect(() => siteDocSchema.parse({ ...doc, sections: doc.sections.map((s) => (s === gifts ? { ...s, upiId: 'not a upi' } : s)) })).toThrow();
    expect(() => siteDocSchema.parse({ ...doc, sections: doc.sections.map((s) => (s === gifts ? { ...s, upiId: 'priya.sharma@okhdfcbank' } : s)) })).not.toThrow();
  });

  it('only accepts http(s) links (no javascript: on guest pages)', () => {
    const doc = defaultSiteDoc({ eventType: 'wedding' });
    const withRegistry = (registryUrl: string) => ({ ...doc, sections: doc.sections.map((s) => (s.type === 'gifts' ? { ...s, registryUrl } : s)) });
    expect(() => siteDocSchema.parse(withRegistry('javascript:alert(1)'))).toThrow();
    expect(() => siteDocSchema.parse(withRegistry('data:text/html,hi'))).toThrow();
    expect(() => siteDocSchema.parse(withRegistry('https://amazon.in/registry/x'))).not.toThrow();
    expect(eventFunctionInputSchema.safeParse({ name: 'Wedding', startsAt: '2026-12-11T20:00:00+05:30', venueName: 'Hall', mapUrl: 'javascript:alert(1)' }).success).toBe(false);
  });

  it('the couple is free, like the auto pick for weddings', () => {
    const doc = defaultSiteDoc({ eventType: 'wedding' });
    doc.character.kind = 'couple';
    expect(applySiteTier(doc, 'free').character.kind).toBe('couple');
  });

  it('guest PATCH does not reset maxPax', () => {
    expect(updateGuestSchema.parse({ stay: { room: '204' } })).toEqual({ stay: { room: '204' } });
  });
});
