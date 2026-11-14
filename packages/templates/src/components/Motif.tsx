import type { MotifId } from '@cardai/shared';
import type { CSSProperties } from 'react';

interface MotifProps {
  motif: MotifId;
  color: string;
  accent: string;
  size: number;
  style?: CSSProperties;
}

/** Sacred / decorative symbols drawn as SVG or script glyphs (no image assets needed). */
export function Motif({ motif, color, accent, size, style }: MotifProps) {
  if (motif === 'none') return null;

  const glyph = (text: string, family: string, scale = 1) => (
    <div
      style={{
        fontFamily: family,
        fontSize: size * scale,
        lineHeight: 1,
        color,
        textShadow: `0 0 ${size * 0.15}px ${accent}66`,
        ...style,
      }}
    >
      {text}
    </div>
  );

  switch (motif) {
    case 'om':
      return glyph('ॐ', '"Tiro Devanagari Hindi", serif');
    case 'shree':
      return glyph('॥ श्री ॥', '"Tiro Devanagari Hindi", serif', 0.62);
    case 'khanda':
      return glyph('☬', 'serif');
  }

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={style} aria-hidden>
      {renderSvg(motif, color, accent)}
    </svg>
  );
}

function renderSvg(motif: MotifId, c: string, a: string) {
  switch (motif) {
    case 'kalash':
      return (
        <g fill="none" stroke={c} strokeWidth={3} strokeLinejoin="round">
          <path d="M30 55 Q30 88 50 90 Q70 88 70 55 Q70 45 60 42 L40 42 Q30 45 30 55Z" fill={a} fillOpacity={0.25} />
          <path d="M36 42 L64 42 L60 36 L40 36Z" fill={c} />
          <path d="M50 36 Q30 20 22 26 Q34 30 44 36 M50 36 Q70 20 78 26 Q66 30 56 36 M50 36 Q50 18 50 14" />
          <circle cx={50} cy={22} r={9} fill={a} fillOpacity={0.6} />
          <path d="M34 62 H66 M36 72 H64" strokeDasharray="3 4" />
          <circle cx={50} cy={67} r={3} fill={c} stroke="none" />
        </g>
      );
    case 'diya':
      return (
        <g>
          <path d="M50 18 C58 34 60 44 50 52 C40 44 42 34 50 18Z" fill={a} />
          <path d="M50 30 C54 38 54 44 50 48 C46 44 46 38 50 30Z" fill="#FFF3B0" />
          <path d="M14 58 Q50 92 86 58 Q50 70 14 58Z" fill={c} />
          <path d="M22 62 Q50 82 78 62" stroke={a} strokeWidth={2} fill="none" />
        </g>
      );
    case 'lotus':
      return (
        <g fill={c} fillOpacity={0.9} stroke={a} strokeWidth={1.5}>
          <path d="M50 20 C62 40 62 60 50 78 C38 60 38 40 50 20Z" />
          <path d="M50 78 C40 56 26 46 12 46 C18 64 32 76 50 78Z" fillOpacity={0.7} />
          <path d="M50 78 C60 56 74 46 88 46 C82 64 68 76 50 78Z" fillOpacity={0.7} />
          <path d="M50 78 C34 66 20 64 6 68 C18 78 34 82 50 78Z" fillOpacity={0.5} />
          <path d="M50 78 C66 66 80 64 94 68 C82 78 66 82 50 78Z" fillOpacity={0.5} />
        </g>
      );
    case 'crescent':
      return (
        <g fill={c}>
          <path d="M58 14 A36 36 0 1 0 58 86 A28 28 0 1 1 58 14Z" />
          <path d="M72 34 L75 43 L84 43 L77 49 L80 58 L72 52 L64 58 L67 49 L60 43 L69 43Z" fill={a} />
        </g>
      );
    case 'cross':
      return (
        <g fill={c}>
          <rect x={45} y={10} width={10} height={80} rx={2} />
          <rect x={25} y={30} width={50} height={10} rx={2} />
          <circle cx={50} cy={35} r={14} fill="none" stroke={a} strokeWidth={2} />
        </g>
      );
    case 'peacock':
      return (
        <g>
          <path d="M50 95 Q48 60 50 20" stroke={c} strokeWidth={2} fill="none" />
          <ellipse cx={50} cy={34} rx={22} ry={28} fill={a} fillOpacity={0.35} />
          <ellipse cx={50} cy={36} rx={14} ry={18} fill="#1B7A6E" />
          <ellipse cx={50} cy={38} rx={8} ry={10} fill="#123E8A" />
          <ellipse cx={50} cy={40} rx={4} ry={5} fill={c} />
        </g>
      );
    case 'balloons':
      return (
        <g>
          {[
            [32, 34, c],
            [55, 26, a],
            [70, 42, c],
          ].map(([x, y, fill], i) => (
            <g key={i}>
              <ellipse cx={x as number} cy={y as number} rx={13} ry={16} fill={fill as string} />
              <path d={`M${x} ${(y as number) + 16} Q${(x as number) + 4} ${(y as number) + 34} 52 92`} stroke={c} strokeWidth={1} fill="none" />
            </g>
          ))}
        </g>
      );
    case 'heart':
      return (
        <path
          d="M50 86 C20 64 10 46 22 30 C32 18 46 22 50 34 C54 22 68 18 78 30 C90 46 80 64 50 86Z"
          fill={c}
          stroke={a}
          strokeWidth={2}
        />
      );
    default:
      return null;
  }
}
