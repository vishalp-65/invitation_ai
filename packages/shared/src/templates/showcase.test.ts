import { describe, expect, it } from 'vitest';
import { ATELIER_FAMILIES } from '../design/families-atelier.js';
import { CELEBRATION_FAMILIES } from '../design/families-celebration.js';
import { PAINTED_FAMILIES } from '../design/families-painted.js';
import { BUILTIN_TEMPLATES } from './catalog.js';
import { MODERN_FAMILY_IDS, SHOWCASE, showcaseRank } from './showcase.js';

describe('showcase', () => {
  it('lists exactly the modern collections', () => {
    expect([...MODERN_FAMILY_IDS].sort()).toEqual([...PAINTED_FAMILIES, ...ATELIER_FAMILIES, ...CELEBRATION_FAMILIES].map((f) => f.id).sort());
  });

  it('every showpiece is a listed, modern template', () => {
    const ids = Object.values(SHOWCASE).flat();
    for (const id of ids) {
      const t = BUILTIN_TEMPLATES.find((x) => x.id === id);
      expect(t, id).toBeDefined();
      expect(showcaseRank(t!.design), id).toBe(0);
    }
  });
});
