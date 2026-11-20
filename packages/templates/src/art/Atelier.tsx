import type { ReactNode } from 'react';
import { rng, type ArtProps } from './Ornaments';
import { PaintFilter, useSvgId } from './svg-ids';

/**
 * Finishing pieces for the "Atelier" collection (Nov 2026), drawn after premium printed
 * invitation suites: watercolour butterflies, gold-leaf flecks, soft paint washes and
 * gold lace bands. All recolour from the element's colour slots.
 */

const svg = (w: number, h: number, vb: string, children: ReactNode, par = 'xMidYMid meet') => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio={par} style={{ display: 'block', overflow: 'visible' }}>
    {children}
  </svg>
);

function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return `#${x.map((v, i) => Math.round(v + (y[i]! - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------------ butterfly

/** Watercolour butterfly, wings slightly open. c = [wing, deep, body]. */
export function Butterfly({ w, h, c }: ArtProps) {
  const [wing = '#9A7FD1', deep = mix(wing, '#2A1A4A', 0.45), body = '#3B2A4A'] = c;
  const fid = useSvgId('bfly');
  const light = mix(wing, '#FFFFFF', 0.45);
  const upper = 'M100 78 C80 30 30 8 14 30 C2 50 26 82 60 90 C76 94 92 88 100 78 Z';
  const lower = 'M100 84 C80 92 44 104 46 128 C48 146 74 146 88 126 C96 114 100 98 100 84 Z';
  const half = (flip: boolean) => (
    <g transform={flip ? 'translate(200 0) scale(-1 1)' : undefined}>
      <path d={upper} fill={wing} opacity={0.85} />
      <path d="M100 78 C86 50 52 32 34 40 C48 56 74 74 100 78 Z" fill={light} opacity={0.6} />
      <path d={upper} fill="none" stroke={deep} strokeWidth={2.2} opacity={0.75} />
      <path d={lower} fill={mix(wing, deep, 0.25)} opacity={0.85} />
      <path d={lower} fill="none" stroke={deep} strokeWidth={2} opacity={0.7} />
      <circle cx={36} cy={44} r={7} fill={deep} opacity={0.55} />
      <circle cx={52} cy={70} r={5} fill={light} opacity={0.9} />
      <circle cx={70} cy={124} r={6} fill={deep} opacity={0.5} />
      <path d="M100 80 L40 42 M100 80 L50 84 M100 86 L64 128" stroke={deep} strokeWidth={1.2} opacity={0.4} />
    </g>
  );
  return svg(
    w,
    h,
    '0 0 200 160',
    <>
      <defs>
        <PaintFilter id={fid} strength={3} />
      </defs>
      <g filter={`url(#${fid})`}>
        {half(false)}
        {half(true)}
      </g>
      <ellipse cx={100} cy={92} rx={4.5} ry={30} fill={body} />
      <circle cx={100} cy={60} r={6} fill={body} />
      <path d="M98 56 C92 40 86 32 80 28 M102 56 C108 40 114 32 120 28" stroke={body} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    </>,
  );
}

// ------------------------------------------------------------------ gold flecks

/** Gold-leaf flecks and splatter clustered in a few drifts. c = [gold]; opts.seed. */
export function GoldDust({ w, h, c, opts }: ArtProps) {
  const [gold = '#C9973F'] = c;
  const r = rng(Number(opts?.seed ?? 5));
  const pale = mix(gold, '#FFFFFF', 0.45);
  const drifts = Array.from({ length: 4 }, () => ({ x: r() * w, y: r() * h }));
  const dots = Array.from({ length: 150 }, (_, i) => {
    const d = drifts[i % drifts.length]!;
    // Two uniforms → a roughly bell-shaped spread around the drift centre.
    const spread = Math.min(w, h) * 0.28;
    const dx = (r() + r() - 1) * spread * 1.6;
    const dy = (r() + r() - 1) * spread;
    const big = r() > 0.93;
    return { x: d.x + dx, y: d.y + dy, rad: big ? 3 + r() * 4 : 0.8 + r() * 2.2, o: 0.45 + r() * 0.55, fill: r() > 0.3 ? gold : pale };
  });
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.rad} fill={d.fill} opacity={d.o} />
      ))}
    </>,
    'none',
  );
}

// ------------------------------------------------------------------ watercolour wash

