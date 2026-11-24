/**
 * Prepares a photo in the browser before upload: big phone photos are scaled to 2400 px and
 * re-encoded as WebP (about a third smaller than JPEG at the same look), so guests download
 * ~250 KB instead of 6 MB and storage stays small. Anything with see-through pixels (cut-outs,
 * logos) is left as it is. Browsers that cannot write WebP get JPEG; small files go up unchanged.
 */
export async function shrinkImage(file: File, maxSide = 2400, quality = 0.84): Promise<Blob> {
  if (typeof window === 'undefined' || !('createImageBitmap' in window)) return file;
  if (file.size < 900 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: file.type === 'image/png' })!;
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    // A PNG is only worth converting when nothing in it is see-through (sampled on a coarse grid).
    if (file.type === 'image/png' && hasAlpha(ctx, canvas.width, canvas.height)) return file;
    // A modest JPEG that needs no resizing is already as good as it gets.
    if (file.type === 'image/jpeg' && scale === 1 && file.size < 2.5 * 1024 * 1024) return file;
    const out = await encode(canvas, quality);
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

/** WebP when the browser can write it (it silently returns PNG when it cannot), else JPEG. */
async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  const toBlob = (type: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
  const webp = await toBlob('image/webp');
  return webp && webp.type === 'image/webp' ? webp : toBlob('image/jpeg');
}

function hasAlpha(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const step = 24;
  for (let y = 0; y < h; y += step) {
    const row = ctx.getImageData(0, y, w, 1).data;
    for (let x = 0; x < w; x += step) if (row[x * 4 + 3]! < 250) return true;
  }
  return false;
}
