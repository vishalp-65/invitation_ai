import type { ReactNode } from 'react';
import { rng, type ArtProps } from './Ornaments';
import { PaintFilter, useSvgId } from './svg-ids';

/**
 * Recolourable watercolour botanicals for the "Canva-style" collection: peonies, hydrangea,
 * tulips, daisies, mimosa, eucalyptus/olive/fern greenery, and fine line-art flowers.
 * Every piece takes its colours from the element so one drawing serves every colourway.
 */

const svg = (w: number, h: number, vb: string, children: ReactNode, par = 'xMidYMid meet') => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio={par} style={{ display: 'block', overflow: 'visible' }}>
    {children}
  </svg>
);

/** Mixes two #rrggbb colours (t = 0 → a, 1 → b). */
function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------------ blooms (unit radius 1)

interface BloomProps {
  x: number;
  y: number;
  s: number;
  rot?: number;
  petal: string;
  deep: string;
}

const PEONY_PETAL = 'M0 0 C0.42 -0.18 0.72 -0.7 0.42 -1.02 Q0.22 -1.16 0 -1.04 Q-0.22 -1.16 -0.42 -1.02 C-0.72 -0.7 -0.42 -0.18 0 0 Z';

function Peony({ x, y, s, rot = 0, petal, deep }: BloomProps) {
  const light = mix(petal, '#FFFFFF', 0.45);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle r={0.95} fill={light} opacity={0.55} />
      {[0, 51, 103, 154, 206, 257, 309].map((a) => (
        <path key={`o${a}`} d={PEONY_PETAL} fill={petal} opacity={0.7} transform={`rotate(${a})`} />
      ))}
      {[25, 85, 145, 205, 265, 325].map((a) => (
        <path key={`m${a}`} d={PEONY_PETAL} fill={mix(petal, deep, 0.45)} opacity={0.55} transform={`rotate(${a}) scale(0.74)`} />
      ))}
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={`i${a}`} d={PEONY_PETAL} fill={deep} opacity={0.5} transform={`rotate(${a + 12}) scale(0.46)`} />
      ))}
      <path d="M-0.3 -0.05 C-0.15 -0.32 0.2 -0.3 0.3 -0.04 C0.18 0.1 -0.16 0.12 -0.3 -0.05 Z" fill={light} opacity={0.9} />
      {[-0.12, 0, 0.13].map((dx, i) => (
        <circle key={i} cx={dx} cy={-0.02 + (i % 2) * 0.05} r={0.035} fill="#E9B949" />
      ))}
    </g>
  );
}

function Hydrangea({ x, y, s, rot = 0, petal, deep }: BloomProps) {
  const r = rng(Math.round(x * 13 + y * 7));
  const florets = Array.from({ length: 30 }, (_, i) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.82;
    return { fx: Math.cos(a) * d, fy: Math.sin(a) * d, k: i, t: r() };
  });
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle r={1} fill={mix(petal, '#FFFFFF', 0.35)} opacity={0.5} />
      {florets.map((f) => (
        <g key={f.k} transform={`translate(${f.fx} ${f.fy}) rotate(${f.t * 90}) scale(0.2)`}>
          {[0, 90, 180, 270].map((a) => (
            <ellipse key={a} cx={0} cy={-0.55} rx={0.42} ry={0.55} fill={mix(petal, deep, f.t * 0.7)} opacity={0.82} transform={`rotate(${a})`} />
          ))}
          <circle r={0.16} fill={mix(deep, '#FFFFFF', 0.2)} />
        </g>
      ))}
    </g>
  );
}

function Tulip({ x, y, s, rot = 0, petal, deep }: BloomProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0.9 C-0.05 0.4 0.02 0.1 0 -0.1" stroke="#4E7D3A" strokeWidth={0.07} fill="none" />
      <path d="M-0.62 -0.2 C-0.7 -0.85 -0.35 -1.2 -0.1 -1.05 C-0.05 -0.6 -0.15 -0.15 -0.62 -0.2 Z" fill={petal} opacity={0.85} />
      <path d="M0.62 -0.2 C0.7 -0.85 0.35 -1.2 0.1 -1.05 C0.05 -0.6 0.15 -0.15 0.62 -0.2 Z" fill={petal} opacity={0.85} />
      <path d="M-0.42 -0.15 C-0.5 -0.95 0 -1.35 0 -1.35 C0 -1.35 0.5 -0.95 0.42 -0.15 C0.2 0.05 -0.2 0.05 -0.42 -0.15 Z" fill={deep} opacity={0.7} />
      <path d="M-0.15 -0.3 C-0.1 -0.8 0 -1.1 0 -1.1" stroke={mix(petal, '#FFFFFF', 0.5)} strokeWidth={0.05} fill="none" opacity={0.8} />
    </g>
  );
}

