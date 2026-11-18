'use client';

import { SCAN_MAX_IMAGE_CHARS } from '@cardai/shared';

export const SCAN_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const LONG_SIDE = 1800;

export class UnreadablePhotoError extends Error {
  constructor(readonly fileName: string) {
    super(`Could not open ${fileName}. Use a JPG or PNG photo.`);
  }
}

/**
 * Photo → resized JPEG data URL small enough to send (phone photos are 4–12 MB). Card text stays
 * legible at ~1800px on the long side; quality steps down until it fits the per-image cap.
 */
export async function prepareImage(file: File): Promise<string> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    // HEIC opens only where the browser can decode it (Safari).
    throw new UnreadablePhotoError(file.name);
  }
  let side = LONG_SIDE;
  for (let attempt = 0; attempt < 5; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', attempt < 2 ? 0.85 : 0.75);
    if (url.length <= SCAN_MAX_IMAGE_CHARS) {
      bitmap.close();
      return url;
    }
    side = Math.round(side * 0.82);
  }
  bitmap.close();
  throw new UnreadablePhotoError(file.name);
}
