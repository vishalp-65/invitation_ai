import { memo } from 'react';
import type { PatternId } from '@cardai/shared';
import { random } from '../utils/remotion-lite';
import { useSvgId } from '../art/svg-ids';

interface PatternProps {
  pattern: PatternId;
  color: string;
  accent: string;
  opacity: number;
  width: number;
  height: number;
  /** Seed for deterministic placement (same output every render). */
  seed?: string;
}

/** Tiled background ornament. Pure SVG so it is crisp at any print resolution. */
/** Memoized: all props are primitives, so the pattern SVG is rebuilt only when it actually changes. */
export const Pattern = memo(function Pattern({ pattern, color, accent, opacity, width, height, seed = 'p' }: PatternProps) {
  // Unique per instance: the gallery shows many cards (different colours) on one page.
  const id = useSvgId(`pat-${pattern}`);
  if (pattern === 'none' || opacity <= 0) return null;
  const tile = width / 6;

  if (pattern === 'confetti') {
    const pieces = Array.from({ length: 90 }, (_, i) => {
      const x = random(`${seed}-x-${i}`) * width;
      const y = random(`${seed}-y-${i}`) * height;
      const r = random(`${seed}-r-${i}`) * 360;
      const s = 8 + random(`${seed}-s-${i}`) * 18;
      return (
        <rect
          key={i}
          x={x}
          y={y}
          width={s}
          height={s * 0.45}
          rx={2}
          fill={i % 2 ? color : accent}
          transform={`rotate(${r} ${x} ${y})`}
        />
      );
    });
    return (
      <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity }}>
        {pieces}
      </svg>
    );
  }

  return (
    <svg width={width} height={height} style={{ position: 'absolute', inset: 0, opacity }} aria-hidden>
      <defs>
        <pattern id={id} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <g transform={`scale(${tile / 100})`}>{tileFor(pattern, color, accent)}</g>
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${id})`} />
    </svg>
  );
});

function tileFor(pattern: PatternId, c: string, a: string) {
  switch (pattern) {
    case 'mandala':
      return (
        <g fill="none" stroke={c} strokeWidth={1.2}>
          <circle cx={50} cy={50} r={30} />
          <circle cx={50} cy={50} r={18} stroke={a} />
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx={50} cy={26} rx={5} ry={12} transform={`rotate(${i * 30} 50 50)`} />
          ))}
          <circle cx={50} cy={50} r={4} fill={a} />
        </g>
      );
    case 'paisley':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <path d="M30 70 C10 60 14 26 40 22 C64 18 72 44 56 54 C46 60 38 52 44 44" />
          <path d="M34 62 C22 54 26 34 42 32" stroke={a} />
          <circle cx={78} cy={78} r={4} fill={a} />
          <circle cx={78} cy={22} r={2} fill={c} />
        </g>
      );
    case 'jaali':
      return (
        <g fill="none" stroke={c} strokeWidth={1.4}>
          <path d="M50 0 L100 50 L50 100 L0 50Z" />
          <path d="M50 18 Q66 34 50 50 Q34 34 50 18Z" stroke={a} />
          <path d="M50 50 Q66 66 50 82 Q34 66 50 50Z" stroke={a} />
        </g>
      );
    case 'dots':
      return (
        <g fill={c}>
          <circle cx={25} cy={25} r={3} />
          <circle cx={75} cy={75} r={3} />
          <circle cx={75} cy={25} r={1.6} fill={a} />
          <circle cx={25} cy={75} r={1.6} fill={a} />
        </g>
      );
    case 'leaves':
      return (
        <g fill="none" stroke={c} strokeWidth={1.3}>
          <path d="M20 80 Q50 50 80 20" />
          <path d="M35 65 Q30 50 42 42 Q48 56 35 65Z" fill={a} fillOpacity={0.4} />
          <path d="M55 45 Q62 30 74 30 Q70 46 55 45Z" fill={a} fillOpacity={0.4} />
        </g>
      );
    default:
      return null;
  }
}
