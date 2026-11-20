import type { ReactNode } from 'react';
import { rng, type ArtProps } from './Ornaments';
import { useSvgId } from './svg-ids';

/**
 * Frames and ornaments for the multi-page collection: scalloped / Mughal / dome arch panels,
 * a palace arch with pillars, gold filigree corners, a geometric frame, a gold hoop,
 * satin bow, royal umbrella (chhatri), hanging marigold strings and function icons.
 */

const svg = (w: number, h: number, vb: string, children: ReactNode, par = 'xMidYMid meet') => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio={par} style={{ display: 'block', overflow: 'visible' }}>
    {children}
  </svg>
);

function Gold({ id, c, dir = 'diag' }: { id: string; c: string; dir?: 'diag' | 'h' }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2={dir === 'h' ? 0 : 1}>
      <stop offset="0" stopColor={c} />
      <stop offset="0.48" stopColor="#FFF0BE" stopOpacity={0.95} />
      <stop offset="1" stopColor={c} />
    </linearGradient>
  );
}

// ------------------------------------------------------------------ arch panels

export const ARCH_SHAPES = ['scallop', 'mughal', 'dome', 'oval', 'rect'] as const;

type Pt = [number, number];
const cubic = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

/** Arch outline inset by `i` px, as an SVG path in box pixels. */
function archPath(shape: string, w: number, h: number, i: number): string {
  const x0 = i;
  const x1 = w - i;
  const y0 = i;
  const y1 = h - i;
  const cx = w / 2;
  const iw = x1 - x0;
  if (shape === 'oval') return `M${cx} ${y0} A${iw / 2} ${(y1 - y0) / 2} 0 1 1 ${cx} ${y1} A${iw / 2} ${(y1 - y0) / 2} 0 1 1 ${cx} ${y0} Z`;
  if (shape === 'rect') {
    const r = Math.min(iw, y1 - y0) * 0.06;
    return `M${x0 + r} ${y0} H${x1 - r} Q${x1} ${y0} ${x1} ${y0 + r} V${y1 - r} Q${x1} ${y1} ${x1 - r} ${y1} H${x0 + r} Q${x0} ${y1} ${x0} ${y1 - r} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} Z`;
  }
  if (shape === 'dome') {
    const r = iw / 2;
    const sh = y0 + r * 1.08;
    return `M${x0} ${y1} V${sh} C${x0} ${y0 + r * 0.32} ${cx - r * 0.55} ${y0 + r * 0.02} ${cx} ${y0} C${cx + r * 0.55} ${y0 + r * 0.02} ${x1} ${y0 + r * 0.32} ${x1} ${sh} V${y1} Z`;
  }
  const sh = y0 + Math.min((y1 - y0) * 0.3, iw * 0.62);
  if (shape === 'mughal') {
    return `M${x0} ${y1} V${sh} C${x0} ${sh - (sh - y0) * 0.38} ${cx - iw * 0.28} ${y0 + (sh - y0) * 0.28} ${cx - iw * 0.07} ${y0 + (sh - y0) * 0.12}
      Q${cx - iw * 0.03} ${y0 + (sh - y0) * 0.02} ${cx} ${y0} Q${cx + iw * 0.03} ${y0 + (sh - y0) * 0.02} ${cx + iw * 0.07} ${y0 + (sh - y0) * 0.12}
      C${cx + iw * 0.28} ${y0 + (sh - y0) * 0.28} ${x1} ${sh - (sh - y0) * 0.38} ${x1} ${sh} V${y1} Z`;
  }
  // Scalloped (Rajasthani) arch: an ogee whose edge is a row of little half-circles.
  const left: Pt[] = [];
  const n = 8;
  const P: [Pt, Pt, Pt, Pt] = [[x0, sh], [x0, y0 + (sh - y0) * 0.3], [cx - iw * 0.2, y0 + (sh - y0) * 0.22], [cx, y0]];
  for (let k = 0; k <= n; k++) left.push(cubic(...P, k / n));
  const right = left.map(([x, y]) => [w - x, y] as Pt).reverse();
  const pts = [...left, ...right.slice(1)];
  let d = `M${x0} ${y1} V${sh}`;
  for (let k = 1; k < pts.length; k++) {
    const [ax, ay] = pts[k - 1]!;
    const [bx, by] = pts[k]!;
    const r = Math.round(Math.hypot(bx - ax, by - ay) * 0.56 * 1000) / 1000;
    d += ` A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${bx.toFixed(1)} ${by.toFixed(1)}`;
  }
  return `${d} V${y1} Z`;
}

