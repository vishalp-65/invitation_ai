import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ART_IDS, artSrc, resolveArtUrl, setArtOrigin } from '../art/library.js';
import { PHOTO_LOOKS } from '../art/looks.js';
import { findBuiltinTemplate } from '../templates/catalog.js';
import { designDataFrom } from './bindings.js';
import { buildDesign } from './build.js';
import { DESIGN_H, DESIGN_W, designDocSchema, type ImageElement } from './schema.js';

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '../../../../apps/web/public');

const content = { invocation: '', headline: 'Save the date', hostLine: '', primaryNames: ['Aarav', 'Diya'], primaryDetails: [], connector: '&', message: '', familyTitle: '', familyLines: [], closing: '' };
const fns = [{ name: 'Wedding', startsAt: '2027-02-14T18:00:00+05:30', venueName: 'Leela Palace', venueAddress: 'Udaipur' }];

function cover(look: string, photos: string[]) {
  const t = findBuiltinTemplate(look)!;
  expect(t).toBeDefined();
  const data = { ...designDataFrom({ content, functions: fns, language: 'en', eventType: 'wedding' }), photos };
  const doc = buildDesign({ template: t, data, language: 'en', eventType: 'wedding' });
  expect(designDocSchema.safeParse(doc).success).toBe(true);
  return { doc, page: doc.pages.find((p) => p.id === 'cover')! };
}

describe('painted art library', () => {
  it('ships every art file in apps/web/public/art', () => {
    for (const id of ART_IDS) expect(existsSync(join(PUBLIC, 'art', `${id}.webp`)), id).toBe(true);
  });

  it('resolves stored /art paths against the renderer origin', () => {
    setArtOrigin('https://noyta.in/');
    expect(resolveArtUrl('/art/paper-cream.webp')).toBe('https://noyta.in/art/paper-cream.webp');
    expect(resolveArtUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
    expect(artSrc('mask-blob')).toBe('https://noyta.in/art/mask-blob.webp');
    setArtOrigin('');
    expect(artSrc('mask-blob')).toBe('/art/mask-blob.webp');
  });
});

describe('painted photo cards', () => {
  for (const look of PHOTO_LOOKS) {
    it(`${look.id}: paper, painted layers and a photo frame bound to the event photo`, () => {
      const { page } = cover(look.id, ['https://example.com/a.jpg', 'https://example.com/b.jpg']);
      expect(page.bg.image).toBe(`/art/${look.paper}.webp`);
      const images = page.elements.filter((e): e is ImageElement => e.type === 'image');
      const photos = images.filter((e) => e.bind?.startsWith('photo.'));
      expect(photos.length).toBe(look.photo.twin ? 2 : 1);
      expect(photos[0]!.mask).toBe(look.photo.mask);
      // Every painted layer points at a real art file.
      for (const img of images.filter((e) => e.src)) expect(img.src).toMatch(/^\/art\/[a-z0-9-]+\.webp$/);
      // The photo stays on the card.
      for (const p of photos) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x + p.w).toBeLessThanOrEqual(DESIGN_W);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y + p.h).toBeLessThanOrEqual(DESIGN_H);
      }
    });
  }

  it('a twin look shows one larger photo when the host added only one', () => {
    const { page } = cover('kahani', ['https://example.com/a.jpg']);
    expect(page.elements.filter((e) => e.type === 'image' && e.bind?.startsWith('photo.')).length).toBe(1);
  });

  it('keeps the frame with initials before any photo is added', () => {
    const { page } = cover('jharokha', []);
    const photo = page.elements.find((e): e is ImageElement => e.type === 'image' && e.bind === 'photo.0')!;
    expect(photo.empty).toBeDefined();
    // The carved window is drawn above the photo.
    const frameIndex = page.elements.findIndex((e) => e.type === 'image' && e.src === '/art/jharokha-arch.webp');
    expect(frameIndex).toBeGreaterThan(page.elements.indexOf(photo));
  });
});
