import { describe, expect, it } from 'vitest';
import { EVENT_TYPE_IDS } from '../constants/event-types.js';
import { defaultDesignFor, getSiteDesign, SITE_DESIGNS, SITE_LAYOUTS, videoDesignFor } from './designs.js';
import { DESIGN_TIER, OPENING_TIER } from './tiers.js';

describe('layout designs (website only)', () => {
  const layouts = SITE_DESIGNS.filter((d) => d.layout);

  it('cover every layout once, each with a tier and an opening', () => {
    expect(new Set(layouts.map((d) => d.layout))).toEqual(new Set(SITE_LAYOUTS));
    for (const d of layouts) {
      expect(DESIGN_TIER[d.id], d.id).toBeDefined();
      expect(OPENING_TIER[d.opening], d.id).toBeDefined();
    }
  });

  it('are never the automatic default for any occasion', () => {
    for (const type of EVENT_TYPE_IDS) expect(getSiteDesign(defaultDesignFor(type))?.layout, type).toBeUndefined();
  });

  it('make their video from a cinematic design', () => {
    for (const d of layouts) expect(getSiteDesign(videoDesignFor(d.id, 'wedding'))?.layout, d.id).toBeUndefined();
    expect(videoDesignFor('raat-mahal', 'wedding')).toBe('raat-mahal');
  });
});