/** A filled arch / oval panel the text sits on, with a fine gold inner line. c = [fill, line, line2]. */
export function ArchPanel({ w, h, c, opts }: ArtProps) {
  const [fill = '#FFF6E5', line = '#C9973F', line2 = line] = c;
  const shape = String(opts?.shape ?? 'scallop');
  const gid = useSvgId('apan');
  const lineOnly = opts?.outline === true;
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      <defs>
        <Gold id={gid} c={line} />
      </defs>
      {!lineOnly && <path d={archPath(shape, w, h, 0)} fill={fill} />}
      <path d={archPath(shape, w, h, lineOnly ? 2 : 18)} fill="none" stroke={`url(#${gid})`} strokeWidth={lineOnly ? 3 : 3.5} />
      <path d={archPath(shape, w, h, lineOnly ? 16 : 30)} fill="none" stroke={line2} strokeWidth={1.4} opacity={0.75} />
    </>,
    'none',
  );
}

// ------------------------------------------------------------------ palace arch with pillars

/** Full-page palace arch: carved pillars, cusped arch, hanging bells. c = [stone, shade, gold]. */
export function PalaceArch({ w, h, c }: ArtProps) {
  const [stone = '#F2B8B5', shade = '#D98E8B', gold = '#C9973F'] = c;
  const gid = useSvgId('pal');
  const pw = w * 0.12;
  const top = h * 0.14;
  const opening = archPath('mughal', w - 2 * pw, h - top + h * 0.02, 0);
  const pillar = (x: number, k: number) => (
    <g key={k} transform={`translate(${x} 0)`}>
      <rect x={0} y={top} width={pw} height={h - top} fill={stone} />
      <rect x={pw * 0.18} y={top + h * 0.1} width={pw * 0.64} height={h - top - h * 0.18} fill={shade} opacity={0.45} rx={pw * 0.1} />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1={pw * (0.28 + i * 0.09)} y1={top + h * 0.12} x2={pw * (0.28 + i * 0.09)} y2={h - h * 0.08} stroke={shade} strokeWidth={2} opacity={0.6} />
      ))}
      <path d={`M${-pw * 0.12} ${top + h * 0.08} H${pw * 1.12} L${pw} ${top + h * 0.11} H0 Z`} fill={`url(#${gid})`} />
      <path d={`M${-pw * 0.12} ${h - h * 0.05} H${pw * 1.12} V${h} H${-pw * 0.12} Z`} fill={`url(#${gid})`} />
      <path d={`M${pw * 0.1} ${h - h * 0.08} H${pw * 0.9} L${pw * 1.02} ${h - h * 0.05} H${-pw * 0.02} Z`} fill={shade} />
      <circle cx={pw / 2} cy={top + h * 0.17} r={pw * 0.16} fill="none" stroke={gold} strokeWidth={3} />
      <circle cx={pw / 2} cy={top + h * 0.17} r={pw * 0.06} fill={gold} />
    </g>
  );
  const bells = [0.2, 0.35, 0.65, 0.8].map((fx, i) => {
    const x = w * fx;
    const len = h * (0.1 + (i % 2) * 0.05);
    return (
      <g key={i}>
        <line x1={x} y1={top} x2={x} y2={top + len} stroke={gold} strokeWidth={2} strokeDasharray="6 4" />
        <path d={`M${x} ${top + len} c-14 2 -16 22 -18 34 h36 c-2 -12 -4 -32 -18 -34 Z`} fill={`url(#${gid})`} />
        <circle cx={x} cy={top + len + 40} r={4} fill={gold} />
      </g>
    );
  });
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      <defs>
        <Gold id={gid} c={gold} />
        <clipPath id={`${gid}-band`}>
          <rect x={0} y={0} width={w - 2 * pw} height={h * 0.32} />
        </clipPath>
      </defs>
      <path d={`M0 0 H${w} V${h} H${w - pw} V${top} H${pw} V${h} H0 Z`} fill={stone} />
      <g transform={`translate(${pw} ${top - h * 0.02})`}>
        <path d={`M0 0 H${w - 2 * pw} V${h * 0.32} H0 Z ${opening}`} fill={stone} fillRule="evenodd" clipPath={`url(#${gid}-band)`} />
        <path d={opening} fill="none" stroke={`url(#${gid})`} strokeWidth={6} />
        <path d={archPath('mughal', w - 2 * pw, h - top + h * 0.02, 22)} fill="none" stroke={shade} strokeWidth={10} opacity={0.5} />
      </g>
      <rect x={0} y={0} width={w} height={h * 0.05} fill={shade} opacity={0.5} />
      <path d={`M0 ${h * 0.05} H${w}`} stroke={`url(#${gid})`} strokeWidth={5} />
      {Array.from({ length: 18 }, (_, i) => (
        <path key={i} d={`M${(i * w) / 18} ${h * 0.05} q${w / 36} ${h * 0.02} ${w / 18} 0`} fill="none" stroke={gold} strokeWidth={2.4} />
      ))}
      {pillar(0, 0)}
      {pillar(w - pw, 1)}
      {bells}
    </>,
    'none',
  );
}

