import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { NotAnImageError, processImage, thumbKeyFor } from './image-process.js';

const plain = (w: number, h: number, fmt: 'jpeg' | 'png' | 'webp' = 'jpeg') =>
  sharp({ create: { width: w, height: h, channels: 3, background: '#d8d0c4' } })[fmt]().toBuffer();

describe('processImage', () => {
  it('accepts a real photo, sizes it and makes a small copy', async () => {
    const r = await processImage(await plain(1200, 900), 'image/jpeg');
    expect([r.width, r.height]).toEqual([1200, 900]);
    expect(r.changed).toBe(false);
    const t = await sharp(r.thumb).metadata();
    expect(t.format).toBe('webp');
    expect(Math.max(t.width!, t.height!)).toBeLessThanOrEqual(480);
  });

  it('rejects a file that is not an image, or not the type it claims', async () => {
    await expect(processImage(Buffer.from('<html>not an image</html>'), 'image/jpeg')).rejects.toBeInstanceOf(NotAnImageError);
    await expect(processImage(await plain(100, 100, 'png'), 'image/jpeg')).rejects.toBeInstanceOf(NotAnImageError);
    await expect(processImage(await plain(100, 100), 'application/pdf')).rejects.toBeInstanceOf(NotAnImageError);
  });

  it('strips GPS and other EXIF and applies the camera rotation', async () => {
    const tagged = await sharp(await plain(800, 400)).withMetadata({ orientation: 6 }).withExif({ IFD0: { Copyright: 'x' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '26/1 55/1 0/1' } }).jpeg().toBuffer();
    expect((await sharp(tagged).metadata()).exif).toBeDefined();
    const r = await processImage(tagged, 'image/jpeg');
    expect(r.changed).toBe(true);
    // Rotated upright: 800×400 with orientation 6 is a portrait.
    expect([r.width, r.height]).toEqual([400, 800]);
    expect((await sharp(r.buffer).metadata()).exif).toBeUndefined();
  });

  it('finds the subject of a portrait photo, not the empty background', async () => {
    // A tall photo: beige wall, a saturated "face" blob near the top.
    const face = await sharp({ create: { width: 200, height: 240, channels: 3, background: '#e0a07a' } }).jpeg().toBuffer();
    const photo = await sharp({ create: { width: 900, height: 1600, channels: 3, background: '#d9d4cc' } }).composite([{ input: face, left: 350, top: 250 }]).jpeg().toBuffer();
    const r = await processImage(photo, 'image/jpeg');
    expect(r.focus.y).toBeLessThan(45);
    expect(r.focus.x).toBeGreaterThan(30);
    expect(r.focus.x).toBeLessThan(70);
  });

  it('leaves a square photo centred', async () => {
    expect((await processImage(await plain(600, 600), 'image/jpeg')).focus).toEqual({ x: 50, y: 50 });
  });
});

describe('thumbKeyFor', () => {
  it('sits next to the photo', () => {
    expect(thumbKeyFor('u/1/abc.jpg')).toBe('u/1/abc.thumb.webp');
  });
});
