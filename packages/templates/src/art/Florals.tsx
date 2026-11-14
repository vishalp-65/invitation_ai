import type { FloralKind } from '@cardai/shared';
import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { PaintFilter, useSvgId } from './svg-ids';

/** Watercolour-style flowers drawn in a local unit space (radius 1 = one "flower size"). */

const COLORS = {
  marigold: ['#E8730C', '#F59E0B', '#FFC93C', '#B84A06'],
  rose: ['#C2334D', '#E0607A', '#F4A3B4', '#8E1B33'],
  lotus: ['#E57399', '#F6A9C2', '#FDE3EC', '#F2B705'],
  jasmine: ['#FFFFFF', '#FFF7E8', '#F4E4C1', '#E8B923'],
};
const LEAF = ['#4E7D3A', '#6E9F4F', '#2F5A26'];

function ruffle(r: number, bumps: number, depth: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= bumps * 2; i++) {
    const a = (Math.PI * i) / bumps;
    const rr = i % 2 ? r * (1 - depth) : r;
    pts.push(`${(Math.cos(a) * rr).toFixed(3)},${(Math.sin(a) * rr).toFixed(3)}`);
  }
  return `M${pts.join(' L')} Z`;
}

function Marigold({ x, y, s, rot = 0 }: { x: number; y: number; s: number; rot?: number }) {
  const [c1, c2, c3, c4] = COLORS.marigold;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d={ruffle(1, 18, 0.16)} fill={c1} />
      <path d={ruffle(0.78, 16, 0.18)} fill={c2} transform="rotate(10)" />
      <path d={ruffle(0.55, 14, 0.2)} fill={c3} transform="rotate(20)" />
      <path d={ruffle(0.32, 10, 0.22)} fill={c2} />
      <circle r={0.12} fill={c4} />
    </g>
  );
}

function Rose({ x, y, s, rot = 0 }: { x: number; y: number; s: number; rot?: number }) {
  const [c1, c2, c3, c4] = COLORS.rose;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <circle r={1} fill={c2} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0.55} cy={0} rx={0.55} ry={0.42} fill={c1} opacity={0.55} transform={`rotate(${a})`} />
      ))}
      <circle r={0.62} fill={c3} opacity={0.6} />
      <path d="M0.05 -0.05 C0.4 -0.1 0.45 0.35 0.05 0.4 C-0.4 0.45 -0.5 -0.15 -0.15 -0.45 C0.25 -0.75 0.75 -0.4 0.7 0.1" fill="none" stroke={c4} strokeWidth={0.07} strokeLinecap="round" />
    </g>
  );
}

function Lotus({ x, y, s, rot = 0 }: { x: number; y: number; s: number; rot?: number }) {
  const [c1, c2, c3, c4] = COLORS.lotus;
  const petal = 'M0 0 C0.35 -0.35 0.3 -0.85 0 -1.15 C-0.3 -0.85 -0.35 -0.35 0 0 Z';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {[-70, -35, 35, 70].map((a) => (
        <path key={a} d={petal} fill={c2} transform={`rotate(${a}) scale(0.9)`} />
      ))}
      {[-18, 18].map((a) => (
        <path key={a} d={petal} fill={c1} transform={`rotate(${a})`} />
      ))}
      <path d={petal} fill={c3} transform="scale(0.8 1)" />
      <ellipse cx={0} cy={-0.05} rx={0.28} ry={0.12} fill={c4} />
    </g>
  );
}

function Jasmine({ x, y, s, rot = 0 }: { x: number; y: number; s: number; rot?: number }) {
  const [c1, , c3, c4] = COLORS.jasmine;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx={0} cy={-0.55} rx={0.3} ry={0.55} fill={c1} stroke={c3} strokeWidth={0.04} transform={`rotate(${a})`} />
      ))}
      <circle r={0.16} fill={c4} />
    </g>
  );
}

