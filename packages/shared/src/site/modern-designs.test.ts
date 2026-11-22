import { describe, expect, it } from 'vitest';
import { MODERN_FAMILY_IDS } from '../templates/showcase.js';
import { designsFor, heroInk, SITE_DESIGNS } from './designs.js';
import { DESIGN_TIER } from './tiers.js';

const modern = SITE_DESIGNS.filter((d) => d.scene.style === 'modern');

describe('modern website / video packs', () => {
  it('come first and each one matches a modern card family by id', () => {
    expect(modern.length).toBeGreaterThanOrEqual(12);
    expect(SITE_DESIGNS.slice(0, modern.length).every((d) => d.scene.style === 'modern')).toBe(true);
    // Website-first premium packs have no card family of their own.
    const websiteFirst = new Set(['sheesh-mahal', 'mogra', 'kesariya', 'chandni']);
    for (const d of modern) {
      expect(DESIGN_TIER[d.id], d.id).toBeDefined();
      if (websiteFirst.has(d.id)) continue;
      expect(MODERN_FAMILY_IDS as readonly string[], d.id).toContain(d.id);
      expect(DESIGN_TIER[d.id], d.id).toBeDefined();
    }
  });

  it('lists the pack matching the card first in the picker', () => {
    expect(designsFor('wedding', 'hindu-north', 'gulab-ring')[0]!.id).toBe('gulab-ring');
    expect(designsFor('birthday', null, 'gubbare')[0]!.id).toBe('gubbare');
    // Unknown or classic card designs leave the order alone.
    expect(designsFor('wedding', 'hindu-north', 'darbar-arch')[0]!.id).toBe(designsFor('wedding', 'hindu-north')[0]!.id);
  });

  it('cover text uses the pack ink when set (cream on the maroon arch)', () => {
    expect(heroInk(SITE_DESIGNS.find((d) => d.id === 'raat-mahal')!)).toBe('#FBEFD9');
    expect(heroInk(SITE_DESIGNS.find((d) => d.id === 'gulab-ring')!)).toBe('#9C3D57');
  });
});
