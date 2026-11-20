import type { CSSProperties, ReactNode } from 'react';

/*
 * The two Remotion helpers the static card renderer (DesignPage) needs, without importing
 * `remotion` itself: the package has no tree-shaking hints, so a single import from it pulled the
 * whole runtime (~90 KB gzipped) into every web page that shows a card thumbnail.
 * Output is identical to Remotion's: same layout styles, same seeded random sequence.
 */

const FILL: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
};

/** Same box as Remotion's `<AbsoluteFill>` (used here without className, so no Tailwind handling). */
export function AbsoluteFill({ style, children }: { style?: CSSProperties; children?: ReactNode }) {
  return <div style={style ? { ...FILL, ...style } : FILL}>{children}</div>;
}

function mulberry32(a: number) {
  let t = a + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // 32-bit integer
  }
  return hash;
}

/** Remotion's deterministic `random(seed)`: the same seed always gives the same number in [0, 1). */
export function random(seed: string | number): number {
  return typeof seed === 'string' ? mulberry32(hashCode(seed)) : mulberry32(seed * 10000000000);
}
