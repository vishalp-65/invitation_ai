/**
 * Downscales big phone photos in the browser before upload: guests then download a ~300 KB
 * photo instead of a 6 MB original, and storage stays small. PNGs with transparency (cut-outs,
 * logos) are left alone; anything already small is uploaded as it is.
 */
export async function shrinkImage(file: File, maxSide = 2400, quality = 0.86): Promise<Blob> {
  if (typeof window === 'undefined' || !('createImageBitmap' in window)) return file;
  if (file.size < 900 * 1024 || file.type === 'image/png') return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 2.5 * 1024 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}
