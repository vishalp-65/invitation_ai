/** An invitation keeps up to this many photos; every template draws its photo frames from them. */
export const PHOTO_POOL_MAX = 6;

/**
 * The photo list after adding one: newest last, no duplicates. When full, the oldest makes room
 * (it stays in the media library, only its place on the card goes).
 */
export function addToPhotoPool(current: readonly string[], assetId: string, max = PHOTO_POOL_MAX): string[] {
  if (current.includes(assetId)) return [...current];
  return [...current, assetId].slice(-max);
}

export const removeFromPhotoPool = (current: readonly string[], assetId: string): string[] => current.filter((id) => id !== assetId);