function Leaf({ x, y, len, angle, shade = 0 }: { x: number; y: number; len: number; angle: number; shade?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${len})`}>
      <path d="M0 0 C0.3 -0.18 0.75 -0.2 1 0 C0.75 0.2 0.3 0.18 0 0 Z" fill={LEAF[shade % 3]} />
      <path d="M0.05 0 L0.92 0" stroke={LEAF[(shade + 1) % 3]} strokeWidth={0.03} />
    </g>
  );
}

function Bud({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return <ellipse cx={x} cy={y} rx={0.22 * s} ry={0.32 * s} fill={color} />;
}

const FLOWER = { marigold: Marigold, rose: Rose, lotus: Lotus, jasmine: Jasmine };

/**
 * A corner bouquet: hero flower + supporting blooms + leaves fanning outward.
 * Coordinates are in "corner space" (0,0 = the corner, growing into the card).
 */
function Cluster({ kind, unit }: { kind: Exclude<FloralKind, 'none'>; unit: number }) {
  const order: Array<keyof typeof FLOWER> =
    kind === 'mixed' ? ['rose', 'marigold', 'lotus', 'jasmine'] : [kind, kind, kind, 'jasmine'];
  const [A, B, C, D] = order.map((k) => FLOWER[k]) as [typeof Marigold, typeof Marigold, typeof Marigold, typeof Marigold];
  const u = unit;
  const leaves: ReactNode[] = [
    [2.6, 0.6, 2.4, -8, 0], [0.6, 2.6, 2.4, 98, 1], [2.1, 1.9, 2.0, 45, 2], [3.4, 1.6, 1.6, 15, 1], [1.6, 3.4, 1.6, 75, 0], [3.0, 0.1, 1.5, -25, 2], [0.1, 3.0, 1.5, 115, 2],
  ].map(([x, y, l, a, sh], i) => <Leaf key={i} x={x! * u} y={y! * u} len={l! * u} angle={a!} shade={sh!} />);
  return (
    <g>
      {leaves}
      <C x={2.6 * u} y={0.9 * u} s={0.75 * u} rot={20} />
      <C x={0.9 * u} y={2.6 * u} s={0.75 * u} rot={-15} />
      <B x={2.2 * u} y={2.2 * u} s={0.62 * u} rot={40} />
      <A x={1.05 * u} y={1.05 * u} s={1.25 * u} rot={10} />
      <D x={3.5 * u} y={0.5 * u} s={0.4 * u} />
      <D x={0.5 * u} y={3.5 * u} s={0.4 * u} />
      <Bud x={3.9 * u} y={1.2 * u} s={u} color={COLORS.marigold[2]!} />
      <Bud x={1.2 * u} y={3.9 * u} s={u} color={COLORS.rose[2]!} />
    </g>
  );
}

/** Full-card overlay of corner bouquets. */
export function FloralCorners({
  kind,
  placement,
  width,
  height,
  painted = true,
}: {
  kind: FloralKind;
  placement: 'diagonal' | 'bottom' | 'corners';
  width: number;
  height: number;
  painted?: boolean;
}) {
  const fid = useSvgId('fpaint');
  if (kind === 'none') return null;
  const u = width * (placement === 'corners' ? 0.045 : 0.06);
  const corners: Array<{ key: string; t: string }> = [];
  const tl = { key: 'tl', t: 'translate(0 0)' };
  const tr = { key: 'tr', t: `translate(${width} 0) scale(-1 1)` };
  const bl = { key: 'bl', t: `translate(0 ${height}) scale(1 -1)` };
  const br = { key: 'br', t: `translate(${width} ${height}) scale(-1 -1)` };
  if (placement === 'diagonal') corners.push(tr, bl);
  if (placement === 'bottom') corners.push(bl, br);
  if (placement === 'corners') corners.push(tl, tr, bl, br);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <PaintFilter id={fid} strength={u * 0.08} />
        </defs>
        <g filter={painted ? `url(#${fid})` : undefined}>
          {corners.map((c) => (
            <g key={c.key} transform={c.t}>
              <Cluster kind={kind} unit={u} />
            </g>
          ))}
        </g>
      </svg>
    </AbsoluteFill>
  );
}

export { Marigold, Rose, Lotus, Jasmine, Leaf };
