import type { ReactNode } from 'react';
import { rng, type ArtProps } from './Ornaments';
import { useSvgId } from './svg-ids';

/**
 * Party pieces for the birthday / celebration suites (Nov 2026): glossy balloons, gift boxes
 * with satin bows, pennant bunting and curly streamers. Recolourable from the colour slots.
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

// ------------------------------------------------------------------ glossy balloons

/** Arrangements in a 300 × 420 box: [cx, cy, rx] per balloon; strings meet at the bottom. */
const BUNCHES: Record<string, Array<[number, number, number]>> = {
  pair: [[110, 120, 70], [195, 150, 66]],
  trio: [[150, 95, 70], [85, 175, 64], [215, 185, 62]],
  cluster: [[150, 80, 62], [80, 150, 60], [222, 150, 60], [125, 215, 58], [195, 235, 56]],
  single: [[150, 140, 96]],
};

/**
 * Glossy (latex or metallic foil) balloons on curling strings.
 * c = [balloon, second balloon, string]; opts.bunch = single | pair | trio | cluster; opts.metal for foil shine.
 */
export function GlossyBalloons({ w, h, c, opts }: ArtProps) {
  const [a = '#5FA8D3', b = mix(a, '#FFFFFF', 0.3), string = mix(a, '#666666', 0.5)] = c;
  const bunch = BUNCHES[String(opts?.bunch ?? 'trio')] ?? BUNCHES.trio!;
  const metal = Boolean(opts?.metal);
  const id = useSvgId('gbal');
  const tie = { x: 150, y: 405 };
  return svg(
    w,
    h,
    '0 0 300 420',
    <>
      <defs>
        {[a, b].map((col, i) => (
          <radialGradient key={i} id={`${id}${i}`} cx="0.36" cy="0.3" r="0.75">
            <stop offset="0" stopColor={mix(col, '#FFFFFF', metal ? 0.85 : 0.6)} />
            <stop offset={metal ? 0.22 : 0.3} stopColor={mix(col, '#FFFFFF', metal ? 0.25 : 0.12)} />
            <stop offset="0.75" stopColor={col} />
            <stop offset="1" stopColor={mix(col, '#000000', metal ? 0.45 : 0.28)} />
          </radialGradient>
        ))}
      </defs>
      {bunch.map(([cx, cy, rx], i) => {
        const ry = rx * 1.18;
        const bottom = cy + ry;
        return <path key={`s${i}`} d={`M${cx} ${bottom + 8} C${cx + (i % 2 ? 18 : -18)} ${bottom + 70} ${tie.x + (i % 2 ? -14 : 14)} ${tie.y - 90} ${tie.x} ${tie.y}`} stroke={string} strokeWidth={1.6} fill="none" opacity={0.85} />;
      })}
      {bunch.map(([cx, cy, rx], i) => {
        const ry = rx * 1.18;
        const g = `url(#${id}${i % 2})`;
        const col = i % 2 ? b : a;
        return (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={g} />
            <path d={`M${cx - 7} ${cy + ry + 9} L${cx} ${cy + ry - 2} L${cx + 7} ${cy + ry + 9} Z`} fill={mix(col, '#000000', 0.2)} />
            <ellipse cx={cx - rx * 0.36} cy={cy - ry * 0.42} rx={rx * 0.16} ry={ry * 0.24} fill="#FFFFFF" opacity={metal ? 0.75 : 0.55} transform={`rotate(-28 ${cx - rx * 0.36} ${cy - ry * 0.42})`} />
            {metal && <path d={`M${cx + rx * 0.5} ${cy + ry * 0.2} Q${cx + rx * 0.62} ${cy - ry * 0.1} ${cx + rx * 0.45} ${cy - ry * 0.45}`} stroke="#FFFFFF" strokeWidth={4} fill="none" opacity={0.35} strokeLinecap="round" />}
          </g>
        );
      })}
    </>,
  );
}

// ------------------------------------------------------------------ gift boxes

/** A row of three wrapped gifts with big satin bows (bottom of a card). c = [box, ribbon, box 2]. */
export function GiftBoxes({ w, h, c }: ArtProps) {
  const [box = '#F4EEE6', ribbon = '#3D97B8', box2 = mix(box, ribbon, 0.12)] = c;
  const id = useSvgId('gift');
  const shade = mix(ribbon, '#000000', 0.25);
  const light = mix(ribbon, '#FFFFFF', 0.35);
  const gift = (x: number, bw: number, bh: number, fill: string, key: string) => {
    const top = 360 - bh;
    const cx = x + bw / 2;
    const loop = bw * 0.36;
    return (
      <g key={key}>
        <rect x={x} y={top + 26} width={bw} height={bh - 26} fill={fill} />
        <rect x={x} y={top + 26} width={bw} height={bh - 26} fill={`url(#${id}s)`} />
        <rect x={x - 10} y={top} width={bw + 20} height={34} rx={4} fill={mix(fill, '#FFFFFF', 0.25)} />
        <rect x={cx - bw * 0.08} y={top} width={bw * 0.16} height={bh} fill={ribbon} />
        <rect x={cx - bw * 0.08} y={top} width={bw * 0.05} height={bh} fill={light} opacity={0.6} />
        {/* bow */}
        <path d={`M${cx} ${top + 4} C${cx - loop * 1.4} ${top - loop * 0.9} ${cx - loop * 1.6} ${top + loop * 0.15} ${cx} ${top + 4} Z`} fill={ribbon} />
        <path d={`M${cx} ${top + 4} C${cx + loop * 1.4} ${top - loop * 0.9} ${cx + loop * 1.6} ${top + loop * 0.15} ${cx} ${top + 4} Z`} fill={ribbon} />
        <path d={`M${cx} ${top + 4} C${cx - loop * 0.9} ${top - loop * 1.25} ${cx + loop * 0.2} ${top - loop * 1.1} ${cx} ${top + 4} Z`} fill={light} />
        <path d={`M${cx} ${top + 4} C${cx + loop * 0.9} ${top - loop * 1.25} ${cx - loop * 0.2} ${top - loop * 1.1} ${cx} ${top + 4} Z`} fill={shade} opacity={0.75} />
        <path d={`M${cx - 6} ${top + 10} L${cx - loop * 0.7} ${top + loop * 0.9} L${cx - loop * 0.45} ${top + loop * 0.8} Z M${cx + 6} ${top + 10} L${cx + loop * 0.7} ${top + loop * 0.9} L${cx + loop * 0.45} ${top + loop * 0.8} Z`} fill={shade} />
        <circle cx={cx} cy={top + 6} r={loop * 0.16} fill={shade} />
      </g>
    );
  };
  return svg(
    w,
    h,
    '0 0 1080 360',
    <>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000000" stopOpacity={0.08} />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.08} />
          <stop offset="1" stopColor="#000000" stopOpacity={0.14} />
        </linearGradient>
      </defs>
      {gift(-30, 330, 220, box2, 'l')}
      {gift(760, 340, 230, box2, 'r')}
      {gift(330, 420, 260, box, 'm')}
    </>,
    'xMidYMax meet',
  );
}

