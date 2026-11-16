import type { ReactNode } from 'react';
import { loop, q, rnd } from './anim';

/** Drawing primitives for the placeholder painted scenes (viewBox 400×800, ground at y≈800). */

/** Round-topped arch opening, bottom-left at (x, y+h). */
export const roundArch = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`;

/** Pointed / cusped (Mughal) arch opening. */
export const pointedArch = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y + h}V${y + w * 0.62}Q${x} ${y + w * 0.12} ${x + w / 2} ${y}Q${x + w} ${y + w * 0.12} ${x + w} ${y + w * 0.62}V${y + h}Z`;

/** Onion dome sitting on (cx, y) with radius r, plus finial. */
export function Dome({ cx, y, r, fill, trim }: { cx: number; y: number; r: number; fill: string; trim: string }) {
  return (
    <g>
      <path d={`M${cx - r} ${y}C${cx - r * 1.15} ${y - r * 0.9} ${cx - r * 0.2} ${y - r * 1.1} ${cx} ${y - r * 1.55}C${cx + r * 0.2} ${y - r * 1.1} ${cx + r * 1.15} ${y - r * 0.9} ${cx + r} ${y}Z`} fill={fill} />
      <path d={`M${cx - r} ${y}C${cx - r * 1.15} ${y - r * 0.9} ${cx - r * 0.2} ${y - r * 1.1} ${cx} ${y - r * 1.55}`} stroke={trim} strokeWidth={1.2} fill="none" opacity={0.5} />
      <line x1={cx} y1={y - r * 1.55} x2={cx} y2={y - r * 1.95} stroke={trim} strokeWidth={2} />
      <circle cx={cx} cy={y - r * 1.75} r={r * 0.08 + 1} fill={trim} />
      <rect x={cx - r * 1.05} y={y - 2} width={r * 2.1} height={5} rx={2} fill={trim} />
    </g>
  );
}

/** Rajasthani chhatri: plinth, four pillars, dome. (cx, y) = base centre. */
export function Chhatri({ cx, y, w, fill, shade, trim }: { cx: number; y: number; w: number; fill: string; shade: string; trim: string }) {
  const h = w * 0.7;
  return (
    <g>
      <rect x={cx - w / 2 - 4} y={y - 6} width={w + 8} height={6} fill={trim} />
      <rect x={cx - w / 2} y={y - h} width={w} height={h} fill={shade} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={roundArch(cx - w / 2 + 4 + i * ((w - 8) / 3), y - h + 8, (w - 8) / 3 - 4, h - 14)} fill={fill} opacity={0.35} />
      ))}
      <path d={`M${cx - w / 2 - 8} ${y - h}L${cx + w / 2 + 8} ${y - h}L${cx + w / 2} ${y - h - 6}L${cx - w / 2} ${y - h - 6}Z`} fill={trim} />
      <Dome cx={cx} y={y - h - 6} r={w / 2} fill={fill} trim={trim} />
    </g>
  );
}

/** Row of n identical arches across [x, x+w]. */
export function ArchRow({ x, y, w, h, n, fill, pointed = false, gap = 0.18 }: { x: number; y: number; w: number; h: number; n: number; fill: string; pointed?: boolean; gap?: number }) {
  const cell = w / n;
  const aw = cell * (1 - gap);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <path key={i} d={(pointed ? pointedArch : roundArch)(x + i * cell + (cell - aw) / 2, y, aw, h)} fill={fill} />
      ))}
    </g>
  );
}

/** Battlement edge along the top of a wall. */
export function Crenels({ x, y, w, size, fill }: { x: number; y: number; w: number; size: number; fill: string }) {
  const n = Math.floor(w / (size * 2));
  return (
    <g>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * size * 2 + size / 2} y={y - size} width={size} height={size} fill={fill} />
      ))}
    </g>
  );
}

