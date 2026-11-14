import { describe, expect, it } from 'vitest';
import { BUILTIN_TEMPLATES } from '../templates/catalog.js';
import { getEventType, EVENT_TYPE_IDS } from '../constants/event-types.js';
import { buildDesign } from './build.js';
import { designDataFrom, resolveBinding, writeBinding } from './bindings.js';
import { designDocSchema } from './schema.js';

const content = {
  invocation: '|| Shree Ganeshaya Namah ||',
  headline: 'Wedding Invitation',
  hostLine: 'Mr & Mrs Sharma request the pleasure of your company at the wedding of their daughter',
  primaryNames: ['Priya', 'Rahul'],
  primaryDetails: [],
  connector: 'weds',
  message: 'Your presence will make our celebration complete.',
  familyTitle: 'With best compliments',
  familyLines: ['Sharma family', 'Verma family'],
  closing: 'Looking forward to celebrating with you',
};
const functions = [
  { name: 'Haldi', startsAt: '2026-12-12T10:00:00+05:30', venueName: 'Sharma Niwas', venueAddress: 'Civil Lines, Jaipur' },
  { name: 'Wedding', startsAt: '2026-12-14T19:00:00+05:30', venueName: 'Rambagh Palace', venueAddress: 'Bhawani Singh Rd, Jaipur' },
];

describe('buildDesign', () => {
  it('builds a valid document for every built-in template', () => {
    for (const t of BUILTIN_TEMPLATES) {
      const eventType = t.eventTypes === 'all' ? 'other' : t.eventTypes[0]!;
      const data = designDataFrom({ content, functions, language: 'en', eventType });
      const doc = buildDesign({ template: t, data, language: 'en', eventType });
      const parsed = designDocSchema.safeParse(doc);
      if (!parsed.success) throw new Error(`${t.id}: ${parsed.error.message.slice(0, 400)}`);
      expect(doc.pages.length).toBeGreaterThanOrEqual(2);
      const texts = doc.pages[0]!.elements.filter((e) => e.type === 'text');
      expect(texts.length, t.id).toBeGreaterThan(3);
      for (const e of texts) {
        expect(e.y, `${t.id} ${e.id}`).toBeGreaterThanOrEqual(0);
        expect(e.y + e.h, `${t.id} ${e.id} ${'bind' in e ? e.bind : ''}`).toBeLessThanOrEqual(1920 + 1);
      }
    }
  });

  it('works for every event type and Hindi', () => {
    for (const type of EVENT_TYPE_IDS) {
      const t = BUILTIN_TEMPLATES.find((x) => x.design && (x.eventTypes === 'all' || x.eventTypes.includes(type))) ?? BUILTIN_TEMPLATES[0]!;
      const data = designDataFrom({ content: { ...content, primaryNames: content.primaryNames.slice(0, getEventType(type).primaryPeople) }, functions: functions.slice(0, 1), language: 'hi', eventType: type });
      const doc = buildDesign({ template: t, data, language: 'hi', eventType: type });
      expect(designDocSchema.safeParse(doc).success).toBe(true);
    }
  });

  it('reads and writes bindings', () => {
    const data = designDataFrom({ content, functions, language: 'en', eventType: 'wedding' });
    expect(data.mainFunction).toBe(1);
    expect(resolveBinding('fnM.venue', data)).toBe('Rambagh Palace');
    expect(resolveBinding('name2', data)).toBe('Rahul');
    const w = writeBinding('name2', 'Rohan', data);
    expect(w?.scope === 'content' && w.content.primaryNames).toEqual(['Priya', 'Rohan']);
    expect(writeBinding('fnM.venue', 'City Palace', data)).toEqual({ scope: 'fn', index: 1, field: 'venueName', value: 'City Palace' });
    expect(writeBinding('fnM.date', 'x', data)).toBeNull();
  });
});
