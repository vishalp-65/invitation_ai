/**
 * Painted art library: watercolour papers, overlays (flowers, garlands, frames), photo masks
 * and sample photos. Generated once with AI, reviewed, and served as WebP from the web app's
 * `/art` folder. The image card, the video and the website all use the same files, so the
 * three outputs of one invitation look alike.
 *
 * Zod-free on purpose: the website and the Remotion bundle import it (see bundle-size rules).
 */

export const ART_IDS = [
  // papers (opaque backgrounds)
  'paper-cream',
  'paper-linen',
  'paper-white',
  'paper-mint',
  'paper-saffron',
  'sky-wash',
  'maroon-velvet',
  'teal-wall',
  'night-navy',
  // overlays (transparent)
  'rose-arch',
  'rose-cluster',
  'pressed-wreath',
  'pressed-sprig',
  'blush-corner',
  'peony-corner',
  'leaf-corner',
  'autumn-crown',
  'peach-sprig',
  'brush-blue',
  'brush-yellow',
  'daisies',
  'wash-circle',
  'marigold-toran',
  'marigold-side',
  'lotus-pond',
  'lotus-bud',
  'jharokha-arch',
  'fairy-lights',
  // photo masks (white shape, alpha = visible)
  'mask-blob',
  'mask-brush',
  'mask-arch',
  // sample photos (fictional people) for previews and thumbnails
  'sample-couple',
  'sample-couple-2',
  'sample-bride',
  'sample-groom',
  'sample-family',
] as const;
export type ArtId = (typeof ART_IDS)[number];

/** Pixel size of each file (width / height), used to keep aspect ratios exact. */
export const ART_SIZE: Record<ArtId, readonly [number, number]> = {
  'paper-cream': [768, 1376],
  'paper-linen': [768, 1376],
  'paper-white': [768, 1376],
  'paper-mint': [768, 1376],
  'paper-saffron': [768, 1376],
  'sky-wash': [768, 1376],
  'maroon-velvet': [768, 1376],
  'teal-wall': [768, 1376],
  'night-navy': [768, 1376],
  'rose-arch': [768, 1376],
  'rose-cluster': [1024, 1024],
  'pressed-wreath': [743, 950],
  'pressed-sprig': [1024, 1024],
  'blush-corner': [1024, 1024],
  'peony-corner': [1024, 1024],
  'leaf-corner': [1024, 1024],
  'autumn-crown': [1376, 768],
  'peach-sprig': [1024, 1024],
  'brush-blue': [768, 1376],
  'brush-yellow': [768, 1376],
  daisies: [1376, 768],
  'wash-circle': [1024, 1024],
  'marigold-toran': [1376, 768],
  'marigold-side': [768, 1376],
  'lotus-pond': [1376, 768],
  'lotus-bud': [1024, 1024],
  'jharokha-arch': [636, 1101],
  'fairy-lights': [1376, 768],
  'mask-blob': [1024, 1024],
  'mask-brush': [821, 1100],
  'mask-arch': [821, 1100],
  'sample-couple': [896, 1200],
  'sample-couple-2': [896, 1200],
  'sample-bride': [1024, 1024],
  'sample-groom': [1024, 1024],
  'sample-family': [1200, 896],
};

/** Height / width of an art file. */
export const artAspect = (id: ArtId) => ART_SIZE[id][1] / ART_SIZE[id][0];

let origin = '';

/**
 * Where `/art` is served from. Empty on the website (same origin). The video and image renderer
 * runs on another origin, so its compositions set the web app's URL first.
 */
export function setArtOrigin(url: string | null | undefined) {
  origin = (url ?? '').replace(/\/+$/, '');
}

export const ART_PATH = '/art/';

/** Public URL of an art file. */
export const artSrc = (id: ArtId) => `${origin}${ART_PATH}${id}.webp`;

/** Saved designs store `/art/<id>.webp`; renderers on another origin need the full URL. */
export function resolveArtUrl<T extends string | null | undefined>(src: T): T {
  if (src && origin && src.startsWith(ART_PATH)) return `${origin}${src}` as T;
  return src;
}

/** Photo masks: painted shapes for photos (CSS mask-image), plus the plain geometric ones. */
export const PAINTED_MASKS = { blob: 'mask-blob', brush: 'mask-brush', 'soft-arch': 'mask-arch' } as const satisfies Record<string, ArtId>;
export type PaintedMask = keyof typeof PAINTED_MASKS;
export const isPaintedMask = (m: string): m is PaintedMask => m in PAINTED_MASKS;
