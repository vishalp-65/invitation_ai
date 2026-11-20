import { describe, expect, it } from 'vitest';
import { BUILTIN_TEMPLATES } from '../templates/catalog.js';
import { buildDesign } from '../design/build.js';
import { designDataFrom, resolveBinding } from '../design/bindings.js';
import type { DesignDoc } from '../design/schema.js';
import { defaultSiteDoc } from '../site/defaults.js';
import { autoCharacter, siteCharacterFor } from '../site/display.js';
import { attireFor, BISMILLAH, blessingFor, faithOf, invocationFor, resolveInvocation, templateFaithClash } from './faith.js';

const functions = [{ name: 'Wedding', startsAt: '2026-12-14T19:00:00+05:30', venueName: 'Rambagh Palace' }];
const content = { headline: 'Wedding', primaryNames: ['Priya', 'Rahul'], primaryDetails: [], familyLines: [] };

const SACRED = ['ganesha', 'om', 'shree', 'kalash', 'crescent', 'cross', 'khanda'];

/** Every art mark on a card: 'ganesha' or the motif id of a sacred motif. */
function marks(doc: DesignDoc): string[] {
  return doc.pages.flatMap((p) =>
    p.elements.flatMap((e) => (e.type !== 'art' ? [] : e.asset === 'ganesha' ? ['ganesha'] : e.asset === 'motif' ? [String(e.opts?.motif)] : [])),
  );
}
const texts = (doc: DesignDoc, data: ReturnType<typeof designDataFrom>) =>
  doc.pages.flatMap((p) => p.elements.flatMap((e) => (e.type === 'text' ? [e.bind ? (resolveBinding(e.bind, data) ?? '') : e.text] : [])));

function card(templateId: string, eventType: string, community?: string, invocation?: string) {
  const template = BUILTIN_TEMPLATES.find((t) => t.id === templateId)!;
  const data = designDataFrom({ content: { ...content, invocation }, functions, language: 'hi', eventType, community });
  const doc = buildDesign({ template, data, language: 'hi', eventType, community });
  return { doc, data, marks: marks(doc), texts: texts(doc, data) };
}

describe('faithOf', () => {
  it('lets a faith’s own ceremony win', () => {
    expect(faithOf('nikah', 'hindu-north')).toBe('muslim');
    expect(faithOf('anand-karaj')).toBe('sikh');
    expect(faithOf('christian-wedding')).toBe('christian');
  });
  it('follows the family’s tradition for shared occasions', () => {
    expect(faithOf('wedding', 'muslim')).toBe('muslim');
    expect(faithOf('griha-pravesh', 'jain')).toBe('jain');
    expect(faithOf('engagement', 'sikh')).toBe('sikh');
    expect(faithOf('wedding', 'modern')).toBe('secular');
    // A Jain family's puja is a Jain puja.
    expect(faithOf('puja', 'jain')).toBe('jain');
  });
  it('defaults rituals to Hindu and parties to secular', () => {
    expect(faithOf('wedding')).toBe('hindu');
    expect(faithOf('mundan')).toBe('hindu');
    expect(faithOf('birthday')).toBe('secular');
    expect(faithOf('birthday', 'hindu-north')).toBe('hindu');
    expect(blessingFor('birthday', 'hindu')).toBe('none');
  });
});

describe('blessing lines', () => {
  it('gives each faith its own line', () => {
    expect(invocationFor({ eventType: 'wedding', faith: 'hindu', language: 'hi' })).toContain('गणेशाय');
    expect(invocationFor({ eventType: 'nikah', faith: 'muslim', language: 'hi' })).toBe(BISMILLAH);
    expect(invocationFor({ eventType: 'anand-karaj', faith: 'sikh', language: 'pa' })).toContain('ੴ');
    expect(invocationFor({ eventType: 'wedding', faith: 'jain', language: 'hi' })).toContain('अरिहंताणं');
    expect(invocationFor({ eventType: 'wedding', faith: 'hindu', language: 'bn', community: 'bengali' })).toContain('প্রজাপতয়ে');
    expect(invocationFor({ eventType: 'wedding', faith: 'secular', language: 'en' })).toBeUndefined();
  });
  it('replaces a stale stock line but keeps the family’s own words and removals', () => {
    const nikah = { eventType: 'nikah', faith: 'muslim' as const, language: 'hi' as const };
    expect(resolveInvocation('॥ श्री गणेशाय नमः ॥', nikah)).toBe(BISMILLAH);
    expect(resolveInvocation('अल्लाह की रहमत से', nikah)).toBe('अल्लाह की रहमत से');
    expect(resolveInvocation('', nikah)).toBe('');
    expect(resolveInvocation(undefined, nikah)).toBeUndefined();
  });
});