function Daisy({ x, y, s, rot = 0, petal, deep }: BloomProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {Array.from({ length: 14 }, (_, i) => (
        <ellipse key={i} cx={0} cy={-0.55} rx={0.13} ry={0.48} fill={petal} stroke={mix(petal, deep, 0.4)} strokeWidth={0.02} transform={`rotate(${(i * 360) / 14})`} />
      ))}
      <circle r={0.24} fill="#E9B949" />
      <circle r={0.24} fill="none" stroke="#B9831B" strokeWidth={0.04} strokeDasharray="0.04 0.06" />
    </g>
  );
}

const ROSE_PETAL = 'M0 0 C0.5 -0.06 0.86 -0.5 0.62 -0.92 Q0.3 -1.12 0 -1 Q-0.3 -1.12 -0.62 -0.92 C-0.86 -0.5 -0.5 -0.06 0 0 Z';

/** Garden rose: cupped outer petals around a tight spiral heart. */
function Rose({ x, y, s, rot = 0, petal, deep }: BloomProps) {
  const light = mix(petal, '#FFFFFF', 0.4);
  const mid = mix(petal, deep, 0.35);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle r={0.98} fill={light} opacity={0.5} />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={`o${a}`} d={ROSE_PETAL} fill={petal} opacity={0.72} transform={`rotate(${a + 15})`} />
      ))}
      {[30, 102, 174, 246, 318].map((a) => (
        <path key={`m${a}`} d={ROSE_PETAL} fill={mid} opacity={0.6} transform={`rotate(${a}) scale(0.7)`} />
      ))}
      <circle r={0.42} fill={mix(petal, deep, 0.55)} opacity={0.85} />
      <path d="M-0.34 0.08 C-0.36 -0.3 0.1 -0.42 0.3 -0.18 C0.42 0.04 0.2 0.3 -0.04 0.26 C-0.24 0.2 -0.22 -0.06 -0.04 -0.12 C0.1 -0.16 0.18 -0.02 0.1 0.08" fill="none" stroke={deep} strokeWidth={0.06} strokeLinecap="round" opacity={0.8} />
      <path d="M-0.5 0.2 C-0.3 0.5 0.3 0.52 0.5 0.18" fill="none" stroke={light} strokeWidth={0.06} strokeLinecap="round" opacity={0.75} />
      <path d="M-0.55 -0.2 C-0.5 -0.55 -0.1 -0.68 0.2 -0.6" fill="none" stroke={light} strokeWidth={0.05} strokeLinecap="round" opacity={0.6} />
    </g>
  );
}

/** Rosebud with sepals. */
function Bud({ x, y, s, rot = 0, petal, deep }: BloomProps) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0.9 C0.02 0.5 0 0.3 0 0.1" stroke="#5E7D4A" strokeWidth={0.06} fill="none" />
      <path d="M-0.32 0.05 C-0.42 -0.45 -0.1 -0.8 0 -0.82 C0.1 -0.8 0.42 -0.45 0.32 0.05 C0.15 0.2 -0.15 0.2 -0.32 0.05 Z" fill={petal} opacity={0.85} />
      <path d="M-0.12 -0.1 C-0.16 -0.45 0 -0.7 0.06 -0.72 C0.16 -0.5 0.12 -0.2 -0.12 -0.1 Z" fill={deep} opacity={0.55} />
      <path d="M-0.32 0.05 C-0.2 0.25 -0.36 0.1 -0.5 -0.2 M0.32 0.05 C0.2 0.25 0.36 0.1 0.5 -0.2" stroke="#5E7D4A" strokeWidth={0.07} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Mimosa({ x, y, s, rot = 0, color }: { x: number; y: number; s: number; rot?: number; color: string }) {
  const r = rng(Math.round(x * 3 + y * 11 + 5));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0 C0.3 -0.4 0.5 -0.8 0.9 -1.1" stroke="#7A8B4A" strokeWidth={0.03} fill="none" />
      {Array.from({ length: 16 }, (_, i) => {
        const t = i / 15;
        const bx = 0.9 * t + (r() - 0.5) * 0.35;
        const by = -1.1 * t + (r() - 0.5) * 0.35;
        return <circle key={i} cx={bx} cy={by} r={0.06 + r() * 0.05} fill={i % 3 ? color : mix(color, '#FFFFFF', 0.4)} />;
      })}
    </g>
  );
}

