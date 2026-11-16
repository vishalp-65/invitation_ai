import type { CSSProperties } from 'react';

/**
 * Scene art animates two ways from one description:
 * - website: `time` is undefined → CSS classes (`scn-*`, defined in the site stylesheet) loop forever;
 * - video (Remotion): `time` in seconds → the same motion computed per frame (deterministic renders).
 */
export type Loop = 'sway' | 'bob' | 'flicker' | 'glide' | 'shimmer' | 'twinkle';

const PERIOD: Record<Loop, number> = { sway: 7, bob: 5, flicker: 1.8, glide: 14, shimmer: 4, twinkle: 2.4 };

export function loop(kind: Loop, time: number | undefined, phase = 0, amount = 1): { className?: string; style: CSSProperties } {
  const base: CSSProperties = { transformBox: 'fill-box', transformOrigin: kind === 'sway' ? '50% 100%' : '50% 50%' };
  if (time === undefined) {
    return { className: `scn-${kind}`, style: { ...base, animationDelay: `${-phase * PERIOD[kind]}s` } };
  }
  const p = ((time / PERIOD[kind] + phase) % 1) * Math.PI * 2;
  switch (kind) {
    case 'sway':
      return { style: { ...base, transform: `rotate(${Math.sin(p) * 2.2 * amount}deg)` } };
    case 'bob':
      return { style: { ...base, transform: `translateY(${Math.sin(p) * 4 * amount}px)` } };
    case 'flicker':
      return { style: { ...base, opacity: 0.75 + Math.sin(p * 3) * 0.12 + Math.sin(p * 7) * 0.08, transform: `scale(${1 + Math.sin(p * 2) * 0.05})` } };
    case 'glide':
      return { style: { ...base, transform: `translateX(${Math.sin(p) * 18 * amount}px)` } };
    case 'shimmer':
      return { style: { ...base, opacity: 0.35 + (Math.sin(p) + 1) * 0.25 } };
    case 'twinkle':
      return { style: { ...base, opacity: 0.3 + (Math.sin(p) + 1) * 0.35 } };
  }
}

/** Deterministic 0..1 noise so the web page and the video place particles identically. */
export function rnd(i: number, salt = 0): number {
  // Integer hash (exact on every JS engine, so server and browser render identical SVG).
  let h = (Math.imul(Math.round(i * 1000) | 0, 0x9e3779b1) ^ Math.imul((salt + 1) | 0, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Rounds trig-derived coordinates (engines differ in the last bits of sin/cos). */
export const q = (n: number) => Math.round(n * 100) / 100;