describe('cards respect the family’s faith', () => {
  it('Hindu wedding on an arch also drawn for Nikah: Ganesha, never Bismillah', () => {
    const c = card('lantern-mahal-maroon', 'wedding', undefined, '॥ श्री गणेशाय नमः ॥');
    expect(c.marks).toContain('ganesha');
    expect(c.marks).not.toContain('crescent');
    expect(c.texts.join(' ')).not.toContain(BISMILLAH);
  });

  it('Nikah: Bismillah, no Ganesha anywhere, even with a stale Ganesha line', () => {
    for (const t of BUILTIN_TEMPLATES.filter((t) => t.design && (t.eventTypes === 'all' || (t.eventTypes as string[]).includes('nikah')))) {
      const c = card(t.id, 'nikah', undefined, '॥ श्री गणेशाय नमः ॥');
      expect(c.marks, t.id).not.toContain('ganesha');
      expect(c.marks.filter((m) => SACRED.includes(m) && m !== 'crescent'), t.id).toEqual([]);
      expect(c.texts.join(' '), t.id).not.toContain('गणेशाय');
      expect(c.texts, t.id).toContain(BISMILLAH);
    }
  });

  it('Ganesha designs used by a Sikh or Christian family carry their own symbol', () => {
    const ganeshaTemplates = BUILTIN_TEMPLATES.filter((t) => t.design && marks(buildDesign({ template: t, data: designDataFrom({ content, functions, language: 'hi', eventType: 'wedding' }), language: 'hi', eventType: 'wedding' })).includes('ganesha'));
    expect(ganeshaTemplates.length).toBeGreaterThan(0);
    for (const t of ganeshaTemplates) {
      expect(card(t.id, 'wedding', 'sikh').marks, t.id).not.toContain('ganesha');
      expect(card(t.id, 'wedding', 'sikh').marks, t.id).toContain('khanda');
      expect(card(t.id, 'wedding', 'christian').marks, t.id).toContain('cross');
      expect(card(t.id, 'wedding', 'modern').marks.filter((m) => SACRED.includes(m)), t.id).toEqual([]);
    }
  });

  it('flags designs drawn only for other faiths', () => {
    expect(templateFaithClash(['muslim', 'modern'], 'hindu')).toBe(true);
    expect(templateFaithClash(['hindu-north', 'muslim'], 'hindu')).toBe(false);
    expect(templateFaithClash([], 'sikh')).toBe(false);
  });
});

describe('couple attire and website characters', () => {
  const coupleAttires = (doc: DesignDoc) => doc.pages.flatMap((p) => p.elements.flatMap((e) => (e.type === 'art' && e.asset === 'couple' ? [String(e.opts?.attire)] : [])));

  it('dresses the couple for the family’s faith, keeping a design’s regional look when it fits', () => {
    expect(attireFor('muslim', undefined, 'north')).toBe('muslim');
    expect(attireFor('sikh', 'punjabi', 'bengali')).toBe('sikh');
    expect(attireFor('hindu', 'hindu-north', 'bengali')).toBe('bengali');
    expect(attireFor('hindu', 'hindu-south', 'muslim')).toBe('south');
    expect(attireFor('jain', undefined, 'christian')).toBe('north');
    expect(attireFor('secular', undefined, 'christian')).toBe('christian');
  });

  it('no couple on a Nikah card wears Hindu attire', () => {
    const couples = BUILTIN_TEMPLATES.filter((t) => t.design && (t.eventTypes === 'all' || (t.eventTypes as string[]).includes('nikah')));
    let seen = 0;
    for (const t of couples) {
      const a = coupleAttires(card(t.id, 'nikah').doc);
      seen += a.length;
      expect(a.every((x) => x === 'muslim'), t.id).toBe(true);
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('website characters: no Ganesha or kalash for other faiths, host picks kept', () => {
    expect(autoCharacter('shop-opening')).toBe('kalash');
    expect(autoCharacter('shop-opening', 'muslim')).toBe('peacock');
    expect(autoCharacter('shop-opening', 'jain')).toBe('kalash');
    expect(siteCharacterFor('ganesha', 'nikah', null, 'ai')).not.toBe('ganesha');
    expect(siteCharacterFor('ganesha', 'nikah', null, 'host')).toBe('ganesha');
    expect(defaultSiteDoc({ eventType: 'nikah' }).character.attire).toBe('muslim');
    expect(defaultSiteDoc({ eventType: 'wedding', community: 'christian' }).character.attire).toBe('christian');
    expect(defaultSiteDoc({ eventType: 'wedding', community: 'bengali' }).character.attire).toBe('bengali');
  });
});
