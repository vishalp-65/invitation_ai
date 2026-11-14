import { describe, expect, it } from 'vitest';
import { curvedTextPath, imageFilterCss } from './schema.js';

describe('curvedTextPath', () => {
  it('half circle arch spans the box width and is as tall as its radius', () => {
    const { d, height } = curvedTextPath(800, 100, 100);
    // r = chord / 2 for a semicircle → sag = 400
    expect(d).toMatch(/^M 0 [\d.]+ A 400(\.0+)? 400(\.0+)? 0 0 1 800 /);
    expect(height).toBeCloseTo(25 + 100 + 400 + 25, 5);
  });

  it('smile curves the other way (sweep 0) and grows the box downward', () => {
    const up = curvedTextPath(600, 80, 40);
    const down = curvedTextPath(600, 80, -40);
    expect(down.d).toContain(' 0 0 0 600 ');
    expect(down.height).toBeCloseTo(up.height, 5);
  });

  it('gentler curves need less height', () => {
    expect(curvedTextPath(600, 80, 20).height).toBeLessThan(curvedTextPath(600, 80, 60).height);
  });
});

describe('imageFilterCss', () => {
  it('returns undefined when nothing changes the photo', () => {
    expect(imageFilterCss({})).toBeUndefined();
    expect(imageFilterCss({ filter: 'none', bright: 1 })).toBeUndefined();
  });
  it('combines a preset with manual adjustments', () => {
    expect(imageFilterCss({ filter: 'mono', bright: 1.2 })).toBe('grayscale(1) brightness(1.2)');
  });
});
