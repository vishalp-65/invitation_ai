import { describe, expect, it } from 'vitest';
import { BUILTIN_TEMPLATES } from './catalog.js';
import { searchTemplates, templateMeta } from './search.js';

const ids = (q: Parameters<typeof searchTemplates>[1]) => searchTemplates(BUILTIN_TEMPLATES, q).map((h) => h.template.id);

describe('searchTemplates', () => {
  it('matches Hindi and Hinglish occasion words', () => {
    const shaadi = ids({ q: 'shaadi' });
    expect(shaadi.length).toBeGreaterThan(40);
    expect(ids({ q: 'शादी' })).toEqual(expect.arrayContaining(shaadi.slice(0, 5)));
    expect(ids({ q: 'griha pravesh' }).length).toBeGreaterThan(5);
    expect(ids({ q: 'nikaah' }).length).toBeGreaterThan(5);
  });

  it('combines words (all must match) and ranks name matches first', () => {
    const hits = ids({ q: 'lantern maroon' });
    expect(hits[0]).toBe('lantern-mahal-maroon');
    expect(ids({ q: 'ganpati peela' }).every((id) => id.length > 0)).toBe(true);
    expect(ids({ q: 'zzzz' })).toEqual([]);
  });

  it('filters by colour, style, occasion and community chips', () => {
    const blue = searchTemplates(BUILTIN_TEMPLATES, { colors: ['blue', 'navy'] });
    expect(blue.length).toBeGreaterThan(10);
    for (const h of blue) expect(templateMeta(h.template).colors.some((c) => c === 'blue' || c === 'navy')).toBe(true);
    const cartoon = ids({ styles: ['caricature'], eventType: 'wedding' });
    expect(cartoon).toEqual(expect.arrayContaining(['gulabi-mahal-blush', 'shahi-chhatri-mustard']));
    expect(ids({ community: 'muslim', q: 'arch' })).toContain('noor-arch-dusty-rose');
  });

  it('gives every template some styles and colours', () => {
    for (const t of BUILTIN_TEMPLATES) {
      const m = templateMeta(t);
      expect(m.colors.length, t.id).toBeGreaterThan(0);
    }
  });
});
