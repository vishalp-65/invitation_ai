import type { ReactNode } from 'react';
import { useSvgId } from './svg-ids';

/**
 * Vector ornaments for the layered designs: borders, corners, dividers, arches, sparkles,
 * confetti, wreaths, botanical sprigs, rings, ribbon, gift, skyline, lanterns, clouds, rainbow.
 * Each takes the element box (w, h) and its colour slots `c`.
 */
export interface ArtProps {
  w: number;
  h: number;
  c: string[];
  opts?: Record<string, string | number | boolean>;
}

/** Deterministic PRNG so scatters look the same in editor, stills and every video frame. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const svg = (w: number, h: number, vb: string, children: ReactNode, par = 'xMidYMid meet') => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio={par} style={{ display: 'block', overflow: 'visible' }}>
    {children}
  </svg>
);

function GoldGrad({ id, c }: { id: string; c: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={c} />
      <stop offset="0.5" stopColor="#FFF1C1" stopOpacity={0.9} />
      <stop offset="1" stopColor={c} />
    </linearGradient>
  );
}

// ------------------------------------------------------------------ borders

export function Border({ w, h, c, opts }: ArtProps) {
  const [a = '#C9973F', b = a, third = a] = c;
  const style = String(opts?.style ?? 'double');
  const gid = useSvgId('bord');
  const g = `url(#${gid})`;
  let body: ReactNode;

  if (style === 'temple') {
    const spires = (y: number, flip: boolean) => {
      const n = 13;
      const step = (w - 140) / n;
      return Array.from({ length: n }, (_, i) => {
        const x = 70 + i * step;
        const d = flip
          ? `M${x} ${y} l${step / 2} ${26} l${step / 2} ${-26}`
          : `M${x} ${y} l${step / 2} ${-26} l${step / 2} ${26}`;
        return <path key={`${y}-${i}`} d={d} fill="none" stroke={b} strokeWidth={2.4} />;
      });
    };
    body = (
      <>
        <rect x={40} y={40} width={w - 80} height={h - 80} fill="none" stroke={g} strokeWidth={6} />
        <rect x={56} y={56} width={w - 112} height={h - 112} fill="none" stroke={a} strokeWidth={1.5} strokeDasharray="2 7" />
        {spires(98, false)}
        {spires(h - 98, true)}
        {[
          [70, 70],
          [w - 70, 70],
          [70, h - 70],
          [w - 70, h - 70],
        ].map(([x, y], i) => (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle r={13} fill={g} />
            <circle r={5} fill={b} />
          </g>
        ))}
      </>
    );
  } else if (style === 'paithani') {
    const t = 30;
    const diamonds: ReactNode[] = [];
    const along = (len: number, fn: (p: number) => [number, number]) => {
      const n = Math.floor(len / 52);
      for (let i = 0; i <= n; i++) {
        const [x, y] = fn(i / n);
        diamonds.push(<path key={`${x}-${y}`} d={`M${x} ${y - 9} l9 9 l-9 9 l-9 -9 Z`} fill={b} />);
      }
    };
    along(w - 120, (p) => [60 + p * (w - 120), 30 + t / 2]);
    along(w - 120, (p) => [60 + p * (w - 120), h - 30 - t / 2]);
    along(h - 120, (p) => [30 + t / 2, 60 + p * (h - 120)]);
    along(h - 120, (p) => [w - 30 - t / 2, 60 + p * (h - 120)]);
    body = (
      <>
        <path d={`M0 0 H${w} V${h} H0 Z M${30 + t} ${30 + t} V${h - 30 - t} H${w - 30 - t} V${30 + t} Z`} fill={g} fillRule="evenodd" opacity={0.95} />
        <rect x={30} y={30} width={w - 60} height={h - 60} fill="none" stroke={third} strokeWidth={2} opacity={0.6} />
        {diamonds}
        <rect x={30 + t + 12} y={30 + t + 12} width={w - 2 * (30 + t + 12)} height={h - 2 * (30 + t + 12)} fill="none" stroke={a} strokeWidth={2} />
      </>
    );
  } else if (style === 'phulkari') {
    const flowers: ReactNode[] = [];
    const cols = [a, b, third];
    const star = (x: number, y: number, k: number) => (
      <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
        <path d="M0 -20 L6 -6 L20 0 L6 6 L0 20 L-6 6 L-20 0 L-6 -6 Z" fill={cols[k % 3]} />
        <path d="M0 -10 L10 0 L0 10 L-10 0 Z" fill="#FFFFFF" opacity={0.7} transform="rotate(45)" />
      </g>
    );
    let k = 0;
    for (let x = 60; x <= w - 60; x += 56) {
      flowers.push(star(x, 52, k++));
      flowers.push(star(x, h - 52, k++));
    }
    for (let y = 108; y <= h - 108; y += 56) {
      flowers.push(star(52, y, k++));
      flowers.push(star(w - 52, y, k++));
    }
    body = (
      <>
        {flowers}
        <rect x={92} y={92} width={w - 184} height={h - 184} fill="none" stroke={a} strokeWidth={3} />
      </>
    );
  } else if (style === 'deco') {
    const fan = (cx: number, cy: number, flip: boolean) => (
      <g transform={`translate(${cx} ${cy}) scale(1 ${flip ? -1 : 1})`}>
        {Array.from({ length: 9 }, (_, i) => {
          const ang = (-90 + (i - 4) * 14) * (Math.PI / 180);
          return <line key={i} x1={0} y1={0} x2={Math.cos(ang) * 120} y2={Math.sin(ang) * 120 + 120} stroke={g} strokeWidth={2.4} />;
        })}
        <path d="M-130 120 A130 130 0 0 1 130 120" fill="none" stroke={a} strokeWidth={3} transform="translate(0 0)" />
      </g>
    );
    const step = 26;
    const corner = (x: number, y: number, sx: number, sy: number) => (
      <path
        d={`M${x} ${y + sy * 160} V${y + sy * step} H${x + sx * step} V${y} H${x + sx * 160}`}
        fill="none"
        stroke={g}
        strokeWidth={4}
      />
    );
    body = (
      <>
        <rect x={46} y={46} width={w - 92} height={h - 92} fill="none" stroke={g} strokeWidth={3} />
        <rect x={70} y={70} width={w - 140} height={h - 140} fill="none" stroke={a} strokeWidth={1.2} />
        {corner(90, 90, 1, 1)}
        {corner(w - 90, 90, -1, 1)}
        {corner(90, h - 90, 1, -1)}
        {corner(w - 90, h - 90, -1, -1)}
        {fan(w / 2, 46, false)}
        {fan(w / 2, h - 46, true)}
      </>
    );
  } else {
    // double rule with diamond studs
    body = (
      <>
        <rect x={38} y={38} width={w - 76} height={h - 76} fill="none" stroke={g} strokeWidth={5} />
        <rect x={60} y={60} width={w - 120} height={h - 120} fill="none" stroke={b} strokeWidth={1.6} />
        {[
          [w / 2, 38],
          [w / 2, h - 38],
          [38, h / 2],
          [w - 38, h / 2],
        ].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y! - 16} l16 16 l-16 16 l-16 -16 Z`} fill={g} />
        ))}
      </>
    );
  }
  return svg(w, h, `0 0 ${w} ${h}`, <><defs><GoldGrad id={gid} c={a} /></defs>{body}</>, 'none');
}

/** Filigree corner flourish drawn for the top-left corner (flip for the others). */
export function Corner({ w, h, c }: ArtProps) {
  const gid = useSvgId('corn');
  const g = `url(#${gid})`;
  const s = { fill: 'none', stroke: g, strokeLinecap: 'round' as const };
  return svg(
    w,
    h,
    '0 0 200 200',
    <>
      <defs>
        <GoldGrad id={gid} c={c[0] ?? '#C9973F'} />
      </defs>
      <path d="M12 190 V40 Q12 12 40 12 H190" {...s} strokeWidth={3} />
      <path d="M26 170 V56 Q26 26 56 26 H170" {...s} strokeWidth={1.4} />
      <path d="M40 40 C70 40 92 58 92 84 C92 104 74 112 62 102 C52 94 58 80 70 82" {...s} strokeWidth={2.4} />
      <path d="M40 40 C40 70 58 92 84 92 C104 92 112 74 102 62 C94 52 80 58 82 70" {...s} strokeWidth={2.4} />
      <path d="M92 84 C110 60 136 52 160 56 M84 92 C60 110 52 136 56 160" {...s} strokeWidth={1.6} />
      {[
        [120, 46, -30],
        [148, 40, -10],
        [46, 120, 120],
        [40, 148, 100],
      ].map(([x, y, r], i) => (
        <path key={i} d="M0 0 C6 -10 18 -10 24 0 C18 10 6 10 0 0 Z" fill={g} transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
      <circle cx={40} cy={40} r={7} fill={g} />
      <circle cx={172} cy={57} r={3.4} fill={g} />
      <circle cx={57} cy={172} r={3.4} fill={g} />
    </>,
  );
}

export function Divider({ w, h, c, opts }: ArtProps) {
  const a = c[0] ?? '#C9973F';
  const style = String(opts?.style ?? 'ornate');
  const line = (x1: number, x2: number, sw = 1.6) => <line x1={x1} y1={20} x2={x2} y2={20} stroke={a} strokeWidth={sw} strokeLinecap="round" />;
  let centre: ReactNode;
  switch (style) {
    case 'lotus':
      centre = (
        <g transform="translate(200 22)" fill={a}>
          <path d="M0 -16 C7 -8 7 0 0 6 C-7 0 -7 -8 0 -16 Z" />
          <path d="M0 6 C-12 4 -20 -4 -22 -10 C-12 -10 -4 -4 0 6 Z" opacity={0.8} />
          <path d="M0 6 C12 4 20 -4 22 -10 C12 -10 4 -4 0 6 Z" opacity={0.8} />
        </g>
      );
      break;
    case 'dots':
      centre = (
        <g fill={a}>
          {[-30, -15, 0, 15, 30].map((dx, i) => (
            <circle key={dx} cx={200 + dx} cy={20} r={i === 2 ? 6 : 3.5} />
          ))}
        </g>
      );
      break;
    case 'leaf':
      centre = (
        <g fill={a}>
          {[-60, -40, -20, 20, 40, 60].map((dx) => (
            <path key={dx} d="M0 0 C5 -8 14 -8 18 0 C14 8 5 8 0 0 Z" transform={`translate(${200 + dx - (dx > 0 ? 0 : 18)} 20) rotate(${dx > 0 ? -20 : 20} 9 0)`} />
          ))}
          <circle cx={200} cy={20} r={4} />
        </g>
      );
      break;
    case 'hearts':
      centre = <path d="M200 30 C186 20 182 12 188 7 C193 3 198 6 200 10 C202 6 207 3 212 7 C218 12 214 20 200 30 Z" fill={a} />;
      break;
    case 'stars':
      centre = <path d="M200 6 L204 16 L215 17 L206 24 L209 34 L200 28 L191 34 L194 24 L185 17 L196 16 Z" fill={a} />;
      break;
    case 'deco':
      centre = <path d="M176 20 L188 8 L200 20 L212 8 L224 20 L212 32 L200 20 L188 32 Z" fill="none" stroke={a} strokeWidth={1.8} />;
      break;
    case 'simple':
      centre = <path d="M200 13 L207 20 L200 27 L193 20 Z" fill={a} />;
      break;
    default:
      centre = (
        <g fill="none" stroke={a} strokeWidth={1.8} strokeLinecap="round">
          <path d="M200 8 L210 20 L200 32 L190 20 Z" fill={a} />
          <path d="M188 20 C176 8 160 10 158 20 C160 30 176 32 188 20" />
          <path d="M212 20 C224 8 240 10 242 20 C240 30 224 32 212 20" />
        </g>
      );
  }
  const gapL = style === 'leaf' ? 130 : 150;
  return svg(
    w,
    h,
    '0 0 400 40',
    <>
      {line(10, gapL)}
      {line(400 - gapL, 390)}
      {centre}
    </>,
  );
}

/** Mughal cusped arch window. c = [stroke, fill]. Stretches to its box. */
export function Arch({ w, h, c }: ArtProps) {
  const [a = '#C9973F', fill = '#FFF8EC'] = c;
  const gid = useSvgId('arch');
  const shoulder = Math.min(h * 0.32, w * 0.62);
  const path = (i: number) => {
    const x0 = i;
    const x1 = w - i;
    const top = i;
    const yb = h - i;
    const sh = shoulder + i * 0.4;
    const cx = w / 2;
    // Cusped (multi-foil) top: two big curves meeting at a point plus small cusps.
    return `M${x0} ${yb} V${sh} C${x0} ${sh * 0.62} ${cx - w * 0.28} ${top + sh * 0.28} ${cx - w * 0.07} ${top + sh * 0.12}
      Q${cx - w * 0.03} ${top + sh * 0.02} ${cx} ${top} Q${cx + w * 0.03} ${top + sh * 0.02} ${cx + w * 0.07} ${top + sh * 0.12}
      C${cx + w * 0.28} ${top + sh * 0.28} ${x1} ${sh * 0.62} ${x1} ${sh} V${yb} Z`;
  };
  return svg(
    w,
    h,
    `0 0 ${w} ${h}`,
    <>
      <defs>
        <GoldGrad id={gid} c={a} />
      </defs>
      <path d={path(0)} fill={fill} />
      <path d={path(6)} fill="none" stroke={`url(#${gid})`} strokeWidth={6} />
      <path d={path(26)} fill="none" stroke={a} strokeWidth={1.5} strokeDasharray="1 8" strokeLinecap="round" />
      <circle cx={w / 2} cy={-14} r={12} fill={`url(#${gid})`} />
    </>,
    'none',
  );
}

export function Sunburst({ w, h, c }: ArtProps) {
  const gid = useSvgId('sun');
  const rays = 36;
  return svg(
    w,
    h,
    '0 0 200 200',
    <>
      <defs>
        <radialGradient id={gid}>
          <stop offset="0" stopColor={c[0] ?? '#F2C462'} stopOpacity={1} />
          <stop offset="1" stopColor={c[0] ?? '#F2C462'} stopOpacity={0} />
        </radialGradient>
      </defs>
      {Array.from({ length: rays }, (_, i) => {
        const a0 = (i / rays) * Math.PI * 2;
        const a1 = a0 + Math.PI / rays;
        return <path key={i} d={`M100 100 L${100 + Math.cos(a0) * 100} ${100 + Math.sin(a0) * 100} L${100 + Math.cos(a1) * 100} ${100 + Math.sin(a1) * 100} Z`} fill={`url(#${gid})`} />;
      })}
    </>,
  );
}

export function Stars({ w, h, c, opts }: ArtProps) {
  const rand = rng(Number(opts?.seed ?? 7));
  const n = Math.round((w * h) / 26000);
  const col = c[0] ?? '#F2C462';
  const items: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const s = 3 + rand() * 9;
    if (rand() > 0.55) {
      items.push(<path key={i} d={`M${x} ${y - s * 2} Q${x} ${y} ${x + s * 2} ${y} Q${x} ${y} ${x} ${y + s * 2} Q${x} ${y} ${x - s * 2} ${y} Q${x} ${y} ${x} ${y - s * 2} Z`} fill={col} opacity={0.5 + rand() * 0.5} />);
    } else {
      items.push(<circle key={i} cx={x} cy={y} r={s * 0.35} fill={col} opacity={0.3 + rand() * 0.5} />);
    }
  }
  return svg(w, h, `0 0 ${w} ${h}`, items, 'none');
}

export function Confetti({ w, h, c, opts }: ArtProps) {
  const rand = rng(Number(opts?.seed ?? 3));
  const cols = c.length ? c : ['#E0533D', '#F2A900', '#2B6CB0'];
  const n = Math.round((w * h) / 9000);
  const items: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const col = cols[i % cols.length]!;
    const r = rand() * 360;
    const k = rand();
    const fade = 1 - (y / h) * 0.5;
    if (k < 0.45) items.push(<rect key={i} x={x} y={y} width={14} height={7} rx={2} fill={col} transform={`rotate(${r} ${x} ${y})`} opacity={fade} />);
    else if (k < 0.75) items.push(<circle key={i} cx={x} cy={y} r={5} fill={col} opacity={fade} />);
    else items.push(<path key={i} d={`M${x} ${y} q6 -8 12 0 t12 0`} fill="none" stroke={col} strokeWidth={3.5} strokeLinecap="round" transform={`rotate(${r} ${x} ${y})`} opacity={fade} />);
  }
  return svg(w, h, `0 0 ${w} ${h}`, items, 'none');
}

export function Wreath({ w, h, c }: ArtProps) {
  const [leaf = '#7A9A6B', berry = '#C9973F'] = c;
  const items: ReactNode[] = [];
  const n = 44;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360;
    const out = i % 2 ? 1 : -1;
    items.push(
      <path
        key={i}
        d="M0 0 C4 -7 12 -7 16 0 C12 7 4 7 0 0 Z"
        fill={leaf}
        opacity={0.75 + (i % 3) * 0.08}
        transform={`rotate(${a} 100 100) translate(100 ${100 - 88}) rotate(${out * 35})`}
      />,
    );
    if (i % 4 === 0) items.push(<circle key={`b${i}`} cx={100 + Math.cos(((a + 4) * Math.PI) / 180) * 84} cy={100 + Math.sin(((a + 4) * Math.PI) / 180) * 84} r={2.4} fill={berry} />);
  }
  return svg(w, h, '0 0 200 200', <>
    <circle cx={100} cy={100} r={88} fill="none" stroke={leaf} strokeWidth={0.8} opacity={0.6} />
    {items}
  </>);
}

