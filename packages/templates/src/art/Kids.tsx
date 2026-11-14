import type { ReactNode } from 'react';
import type { ArtProps } from './Ornaments';
import { useSvgId } from './svg-ids';

/** Birthday & baby art: balloon bunch, tiered cake, crescent moon with stars, cradle (palna). */

const svg = (w: number, h: number, vb: string, children: ReactNode) => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'visible' }}>
    {children}
  </svg>
);

/** Balloon bunch tied with a bow. c = three balloon colours. */
export function Balloons({ w, h, c }: ArtProps) {
  const cols = c.length ? c : ['#E0533D', '#2B6CB0', '#F2A900'];
  const gid = useSvgId('bal');
  const balloons: Array<[number, number, number, number]> = [
    [150, 150, 78, 0],
    [290, 120, 82, 1],
    [220, 250, 80, 2],
    [100, 300, 64, 1],
    [340, 270, 66, 0],
  ];
  const knot = [230, 520] as const;
  return svg(w, h, '0 0 460 640', <>
    <defs>
      <radialGradient id={gid} cx="0.35" cy="0.3" r="0.7">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
        <stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0} />
      </radialGradient>
    </defs>
    {balloons.map(([x, y, r], i) => (
      <path key={`s${i}`} d={`M${x} ${y + r * 1.18} C${x} ${(y + knot[1]) / 2} ${knot[0]} ${knot[1] - 80} ${knot[0]} ${knot[1]}`} fill="none" stroke="#8C8C8C" strokeWidth={1.6} />
    ))}
    {balloons.map(([x, y, r, k], i) => (
      <g key={i}>
        <ellipse cx={x} cy={y} rx={r} ry={r * 1.18} fill={cols[k % cols.length]} />
        <ellipse cx={x} cy={y} rx={r} ry={r * 1.18} fill={`url(#${gid})`} />
        <path d={`M${x - 8} ${y + r * 1.18 + 10} L${x} ${y + r * 1.16} L${x + 8} ${y + r * 1.18 + 10} Z`} fill={cols[k % cols.length]} />
      </g>
    ))}
    <path d={`M${knot[0]} ${knot[1]} c-30 -20 -50 10 -26 22 c10 4 20 -6 26 -22 c6 16 16 26 26 22 c24 -12 4 -42 -26 -22 Z`} fill={cols[0]} />
    <path d={`M${knot[0]} ${knot[1]} q-20 50 -6 110 M${knot[0]} ${knot[1]} q20 50 6 110`} fill="none" stroke={cols[0]} strokeWidth={3} />
  </>);
}

/** Two-tier cake with drips, sprinkles and candles. c = [cream, frosting, candle]. */
export function Cake({ w, h, c }: ArtProps) {
  const [cream = '#FFF4E6', frost = '#D6336C', candle = '#2B6CB0'] = c;
  const sprinkles: ReactNode[] = [];
  const cols = ['#F2A900', '#2B6CB0', '#2C8C6E', '#E0533D', '#FFFFFF'];
  for (let i = 0; i < 26; i++) {
    const x = 70 + ((i * 53) % 200);
    const y = i < 13 ? 290 + ((i * 17) % 40) : 200 + ((i * 13) % 34);
    if (i >= 13 && (x < 100 || x > 240)) continue;
    sprinkles.push(<rect key={i} x={x} y={y} width={10} height={3.6} rx={1.8} fill={cols[i % cols.length]} transform={`rotate(${(i * 47) % 180} ${x} ${y})`} />);
  }
  const drip = (x0: number, x1: number, y: number) => {
    let d = `M${x0} ${y}`;
    const n = 7;
    const step = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * step;
      const len = 14 + ((i * 7) % 3) * 9;
      d += ` L${x + step * 0.25} ${y} Q${x + step * 0.25} ${y + len} ${x + step * 0.5} ${y + len} Q${x + step * 0.75} ${y + len} ${x + step * 0.75} ${y} L${x + step} ${y}`;
    }
    return `${d} V${y - 26} H${x0} Z`;
  };
  return svg(w, h, '0 0 340 360', <>
    <ellipse cx={170} cy={344} rx={150} ry={14} fill="#00000014" />
    <rect x={30} y={326} width={280} height={14} rx={7} fill="#E6D3BC" />
    <rect x={50} y={250} width={240} height={80} rx={12} fill={cream} />
    <path d={drip(50, 290, 270)} fill={frost} />
    <rect x={90} y={170} width={160} height={84} rx={12} fill={cream} />
    <path d={drip(90, 250, 190)} fill={frost} />
    {sprinkles}
    {[130, 170, 210].map((x) => (
      <g key={x}>
        <rect x={x - 6} y={112} width={12} height={58} rx={3} fill={candle} />
        <path d={`M${x - 6} 124 L${x + 6} 118 M${x - 6} 140 L${x + 6} 134 M${x - 6} 156 L${x + 6} 150`} stroke="#FFFFFF" strokeWidth={3} />
        <path d={`M${x} 82 C${x + 10} 96 ${x + 9} 106 ${x} 110 C${x - 9} 106 ${x - 10} 96 ${x} 82 Z`} fill="#FFB020" />
        <path d={`M${x} 94 C${x + 4} 100 ${x + 4} 104 ${x} 106 C${x - 4} 104 ${x - 4} 100 ${x} 94 Z`} fill="#FFF3B0" />
      </g>
    ))}
  </>);
}