// ------------------------------------------------------------------ filigree corner

/** Gold scrollwork for a corner (top-left; flip for the others). c = [gold]. */
export function Filigree({ w, h, c }: ArtProps) {
  const [gold = '#C9973F'] = c;
  const gid = useSvgId('fil');
  const st = { fill: 'none', stroke: `url(#${gid})`, strokeWidth: 3.2, strokeLinecap: 'round' as const };
  const curl = (x: number, y: number, s: number, r: number, k: number) => (
    <g key={k} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C30 -6 52 12 48 34 C45 50 26 54 18 44 C12 36 18 26 27 29" {...st} />
      <path d="M0 0 C-10 22 -2 46 18 58" {...st} />
      <path d="M48 34 C62 30 72 18 70 2" {...st} />
      <path d="M70 2 C80 8 86 4 88 -6 C80 -10 74 -6 70 2 Z" fill={gold} opacity={0.85} />
      <path d="M18 58 C12 70 16 80 26 82 C30 74 26 64 18 58 Z" fill={gold} opacity={0.85} />
    </g>
  );
  return svg(
    w,
    h,
    '0 0 300 300',
    <>
      <defs>
        <Gold id={gid} c={gold} />
      </defs>
      <path d="M12 290 C12 140 60 60 140 30 C190 12 240 10 290 12" {...st} strokeWidth={4} />
      <path d="M30 290 C34 170 74 90 150 56" {...st} strokeWidth={1.6} />
      {curl(40, 40, 1.15, 0, 0)}
      {curl(150, 30, 0.8, -10, 1)}
      {curl(30, 150, 0.8, 100, 2)}
      {curl(230, 14, 0.55, -5, 3)}
      {curl(14, 230, 0.55, 95, 4)}
      {[
        [96, 96],
        [70, 125],
        [125, 70],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill={gold} />
      ))}
      <path d="M100 100 C120 92 130 80 132 64 C116 66 104 78 100 100 Z M100 100 C92 120 80 130 64 132 C66 116 78 104 100 100 Z" fill={gold} opacity={0.7} />
    </>,
  );
}