/** Jharokha balcony (projecting window with small arches and a canopy). */
export function Jharokha({ cx, y, w, fill, shade, trim }: { cx: number; y: number; w: number; fill: string; shade: string; trim: string }) {
  const h = w * 0.55;
  return (
    <g>
      <path d={`M${cx - w / 2 - 6} ${y}h${w + 12}l-8 10h${-(w - 4)}z`} fill={trim} />
      <rect x={cx - w / 2} y={y - h} width={w} height={h} fill={fill} />
      <ArchRow x={cx - w / 2 + 3} y={y - h + 6} w={w - 6} h={h - 8} n={3} fill={shade} />
      <path d={`M${cx - w / 2 - 8} ${y - h}Q${cx} ${y - h - w * 0.45} ${cx + w / 2 + 8} ${y - h}Z`} fill={trim} />
    </g>
  );
}

export function Palm({ x, y, s, color, time, phase = 0 }: { x: number; y: number; s: number; color: string; time?: number; phase?: number }) {
  const m = loop('sway', time, phase, 1.4);
  return (
    <g className={m.className} style={m.style}>
      <path d={`M${x} ${y}C${x + 6 * s} ${y - 60 * s} ${x - 4 * s} ${y - 120 * s} ${x + 8 * s} ${y - 170 * s}`} stroke={color} strokeWidth={7 * s} fill="none" strokeLinecap="round" />
      {[-70, -35, 0, 35, 70, 110, -110].map((a, i) => {
        const rad = ((a - 90) * Math.PI) / 180;
        const tx = q(x + 8 * s + Math.cos(rad) * 70 * s);
        const ty = q(y - 170 * s + Math.sin(rad) * 40 * s + 22 * s);
        return <path key={i} d={`M${x + 8 * s} ${y - 170 * s}Q${(x + 8 * s + tx) / 2} ${y - 200 * s} ${tx} ${ty}`} stroke={color} strokeWidth={9 * s} fill="none" strokeLinecap="round" />;
      })}
    </g>
  );
}

export function Cypress({ x, y, h, color }: { x: number; y: number; h: number; color: string }) {
  return <path d={`M${x} ${y}C${x - h * 0.16} ${y - h * 0.4} ${x - h * 0.08} ${y - h * 0.85} ${x} ${y - h}C${x + h * 0.08} ${y - h * 0.85} ${x + h * 0.16} ${y - h * 0.4} ${x} ${y}Z`} fill={color} />;
}

export function Tree({ x, y, r, color, trunk }: { x: number; y: number; r: number; color: string; trunk: string }) {
  return (
    <g>
      <rect x={x - r * 0.08} y={y - r * 0.9} width={r * 0.16} height={r * 0.9} fill={trunk} />
      <circle cx={x} cy={y - r * 1.2} r={r * 0.75} fill={color} />
      <circle cx={x - r * 0.5} cy={y - r * 0.95} r={r * 0.5} fill={color} />
      <circle cx={x + r * 0.5} cy={y - r * 0.95} r={r * 0.55} fill={color} />
    </g>
  );
}

/** Soft rolling hills band. */
export function Hills({ y, amp, color, seed = 1, opacity = 1 }: { y: number; amp: number; color: string; seed?: number; opacity?: number }) {
  const pts = Array.from({ length: 6 }, (_, i) => [i * 80, y - rnd(i, seed) * amp] as const);
  let d = `M-20 800L-20 ${pts[0]![1]}`;
  for (let i = 0; i < pts.length; i++) {
    const [px, py] = pts[i]!;
    const [nx, ny] = pts[i + 1] ?? [420, y - amp * 0.4];
    d += `Q${px + 40} ${py - amp * 0.4} ${(px + nx) / 2 + 20} ${(py + ny) / 2}`;
  }
  d += 'L420 800Z';
  return <path d={d} fill={color} opacity={opacity} />;
}

/** Five-petal flower. */
export function Flower({ x, y, r, color, center }: { x: number; y: number; r: number; color: string; center: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => {
        const rad = (a * Math.PI) / 180;
        const ex = q(x + Math.cos(rad) * r * 0.55);
        const ey = q(y + Math.sin(rad) * r * 0.55);
        return <ellipse key={a} cx={ex} cy={ey} rx={q(r * 0.5)} ry={q(r * 0.36)} transform={`rotate(${a} ${ex} ${ey})`} fill={color} />;
      })}
      <circle cx={x} cy={y} r={r * 0.28} fill={center} />
    </g>
  );
}

