/*
 * Plain values and helpers of the design document, kept apart from schema.ts (zod) so client
 * pages that only need a size or a helper never download zod (see bundle-size rules).
 */

export const DESIGN_W = 1080;
export const DESIGN_H = 1920;

export const ELEMENT_ANIMS = ['auto', 'fade', 'rise', 'zoom', 'drop', 'none'] as const;
export const TEXT_EFFECTS = ['none', 'shadow', 'glow', 'gold', 'outline'] as const;
/** `blob`, `brush` and `soft-arch` are painted watercolour edges (art library masks). */
export const IMAGE_MASKS = ['rect', 'rounded', 'circle', 'arch', 'oval', 'blob', 'brush', 'soft-arch'] as const;
export const SHAPES = ['rect', 'ellipse', 'line'] as const;
/** One-tap photo looks (CSS filter presets, see imageFilterCss). */
export const IMAGE_FILTERS = ['none', 'warm', 'cool', 'vivid', 'fade', 'mono', 'sepia', 'noir'] as const;

export type ElementAnim = (typeof ELEMENT_ANIMS)[number];
export type TextEffect = (typeof TEXT_EFFECTS)[number];
export type ImageFilter = (typeof IMAGE_FILTERS)[number];

/**
 * Geometry for curved text: an arc whose chord spans the box width.
 * Returns the SVG path (box-local coords, text sits on it) and the box height it needs.
 */
export function curvedTextPath(w: number, size: number, curve: number): { d: string; height: number } {
  const theta = (Math.min(100, Math.abs(curve)) / 100) * Math.PI; // up to a half circle
  const chord = w;
  const r = chord / (2 * Math.sin(theta / 2));
  const sag = r * (1 - Math.cos(theta / 2));
  const pad = size * 0.25;
  if (curve > 0) {
    // Arch (∩): glyph tops at the box top, ends lower.
    const y = pad + size + sag;
    return { d: `M 0 ${y} A ${r} ${r} 0 0 1 ${chord} ${y}`, height: y + pad };
  }
  // Smile (∪): the middle dips; text sits on the curve.
  const y = pad + size;
  return { d: `M 0 ${y} A ${r} ${r} 0 0 0 ${chord} ${y}`, height: y + sag + pad };
}

/** CSS filter for a photo layer (shared by editor preview, stills and video). */
export function imageFilterCss(el: { filter?: ImageFilter; bright?: number; contrast?: number; sat?: number }): string | undefined {
  const preset: Record<ImageFilter, string> = {
    none: '',
    warm: 'sepia(0.18) saturate(1.25) hue-rotate(-8deg)',
    cool: 'saturate(1.05) hue-rotate(12deg) brightness(1.03)',
    vivid: 'saturate(1.5) contrast(1.08)',
    fade: 'contrast(0.85) brightness(1.08) saturate(0.8)',
    mono: 'grayscale(1)',
    sepia: 'sepia(0.75)',
    noir: 'grayscale(1) contrast(1.35) brightness(0.92)',
  };
  const parts = [preset[el.filter ?? 'none']];
  if (el.bright !== undefined && el.bright !== 1) parts.push(`brightness(${el.bright})`);
  if (el.contrast !== undefined && el.contrast !== 1) parts.push(`contrast(${el.contrast})`);
  if (el.sat !== undefined && el.sat !== 1) parts.push(`saturate(${el.sat})`);
  const out = parts.filter(Boolean).join(' ');
  return out || undefined;
}