// ------------------------------------------------------------------ geometric frame & hoop

/** Two overlapping fine gold rectangles with a small diamond at the crossing. c = [gold]. */
export function GeoFrame({ w, h, c }: ArtProps) {
  const [gold = '#C9973F'] = c;
  const gid = useSvgId('geo');
  const sw = 3;
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      <defs>
        <Gold id={gid} c={gold} />
      </defs>
      <rect x={w * 0.04} y={h * 0.02} width={w * 0.88} height={h * 0.9} fill="none" stroke={`url(#${gid})`} strokeWidth={sw} />
      <rect x={w * 0.08} y={h * 0.07} width={w * 0.88} height={h * 0.9} fill="none" stroke={`url(#${gid})`} strokeWidth={sw} transform={`rotate(-2.2 ${w / 2} ${h / 2})`} />
      <path d={`M${w * 0.5} ${h * 0.006} l12 14 l-12 14 l-12 -14 Z`} fill={gold} />
      <path d={`M${w * 0.5} ${h * 0.97} l12 14 l-12 14 l-12 -14 Z`} fill={gold} />
    </>,
    'none',
  );
}

/** Fine double gold hoop (around names or a photo). c = [gold]. */
export function GoldRing({ w, h, c }: ArtProps) {
  const [gold = '#C9973F'] = c;
  const gid = useSvgId('ring');
  return svg(
    w,
    h,
    '0 0 400 400',
    <>
      <defs>
        <Gold id={gid} c={gold} />
      </defs>
      <circle cx={200} cy={200} r={190} fill="none" stroke={`url(#${gid})`} strokeWidth={6} />
      <circle cx={200} cy={200} r={176} fill="none" stroke={gold} strokeWidth={1.6} opacity={0.8} />
      {[45, 225].map((a) => (
        <g key={a} transform={`rotate(${a} 200 200)`}>
          <path d="M200 6 l6 8 l-6 8 l-6 -8 Z" fill={gold} />
        </g>
      ))}
    </>,
  );
}

// ------------------------------------------------------------------ satin bow

/** Vertical satin ribbon with a bow (left edge of a save-the-date). c = [satin, shade]. */
export function Bow({ w, h, c }: ArtProps) {
  const [satin = '#B9BEC6', shade = '#8D939C'] = c;
  const gid = useSvgId('bow');
  const bx = 100;
  const by = h * (200 / w) * 0.38;
  const vh = h * (200 / w);
  return svg(
    w,
    h,
    `0 0 200 ${vh}`,
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade} />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0.9} />
          <stop offset="0.6" stopColor={satin} />
          <stop offset="1" stopColor={shade} />
        </linearGradient>
      </defs>
      <rect x={70} y={0} width={60} height={vh} fill={`url(#${gid})`} />
      <path d={`M${bx} ${by} C60 ${by - 90} -10 ${by - 70} 10 ${by - 10} C20 ${by + 40} 70 ${by + 20} ${bx} ${by} Z`} fill={`url(#${gid})`} stroke={shade} strokeWidth={1.5} />
      <path d={`M${bx} ${by} C140 ${by - 90} 210 ${by - 70} 190 ${by - 10} C180 ${by + 40} 130 ${by + 20} ${bx} ${by} Z`} fill={`url(#${gid})`} stroke={shade} strokeWidth={1.5} />
      <path d={`M${bx - 8} ${by + 10} C70 ${by + 120} 40 ${by + 220} 20 ${by + 300} L58 ${by + 290} C80 ${by + 200} 96 ${by + 120} ${bx + 4} ${by + 14} Z`} fill={`url(#${gid})`} stroke={shade} strokeWidth={1.2} />
      <path d={`M${bx + 8} ${by + 10} C130 ${by + 120} 160 ${by + 220} 180 ${by + 300} L142 ${by + 290} C120 ${by + 200} 104 ${by + 120} ${bx - 4} ${by + 14} Z`} fill={`url(#${gid})`} stroke={shade} strokeWidth={1.2} />
      <ellipse cx={bx} cy={by} rx={22} ry={26} fill={`url(#${gid})`} stroke={shade} strokeWidth={1.5} />
      <path d={`M${bx - 70} ${by - 40} C${bx - 50} ${by - 30} ${bx - 30} ${by - 14} ${bx - 18} ${by}`} fill="none" stroke={shade} strokeWidth={1.4} opacity={0.6} />
      <path d={`M${bx + 70} ${by - 40} C${bx + 50} ${by - 30} ${bx + 30} ${by - 14} ${bx + 18} ${by}`} fill="none" stroke={shade} strokeWidth={1.4} opacity={0.6} />
    </>,
    'none',
  );
}

