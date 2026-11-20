import { describe, expect, it } from 'vitest';
import { BUILTIN_TEMPLATES } from '../templates/catalog.js';
import { designDataFrom } from './bindings.js';
import { buildDesign } from './build.js';
import { designDocSchema, type ImageElement } from './schema.js';

const content = { invocation: '', headline: "You're invited!", hostLine: '', primaryNames: ['Juliana'], primaryDetails: [], connector: '&', message: '18th birthday party', familyTitle: '', familyLines: [], closing: '' };
const fns = [{ name: 'Party', startsAt: '2026-01-15T10:00:00+05:30', venueName: 'The Grand Banquet', venueAddress: 'Pune' }];

function cover(design: string, photos: string[] = []) {
  const t = BUILTIN_TEMPLATES.find((x) => x.design === design)!;
  const data = { ...designDataFrom({ content, functions: fns, language: 'en', eventType: 'birthday' }), photos };
  const doc = buildDesign({ template: t, data, language: 'en', eventType: 'birthday' });
  expect(designDocSchema.safeParse(doc).success).toBe(true);
  return doc.pages.find((p) => p.id === 'cover')!;
}

describe('photo frames', () => {
  it('keeps the circular frame (bound to the first photo) before any photo is added', () => {
    const img = cover('gubbare').elements.find((e): e is ImageElement => e.type === 'image');
    expect(img).toBeDefined();
    expect(img!.mask).toBe('circle');
    expect(img!.bind).toBe('photo.0');
    expect(img!.w).toBe(img!.h);
    expect(img!.empty?.font).toBe('Ephesis');
  });

  it('uses the same frame once the event has a photo', () => {
    const img = cover('gubbare', ['https://example.com/p.jpg']).elements.find((e): e is ImageElement => e.type === 'image');
    expect(img?.bind).toBe('photo.0');
    expect(img?.mask).toBe('circle');
  });

  it('polaroid and arch frames keep their own shape, border and tilt', () => {
    const polaroid = cover('yaadein').elements.find((e): e is ImageElement => e.type === 'image')!;
    expect(polaroid.mask).toBe('rect');
    expect(polaroid.borderW).toBe(26);
    expect(polaroid.rot).toBe(-3);
    const arch = cover('tasveer').elements.find((e): e is ImageElement => e.type === 'image')!;
    expect(arch.mask).toBe('arch');
  });

  it('arches the heading over the photo', () => {
    const heading = cover('gubbare').elements.find((e) => e.type === 'text' && e.bind === 'headline');
    expect(heading?.type === 'text' && heading.curve).toBe(34);
  });
});
