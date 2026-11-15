import { describe, expect, it } from 'vitest';
import { BUILTIN_TEMPLATES } from '../templates/catalog.js';
import { getEventType, EVENT_TYPE_IDS } from '../constants/event-types.js';
import { buildDesign, coverPageIndex } from './build.js';
import { functionIcon } from './pages.js';
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
      const texts = doc.pages[coverPageIndex(doc)]!.elements.filter((e) => e.type === 'text');
      expect(texts.length, t.id).toBeGreaterThan(3);
      for (const e of doc.pages.flatMap((pg) => pg.elements.filter((x) => x.type === 'text'))) {
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

  it('adds blessing, ceremonies, family & RSVP and photo pages', () => {
    const t = BUILTIN_TEMPLATES.find((x) => x.design === 'rajwada-gold')!;
    const many = Array.from({ length: 7 }, (_, i) => ({ ...functions[i % 2]!, name: ['Haldi', 'Mehendi', 'Sangeet', 'Baraat', 'Wedding', 'Reception', 'Puja'][i]! }));
    const data = designDataFrom({
      content: { ...content, welcomeLines: ['Aarav', 'Diya'], rsvpContacts: [{ name: 'Ramesh Sharma', phone: '98290 12345' }], note: 'Your blessings are our gift', hashtag: '#PriyaWedsRahul' },
      functions: many,
      language: 'en',
      eventType: 'wedding',
      rsvpDeadline: '2026-12-01T00:00:00+05:30',
    });
    const doc = buildDesign({ template: t, data, language: 'en', eventType: 'wedding' });
    expect(doc.pages.map((p) => p.id)).toEqual(['blessing', 'cover', 'schedule-1', 'schedule-2', 'schedule-3', 'family', 'photo']);
    const binds = doc.pages.flatMap((p) => p.elements.map((e) => ('bind' in e ? e.bind : undefined))).filter(Boolean);
    for (const b of ['invocation', 'fn6.name', 'welcomeLines', 'rsvpContacts', 'rsvpBy', 'note', 'hashtag']) expect(binds).toContain(b);
    expect(resolveBinding('rsvpBy', data)).toBe('Kindly RSVP by 1 December');
    // Function blocks move together.
    const fn0 = doc.pages[2]!.elements.filter((e) => e.group === 'fn0');
    expect(fn0.length).toBeGreaterThanOrEqual(4);
    // Nikah opens with Bismillah instead of Ganesha.
    const nikah = buildDesign({ template: t, data, language: 'en', eventType: 'nikah' });
    expect(nikah.pages[0]!.elements.some((e) => e.type === 'text' && e.font === 'Amiri')).toBe(true);
  });

  it('picks function icons and parses RSVP contacts', () => {
    expect(['Haldi Ceremony', 'मेहंदी', 'Sangeet Night', 'Baraat', 'Pheras', 'Reception Dinner', 'Ring Ceremony', 'Satyanarayan Katha', 'Something'].map(functionIcon)).toEqual([
      'haldi', 'mehendi', 'sangeet', 'baraat', 'pheras', 'dinner', 'rings', 'puja', 'flower',
    ]);
    const data = designDataFrom({ content, functions, language: 'en', eventType: 'wedding' });
    const w = writeBinding('rsvpContacts', 'Ramesh Sharma · 98290 12345\nSunita - +91 99999 00000', data);
    expect(w?.scope === 'content' && w.content.rsvpContacts).toEqual([
      { name: 'Ramesh Sharma', phone: '98290 12345' },
      { name: 'Sunita', phone: '+91 99999 00000' },
    ]);
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