// ------------------------------------------------------------------ chhatri (royal umbrella)

/** Royal umbrella with scalloped canopy, tassels and a gold pole. c = [canopy, trim, gold]. */
export function Chhatri({ w, h, c }: ArtProps) {
  const [canopy = '#C2185B', trim = '#1B4F9C', gold = '#E9B949'] = c;
  const gid = useSvgId('cht');
  return svg(
    w,
    h,
    '0 0 240 300',
    <>
      <defs>
        <Gold id={gid} c={gold} />
      </defs>
      <rect x={117} y={60} width={6} height={236} fill={`url(#${gid})`} />
      <path d="M20 110 C30 60 80 30 120 28 C160 30 210 60 220 110 Z" fill={canopy} />
      <path d="M48 104 C60 70 90 46 120 44 C150 46 180 70 192 104" fill="none" stroke={gold} strokeWidth={3} strokeDasharray="2 6" strokeLinecap="round" />
      {Array.from({ length: 8 }, (_, i) => {
        const x = 20 + i * 25;
        return <path key={i} d={`M${x} 110 q12.5 22 25 0 Z`} fill={trim} />;
      })}
      {Array.from({ length: 9 }, (_, i) => {
        const x = 20 + i * 25;
        return (
          <g key={i}>
            <line x1={x} y1={110} x2={x} y2={134} stroke={gold} strokeWidth={2} />
            <path d={`M${x - 4} 134 h8 l-2 12 h-4 Z`} fill={`url(#${gid})`} />
          </g>
        );
      })}
      <path d="M110 30 L120 6 L130 30 Z" fill={`url(#${gid})`} />
      <circle cx={120} cy={6} r={5} fill={gold} />
      <path d="M120 28 V110" stroke={gold} strokeWidth={1.2} opacity={0.6} />
      <path d="M120 28 C100 50 80 80 70 110 M120 28 C140 50 160 80 170 110" stroke={gold} strokeWidth={1.2} fill="none" opacity={0.6} />
    </>,
  );
}

// ------------------------------------------------------------------ hanging marigold strings (ladi)