/** Botanical branch from the top-left corner sweeping diagonally. */
export function Sprig({ w, h, c }: ArtProps) {
  const [leaf = '#6E8B5A', berry = '#C9973F'] = c;
  const leaves: ReactNode[] = [];
  for (let i = 1; i < 11; i++) {
    const t = i / 11;
    const x = 10 + t * 170;
    const y = Math.round((10 + t * 150 + Math.sin(t * 3) * 14) * 1000) / 1000;
    const s = 1 - t * 0.5;
    leaves.push(<path key={`l${i}`} d="M0 0 C8 -14 26 -16 36 -4 C24 4 10 6 0 0 Z" fill={leaf} opacity={0.85} transform={`translate(${x} ${y}) rotate(${-40 + i * 3}) scale(${s})`} />);
    leaves.push(<path key={`r${i}`} d="M0 0 C8 14 26 16 36 4 C24 -4 10 -6 0 0 Z" fill={leaf} opacity={0.7} transform={`translate(${x} ${y}) rotate(${50 + i * 2}) scale(${s})`} />);
    if (i % 3 === 0) leaves.push(<circle key={`b${i}`} cx={x + 14} cy={y + 18} r={4 * s + 1} fill={berry} />);
  }
  return svg(w, h, '0 0 200 200', <>
    <path d="M10 10 C60 60 110 110 180 160" fill="none" stroke={leaf} strokeWidth={2.4} strokeLinecap="round" />
    {leaves}
  </>);
}