/** Crescent moon on a cloud with hanging stars. c = [moon, stars/strings, cloud]. */
export function BabyMoon({ w, h, c }: ArtProps) {
  const [moon = '#F8D57E', star = '#C08B2C', cloud = '#FFFFFF'] = c;
  const gid = useSvgId('moon');
  const starPath = (x: number, y: number, s: number) => `M${x} ${y - 10 * s} L${x + 3 * s} ${y - 3 * s} L${x + 10 * s} ${y - 3 * s} L${x + 4.5 * s} ${y + 2 * s} L${x + 6.5 * s} ${y + 9 * s} L${x} ${y + 5 * s} L${x - 6.5 * s} ${y + 9 * s} L${x - 4.5 * s} ${y + 2 * s} L${x - 10 * s} ${y - 3 * s} L${x - 3 * s} ${y - 3 * s} Z`;
  return svg(w, h, '0 0 330 300', <>
    <defs>
      <radialGradient id={gid} cx="0.4" cy="0.4" r="0.7">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.6} />
        <stop offset="1" stopColor={moon} stopOpacity={0} />
      </radialGradient>
    </defs>
    <path d="M200 30 A110 110 0 1 0 220 240 A86 86 0 1 1 200 30 Z" fill={moon} />
    <path d="M200 30 A110 110 0 1 0 220 240 A86 86 0 1 1 200 30 Z" fill={`url(#${gid})`} />
    <path d="M118 150 q10 8 20 0" fill="none" stroke={star} strokeWidth={3} strokeLinecap="round" />
    <circle cx={104} cy={168} r={8} fill="#F4A6B7" opacity={0.6} />
    {[
      [250, 70, 60, 1.4],
      [290, 120, 90, 1.1],
      [240, 150, 40, 0.9],
    ].map(([x, y, len, s], i) => (
      <g key={i}>
        <line x1={x} y1={y! - len!} x2={x} y2={y! - 10 * s!} stroke={star} strokeWidth={1.5} />
        <path d={starPath(x!, y!, s!)} fill={star} />
      </g>
    ))}
    <g fill={cloud}>
      <circle cx={70} cy={250} r={38} />
      <circle cx={120} cy={232} r={46} />
      <circle cx={180} cy={250} r={40} />
      <circle cx={226} cy={262} r={28} />
      <rect x={40} y={252} width={210} height={40} rx={20} />
    </g>
  </>);
}

/** Palna (cradle) hanging from a stand with a small toran. c = [frame, cloth, pillow]. */
export function Cradle({ w, h, c }: ArtProps) {
  const [frame = '#C9973F', cloth = '#2F6FA3', pillow = '#FFFFFF'] = c;
  return svg(w, h, '0 0 320 260', <>
    <path d="M30 250 L60 30 H260 L290 250" fill="none" stroke={frame} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
    <path d="M60 30 Q160 60 260 30" fill="none" stroke="#2F7D32" strokeWidth={3} />
    {[80, 110, 140, 170, 200, 230].map((x, i) => (
      <circle key={x} cx={x} cy={36 + Math.sin(((i + 0.5) / 6) * Math.PI) * 12} r={6} fill={i % 2 ? '#F28C0F' : '#FFB627'} />
    ))}
    <line x1={110} y1={34} x2={100} y2={130} stroke={frame} strokeWidth={3} />
    <line x1={210} y1={34} x2={220} y2={130} stroke={frame} strokeWidth={3} />
    <path d="M70 130 H250 Q250 210 160 214 Q70 210 70 130 Z" fill={cloth} stroke={frame} strokeWidth={5} />
    <path d="M80 150 Q160 176 240 150" fill="none" stroke={frame} strokeWidth={2} strokeDasharray="4 6" />
    <ellipse cx={110} cy={130} rx={30} ry={14} fill={pillow} />
    <path d="M150 128 Q190 112 236 128" fill="none" stroke={pillow} strokeWidth={10} strokeLinecap="round" />
    <circle cx={160} cy={190} r={8} fill={frame} />
  </>);
}