/** Vertical strings of marigolds with tiny bells, hanging from the top. c = [flower, flower2, leaf]. */
export function GendaLadi({ w, h, c, opts }: ArtProps) {
  const [f1 = '#F28C0F', f2 = '#FFC93C', leaf = '#2F7D32'] = c;
  const n = Math.max(1, Math.min(9, Number(opts?.count ?? 3)));
  const r = rng(41);
  const strands = Array.from({ length: n }, (_, i) => {
    const x = n === 1 ? w / 2 : (w * (i + 0.5)) / n;
    const len = h * (0.55 + r() * 0.45);
    return { x, len, k: i };
  });
  const size = Math.min(w / n, 60) * 0.42;
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      {strands.map((s) => {
        const count = Math.floor(s.len / (size * 1.7));
        return (
          <g key={s.k}>
            <line x1={s.x} y1={0} x2={s.x} y2={s.len} stroke="#7A4E1C" strokeWidth={1.4} />
            {Array.from({ length: count }, (_, j) => {
              const y = size + j * size * 1.7;
              const col = j % 2 ? f2 : f1;
              return (
                <g key={j} transform={`translate(${s.x} ${y})`}>
                  {j % 4 === 3 ? (
                    <path d={`M0 ${-size * 0.8} C${size * 0.7} ${-size * 0.3} ${size * 0.4} ${size * 0.6} 0 ${size * 0.8} C${-size * 0.4} ${size * 0.6} ${-size * 0.7} ${-size * 0.3} 0 ${-size * 0.8} Z`} fill={leaf} />
                  ) : (
                    <>
                      <circle r={size * 0.82} fill={col} />
                      {Array.from({ length: 10 }, (_, q) => (
                        <circle key={q} cx={Math.cos((q * Math.PI) / 5) * size * 0.62} cy={Math.sin((q * Math.PI) / 5) * size * 0.62} r={size * 0.26} fill={col === f1 ? f2 : f1} opacity={0.55} />
                      ))}
                      <circle r={size * 0.22} fill="#B84A06" opacity={0.7} />
                    </>
                  )}
                </g>
              );
            })}
            <path d={`M${s.x} ${s.len} c-${size * 0.6} 2 -${size * 0.7} ${size * 1.1} -${size * 0.8} ${size * 1.5} h${size * 1.6} c-0.1 -${size * 0.4} -0.2 -${size * 1.3} -${size * 0.8} -${size * 1.5} Z`} fill="#E9B949" />
          </g>
        );
      })}
    </>,
    'none',
  );
}

// ------------------------------------------------------------------ function icons