export function Rings({ w, h, c }: ArtProps) {
  const gid = useSvgId('ring');
  return svg(w, h, '0 0 200 150', <>
    <defs>
      <GoldGrad id={gid} c={c[0] ?? '#C9973F'} />
    </defs>
    <circle cx={78} cy={88} r={44} fill="none" stroke={`url(#${gid})`} strokeWidth={9} />
    <circle cx={122} cy={88} r={44} fill="none" stroke={`url(#${gid})`} strokeWidth={9} />
    <path d="M70 44 L78 30 L86 44 Z" fill="#FFFFFF" stroke={c[1] ?? '#E6F4FF'} strokeWidth={2} />
    <path d="M78 30 L70 44 H86 Z M66 36 L90 36" fill="none" stroke="#B9D7F0" strokeWidth={1} />
    <path d="M40 22 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z M160 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 Z" fill={c[1] ?? '#F7E2A6'} />
  </>);
}

/** Full-width ribbon with a centre bow, for inaugurations. c = [ribbon, trim]. */
export function Ribbon({ w, h, c }: ArtProps) {
  const [rib = '#C8102E', trim = '#E9B949'] = c;
  const gid = useSvgId('rib');
  const y = 180;
  return svg(w, h, '0 0 1080 360', <>
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={rib} />
        <stop offset="0.5" stopColor="#FF5A6E" stopOpacity={0.9} />
        <stop offset="1" stopColor={rib} />
      </linearGradient>
    </defs>
    <path d={`M0 ${y - 34} Q270 ${y - 64} 540 ${y - 30} T1080 ${y - 40} V${y + 30} Q810 ${y + 10} 540 ${y + 34} T0 ${y + 28} Z`} fill={`url(#${gid})`} />
    <path d={`M0 ${y - 30} Q270 ${y - 60} 540 ${y - 26} T1080 ${y - 36}`} fill="none" stroke={trim} strokeWidth={3} />
    <path d={`M0 ${y + 24} Q270 ${y + 6} 540 ${y + 30} T1080 ${y + 26}`} fill="none" stroke={trim} strokeWidth={3} />
    <g transform={`translate(540 ${y})`}>
      <path d="M0 0 C-60 -110 -170 -70 -150 0 C-170 70 -60 110 0 0 Z" fill={`url(#${gid})`} stroke={trim} strokeWidth={3} />
      <path d="M0 0 C60 -110 170 -70 150 0 C170 70 60 110 0 0 Z" fill={`url(#${gid})`} stroke={trim} strokeWidth={3} />
      <path d="M-10 10 L-70 160 L-40 140 L-20 170 L0 14 Z M10 10 L70 160 L40 140 L20 170 L0 14 Z" fill={rib} stroke={trim} strokeWidth={2} />
      <ellipse rx={30} ry={36} fill={rib} stroke={trim} strokeWidth={4} />
    </g>
  </>);
}

