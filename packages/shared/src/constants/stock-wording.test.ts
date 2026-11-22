import { describe, expect, it } from 'vitest';
import { EVENT_TYPES } from './event-types.js';
import { LANGUAGES } from './languages.js';
import { EVENT_TITLES, eventTitle, localizeFunctionName, STOCK_LINES } from './stock-wording.js';
import { BUILTIN_TEMPLATES } from '../templates/catalog.js';
import { templateSampleLanguage } from '../templates/showcase.js';

describe('stock wording', () => {
  it('has every line in every card language', () => {
    for (const l of LANGUAGES) {
      const s = STOCK_LINES[l.code];
      expect(s, l.code).toBeDefined();
      for (const v of [s.invited, s.weds, s.and, s.message, s.familyTitle, s.closing, s.hostLine('X')]) expect(v.trim(), l.code).not.toBe('');
    }
  });

  it('titles every occasion in every language, never in English outside English', () => {
    for (const e of EVENT_TYPES) {
      expect(EVENT_TITLES[e.id], e.id).toBeDefined();
      for (const l of LANGUAGES.filter((x) => x.code !== 'en')) expect(eventTitle(e.id, l.code), `${e.id}/${l.code}`).not.toMatch(/[a-z]/i);
    }
  });

  it('translates every suggested function name and keeps typed ones', () => {
    for (const e of EVENT_TYPES)
      for (const f of e.defaultFunctions) {
        expect(localizeFunctionName(f, 'hi'), f).not.toMatch(/[a-z]/i);
        expect(localizeFunctionName(localizeFunctionName(f, 'ta'), 'en').toLowerCase(), f).toBe(f === 'Mehndi' ? 'mehendi' : f.toLowerCase());
      }
    expect(localizeFunctionName('Cocktail night', 'hi')).toBe('Cocktail night');
    expect(localizeFunctionName('हल्दी', 'en')).toBe('Haldi');
  });

  it('gives every design a tile language', () => {
    for (const t of BUILTIN_TEMPLATES) expect(['en', 'hi']).toContain(templateSampleLanguage(t));
  });
});