/** Watercolour-ish rose: layered petals + spiral. */
export function Rose({ x: x0, y: y0, r: r0, color, light }: { x: number; y: number; r: number; color: string; light: string }) {
  const [x, y, r] = [q(x0), q(y0), q(r0)];
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={color} />
      <circle cx={x - r * 0.15} cy={y - r * 0.12} r={r * 0.72} fill={light} opacity={0.35} />
      <path d={`M${x - r * 0.5} ${y}a${r * 0.5} ${r * 0.45} 0 1 1 ${r * 0.6} ${r * 0.4}a${r * 0.32} ${r * 0.3} 0 1 1 ${-r * 0.1} ${-r * 0.55}`} stroke={light} strokeWidth={r * 0.1} fill="none" opacity={0.7} />
    </g>
  );
}

export function Marigold({ x, y, r, color, dark }: { x: number; y: number; r: number; color: string; dark: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={dark} />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <circle key={i} cx={q(x + Math.cos(a) * r * 0.62)} cy={q(y + Math.sin(a) * r * 0.62)} r={q(r * 0.42)} fill={color} />;
      })}
      <circle cx={x} cy={y} r={r * 0.4} fill={color} />
    </g>
  );
}

export function Leaf({ x, y, len, angle, color }: { x: number; y: number; len: number; angle: number; color: string }) {
  const [cx, cy, a] = [q(x), q(y), q(angle)];
  return <ellipse cx={cx} cy={cy} rx={q(len / 2)} ry={q(len / 6)} fill={color} transform={`rotate(${a} ${cx} ${cy})`} />;
}

/** A cluster of flowers with leaves (corner bouquets). */
export function Bouquet({ x, y, s, colors, leaf, kind = 'rose', seed = 0 }: { x: number; y: number; s: number; colors: string[]; leaf: string; kind?: 'rose' | 'flower' | 'marigold'; seed?: number }) {
  const items: ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const a = rnd(i, seed) * Math.PI * 2;
    const d = rnd(i, seed + 3) * 34 * s;
    items.push(<Leaf key={`l${i}`} x={x + Math.cos(a) * (d + 14 * s)} y={y + Math.sin(a) * (d + 10 * s)} len={30 * s} angle={(a * 180) / Math.PI} color={leaf} />);
  }
  for (let i = 0; i < 7; i++) {
    const a = rnd(i, seed + 7) * Math.PI * 2;
    const d = rnd(i, seed + 9) * 26 * s;
    const r = (10 + rnd(i, seed + 11) * 10) * s;
    const c = colors[i % colors.length]!;
    const cx = q(x + Math.cos(a) * d);
    const cy = q(y + Math.sin(a) * d);
    items.push(
      kind === 'rose' ? (
        <Rose key={`f${i}`} x={cx} y={cy} r={r} color={c} light="#FFFFFF" />
      ) : kind === 'marigold' ? (
        <Marigold key={`f${i}`} x={cx} y={cy} r={r * 0.8} color={c} dark={colors[(i + 1) % colors.length]!} />
      ) : (
        <Flower key={`f${i}`} x={cx} y={cy} r={r} color={c} center={colors[(i + 1) % colors.length]!} />
      ),
    );
  }
  return <g>{items}</g>;
}

/** Hanging string of marigolds (genda garland) from (x, y). */
export function Garland({ x, y, len, color, dark, time, phase = 0 }: { x: number; y: number; len: number; color: string; dark: string; time?: number; phase?: number }) {
  const m = loop('sway', time, phase, 0.8);
  const n = Math.floor(len / 13);
  return (
    <g className={m.className} style={{ ...m.style, transformOrigin: '50% 0%' }}>
      <line x1={x} y1={y} x2={x} y2={y + len} stroke={dark} strokeWidth={1} />
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={x} cy={y + 8 + i * 13} r={6.5} fill={i % 3 === 2 ? dark : color} />
      ))}
    </g>
  );
}