export function Gift({ w, h, c }: ArtProps) {
  const [box = '#C2543A', rib = '#E9B949'] = c;
  return svg(w, h, '0 0 200 200', <>
    <rect x={30} y={88} width={140} height={100} rx={8} fill={box} />
    <rect x={22} y={64} width={156} height={34} rx={8} fill={box} />
    <rect x={22} y={64} width={156} height={34} rx={8} fill="#FFFFFF" opacity={0.12} />
    <rect x={88} y={64} width={24} height={124} fill={rib} />
    <path d="M100 64 C70 20 34 34 56 58 C64 66 84 66 100 64 Z M100 64 C130 20 166 34 144 58 C136 66 116 66 100 64 Z" fill={rib} />
  </>);
}

/** Mosque skyline silhouette with lit windows. c = [silhouette, light]. */
export function Skyline({ w, h, c }: ArtProps) {
  const [sil = '#062319', light = '#E9B949'] = c;
  const dome = (cx: number, base: number, r: number) => `M${cx - r} ${base} C${cx - r} ${base - r * 1.25} ${cx - r * 0.2} ${base - r * 1.5} ${cx} ${base - r * 1.9} C${cx + r * 0.2} ${base - r * 1.5} ${cx + r} ${base - r * 1.25} ${cx + r} ${base} Z`;
  const minaret = (x: number, top: number) => (
    <g key={x}>
      <rect x={x - 14} y={top} width={28} height={400 - top} fill={sil} />
      <rect x={x - 22} y={top + 60} width={44} height={10} fill={sil} />
      <path d={dome(x, top, 16)} fill={sil} />
      <path d={`M${x} ${top - 34} v-16`} stroke={light} strokeWidth={3} />
      <rect x={x - 4} y={top + 90} width={8} height={20} rx={4} fill={light} opacity={0.8} />
    </g>
  );
  return svg(w, h, '0 0 1080 400', <>
    {minaret(150, 90)}
    {minaret(930, 90)}
    {minaret(330, 170)}
    {minaret(750, 170)}
    <rect x={240} y={250} width={600} height={150} fill={sil} />
    <path d={dome(540, 250, 140)} fill={sil} />
    <path d={dome(390, 260, 60)} fill={sil} />
    <path d={dome(690, 260, 60)} fill={sil} />
    <path d="M540 -20 a18 18 0 1 0 12 30 a14 14 0 1 1 -12 -30 Z" fill={light} transform="translate(0 0)" />
    {[300, 380, 460, 620, 700, 780].map((x) => (
      <path key={x} d={`M${x} 360 v-40 a18 18 0 0 1 36 0 v40 Z`} fill={light} opacity={0.75} />
    ))}
    <path d="M510 400 v-70 a30 30 0 0 1 60 0 v70 Z" fill={light} opacity={0.9} />
    <rect x={0} y={392} width={1080} height={8} fill={sil} />
  </>, 'none');
}

