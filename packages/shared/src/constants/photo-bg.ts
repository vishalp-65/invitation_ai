/**
 * The host's photo behind the design ("background photo"): one setting on the event, drawn the
 * same way on the image card (cover page), the website hero and the video's opening scenes.
 * Plain values only (no zod) so the renderers can import it without the schemas.
 */

/** 3×3 grid of spots (t/m/b row, l/c/r column) plus the whole background. */
export const PHOTO_BG_POSITIONS = ['full', 'tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'] as const;
export type PhotoBgPosition = (typeof PHOTO_BG_POSITIONS)[number];

/** How the photo melts into the design. */
export const PHOTO_BG_FADES = ['none', 'soft', 'bottom', 'top', 'sides'] as const;
export type PhotoBgFade = (typeof PHOTO_BG_FADES)[number];

/** CSS mix-blend-mode: the photo takes on the paper and colour of the design. */
export const PHOTO_BG_BLENDS = ['normal', 'multiply', 'screen', 'soft-light', 'overlay', 'luminosity'] as const;
export type PhotoBgBlend = (typeof PHOTO_BG_BLENDS)[number];

/** Cut-out shapes and frames. */
export const PHOTO_BG_SHAPES = ['none', 'arch', 'circle', 'heart', 'brush', 'torn', 'polaroid', 'film'] as const;
export type PhotoBgShape = (typeof PHOTO_BG_SHAPES)[number];

export interface PhotoBg {
  /** Which event photo (index into the event's photos). */
  photo: number;
  position: PhotoBgPosition;
  /** Width as % of the canvas (30–100). Ignored for `full`. */
  size: number;
  /** Fine-tune offset in % of the canvas width / height (drag in the editor). */
  dx: number;
  dy: number;
  fade: PhotoBgFade;
  blend: PhotoBgBlend;
  /** 0.15–1. */
  opacity: number;
  /** Recolour the photo in the design's dark and light colours. */
  duotone: boolean;
  shape: PhotoBgShape;
  /** Where it shows: card image, video, website. */
  image: boolean;
  video: boolean;
  site: boolean;
}

export const PHOTO_BG_DEFAULT: PhotoBg = {
  photo: 0,
  position: 'tc',
  size: 62,
  dx: 0,
  dy: 0,
  fade: 'soft',
  blend: 'normal',
  opacity: 1,
  duotone: false,
  shape: 'none',
  image: true,
  video: true,
  site: true,
};

/** The saved setting with defaults filled in, or null when the host hasn't turned it on. */
export function photoBgOf(settings: { photoBg?: Partial<PhotoBg> | null } | null | undefined): PhotoBg | null {
  const s = settings?.photoBg;
  return s ? { ...PHOTO_BG_DEFAULT, ...s } : null;
}

/** Height ÷ width of each shape (the full background uses the canvas). */
export const PHOTO_BG_ASPECT: Record<PhotoBgShape, number> = {
  none: 1.25,
  arch: 1.35,
  circle: 1,
  heart: 0.92,
  brush: 1.1,
  torn: 1.2,
  polaroid: 1.2,
  film: 1.4,
};

/**
 * Where the photo sits, as fractions of the canvas (0–1 of its width and height).
 * `canvasAspect` = canvas height ÷ width (card and video 16/9, a desktop hero ~0.55).
 */
export function photoBgBox(bg: Pick<PhotoBg, 'position' | 'size' | 'dx' | 'dy' | 'shape'>, canvasAspect: number): { x: number; y: number; w: number; h: number } {
  if (bg.position === 'full') return { x: bg.dx / 100, y: bg.dy / 100, w: 1, h: 1 };
  let w = Math.min(1, Math.max(0.3, bg.size / 100));
  let h = (w * PHOTO_BG_ASPECT[bg.shape]) / canvasAspect;
  // Too tall for a wide canvas (desktop website): shrink to fit the height.
  if (h > 0.92) {
    w *= 0.92 / h;
    h = 0.92;
  }
  const mx = w >= 0.98 ? 0 : 0.05;
  const my = 0.04;
  const [row, col] = bg.position as `${'t' | 'm' | 'b'}${'l' | 'c' | 'r'}`;
  const x = col === 'l' ? mx : col === 'r' ? 1 - w - mx : (1 - w) / 2;
  const y = row === 't' ? my : row === 'b' ? 1 - h - my : (1 - h) / 2;
  return { x: x + bg.dx / 100, y: y + bg.dy / 100, w, h };
}

/** The card's background photo for one output, or null (off, hidden there, or no such photo). */
export function photoBgFor(
  settings: { photoBg?: Partial<PhotoBg> | null } | null | undefined,
  photos: readonly string[],
  output: 'image' | 'video' | 'site',
): { spec: PhotoBg; src: string } | null {
  const spec = photoBgOf(settings);
  if (!spec || !spec[output]) return null;
  const src = photos[spec.photo] ?? photos[0];
  return src ? { spec, src } : null;
}
