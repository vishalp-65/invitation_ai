import type { CSSProperties } from 'react';
import { useSvgId } from './svg-ids';

/**
 * Gold calligraphic Shree Ganesha — crown, ears, trunk and tusk in flowing brush strokes,
 * on a lotus base inside a faint halo. Respectful, minimal, prints crisply at any size.
 */
export function Ganesha({ color, glow, size, light = false, css }: { color: string; glow: string; size: number; light?: boolean; css?: CSSProperties }) {
  const gid = useSvgId('gold');
  const hid = useSvgId('halo');
  const stroke = { fill: 'none', stroke: `url(#${gid})`, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 100 110" style={css} aria-label="Shree Ganesha">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          {/* Highlight band: bright on dark grounds, a warmer gold on light ones (keeps contrast). */}
          <stop offset="0.5" stopColor={light ? '#D9A93F' : '#F7E2A6'} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <radialGradient id={hid}>
          <stop offset="0" stopColor={glow} stopOpacity={0.35} />
          <stop offset="1" stopColor={glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={50} cy={52} r={48} fill={`url(#${hid})`} />
      <circle cx={50} cy={52} r={44} {...stroke} strokeWidth={0.5} opacity={0.5} />
      {/* Crown (mukut) */}
      <path d="M40 33 C40 22 46 15 50 8 C54 15 60 22 60 33 Z" fill={`url(#${gid})`} />
      <circle cx={50} cy={6.5} r={2.2} fill={`url(#${gid})`} />
      <path d="M37 33.5 H63" {...stroke} strokeWidth={2.4} />
      <path d="M44 27 Q50 23 56 27 M46 21 Q50 18 54 21" {...stroke} strokeWidth={0.9} opacity={0.8} />
      <path d="M37 35 C31 33 28 27 32 23 M63 35 C69 33 72 27 68 23" {...stroke} strokeWidth={1.2} />
      {/* Forehead & cheeks */}
      <path d="M38 37 C38 47 41 52 44.5 55 M62 37 C62 47 59 52 55.5 55" {...stroke} strokeWidth={1.8} />
      {/* Ears */}
      <path d="M37.5 40 C22 33 11 44 13.5 58 C16 71 29 75 36.5 66" {...stroke} strokeWidth={3} />
      <path d="M62.5 40 C78 33 89 44 86.5 58 C84 71 71 75 63.5 66" {...stroke} strokeWidth={3} />
      <path d="M32 46 C24 46 21.5 56 28 60 M68 46 C76 46 78.5 56 72 60" {...stroke} strokeWidth={1.4} />
      {/* Eyes & tilak */}
      <path d="M42 45 Q45 42.5 48 45 M52 45 Q55 42.5 58 45" {...stroke} strokeWidth={1.6} />
      <path d="M47 38.5 Q50 43 53 38.5 M50 39 V44" {...stroke} strokeWidth={1.3} />
      {/* Trunk — the signature brush stroke */}
      <path d="M50 48 C50 60 44.5 66 45.5 76 C46.5 88 58 92 64 86 C68 81 64 75 59 77 C56 78 56 82 59 83" {...stroke} strokeWidth={4.4} />
      <path d="M47.5 60 L52 61 M46.5 67 L51 68.5 M46.5 74 L51 76" {...stroke} strokeWidth={0.8} opacity={0.7} />
      {/* Tusk */}
      <path d="M44 56 C40 58 38.8 62 41 66" {...stroke} strokeWidth={2.4} />
      {/* Lotus base */}
      <path d="M28 100 Q50 86 72 100" {...stroke} strokeWidth={1.6} />
      <path d="M50 99 C44 92 44 86 50 81 C56 86 56 92 50 99 Z M50 99 C40 98 34 93 33 88 C40 88 46 92 50 99 Z M50 99 C60 98 66 93 67 88 C60 88 54 92 50 99 Z" fill={`url(#${gid})`} opacity={0.9} />
    </svg>
  );
}
