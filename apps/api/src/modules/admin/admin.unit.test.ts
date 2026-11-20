import { describe, expect, it } from 'vitest';
import { parseGeo } from '../analytics/geo.js';
import { toCsv } from './csv.js';
import { effectiveScopes, hasScope } from './scopes.js';

describe('CSV export', () => {
  it('quotes commas, quotes and new lines', () => {
    const csv = toCsv([{ a: 'x,y', b: 'say "hi"', c: 'line\nbreak' }], ['a', 'b', 'c']);
    expect(csv).toBe('a,b,c\r\n"x,y","say ""hi""","line\nbreak"\r\n');
  });

  it('defuses spreadsheet formulas in user-typed text', () => {
    expect(toCsv([{ n: '=HYPERLINK("x")' }], ['n'])).toContain(`"'=HYPERLINK(""x"")"`);
    expect(toCsv([{ n: '+91 98200' }], ['n'])).toContain("'+91 98200");
  });

  it('writes empty cells for null and dates as ISO', () => {
    expect(toCsv([{ a: null, d: new Date('2026-11-20T00:00:00Z') }], ['a', 'd'])).toBe('a,d\r\n,2026-11-20T00:00:00.000Z\r\n');
  });
});

describe('geo cookie', () => {
  it('reads country, state code and city', () => {
    expect(parseGeo(encodeURIComponent('IN|MH|Mumbai'))).toEqual({ country: 'IN', region: 'MH', city: 'Mumbai' });
    expect(parseGeo(encodeURIComponent('IN|KA|Bengaluru'))?.city).toBe('Bengaluru');
  });

  it('rejects junk instead of storing it', () => {
    expect(parseGeo(encodeURIComponent('IN|MH|<script>'))?.city).toBeNull();
    expect(parseGeo(undefined)).toBeNull();
    expect(parseGeo('%E0%A4%A')).toBeNull();
  });
});

describe('admin scopes', () => {
  it('treats an admin without scopes as owner', () => {
    expect(effectiveScopes([])).toEqual(['owner']);
    expect(effectiveScopes(null)).toEqual(['owner']);
    expect(effectiveScopes(['support', 'bogus'])).toEqual(['support']);
  });

  it('lets owners do everything and others only their areas', () => {
    expect(hasScope(['owner'], ['marketing'])).toBe(true);
    expect(hasScope(['support'], ['support', 'marketing'])).toBe(true);
    expect(hasScope(['content'], ['owner'])).toBe(false);
  });
});
