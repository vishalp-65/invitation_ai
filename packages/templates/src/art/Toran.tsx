import { AbsoluteFill } from '../utils/remotion-lite';
import { Leaf, Marigold } from './Florals';
import { useSvgId } from './svg-ids';

/**
 * Toran: mango-leaf rope with hanging marigold strings and two brass lanterns — the
 * welcome garland over every Indian doorway. `sway` (degrees) animates it in video.
 */
export function Toran({ width, height, sway = 0, glow = '#FFC93C' }: { width: number; height: number; sway?: number; glow?: string }) {
  const brass = useSvgId('brass');
  const halo = useSvgId('halo');
  const ropeY = height * 0.018;
  const strings = 11;
  const r = width * 0.013;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={brass} x1="0" x2="1">
            <stop offset="0" stopColor="#8A5A12" />
            <stop offset="0.45" stopColor="#F2C462" />
            <stop offset="1" stopColor="#8A5A12" />
          </linearGradient>
          <radialGradient id={halo}>
            <stop offset="0" stopColor={glow} stopOpacity={0.7} />
            <stop offset="1" stopColor={glow} stopOpacity={0} />
          </radialGradient>
        </defs>

        {/* Hanging marigold strings (lengths vary like a real toran) */}
        {Array.from({ length: strings }, (_, i) => {
          const x = (width * (i + 0.5)) / strings;
          const n = [5, 7, 4, 8, 5, 9, 5, 8, 4, 7, 5][i] ?? 5;
          return (
            <g key={i} transform={`rotate(${sway * (i % 2 ? 1 : -1)} ${x} ${ropeY})`}>
              <path d={`M${x} ${ropeY} V${ropeY + n * r * 1.85}`} stroke="#6B4A1A" strokeWidth={width * 0.0015} />
              {Array.from({ length: n }, (_, k) => (
                <Marigold key={k} x={x} y={ropeY + r * 1.2 + k * r * 1.85} s={r} rot={k * 37} />
              ))}
              <path d={`M${x} ${ropeY + n * r * 1.85 + r * 0.6} l${-r * 0.4} ${r * 1.2} l${r * 0.8} 0 Z`} fill="#C9973F" />
            </g>
          );
        })}

        {/* Mango-leaf rope */}
        <path d={`M0 ${ropeY} Q${width / 2} ${ropeY * 2.2} ${width} ${ropeY}`} stroke="#6B4A1A" strokeWidth={width * 0.004} fill="none" />
        {Array.from({ length: 22 }, (_, i) => {
          const x = (width * (i + 0.5)) / 22;
          return <Leaf key={i} x={x} y={ropeY + 2} len={width * 0.045} angle={i % 2 ? 100 : 80} shade={i % 3} />;
        })}

        {/* Brass lanterns */}
        {[0.1, 0.9].map((fx, i) => {
          const x = width * fx;
          const top = ropeY;
          const y = height * 0.15;
          const w = width * 0.05;
          return (
            <g key={fx} transform={`rotate(${sway * 1.6 * (i ? -1 : 1)} ${x} ${top})`}>
              <path d={`M${x} ${top} V${y - w * 0.6}`} stroke="#6B4A1A" strokeWidth={width * 0.0018} />
              <circle cx={x} cy={y + w * 0.6} r={w * 1.6} fill={`url(#${halo})`} />
              <path d={`M${x - w * 0.5} ${y - w * 0.15} L${x} ${y - w * 0.75} L${x + w * 0.5} ${y - w * 0.15} Z`} fill={`url(#${brass})`} />
              <rect x={x - w * 0.42} y={y - w * 0.15} width={w * 0.84} height={w * 1.35} rx={w * 0.12} fill={`url(#${brass})`} />
              <path d={`M${x - w * 0.22} ${y + w * 1.05} V${y + w * 0.25} Q${x - w * 0.22} ${y + w * 0.05} ${x} ${y + w * 0.05} Q${x + w * 0.22} ${y + w * 0.05} ${x + w * 0.22} ${y + w * 0.25} V${y + w * 1.05} Z`} fill="#FFE7A3" />
              <path d={`M${x - w * 0.5} ${y + w * 1.2} L${x + w * 0.5} ${y + w * 1.2} L${x} ${y + w * 1.8} Z`} fill={`url(#${brass})`} />
              <circle cx={x} cy={y + w * 1.95} r={w * 0.12} fill="#C9973F" />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}
