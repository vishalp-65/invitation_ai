import { describe, expect, it } from 'vitest';
import { EVENT_TYPE_IDS } from '../constants/event-types.js';
import { ALL_BUILTIN_TEMPLATES, BUILTIN_TEMPLATES, findBuiltinTemplate, templateSupportsEvent } from '../templates/catalog.js';
import { designDataFrom } from './bindings.js';
import { buildDesign } from './build.js';
import { DEVA_PAIRS, TYPE_SETS } from './builder.js';
import { PAINTED_FAMILIES } from './families-painted.js';
import { EDITOR_FONTS, fontSupports } from './fonts.js';

const known = new Set(EDITOR_FONTS.map((f) => f.family));

describe('template fonts', () => {
  it('every type-set font is an editor font (so the renderer loads it)', () => {
    for (const [key, ts] of Object.entries(TYPE_SETS)) {
      for (const [role, style] of Object.entries(ts)) {
        expect(known.has(style.font), `${key}.${role} ${style.font}`).toBe(true);
        expect(style.deva && known.has(style.deva), `${key}.${role} deva ${style.deva}`).toBe(true);
      }
    }
  });

  it('every Hindi pairing can actually write Devanagari', () => {
    for (const [key, pair] of Object.entries(DEVA_PAIRS)) {
      for (const f of Object.values(pair)) expect(fontSupports(f, 'Deva'), `${key} ${f}`).toBe(true);
    }
  });

  it('a Hindi card uses the template’s Devanagari faces, an English one the reference faces', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.design === 'raat-mahal')!;
    const content = { invocation: '', headline: '', hostLine: 'Sharma parivar', primaryNames: ['Priya', 'Rahul'], primaryDetails: [], connector: '&', message: '', familyTitle: '', familyLines: [], closing: '' };
    const fns = [{ name: 'Wedding', startsAt: '2026-12-14T19:00:00+05:30', venueName: 'Rambagh Palace', venueAddress: 'Jaipur' }];
    const fontsOf = (language: 'en' | 'hi', names: string[]) => {
      const host = language === 'hi' ? 'शर्मा परिवार' : content.hostLine;
      const data = designDataFrom({ content: { ...content, hostLine: host, primaryNames: names }, functions: fns, language, eventType: 'wedding' });
      const doc = buildDesign({ template: t, data, language, eventType: 'wedding', community: 'hindu-north' });
      const cover = doc.pages.find((p) => p.id === 'cover')!;
      return new Set(cover.elements.flatMap((e) => (e.type === 'text' && (language === 'en' || /[ऀ-ॿ]/.test(e.text)) ? [e.font] : [])));
    };
    expect(fontsOf('en', ['Priya', 'Rahul']).has('Monsieur La Doulaise')).toBe(true);
    const hi = fontsOf('hi', ['प्रिया', 'राहुल']);
    expect(hi.has('Amita')).toBe(true);
    // Every Devanagari line is set in a face that can write it.
    for (const f of hi) expect(fontSupports(f, 'Deva'), f).toBe(true);
    // Names typed in English on a Hindi card keep the reference script face.
    const data = designDataFrom({ content: { ...content, primaryNames: ['Priya', 'Rahul'] }, functions: fns, language: 'hi', eventType: 'wedding' });
    const doc = buildDesign({ template: t, data, language: 'hi', eventType: 'wedding', community: 'hindu-north' });
    const name = doc.pages.find((p) => p.id === 'cover')!.elements.find((e) => e.type === 'text' && e.bind === 'name1');
    expect(name?.type === 'text' && name.font).toBe('Monsieur La Doulaise');
  });
});

describe('gallery', () => {
  it('keeps at least one design for every occasion after retiring the old ones', () => {
    for (const id of EVENT_TYPE_IDS) {
      expect(BUILTIN_TEMPLATES.some((t) => templateSupportsEvent(t, id)), id).toBe(true);
    }
  });

  it('lists the painted photo collection first and hides retired designs', () => {
    expect(BUILTIN_TEMPLATES[0]!.design).toBe(PAINTED_FAMILIES[0]!.id);
    expect(BUILTIN_TEMPLATES.some((t) => t.retired)).toBe(false);
    expect(ALL_BUILTIN_TEMPLATES.length).toBeGreaterThan(BUILTIN_TEMPLATES.length);
  });

  it('still resolves retired templates by id for existing invitations', () => {
    expect(findBuiltinTemplate('shubh-vivah-maroon')?.retired).toBe(true);
    expect(findBuiltinTemplate('line-of-love-onyx')?.retired).toBe(true);
  });
});