// ------------------------------------------------------------------ greenery

function Eucalyptus({ len, leaf, leaf2, seed }: { len: number; leaf: string; leaf2: string; seed: number }) {
  const r = rng(seed);
  const n = 9;
  return (
    <g>
      <path d={`M0 0 C${len * 0.3} ${-len * 0.05} ${len * 0.65} ${-len * 0.02} ${len} ${-len * 0.12}`} stroke={leaf2} strokeWidth={len * 0.012} fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / (n + 1);
        const px = len * t;
        const py = -len * 0.12 * t * t;
        const rr = len * (0.07 - t * 0.03);
        return (
          <g key={i}>
            <circle cx={px} cy={py - rr * 0.95} r={rr} fill={i % 2 ? leaf : leaf2} opacity={0.62 + r() * 0.3} />
            <circle cx={px + rr * 0.4} cy={py + rr * 0.95} r={rr * 0.92} fill={i % 2 ? leaf2 : leaf} opacity={0.55 + r() * 0.3} />
          </g>
        );
      })}
    </g>
  );
}

function Olive({ len, leaf, leaf2, seed }: { len: number; leaf: string; leaf2: string; seed: number }) {
  const r = rng(seed);
  const n = 11;
  return (
    <g>
      <path d={`M0 0 Q${len * 0.5} ${-len * 0.12} ${len} ${-len * 0.05}`} stroke={leaf2} strokeWidth={len * 0.01} fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / (n + 1);
        const px = len * t;
        const py = -len * 0.12 * 2 * t * (1 - t) - len * 0.05 * t * t;
        const side = i % 2 ? 1 : -1;
        const l = len * (0.2 - t * 0.08);
        return (
          <path
            key={i}
            d={`M0 0 C${l * 0.3} ${-l * 0.16} ${l * 0.75} ${-l * 0.14} ${l} 0 C${l * 0.75} ${l * 0.14} ${l * 0.3} ${l * 0.16} 0 0 Z`}
            fill={i % 3 ? leaf : leaf2}
            opacity={0.7 + r() * 0.25}
            transform={`translate(${px} ${py}) rotate(${side * (38 + r() * 14)})`}
          />
        );
      })}
    </g>
  );
}

function Fern({ len, leaf, leaf2 }: { len: number; leaf: string; leaf2: string }) {
  const n = 16;
  return (
    <g>
      <path d={`M0 0 Q${len * 0.55} ${-len * 0.1} ${len} 0`} stroke={leaf2} strokeWidth={len * 0.01} fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 1) / (n + 1);
        const px = len * t;
        const py = -len * 0.1 * 2 * t * (1 - t);
        const l = len * 0.16 * (1 - t * 0.75);
        return [-1, 1].map((side) => (
          <path key={`${i}${side}`} d={`M0 0 Q${l * 0.5} ${-l * 0.18} ${l} 0 Q${l * 0.5} ${l * 0.1} 0 0 Z`} fill={side > 0 ? leaf : leaf2} opacity={0.8} transform={`translate(${px} ${py}) rotate(${side * 58})`} />
        ));
      })}
    </g>
  );
}

/** A leafy spray growing from the box's bottom-left corner toward the top-right. c = [leaf, leaf2]. */
export function Greenery({ w, h, c, opts }: ArtProps) {
  const [leaf = '#6E8B5A', leaf2 = mix(leaf, '#1F2E1A', 0.35)] = c;
  const kind = String(opts?.kind ?? 'mixed');
  const fid = useSvgId('grn');
  const L = 1000;
  const branch = (k: string, len: number, angle: number, seed: number) => (
    <g key={`${k}${seed}`} transform={`rotate(${angle})`}>
      {k === 'olive' ? <Olive len={len} leaf={leaf} leaf2={leaf2} seed={seed} /> : k === 'fern' ? <Fern len={len} leaf={leaf} leaf2={leaf2} /> : <Eucalyptus len={len} leaf={leaf} leaf2={leaf2} seed={seed} />}
    </g>
  );
  const kinds = kind === 'mixed' ? ['eucalyptus', 'olive', 'fern', 'eucalyptus', 'olive'] : [kind, kind, kind, kind, kind];
  return svg(
    w,
    h,
    `0 0 ${L} ${L}`,
    <>
      <defs>
        <PaintFilter id={fid} strength={6} />
      </defs>
      <g filter={`url(#${fid})`} transform={`translate(20 ${L - 20})`}>
        {branch(kinds[0]!, L * 1.05, -45, 3)}
        {branch(kinds[1]!, L * 0.8, -22, 5)}
        {branch(kinds[2]!, L * 0.8, -68, 7)}
        {branch(kinds[3]!, L * 0.55, -8, 11)}
        {branch(kinds[4]!, L * 0.55, -82, 13)}
      </g>
    </>,
    'none',
  );
}