/** Small line icons for the ceremonies page. c = [line, soft fill]. */
export function FnIcon({ w, h, c, opts }: ArtProps) {
  const [ink = '#C9973F', soft = ink] = c;
  const icon = String(opts?.icon ?? 'flower');
  const st = { fill: 'none', stroke: ink, strokeWidth: 2.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const fill = { fill: soft, opacity: 0.35 };
  let body: ReactNode;
  switch (icon) {
    case 'haldi':
      body = (
        <>
          <path d="M18 54 H82 C80 76 66 88 50 88 C34 88 20 76 18 54 Z" {...fill} />
          <path d="M18 54 H82 C80 76 66 88 50 88 C34 88 20 76 18 54 Z M14 54 H86" {...st} />
          <path d="M28 54 C34 42 46 40 50 46 C56 38 68 42 72 54" {...st} />
          <path d="M60 30 C70 16 86 14 92 20 C86 32 72 36 60 30 Z M60 30 C66 26 74 22 84 20" {...st} />
          {[30, 50, 70].map((x) => <circle key={x} cx={x} cy={70} r={2.4} fill={ink} />)}
        </>
      );
      break;
    case 'mehendi':
      body = (
        <>
          <path d="M34 92 V58 L26 40 C24 34 30 31 33 36 L40 50 V18 C40 12 47 12 47 18 V46 V12 C47 6 54 6 54 12 V46 V16 C54 10 61 10 61 16 V48 V24 C61 18 68 18 68 24 V64 C68 78 62 86 58 92 Z" {...fill} />
          <path d="M34 92 V58 L26 40 C24 34 30 31 33 36 L40 50 V18 C40 12 47 12 47 18 V46 V12 C47 6 54 6 54 12 V46 V16 C54 10 61 10 61 16 V48 V24 C61 18 68 18 68 24 V64 C68 78 62 86 58 92 Z" {...st} />
          <circle cx={52} cy={68} r={8} {...st} strokeWidth={1.8} />
          <circle cx={52} cy={68} r={2.6} fill={ink} />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <circle key={a} cx={52 + Math.cos((a * Math.PI) / 180) * 12} cy={68 + Math.sin((a * Math.PI) / 180) * 12} r={1.6} fill={ink} />
          ))}
          {[43.5, 50.5, 57.5, 64.5].map((x) => <circle key={x} cx={x} cy={x === 43.5 ? 24 : x === 50.5 ? 18 : x === 57.5 ? 22 : 30} r={1.8} fill={ink} />)}
        </>
      );
      break;
    case 'sangeet':
      body = (
        <>
          <path d="M16 46 C16 38 84 38 84 46 V70 C84 78 16 78 16 70 Z" {...fill} />
          <ellipse cx={16} cy={58} rx={6} ry={12} {...st} />
          <ellipse cx={84} cy={58} rx={6} ry={12} {...st} />
          <path d="M16 46 C30 40 70 40 84 46 M16 70 C30 76 70 76 84 70" {...st} />
          <path d="M22 47 L34 71 L46 45 L58 72 L70 45 L80 68" {...st} strokeWidth={1.6} />
          <path d="M64 30 V10 L82 6 V24" {...st} />
          <ellipse cx={60} cy={30} rx={5} ry={4} fill={ink} />
          <ellipse cx={78} cy={25} rx={5} ry={4} fill={ink} />
        </>
      );
      break;
    case 'baraat':
      body = (
        <>
          <path d="M18 66 C16 40 34 26 50 26 C66 26 84 40 82 66 Z" {...fill} />
          <path d="M18 66 C16 40 34 26 50 26 C66 26 84 40 82 66 Z M14 66 H86 M24 54 C40 46 60 46 76 54 M22 44 C40 36 60 36 78 44" {...st} />
          <circle cx={50} cy={42} r={5} {...st} />
          <path d="M50 37 C48 24 54 12 64 8 C62 18 58 26 52 37" {...st} />
          <path d="M30 66 C28 78 26 86 22 92 M70 66 C72 78 74 86 78 92" {...st} strokeWidth={1.8} strokeDasharray="1 5" />
        </>
      );
      break;
    case 'pheras':
      body = (
        <>
          <path d="M22 70 H78 L72 88 H28 Z" {...fill} />
          <path d="M22 70 H78 L72 88 H28 Z M16 70 H84" {...st} />
          <path d="M50 66 C38 58 40 44 48 36 C48 46 54 48 56 40 C62 50 64 60 50 66 Z" {...fill} />
          <path d="M50 66 C38 58 40 44 48 36 C48 46 54 48 56 40 C62 50 64 60 50 66 Z M38 66 C32 60 34 52 38 48 M62 66 C68 60 66 52 62 48" {...st} />
          <path d="M30 79 h4 M48 79 h4 M66 79 h4" {...st} />
          {[20, 50, 80].map((x, i) => <circle key={x} cx={x} cy={18 + (i % 2) * 6} r={2.4} fill={ink} />)}
        </>
      );
      break;
    case 'wedding':
      body = (
        <>
          <path d="M18 36 C30 16 70 16 82 36 Z" {...fill} />
          <path d="M18 36 C30 16 70 16 82 36 Z M14 36 H86 M22 36 V90 M78 36 V90 M14 90 H86" {...st} />
          <path d="M22 42 C34 54 46 54 50 42 C54 54 66 54 78 42" {...st} strokeWidth={1.8} />
          <path d="M50 8 V16 M46 12 H54" {...st} />
          <path d="M40 90 V72 C40 64 60 64 60 72 V90" {...st} />
          <path d="M50 66 C46 60 48 54 50 52 C52 54 54 60 50 66 Z" fill={ink} />
        </>
      );
      break;
    case 'reception':
    case 'dinner':
      body =
        icon === 'reception' ? (
          <>
            <path d="M24 18 H44 L42 40 C40 48 28 48 26 40 Z M56 18 H76 L74 40 C72 48 60 48 58 40 Z" {...fill} />
            <path d="M24 18 H44 L42 40 C40 48 28 48 26 40 Z M34 47 V78 M24 80 H44" {...st} transform="rotate(-10 34 50)" />
            <path d="M56 18 H76 L74 40 C72 48 60 48 58 40 Z M66 47 V78 M56 80 H76" {...st} transform="rotate(10 66 50)" />
            <path d="M50 6 V14 M44 10 L40 6 M56 10 L60 6" {...st} />
          </>
        ) : (
          <>
            <path d="M16 70 C16 44 32 30 50 30 C68 30 84 44 84 70 Z" {...fill} />
            <path d="M16 70 C16 44 32 30 50 30 C68 30 84 44 84 70 Z M8 70 H92 M14 78 H86 M50 30 V24" {...st} />
            <circle cx={50} cy={20} r={4} {...st} />
            <path d="M28 58 C30 48 38 40 46 38" {...st} strokeWidth={1.8} />
          </>
        );
      break;
    case 'rings':
      body = (
        <>
          <circle cx={38} cy={60} r={20} {...st} strokeWidth={4} />
          <circle cx={62} cy={60} r={20} {...st} strokeWidth={4} />
          <path d="M30 34 L38 24 L46 34 L38 42 Z" {...fill} />
          <path d="M30 34 L38 24 L46 34 L38 42 Z M30 34 H46" {...st} />
          <path d="M70 18 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 Z" fill={ink} />
        </>
      );
      break;
    case 'puja':
      body = (
        <>
          <path d="M36 44 C14 50 14 82 30 90 H70 C86 82 86 50 64 44 Z" {...fill} />
          <path d="M36 44 C14 50 14 82 30 90 H70 C86 82 86 50 64 44 Z M34 44 H66 M30 66 C44 72 56 72 70 66" {...st} />
          <ellipse cx={50} cy={32} rx={10} ry={11} {...st} />
          {[-50, -25, 25, 50].map((a) => (
            <path key={a} d="M0 0 C4 -6 4 -16 0 -24 C-4 -16 -4 -6 0 0 Z" {...st} strokeWidth={1.8} transform={`translate(50 40) rotate(${a})`} />
          ))}
          <circle cx={50} cy={60} r={3} fill={ink} />
        </>
      );
      break;
    case 'nikah':
      body = (
        <>
          <path d="M62 14 C40 14 24 32 24 52 C24 72 40 88 62 88 C46 80 38 66 38 52 C38 36 46 22 62 14 Z" {...fill} />
          <path d="M62 14 C40 14 24 32 24 52 C24 72 40 88 62 88 C46 80 38 66 38 52 C38 36 46 22 62 14 Z" {...st} />
          <path d="M70 38 l4 10 l11 1 l-8 7 l3 11 l-10 -6 l-10 6 l3 -11 l-8 -7 l11 -1 Z" fill={ink} />
        </>
      );
      break;
    case 'cake':
      body = (
        <>
          <path d="M22 62 H78 V88 H22 Z M30 40 H70 V62 H30 Z" {...fill} />
          <path d="M22 62 H78 V88 H22 Z M30 40 H70 V62 H30 Z M14 88 H86" {...st} />
          <path d="M22 70 C30 76 38 64 46 70 C54 76 62 64 70 70 C74 73 76 70 78 68 M30 47 C38 52 46 42 54 48 C60 52 66 44 70 46" {...st} strokeWidth={1.8} />
          <path d="M50 40 V28" {...st} />
          <path d="M50 26 C46 20 48 14 50 12 C52 14 54 20 50 26 Z" fill={ink} />
        </>
      );
      break;
    default:
      body = (
        <>
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={a} d="M50 50 C60 40 60 24 50 14 C40 24 40 40 50 50 Z" {...fill} transform={`rotate(${a} 50 50)`} />
          ))}
          {[0, 72, 144, 216, 288].map((a) => (
            <path key={`s${a}`} d="M50 50 C60 40 60 24 50 14 C40 24 40 40 50 50 Z" {...st} transform={`rotate(${a} 50 50)`} />
          ))}
          <circle cx={50} cy={50} r={6} fill={ink} />
        </>
      );
  }
  return svg(w, h, '0 0 100 100', body);
}