/** Soft, bleeding watercolour stain that fades to the box edges. c = [colour, second colour]; opts.seed. */
export function Wash({ w, h, c, opts }: ArtProps) {
  const [a = '#BFD7EA', b = mix(a, '#FFFFFF', 0.35)] = c;
  const seed = Number(opts?.seed ?? 3);
  const r = rng(seed);
  const fid = useSvgId('wash');
  const ga = useSvgId('washa');
  const gb = useSvgId('washb');
  const blobs = Array.from({ length: 6 }, (_, i) => ({
    cx: w * (0.25 + r() * 0.5),
    cy: h * (0.25 + r() * 0.5),
    rx: w * (0.22 + r() * 0.22),
    ry: h * (0.18 + r() * 0.22),
    rot: r() * 180,
    g: i % 2 ? gb : ga,
    o: 0.35 + r() * 0.35,
  }));
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      <defs>
        <filter id={fid} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={3} seed={seed} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={Math.min(w, h) * 0.12} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={Math.min(w, h) * 0.012} />
        </filter>
        <radialGradient id={ga}>
          <stop offset="0" stopColor={a} stopOpacity={0.9} />
          <stop offset="0.65" stopColor={a} stopOpacity={0.45} />
          <stop offset="1" stopColor={a} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={gb}>
          <stop offset="0" stopColor={b} stopOpacity={0.85} />
          <stop offset="0.7" stopColor={b} stopOpacity={0.35} />
          <stop offset="1" stopColor={b} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g filter={`url(#${fid})`}>
        {blobs.map((bl, i) => (
          <ellipse key={i} cx={bl.cx} cy={bl.cy} rx={bl.rx} ry={bl.ry} fill={`url(#${bl.g})`} opacity={bl.o} transform={`rotate(${bl.rot} ${bl.cx} ${bl.cy})`} />
        ))}
      </g>
    </>,
    'none',
  );
}

// ------------------------------------------------------------------ gold lace band

/**
 * Horizontal gold lace: a ruled edge with hanging scallops, lotus drops and beads
 * (top of the card; flip vertically for the bottom). c = [gold, pale gold].
 */
export function LaceBand({ w, h, c }: ArtProps) {
  const [gold = '#C9973F', pale = mix(gold, '#FFFFFF', 0.5)] = c;
  const gid = useSvgId('lace');
  const u = Math.max(40, h * 0.95);
  const n = Math.max(1, Math.round(w / u));
  const step = w / n;
  const edge = h * 0.12;
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={gold} />
          <stop offset="0.5" stopColor={pale} />
          <stop offset="1" stopColor={gold} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={edge} fill={`url(#${gid})`} />
      <rect x={0} y={edge + 4} width={w} height={2} fill={gold} opacity={0.8} />
      {Array.from({ length: n }, (_, i) => {
        const x = i * step;
        const m = x + step / 2;
        const top = edge + 8;
        const depth = h - top - 6;
        return (
          <g key={i}>
            {/* outer scallop */}
            <path d={`M${x} ${top} Q${m} ${top + depth * 1.25} ${x + step} ${top}`} fill="none" stroke={`url(#${gid})`} strokeWidth={Math.max(2, step * 0.05)} />
            {/* inner scallop + filigree */}
            <path d={`M${x + step * 0.16} ${top} Q${m} ${top + depth * 0.85} ${x + step * 0.84} ${top}`} fill="none" stroke={gold} strokeWidth={Math.max(1, step * 0.022)} opacity={0.8} />
            <path d={`M${m} ${top + depth * 0.18} c${step * 0.1} ${depth * 0.12} ${step * 0.1} ${depth * 0.3} 0 ${depth * 0.42} c${-step * 0.1} ${-depth * 0.12} ${-step * 0.1} ${-depth * 0.3} 0 ${-depth * 0.42} Z`} fill={gold} />
            <circle cx={m} cy={top + depth * 0.82} r={Math.max(2, step * 0.045)} fill={pale} stroke={gold} strokeWidth={1} />
            <circle cx={x} cy={top + 4} r={Math.max(2, step * 0.05)} fill={gold} />
            <path d={`M${m - step * 0.2} ${top + 4} l${step * 0.06} ${depth * 0.12} M${m + step * 0.2} ${top + 4} l${-step * 0.06} ${depth * 0.12}`} stroke={gold} strokeWidth={1.4} opacity={0.7} />
          </g>
        );
      })}
    </>,
    'none',
  );
}
