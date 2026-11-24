import { expect, test } from '@playwright/test';
import { addDays, addMonths, joinTime, parseYmd, sameDay, splitTime, toYmd } from '../src/components/ui/date-utils';
import { detailsProblem, isMapUrl } from '../src/features/create/validate';

test.describe('date helpers', () => {
  test('YYYY-MM-DD round-trips at local midnight (no time-zone drift)', () => {
    const d = parseYmd('2026-12-09')!;
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 11, 9, 0]);
    expect(toYmd(d)).toBe('2026-12-09');
    expect(parseYmd('')).toBeNull();
    expect(parseYmd('09/12/2026')).toBeNull();
    expect(parseYmd('2026-12-09T18:30:00+05:30')).not.toBeNull(); // ISO date-times keep their day
  });

  test('adding months clamps to the last day of shorter months', () => {
    expect(toYmd(addMonths(parseYmd('2026-01-31')!, 1))).toBe('2026-02-28');
    expect(toYmd(addMonths(parseYmd('2028-01-31')!, 1))).toBe('2028-02-29'); // leap year
    expect(toYmd(addMonths(parseYmd('2026-03-31')!, -1))).toBe('2026-02-28');
    expect(toYmd(addMonths(parseYmd('2026-12-15')!, 1))).toBe('2027-01-15');
    expect(toYmd(addMonths(parseYmd('2026-05-10')!, -12))).toBe('2025-05-10');
  });

  test('adding days crosses months and years', () => {
    expect(toYmd(addDays(parseYmd('2026-12-31')!, 1))).toBe('2027-01-01');
    expect(toYmd(addDays(parseYmd('2026-03-01')!, -1))).toBe('2026-02-28');
    expect(sameDay(parseYmd('2026-12-09'), new Date(2026, 11, 9, 23, 59))).toBe(true);
    expect(sameDay(null, new Date())).toBe(false);
  });

  test('12-hour time parts round-trip with HH:mm', () => {
    expect(splitTime('00:05')).toEqual({ h12: 12, min: 5, pm: false });
    expect(splitTime('12:30')).toEqual({ h12: 12, min: 30, pm: true });
    expect(splitTime('19:00')).toEqual({ h12: 7, min: 0, pm: true });
    expect(splitTime('')).toBeNull();
    for (const v of ['00:00', '07:45', '12:00', '12:30', '19:00', '23:55']) {
      const p = splitTime(v)!;
      expect(joinTime(p.h12, p.min, p.pm)).toBe(v);
    }
  });
});

test.describe('create checks', () => {
  const fn = (patch: Record<string, string> = {}) => ({ key: 'k', name: 'Wedding', date: '2026-12-09', time: '19:00', venueName: 'Leela Palace', venueAddress: '', mapUrl: '', ...patch });

  test('accepts Google and Apple map links only', () => {
    expect(isMapUrl('https://maps.app.goo.gl/AbC123')).toBe(true);
    expect(isMapUrl('https://www.google.com/maps/place/Leela+Palace')).toBe(true);
    expect(isMapUrl('https://www.google.co.in/maps?q=28.6,77.2')).toBe(true);
    expect(isMapUrl('https://maps.apple.com/?q=Leela')).toBe(true);
    expect(isMapUrl('http://maps.app.goo.gl/x')).toBe(false); // not https
    expect(isMapUrl('https://example.com/maps')).toBe(false);
    expect(isMapUrl('Leela Palace, Delhi')).toBe(false);
  });

  test('asks for exactly what is missing, in order', () => {
    const base = { type: 'wedding' as const, names: ['Rohan', 'Meera'] as [string, string], functions: [fn()] };
    expect(detailsProblem(base)).toBeNull();
    expect(detailsProblem({ ...base, names: ['Rohan', ''] })).toBe('errNames');
    expect(detailsProblem({ ...base, type: 'birthday', names: ['', ''] })).toBe('errName');
    expect(detailsProblem({ ...base, type: 'birthday', names: ['Anaya', ''] })).toBeNull(); // one person
    expect(detailsProblem({ ...base, functions: [fn({ date: '' })] })).toBe('errDate');
    expect(detailsProblem({ ...base, functions: [fn({ venueName: '  ' })] })).toBe('errVenue');
    expect(detailsProblem({ ...base, functions: [fn({ mapUrl: 'not a link' })] })).toBe('errMap');
    expect(detailsProblem({ ...base, functions: [fn({ mapUrl: 'https://maps.app.goo.gl/x' })] })).toBeNull();
  });

  test('extra functions need a name; a single one may keep the default', () => {
    const base = { type: 'wedding' as const, names: ['Rohan', 'Meera'] as [string, string] };
    expect(detailsProblem({ ...base, functions: [fn({ name: '' })] })).toBeNull();
    expect(detailsProblem({ ...base, functions: [fn({ name: 'Haldi' }), fn({ name: '' })] })).toBe('errFnName');
    expect(detailsProblem({ ...base, functions: [fn({ name: 'Haldi' }), fn()] })).toBeNull();
  });
});