// ------------------------------------------------------------------ bunting

/**
 * Pennant bunting in swags across the top of a card. c = [flag, second flag, string];
 * opts.swags = 1–3 rows; opts.style = pennant (triangles) | banner (swallowtail flags).
 */
export function Bunting({ w, h, c, opts }: ArtProps) {
  const [f1 = '#3D97B8', f2 = mix(f1, '#FFFFFF', 0.3), string = mix(f1, '#333333', 0.4)] = c;
  const swags = Math.max(1, Math.min(3, Number(opts?.swags ?? 2)));
  const banner = opts?.style === 'banner';
  const els: ReactNode[] = [];
  const span = w / swags;
  for (let s = 0; s < swags; s++) {
    const x0 = s * span;
    const x1 = x0 + span;
    const y0 = h * 0.06;
    const sag = h * (banner ? 0.28 : 0.42);
    const pt = (t: number) => ({ x: x0 + (x1 - x0) * t, y: y0 + 4 * sag * t * (1 - t) });
    els.push(<path key={`str${s}`} d={`M${x0} ${y0} Q${(x0 + x1) / 2} ${y0 + 2 * sag} ${x1} ${y0}`} stroke={string} strokeWidth={Math.max(1.5, h * 0.012)} fill="none" />);
    const n = banner ? 3 : 7;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const p = pt(t);
      const fw = (span / n) * (banner ? 0.8 : 0.82);
      const fh = banner ? h * 0.52 : h * 0.42;
      // Flags hang plumb, slightly tilted with the string.
      const slope = (4 * sag * (1 - 2 * t)) / (x1 - x0);
      const rot = (Math.atan(slope) * 180) / Math.PI * 0.6;
      const fill = (i + s) % 2 ? f2 : f1;
      els.push(
        <g key={`f${s}-${i}`} transform={`translate(${p.x} ${p.y}) rotate(${rot})`}>
          {banner ? (
            <path d={`M${-fw / 2} 0 H${fw / 2} V${fh} L0 ${fh * 0.78} L${-fw / 2} ${fh} Z`} fill={fill} />
          ) : (
            <path d={`M${-fw / 2} 0 H${fw / 2} L0 ${fh} Z`} fill={fill} />
          )}
          <path d={`M${-fw / 2} 0 H${fw / 2}`} stroke={mix(fill, '#000000', 0.2)} strokeWidth={3} />
        </g>,
      );
    }
  }
  return svg(w, h, `0 0 ${w} ${h}`, <>{els}</>, 'none');
}

// ------------------------------------------------------------------ streamers

/** Curly foil streamers drifting down. c = [foil, highlight]; opts.seed. */
export function Streamers({ w, h, c, opts }: ArtProps) {
  const [foil = '#D4A63A', hi = mix(foil, '#FFFFFF', 0.55)] = c;
  const r = rng(Number(opts?.seed ?? 3));
  const id = useSvgId('strm');
  const pieces = Array.from({ length: 6 }, (_, i) => {
    const x = (0.08 + r() * 0.84) * w;
    const y = (0.05 + r() * 0.75) * h;
    const len = Math.min(w, h) * (0.16 + r() * 0.14);
    const amp = len * 0.13;
    const turns = 3 + Math.floor(r() * 2);
    let d = `M0 0`;
    for (let k = 1; k <= turns * 2; k++) d += ` Q${(k % 2 ? 1 : -1) * amp * 2} ${(len / (turns * 2)) * (k - 0.5)} 0 ${(len / (turns * 2)) * k}`;
    return { x, y, d, rot: -30 + r() * 60, wdt: Math.max(3, len * 0.045), key: i };
  });
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={foil} />
          <stop offset="0.45" stopColor={hi} />
          <stop offset="1" stopColor={foil} />
        </linearGradient>
      </defs>
      {pieces.map((p) => (
        <path key={p.key} d={p.d} transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} stroke={`url(#${id})`} strokeWidth={p.wdt} fill="none" strokeLinecap="round" />
      ))}
    </>,
    'none',
  );
}