/** Toran: swag of leaves and bells across the top. */
export function Toran({ y, color, leaf, bell }: { y: number; color: string; leaf: string; bell: string }) {
  return (
    <g>
      <path d={`M-10 ${y}Q100 ${y + 26} 200 ${y + 8}Q300 ${y + 26} 410 ${y}`} stroke={color} strokeWidth={5} fill="none" />
      {Array.from({ length: 15 }, (_, i) => {
        const x = 10 + i * 27;
        const sag = q(Math.sin((x / 200) * Math.PI) * 14);
        return (
          <g key={i}>
            <path d={`M${x} ${y + sag}q-7 18 0 30q7 -12 0 -30z`} fill={leaf} />
            {i % 2 === 0 && <circle cx={x + 13} cy={y + sag + 22} r={4} fill={bell} />}
          </g>
        );
      })}
    </g>
  );
}

/** Brass lamp stand (deepam) with a flame. Decorative, not a sacred mark. */
export function LampStand({ x, y, h, brass, flame, time, phase = 0 }: { x: number; y: number; h: number; brass: string; flame: string; time?: number; phase?: number }) {
  const m = loop('flicker', time, phase);
  return (
    <g>
      <path d={`M${x - h * 0.18} ${y}h${h * 0.36}l-${h * 0.1} -${h * 0.08}h-${h * 0.16}z`} fill={brass} />
      <rect x={x - h * 0.03} y={y - h * 0.85} width={h * 0.06} height={h * 0.78} fill={brass} />
      {[0.3, 0.55, 0.8].map((t) => (
        <ellipse key={t} cx={x} cy={y - h * t} rx={h * (0.2 - t * 0.12)} ry={h * 0.025} fill={brass} />
      ))}
      <path d={`M${x - h * 0.1} ${y - h * 0.85}q${h * 0.1} ${h * 0.08} ${h * 0.2} 0z`} fill={brass} />
      <g className={m.className} style={m.style}>
        <circle cx={x} cy={y - h * 0.95} r={h * 0.12} fill={flame} opacity={0.25} />
        <path d={`M${x} ${y - h * 1.02}q${h * 0.04} ${h * 0.07} 0 ${h * 0.12}q-${h * 0.04} -${h * 0.05} 0 -${h * 0.12}z`} fill={flame} />
      </g>
    </g>
  );
}

export function Swan({ x, y, s, flip = false, color = '#FFFFFF', beak = '#E08A3C' }: { x: number; y: number; s: number; flip?: boolean; color?: string; beak?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M-30 0C-28 -14 -10 -18 8 -12C16 -10 22 -6 26 0Z" fill={color} />
      <path d="M8 -12C2 -26 6 -44 16 -46C24 -47 26 -40 22 -36C18 -32 14 -30 14 -14" stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" />
      <path d="M22 -42l8 3l-8 2z" fill={beak} />
      <path d="M-24 -4C-14 -12 0 -12 6 -6" stroke="#000" strokeOpacity={0.12} strokeWidth={1.5} fill="none" />
    </g>
  );
}

export function Boat({ x, y, s, color, sail }: { x: number; y: number; s: number; color: string; sail: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-40 0Q0 18 40 0Q34 10 0 12Q-34 10 -40 0Z" fill={color} />
      <path d="M-24 0Q0 -22 24 0Z" fill={sail} />
      <line x1={0} y1={0} x2={0} y2={-40} stroke={color} strokeWidth={2} />
      <path d="M0 -40L22 -14H0Z" fill={sail} opacity={0.9} />
    </g>
  );
}

/** Stylised peacock (decorative). */
export function Peacock({ x, y, s, body, tail, eye }: { x: number; y: number; s: number; body: string; tail: string; eye: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (-160 + i * 17.5) * (Math.PI / 180);
        const ex = q(Math.cos(a) * 70);
        const ey = q(Math.sin(a) * 70);
        return (
          <g key={i}>
            <path d={`M0 0Q${ex * 0.5} ${ey * 0.5 - 6} ${ex} ${ey}`} stroke={tail} strokeWidth={10} fill="none" strokeLinecap="round" />
            <ellipse cx={ex} cy={ey} rx={7} ry={9} fill={eye} />
            <circle cx={ex} cy={ey} r={3} fill={body} />
          </g>
        );
      })}
      <path d="M-6 6C-10 -10 -4 -26 4 -30C10 -32 12 -26 8 -22C4 -16 6 -4 10 6Z" fill={body} />
      <circle cx={6} cy={-30} r={4} fill={body} />
      <path d="M9 -31l7 2l-7 2z" fill={eye} />
    </g>
  );
}

