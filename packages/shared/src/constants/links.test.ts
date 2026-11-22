import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { aliasProblem, isReservedLink, LINK_SEGMENT_PATTERN, normaliseAlias } from './links.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../../apps/web');
const topLevel = (dir: string) =>
  readdirSync(join(root, dir), { withFileTypes: true })
    .map((d) => d.name.replace(/\.[a-z0-9]+$/i, ''))
    .filter((n) => !n.startsWith('[') && !n.startsWith('(') && !n.startsWith('_') && LINK_SEGMENT_PATTERN.test(n));

describe('custom link rules', () => {
  it('reserves every top-level web route and public folder', () => {
    const missing = [...topLevel('src/app'), ...topLevel('public')].filter((n) => !/^[0-9a-f]{20,}$/.test(n) && !isReservedLink(n) && !['page', 'layout', 'error', 'not-found', 'global-error', 'icon1'].includes(n));
    expect(missing).toEqual([]);
  });
  it('reserves occasion landing pages', () => {
    expect(isReservedLink('wedding-invitation')).toBe(true);
    expect(isReservedLink('church-wedding-invitation')).toBe(true);
  });
  it('accepts 2-character names and rejects bad ones', () => {
    expect(aliasProblem('rp')).toBeNull();
    expect(aliasProblem('r')).toBe('short');
    expect(aliasProblem('-rp')).toBe('format');
    expect(aliasProblem('rp-')).toBe('format');
    expect(aliasProblem('login')).toBe('reserved');
    expect(aliasProblem('rahul-weds-priya')).toBeNull();
  });
  it('normalises typing', () => {
    expect(normaliseAlias('  Rahul Weds  Priya ')).toBe('rahul-weds-priya');
    expect(normaliseAlias('R&P')).toBe('r-p');
  });
});
