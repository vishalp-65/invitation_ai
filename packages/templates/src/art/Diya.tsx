import type { CSSProperties } from 'react';
import { useSvgId } from './svg-ids';

/** Hero diya: clay lamp with painted rim, layered flame and warm glow; two small diyas beside it. */
export function DiyaArt({ size, gold, flicker = 0, css }: { size: number; gold: string; flicker?: number; css?: CSSProperties }) {
  const clay = useSvgId('clay');
  const flame = useSvgId('flame');
  const glow = useSvgId('glow');
  const lamp = (x: number, y: number, s: number, key: string) => (
    <g key={key} transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx={0} cy={-22} r={30} fill={`url(#${glow})`} />
      <path d={`M0 ${-40 - flicker * 2} C8 -28 9 -20 0 -12 C-9 -20 -8 -28 0 ${-40 - flicker * 2} Z`} fill={`url(#${flame})`} />
      <path d="M0 -30 C3 -24 3 -19 0 -15 C-3 -19 -3 -24 0 -30 Z" fill="#FFF6C8" />
      <path d="M-28 -8 Q0 30 28 -8 Q0 2 -28 -8 Z" fill={`url(#${clay})`} />
      <path d="M-28 -8 Q0 2 28 -8" fill="none" stroke={gold} strokeWidth={2} />
      <path d="M-20 0 Q0 18 20 0" fill="none" stroke={gold} strokeWidth={1} strokeDasharray="2 3" />
    </g>
  );
  return (
    <svg width={size} height={size * 0.62} viewBox="0 0 200 124" style={css} aria-label="Diya">
      <defs>
        <linearGradient id={clay} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C2562A" />
          <stop offset="1" stopColor="#7A2E12" />
        </linearGradient>
        <radialGradient id={flame} cx="0.5" cy="0.7" r="0.7">
          <stop offset="0" stopColor="#FFF3B0" />
          <stop offset="0.5" stopColor="#FFB020" />
          <stop offset="1" stopColor="#E8590C" />
        </radialGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#FFD166" stopOpacity={0.75} />
          <stop offset="1" stopColor="#FFD166" stopOpacity={0} />
        </radialGradient>
      </defs>
      {lamp(40, 104, 0.6, 'l')}
      {lamp(160, 104, 0.6, 'r')}
      {lamp(100, 96, 1.15, 'c')}
    </svg>
  );
}

/** Large, faint mandala that sits behind the text block. */
export function MandalaWatermark({ size, color, opacity = 0.1 }: { size: number; color: string; opacity?: number }) {
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ opacity }} aria-hidden>
      <g fill="none" stroke={color} strokeWidth={0.35}>
        {[46, 40, 30, 18, 8].map((r) => (
          <circle key={r} r={r} />
        ))}
        {Array.from({ length: 24 }, (_, i) => (
          <path key={`o${i}`} d="M0 -46 C4 -42 4 -36 0 -32 C-4 -36 -4 -42 0 -46 Z" transform={`rotate(${i * 15})`} />
        ))}
        {Array.from({ length: 16 }, (_, i) => (
          <path key={`m${i}`} d="M0 -30 C6 -26 6 -20 0 -18 C-6 -20 -6 -26 0 -30 Z" transform={`rotate(${i * 22.5})`} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <ellipse key={`i${i}`} cx={0} cy={-12} rx={2.6} ry={6} transform={`rotate(${i * 30})`} />
        ))}
      </g>
    </svg>
  );
}