/** Hanging lantern on a chain (Mughal / Moroccan style). */
export function HangingLantern({ x, y, len, metal, glow, time, phase = 0 }: { x: number; y: number; len: number; metal: string; glow: string; time?: number; phase?: number }) {
  const m = loop('sway', time, phase, 0.6);
  const f = loop('flicker', time, phase);
  return (
    <g className={m.className} style={{ ...m.style, transformOrigin: '50% 0%' }}>
      <line x1={x} y1={y} x2={x} y2={y + len} stroke={metal} strokeWidth={1.2} />
      <g className={f.className} style={f.style}>
        <circle cx={x} cy={y + len + 14} r={18} fill={glow} opacity={0.22} />
      </g>
      <path d={`M${x - 7} ${y + len + 2}h14l5 10l-5 16h-14l-5 -16z`} fill={glow} stroke={metal} strokeWidth={1.5} />
      <path d={`M${x - 5} ${y + len}h10l-2 -5h-6z`} fill={metal} />
      <path d={`M${x} ${y + len + 28}v6`} stroke={metal} strokeWidth={1.5} />
    </g>
  );
}

/** Water band with shimmering highlight lines. */
export function Water({ y, color, glint, time }: { y: number; color: string; glint: string; time?: number }) {
  return (
    <g>
      <rect x={-20} y={y} width={440} height={820 - y} fill={color} />
      {[0, 1].map((g) => {
        const m = loop('shimmer', time, g * 0.5);
        return (
          <g key={g} className={m.className} style={m.style}>
            {[0, 1, 2, 3].map((k) => {
              const i = k * 2 + g;
              const yy = q(y + 14 + i * ((800 - y) / 8));
              return <rect key={i} x={q(40 + rnd(i, 5) * 260)} y={yy} width={q(40 + rnd(i, 6) * 60)} height={2} rx={1} fill={glint} />;
            })}
          </g>
        );
      })}
    </g>
  );
}

/** Dotted bandhani pattern band (rows of small dot-rings). */
export function BandhaniBand({ y, h, bg, dot }: { y: number; h: number; bg: string; dot: string }) {
  const rows = Math.floor(h / 16);
  return (
    <g>
      <rect x={-10} y={y} width={420} height={h} fill={bg} />
      {Array.from({ length: rows * 26 }, (_, i) => {
        const r = Math.floor(i / 26);
        const c = i % 26;
        return <circle key={i} cx={c * 16 + (r % 2 ? 8 : 0)} cy={y + 8 + r * 16} r={2.2} fill="none" stroke={dot} strokeWidth={1.4} />;
      })}
    </g>
  );
}

/** Phulkari-style geometric flower border. */
export function PhulkariBand({ y, h, bg, colors }: { y: number; h: number; bg: string; colors: string[] }) {
  return (
    <g>
      <rect x={-10} y={y} width={420} height={h} fill={bg} />
      {Array.from({ length: 11 }, (_, i) => {
        const cx = i * 40 + 10;
        const cy = y + h / 2;
        const r = h * 0.36;
        return (
          <g key={i}>
            <path d={`M${cx} ${cy - r}L${cx + r} ${cy}L${cx} ${cy + r}L${cx - r} ${cy}Z`} fill={colors[i % colors.length]} />
            <path d={`M${cx} ${cy - r * 0.5}L${cx + r * 0.5} ${cy}L${cx} ${cy + r * 0.5}L${cx - r * 0.5} ${cy}Z`} fill={colors[(i + 1) % colors.length]} />
          </g>
        );
      })}
    </g>
  );
}