/** Hanging fanous lantern; the chain fills whatever height the box has. c = [metal, glow]. */
export function Lantern({ w, h, c }: ArtProps) {
  const [metal = '#E9B949', glow = '#FFE29A'] = c;
  const gid = useSvgId('lan');
  const hid = useSvgId('lglow');
  const lw = w;
  const lh = lw * 1.6;
  const top = Math.max(0, h - lh);
  const cx = w / 2;
  return svg(w, h, `0 0 ${w} ${h}`, <>
    <defs>
      <GoldGrad id={gid} c={metal} />
      <radialGradient id={hid}>
        <stop offset="0" stopColor={glow} stopOpacity={0.95} />
        <stop offset="1" stopColor={glow} stopOpacity={0} />
      </radialGradient>
    </defs>
    <line x1={cx} y1={0} x2={cx} y2={top + lw * 0.1} stroke={metal} strokeWidth={2} />
    <circle cx={cx} cy={top + lw * 0.85} r={lw * 0.75} fill={`url(#${hid})`} opacity={0.7} />
    <g transform={`translate(${cx - lw / 2} ${top}) scale(${lw / 100})`}>
      <circle cx={50} cy={8} r={6} fill="none" stroke={`url(#${gid})`} strokeWidth={3} />
      <path d="M30 34 Q50 4 70 34 Z" fill={`url(#${gid})`} />
      <path d="M26 34 H74 L84 60 V112 L70 130 H30 L16 112 V60 Z" fill={glow} opacity={0.85} />
      <path d="M26 34 H74 L84 60 V112 L70 130 H30 L16 112 V60 Z M38 34 V130 M62 34 V130 M16 60 H84 M16 112 H84" fill="none" stroke={`url(#${gid})`} strokeWidth={4} strokeLinejoin="round" />
      <path d="M44 72 a8 8 0 1 0 6 12 a6 6 0 1 1 -6 -12 Z" fill={metal} />
      <path d="M30 130 L50 152 L70 130 Z" fill={`url(#${gid})`} />
      <line x1={50} y1={152} x2={50} y2={160} stroke={metal} strokeWidth={3} />
    </g>
  </>, 'none');
}