// ------------------------------------------------------------------ corner bouquet

export const BLOOM_KINDS = ['peony', 'rose', 'hydrangea', 'tulip', 'daisy', 'mixed'] as const;

/**
 * Watercolour corner bouquet growing from the box's top-left corner (flip for other corners).
 * c = [petal, deep petal, leaf, filler (mimosa)].
 */
export function BloomCorner({ w, h, c, opts }: ArtProps) {
  const [petal = '#B58FD1', deep = mix(petal, '#3B1F4A', 0.4), leaf = '#7A9A6B', filler = '#E9C46A'] = c;
  const kind = String(opts?.kind ?? 'peony');
  const fid = useSvgId('blm');
  const u = 100;
  const pick = (i: number) => {
    const order = kind === 'mixed' ? ['peony', 'hydrangea', 'daisy', 'tulip'] : [kind, kind, kind === 'tulip' ? 'tulip' : 'daisy', kind];
    const k = order[i % order.length]!;
    return k === 'hydrangea' ? Hydrangea : k === 'tulip' ? Tulip : k === 'daisy' ? Daisy : k === 'rose' ? Rose : Peony;
  };
  const [A, B, C] = [pick(0), pick(1), pick(2)];
  const leaf2 = mix(leaf, '#1F2E1A', 0.3);
  const daisyPetal = kind === 'daisy' ? '#FFFFFF' : petal;
  return svg(
    w,
    h,
    '0 0 440 440',
    <>
      <defs>
        <PaintFilter id={fid} strength={7} />
      </defs>
      <g filter={`url(#${fid})`}>
        <g transform="translate(0 0) rotate(20)">
          <Eucalyptus len={4.2 * u} leaf={leaf} leaf2={leaf2} seed={17} />
        </g>
        <g transform="translate(0 0) rotate(72)">
          <Olive len={4 * u} leaf={leaf} leaf2={leaf2} seed={23} />
        </g>
        <g transform="translate(10 10) rotate(46)">
          <Fern len={3.2 * u} leaf={leaf2} leaf2={leaf} />
        </g>
        <Mimosa x={2.6 * u} y={1.5 * u} s={1.1 * u} rot={30} color={filler} />
        <Mimosa x={1.4 * u} y={2.7 * u} s={1.0 * u} rot={70} color={filler} />
        <B x={2.55 * u} y={0.85 * u} s={0.7 * u} rot={20} petal={kind === 'daisy' ? daisyPetal : petal} deep={deep} />
        <B x={0.85 * u} y={2.55 * u} s={0.7 * u} rot={-15} petal={kind === 'daisy' ? daisyPetal : petal} deep={deep} />
        <C x={2.15 * u} y={2.05 * u} s={0.48 * u} rot={40} petal={C === Daisy ? '#FFFFFF' : petal} deep={deep} />
        <A x={1.1 * u} y={1.05 * u} s={1.2 * u} rot={10} petal={kind === 'daisy' ? daisyPetal : petal} deep={deep} />
        <C x={3.4 * u} y={0.45 * u} s={0.32 * u} rot={0} petal={C === Daisy ? '#FFFFFF' : petal} deep={deep} />
        <C x={0.45 * u} y={3.4 * u} s={0.32 * u} rot={0} petal={C === Daisy ? '#FFFFFF' : petal} deep={deep} />
      </g>
    </>,
  );
}

// ------------------------------------------------------------------ floral gold ring

