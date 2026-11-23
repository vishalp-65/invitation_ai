import { describe, expect, it } from 'vitest';
import { COMMUNITIES } from './event-types.js';
import { CEREMONIES, CEREMONY_PACKS, ceremonyPack, ceremonyStart, ceremonyText, findCeremony, getCeremony } from './ceremonies.js';

describe('ceremony packs', () => {
  it('every tradition has a pack of known ceremonies, wedding day included', () => {
    for (const c of COMMUNITIES) {
      const pack = CEREMONY_PACKS[c];
      expect(pack.length, c).toBeGreaterThan(2);
      for (const id of pack) expect(getCeremony(id), `${c}: ${id}`).toBeDefined();
      expect(pack.some((id) => getCeremony(id)!.day === 0), c).toBe(true);
    }
  });

  it('ids are unique and times are HH:MM', () => {
    expect(new Set(CEREMONIES.map((c) => c.id)).size).toBe(CEREMONIES.length);
    for (const c of CEREMONIES) expect(c.time).toMatch(/^\d{2}:\d{2}$/);
  });

  it('falls back by event type, then to North Indian', () => {
    expect(ceremonyPack(null, 'nikah')[0]!.id).toBe('manjha');
    expect(ceremonyPack(null, 'anand-karaj').some((c) => c.id === 'anand-karaj')).toBe(true);
    expect(ceremonyPack(undefined, 'wedding')[0]!.id).toBe('tilak');
  });

  it('recognises a function by any of its names, whole words only', () => {
    expect(findCeremony('Haldi Ceremony')?.id).toBe('haldi');
    expect(findCeremony('हल्दी')?.id).toBe('haldi');
    expect(findCeremony('Mehndi night')?.id).toBe('mehendi');
    expect(findCeremony('ਅਨੰਦ ਕਾਰਜ')?.id).toBe('anand-karaj');
    expect(findCeremony('Rose garden lunch')).toBeNull();
  });

  it('names in the family language, English otherwise', () => {
    const haldi = getCeremony('haldi')!;
    expect(ceremonyText(haldi.name, 'gu')).toBe('પીઠી');
    expect(ceremonyText(getCeremony('tilak')!.name, 'ta')).toBe('Tilak');
  });

  it('counts the day from the wedding day in IST', () => {
    expect(ceremonyStart(getCeremony('mehendi')!, '2027-02-14')).toBe('2027-02-12T16:00:00+05:30');
    expect(ceremonyStart(getCeremony('reception')!, '2027-02-28')).toBe('2027-03-01T19:30:00+05:30');
  });
});
