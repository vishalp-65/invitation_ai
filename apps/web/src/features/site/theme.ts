import type { SiteDesign, SiteDoc, Theme } from '@cardai/shared';
import type { CSSProperties } from 'react';

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableOn(bg: string): string {
  return luminance(bg) > 0.42 ? '#24170F' : '#FFF8EE';
}

function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mix(a: string, b: string, t: number): string {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  return `#${ca.map((v, i) => Math.round(v + (cb[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

/** CSS variables for the page: template palette + the host's overrides + optional dark look. */
export function siteVars(theme: Theme, look: SiteDoc['look'], fonts: { display: string; body: string }, design: SiteDesign | null = null, latin = true): CSSProperties {
  const p = design
    ? { ...design.palette, backgroundAlt: design.bands[1]?.bg ?? mix(design.palette.background, design.palette.primary, 0.06), muted: mix(design.palette.text, design.palette.background, 0.35) }
    : theme.palette;
  const primary = look.primary ?? p.primary;
  const accent = look.accent ?? p.accent;
  let bg = look.background ?? p.background;
  let bgAlt = p.backgroundAlt;
  let surface = p.surface;
  let text = p.text;
  let muted = p.muted;
  // Design fonts are Latin-only; other scripts keep their language fonts.
  const display = design && latin ? design.fonts.serif : fonts.display;
  const body = design && latin ? design.fonts.body : fonts.body;
  const script = design && latin ? design.fonts.script : fonts.display;
  if (look.dark) {
    bg = mix(primary, '#07060D', 0.82);
    bgAlt = mix(primary, '#07060D', 0.7);
    surface = mix(primary, '#07060D', 0.6);
    text = '#FBF3E4';
    muted = '#CFC3B0';
  } else if (look.background) {
    bgAlt = mix(bg, primary, 0.08);
    text = readableOn(bg);
    muted = mix(text, bg, 0.35);
  }
  return {
    '--inv-bg': bg,
    '--inv-bg-a60': rgba(bg, 0.6),
    '--inv-bg-a75': rgba(bg, 0.75),
    '--inv-bg-a90': rgba(bg, 0.9),
    '--inv-bg-alt': bgAlt,
    '--inv-surface': surface,
    '--inv-on-surface': readableOn(surface),
    '--inv-primary': primary,
    // Precomputed shades: `color-mix()` is missing on older Android WebViews.
    '--inv-primary-deep': mix(primary, '#000000', 0.2),
    '--inv-primary-a28': rgba(primary, 0.28),
    '--inv-primary-a16': rgba(primary, 0.16),
    '--inv-on-primary': readableOn(primary),
    '--inv-accent': accent,
    '--inv-text': text,
    '--inv-muted': muted,
    '--inv-display': `"${display}", serif`,
    '--inv-script': `"${script}", "${display}", serif`,
    '--inv-body': `"${body}", ${design ? 'serif' : 'sans-serif'}`,
  } as CSSProperties;
}

export function googleFontsHref(families: string[]): string {
  const uniq = [...new Set(families)];
  // Some display families ship a single weight; asking for 600/700 would 400 the request.
  const single = new Set(['Great Vibes', 'Pinyon Script', 'Italianno', 'Parisienne', 'Allura', 'Tenor Sans', 'Marcellus']);
  return `https://fonts.googleapis.com/css2?${uniq.map((f) => `family=${f.replace(/ /g, '+')}${single.has(f) ? '' : ':wght@400;600;700'}`).join('&')}&display=swap`;
}

/** Section band colours for a design (text + headings recoloured per band). */
export function bandVars(band: { bg: string; ink: string; primary: string }): CSSProperties {
  return {
    '--inv-bg': band.bg,
    '--inv-bg-alt': band.bg,
    '--inv-bg-a60': rgba(band.bg, 0.6),
    '--inv-bg-a75': rgba(band.bg, 0.75),
    '--inv-bg-a90': rgba(band.bg, 0.9),
    '--inv-text': band.ink,
    '--inv-muted': mix(band.ink, band.bg, 0.35),
    '--inv-primary': band.primary,
    '--inv-primary-deep': mix(band.primary, '#000000', 0.2),
    '--inv-primary-a28': rgba(band.primary, 0.28),
    '--inv-primary-a16': rgba(band.primary, 0.16),
    '--inv-on-primary': readableOn(band.primary),
    background: band.bg,
    color: band.ink,
  } as CSSProperties;
}