/**
 * Overlapping fine gold hoops dressed with watercolour bouquets (names sit inside).
 * c = [gold, petal, deep petal, leaf]; opts.kind = rose | peony | hydrangea | mixed;
 * opts.layout = diagonal (top-left + bottom-right) | left (an arc down the left side);
 * opts.scale shrinks the bouquets (default 1).
 */
export function BloomRing({ w, h, c, opts }: ArtProps) {
  const [gold = '#C9973F', petal = '#E58FAB', deep = mix(petal, '#3B1F2A', 0.4), leaf = '#7A9A6B'] = c;
  const kind = String(opts?.kind ?? 'rose');
  const layout = String(opts?.layout ?? 'diagonal');
  const k = Number(opts?.scale ?? 1);
  const fid = useSvgId('bring');
  const gid = useSvgId('bringg');
  const leaf2 = mix(leaf, '#1F2E1A', 0.3);
  const Big = kind === 'hydrangea' ? Hydrangea : kind === 'peony' ? Peony : Rose;
  const Small = kind === 'mixed' ? Hydrangea : kind === 'hydrangea' ? Peony : Peony;
  const R = 200;
  const at = (deg: number, r = R) => [250 + Math.cos((deg * Math.PI) / 180) * r, 250 + Math.sin((deg * Math.PI) / 180) * r] as const;
  /** A bouquet hugging the ring at `deg` (0 = right, 90 = bottom). */
  const bouquet = (deg: number, scale: number, seed: number) => {
    const [x, y] = at(deg);
    const tangent = deg + 90;
    const p = (d: number, r: number) => [x + Math.cos(((tangent + d) * Math.PI) / 180) * r, y + Math.sin(((tangent + d) * Math.PI) / 180) * r] as const;
    const [ax, ay] = p(0, 70 * scale);
    const [bx, by] = p(180, 70 * scale);
    const [cx2, cy2] = p(0, 130 * scale);
    const [dx, dy] = p(180, 125 * scale);
    return (
      <g key={deg}>
        <g transform={`translate(${x} ${y}) rotate(${tangent - 12})`}><Eucalyptus len={190 * scale} leaf={leaf} leaf2={leaf2} seed={seed} /></g>
        <g transform={`translate(${x} ${y}) rotate(${tangent + 192})`}><Olive len={180 * scale} leaf={leaf} leaf2={leaf2} seed={seed + 2} /></g>
        <g transform={`translate(${x} ${y}) rotate(${tangent + 40})`}><Fern len={110 * scale} leaf={leaf2} leaf2={leaf} /></g>
        <Mimosa x={x + 30 * scale} y={y - 40 * scale} s={80 * scale} rot={deg} color={mix(gold, '#FFFFFF', 0.25)} />
        <Small x={ax} y={ay} s={44 * scale} rot={seed * 7} petal={petal} deep={deep} />
        <Small x={bx} y={by} s={40 * scale} rot={seed * 11} petal={mix(petal, '#FFFFFF', 0.25)} deep={deep} />
        <Bud x={cx2} y={cy2} s={34 * scale} rot={tangent} petal={petal} deep={deep} />
        <Bud x={dx} y={dy} s={30 * scale} rot={tangent + 180} petal={petal} deep={deep} />
        <Big x={x} y={y} s={62 * scale} rot={seed * 13} petal={petal} deep={deep} />
      </g>
    );
  };
  const spots = layout === 'left' ? [[200, 1.05, 3], [140, 0.8, 9], [300, 0.55, 15]] : [[225, 1, 3], [45, 1, 9]];
  return svg(
    w,
    h,
    '0 0 500 500',
    <>
      <defs>
        <PaintFilter id={fid} strength={5} />
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={gold} />
          <stop offset="0.5" stopColor={mix(gold, '#FFFFFF', 0.55)} />
          <stop offset="1" stopColor={gold} />
        </linearGradient>
      </defs>
      <circle cx={250} cy={250} r={R} fill="none" stroke={`url(#${gid})`} strokeWidth={4.5} />
      <circle cx={244} cy={256} r={R - 9} fill="none" stroke={gold} strokeWidth={1.6} opacity={0.85} />
      <circle cx={257} cy={246} r={R + 7} fill="none" stroke={gold} strokeWidth={1.1} opacity={0.6} />
      {[[60, 3], [150, 2.4], [320, 2.8]].map(([d, r]) => {
        const [x, y] = at(d!, R + 7);
        return <circle key={d} cx={x} cy={y} r={r} fill={gold} />;
      })}
      <g filter={`url(#${fid})`}>{spots.map(([d, sc, seed]) => bouquet(d!, sc! * k, seed!))}</g>
    </>,
  );
}