export function Clouds({ w, h, c }: ArtProps) {
  const [a = '#FFFFFF', b = '#EEF6FF'] = c;
  const puff = (x: number, y: number, s: number, col: string, k: number) => (
    <g key={k} transform={`translate(${x} ${y}) scale(${s})`} fill={col}>
      <circle cx={0} cy={0} r={60} />
      <circle cx={70} cy={-30} r={80} />
      <circle cx={160} cy={-10} r={64} />
      <circle cx={220} cy={20} r={46} />
      <rect x={-40} y={0} width={290} height={70} />
    </g>
  );
  return svg(w, h, '0 0 1080 330', <>
    {puff(-60, 200, 1.3, b, 1)}
    {puff(560, 190, 1.4, b, 2)}
    {puff(180, 250, 1.2, a, 3)}
    {puff(760, 270, 1.1, a, 4)}
    <rect x={0} y={300} width={1080} height={40} fill={a} />
  </>, 'none');
}

export function Rainbow({ w, h, c }: ArtProps) {
  const cols = c.length ? c : ['#F28B82', '#FBBC04', '#81C995', '#8AB4F8'];
  return svg(w, h, '0 0 660 360', <>
    {cols.map((col, i) => (
      <path key={i} d={`M${60 + i * 34} 330 A${270 - i * 34} ${270 - i * 34} 0 0 1 ${600 - i * 34} 330`} fill="none" stroke={col} strokeWidth={34} strokeLinecap="round" />
    ))}
    {[60, 600].map((x) => (
      <g key={x} fill="#FFFFFF" transform={`translate(${x} 320)`}>
        <circle cx={-34} cy={6} r={30} />
        <circle cx={6} cy={-14} r={40} />
        <circle cx={46} cy={6} r={30} />
        <rect x={-64} y={6} width={140} height={30} rx={15} />
      </g>
    ))}
  </>);
}
