import { describe, expect, it } from 'vitest';
import { brandLink, CAPPED_SITE_SECTIONS, FREE_PLAN, siteBranding } from './free-plan.js';

describe('free plan', () => {
  it('credits Noyta by plan', () => {
    expect(siteBranding('free')).toBe('bar');
    expect(siteBranding('premium', new Date('2026-12-01T00:00:00Z'))).toBe('footer');
    expect(siteBranding('royale', new Date('2026-12-01T00:00:00Z'))).toBe('none');
  });

  it('keeps "no branding" for Premium bought before the footer', () => {
    expect(siteBranding('premium', new Date('2026-11-01T00:00:00Z'))).toBe('none');
  });

  it('warns before the limit', () => {
    expect(FREE_PLAN.siteVisitorsWarnAt).toBeLessThan(FREE_PLAN.siteVisitors);
  });

  it('capped sites keep the venue and date', () => {
    expect(CAPPED_SITE_SECTIONS.has('venue')).toBe(true);
    expect(CAPPED_SITE_SECTIONS.has('schedule')).toBe(true);
    expect(CAPPED_SITE_SECTIONS.has('gallery')).toBe(false);
  });

  it('tags brand links for attribution', () => {
    expect(brandLink('https://noyta.in', 'bar', 'priya & arjun')).toBe('https://noyta.in/?utm_source=invite&utm_medium=bar&utm_campaign=priya%20%26%20arjun');
  });
});