// ------------------------------------------------------------------ line art

export const LINE_FLOWERS = ['poppy', 'lily', 'rose', 'wild'] as const;

/** Fine single-colour botanical drawing (stem from bottom-left, bloom top-right). c = [ink]. */
export function LineFlower({ w, h, c, opts }: ArtProps) {
  const [ink = '#3B2A1A'] = c;
  const kind = String(opts?.kind ?? 'poppy');
  const sw = 2.2;
  const common = { fill: 'none', stroke: ink, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const leaves = (
    <>
      <path d="M40 390 C90 330 150 280 205 230" {...common} />
      <path d="M95 330 C60 300 40 260 55 225 C90 245 105 290 95 330 Z" {...common} />
      <path d="M75 312 C68 285 60 262 55 230" {...common} strokeWidth={1.2} />
      <path d="M140 285 C175 285 215 300 235 330 C195 335 160 318 140 285 Z" {...common} />
      <path d="M150 290 C180 300 205 312 230 328" {...common} strokeWidth={1.2} />
      <path d="M120 300 C110 260 120 220 145 200" {...common} />
      <path d="M145 200 C140 185 150 175 160 172 C162 185 155 196 145 200 Z" {...common} />
    </>
  );
  let bloom: ReactNode;
  if (kind === 'lily') {
    bloom = (
      <g transform="translate(250 175)">
        {[-70, -25, 20, 65, 110].map((a) => (
          <path key={a} d="M0 0 C18 -20 22 -60 0 -95 C-22 -60 -18 -20 0 0 Z" {...common} transform={`rotate(${a})`} />
        ))}
        {[-40, -10, 20].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d="M0 0 L0 -55" {...common} strokeWidth={1.2} />
            <ellipse cx={0} cy={-60} rx={4} ry={8} fill={ink} />
          </g>
        ))}
      </g>
    );
  } else if (kind === 'rose') {
    bloom = (
      <g transform="translate(255 170)">
        <path d="M0 0 C-30 -5 -50 -30 -40 -60 C-20 -85 25 -85 42 -58 C55 -30 35 -2 0 0 Z" {...common} />
        <path d="M-8 -20 C-25 -30 -22 -55 0 -60 C20 -62 30 -42 18 -28 C8 -18 -2 -30 4 -38" {...common} />
        <path d="M-40 -60 C-62 -40 -60 -5 -30 10 C0 22 40 15 55 -15 C62 -32 55 -50 42 -58" {...common} />
        <path d="M-30 10 C-25 30 0 40 20 30" {...common} />
      </g>
    );
  } else if (kind === 'wild') {
    bloom = (
      <g>
        {[
          [230, 190, 1],
          [285, 120, 0.8],
          [195, 120, 0.65],
        ].map(([x, y, s], i) => (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            {Array.from({ length: 8 }, (_, k) => (
              <path key={k} d="M0 0 C8 -10 8 -28 0 -36 C-8 -28 -8 -10 0 0 Z" {...common} transform={`rotate(${k * 45})`} />
            ))}
            <circle r={6} {...common} />
          </g>
        ))}
        <path d="M205 230 C240 200 270 160 285 120 M205 230 C200 190 198 150 195 120" {...common} />
      </g>
    );
  } else {
    bloom = (
      <g transform="translate(255 170)">
        <path d="M0 0 C-50 5 -78 -30 -62 -70 C-45 -100 -10 -96 0 -70 C10 -100 50 -102 66 -70 C80 -35 50 5 0 0 Z" {...common} />
        <path d="M-62 -70 C-40 -50 -20 -45 0 -48 C25 -45 45 -52 66 -70" {...common} />
        <path d="M0 -70 L0 -45" {...common} />
        <circle cx={0} cy={-34} r={12} {...common} />
        {[-24, -12, 0, 12, 24].map((dx) => (
          <line key={dx} x1={dx * 0.6} y1={-34} x2={dx} y2={-52} stroke={ink} strokeWidth={1.1} />
        ))}
        <path d="M30 -100 C40 -125 70 -130 80 -112 C70 -100 50 -98 30 -100 Z" {...common} transform="translate(-20 10)" />
      </g>
    );
  }
  return svg(w, h, '0 0 360 400', <>{leaves}{bloom}</>);
}
