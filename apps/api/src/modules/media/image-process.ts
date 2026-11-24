import sharp, { type Metadata } from 'sharp';

const FORMAT_OF: Record<string, 'jpeg' | 'png' | 'webp'> = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };

export const THUMB_SIDE = 480;

export interface ProcessedImage {
  /** The bytes to keep. Same as the input unless it had to be cleaned (EXIF, orientation). */
  buffer: Buffer;
  changed: boolean;
  width: number;
  height: number;
  thumb: Buffer;
  /** Where the eye goes in the picture, in % (object-position): faces and detail, not the empty sky. */
  focus: { x: number; y: number };
}

export class NotAnImageError extends Error {}

/**
 * Checks that an upload really is the picture it says it is (the declared type comes from the
 * browser and can be anything), removes hidden data such as GPS location, applies the camera's
 * rotation, and makes the small copy used in lists and the focal point used for cropping.
 */
export async function processImage(input: Buffer, declaredType: string): Promise<ProcessedImage> {
  const want = FORMAT_OF[declaredType];
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 100_000_000 }).metadata();
  } catch {
    throw new NotAnImageError('That file is not a valid photo.');
  }
  if (!want || meta.format !== want || !meta.width || !meta.height) throw new NotAnImageError('That file is not the type of photo it claims to be.');

  // EXIF can hold the phone's GPS position: wedding photos are shared with guests, so drop it.
  const dirty = Boolean(meta.exif) || (meta.orientation ?? 1) > 1;
  let buffer = input;
  if (dirty) {
    const pipe = sharp(input).rotate();
    buffer = await (want === 'jpeg' ? pipe.jpeg({ quality: 92 }) : want === 'webp' ? pipe.webp({ quality: 92 }) : pipe.png()).toBuffer();
  }
  const out = dirty ? await sharp(buffer).metadata() : meta;
  const width = out.width ?? meta.width;
  const height = out.height ?? meta.height;

  const thumb = await sharp(buffer).resize(THUMB_SIDE, THUMB_SIDE, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer();
  return { buffer, changed: dirty, width, height, thumb, focus: await focalPoint(buffer) };
}

/** libvips' "attention" crop finds the most interesting square; its centre is the focal point. */
async function focalPoint(buffer: Buffer): Promise<{ x: number; y: number }> {
  try {
    const small = await sharp(buffer).rotate().resize(256, 256, { fit: 'inside', withoutEnlargement: true }).toBuffer({ resolveWithObject: true });
    const { info } = small;
    const side = Math.min(info.width, info.height);
    // A square (or nearly) image has nowhere to move.
    if (Math.abs(info.width - info.height) < 8) return { x: 50, y: 50 };
    const crop = await sharp(small.data).resize(side, side, { fit: 'cover', position: sharp.strategy.attention }).toBuffer({ resolveWithObject: true });
    const ax = (crop.info as { attentionX?: number }).attentionX;
    const ay = (crop.info as { attentionY?: number }).attentionY;
    if (typeof ax !== 'number' || typeof ay !== 'number') return { x: 50, y: 50 };
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));
    return { x: clamp((ax / info.width) * 100), y: clamp((ay / info.height) * 100) };
  } catch {
    return { x: 50, y: 50 };
  }
}

export const thumbKeyFor = (storageKey: string) => storageKey.replace(/\.[a-z0-9]+$/i, '.thumb.webp');
