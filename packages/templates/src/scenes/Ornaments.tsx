import type { AmbientKind, DividerKind, MarkerKind } from '@cardai/shared';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { q, rnd } from './anim';
import { Flower, Marigold, Rose } from './parts';

// ---------------- ambient particles ----------------

const AMBIENT: Record<Exclude<AmbientKind, 'none'>, { n: number; dir: 'rise' | 'fall' | 'drift' | 'twinkle' | 'burst'; dur: [number, number]; size: [number, number] }> = {
  lanterns: { n: 18, dir: 'rise', dur: [16, 28], size: [16, 34] },
  petals: { n: 14, dir: 'fall', dur: [11, 20], size: [10, 18] },
  fireflies: { n: 22, dir: 'drift', dur: [6, 12], size: [4, 7] },
  marigolds: { n: 12, dir: 'fall', dur: [12, 20], size: [12, 20] },
  butterflies: { n: 7, dir: 'drift', dur: [14, 22], size: [16, 24] },
  stars: { n: 26, dir: 'twinkle', dur: [2, 4], size: [3, 6] },
  fireworks: { n: 6, dir: 'burst', dur: [3.5, 5.5], size: [90, 150] },
  fairylights: { n: 24, dir: 'twinkle', dur: [2.5, 4.5], size: [5, 9] },
};

function Particle({ kind, size, color, glow }: { kind: Exclude<AmbientKind, 'none'>; size: number; color: string; glow: string }) {
  switch (kind) {
    case 'lanterns':
      return (
        <span style={{ position: 'relative', display: 'block', width: size, height: size * 1.3 }}>
          {/* Glow as a plain gradient (a CSS filter per lantern is costly on phones). */}
          <span style={{ position: 'absolute', inset: `-${size * 0.6}px`, borderRadius: '50%', background: `radial-gradient(circle, ${glow}88 0%, ${glow}00 65%)` }} />
          <span
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: 'polygon(15% 6%, 50% 0, 85% 6%, 95% 86%, 50% 96%, 5% 86%)',
              background: 'linear-gradient(#FFD27A, #F07A28)',
            }}
          />
        </span>
      );
    case 'petals':
      return <span style={{ display: 'block', width: size, height: size * 0.7, borderRadius: '80% 0 80% 0', background: color, opacity: 0.85 }} />;
    case 'marigolds':
      return (
        <svg width={size} height={size} viewBox="-10 -10 20 20">
          <Marigold x={0} y={0} r={8} color={color} dark={glow} />
        </svg>
      );
    case 'fireflies':
      return <span style={{ display: 'block', width: size, height: size, borderRadius: 99, background: glow, boxShadow: `0 0 ${size * 2}px ${glow}` }} />;
    case 'butterflies':
      return (
        <svg width={size} height={size} viewBox="-12 -10 24 20">
          <path d="M0 0C-4 -10 -12 -9 -10 -2C-9 2 -4 2 0 0C-4 2 -8 8 -4 9C-1 9 0 4 0 0Z" fill={color} />
          <path d="M0 0C4 -10 12 -9 10 -2C9 2 4 2 0 0C4 2 8 8 4 9C1 9 0 4 0 0Z" fill={color} opacity={0.85} />
        </svg>
      );
    case 'fireworks':
      // Rays of a burst; the whole burst scales out and fades (one animation each).
      return (
        <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ overflow: 'visible' }}>
          {Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            return <line key={i} x1={q(Math.cos(a) * 14)} y1={q(Math.sin(a) * 14)} x2={q(Math.cos(a) * 46)} y2={q(Math.sin(a) * 46)} stroke={i % 2 ? color : glow} strokeWidth={2.4} strokeLinecap="round" />;
          })}
          <circle r={6} fill={glow} opacity={0.7} />
        </svg>
      );
    case 'fairylights':
      return <span style={{ display: 'block', width: size, height: size, borderRadius: 99, background: `radial-gradient(circle, #FFF6D8 0 30%, ${glow}AA 45%, ${glow}00 70%)` }} />;
    case 'stars':
      return (
        <svg width={size * 2} height={size * 2} viewBox="-10 -10 20 20">
          <path d="M0 -9L2 -2L9 0L2 2L0 9L-2 2L-9 0L-2 -2Z" fill={glow} />
        </svg>
      );
  }
}

/**
 * Floating lanterns / petals / marigolds / butterflies / stars. Website: CSS loops (pass no
 * `time`). Video: positions from `time` (seconds). Fills its positioned parent.
 */
export function Ambient({ kind, colors, glow, time, density = 1 }: { kind: AmbientKind; colors: string[]; glow: string; time?: number; density?: number }) {
  if (kind === 'none') return null;
  const spec = AMBIENT[kind];
  const n = Math.max(3, Math.round(spec.n * density));
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: n }, (_, i) => {
        const x = rnd(i, 1) * 100;
        const size = spec.size[0] + rnd(i, 2) * (spec.size[1] - spec.size[0]);
        const dur = spec.dur[0] + rnd(i, 3) * (spec.dur[1] - spec.dur[0]);
        const delay = rnd(i, 4) * dur;
        const color = colors[i % colors.length]!;
        const style: CSSProperties = { position: 'absolute', left: `${x}%`, willChange: 'transform' };
        if (time === undefined) {
          const top = spec.dir === 'rise' ? '100%' : spec.dir === 'fall' ? '-6%' : spec.dir === 'burst' ? `${4 + rnd(i, 5) * 40}%` : `${rnd(i, 5) * 90}%`;
          Object.assign(style, { top, animation: `scn-a-${spec.dir} ${dur}s ${spec.dir === 'burst' ? 'ease-out' : 'linear'} ${-delay}s infinite` });
          return (
            <span key={i} style={style}>
              <Particle kind={kind} size={size} color={color} glow={glow} />
            </span>
          );
        }
        const p = ((time + delay) / dur) % 1;
        const sway = Math.sin((time / dur) * Math.PI * 2 + i) * 18;
        let transform = '';
        let opacity = 1;
        if (spec.dir === 'rise') {
          style.top = `${105 - p * 125}%`;
          transform = `translateX(${sway}px)`;
          opacity = Math.min(1, p * 6, (1 - p) * 4);
        } else if (spec.dir === 'fall') {
          style.top = `${-6 + p * 112}%`;
          transform = `translateX(${sway * 1.6}px) rotate(${p * 400}deg)`;
        } else if (spec.dir === 'drift') {
          style.top = `${rnd(i, 5) * 90}%`;
          transform = `translate(${Math.sin(p * Math.PI * 2) * 40}px, ${Math.cos(p * Math.PI * 2) * 24}px)`;
        } else if (spec.dir === 'burst') {
          style.top = `${4 + rnd(i, 5) * 40}%`;
          const e = 1 - (1 - Math.min(1, p / 0.45)) ** 3;
          transform = `scale(${0.1 + e * 0.9})`;
          opacity = p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.4);
        } else {
          style.top = `${rnd(i, 5) * (kind === 'fairylights' ? 90 : 60)}%`;
          opacity = 0.25 + (Math.sin(p * Math.PI * 2) + 1) * 0.37;
        }
        return (
          <span key={i} style={{ ...style, transform, opacity }}>
            <Particle kind={kind} size={size * 1.6} color={color} glow={glow} />
          </span>
        );
      })}
    </div>
  );
}

// ---------------- section dividers ----------------

/** Edge where one band meets the next. `color` = the band below. Height ≈ 28px at any width. */
export function Divider({ kind, color, accent, flip = false, tile = true }: { kind: DividerKind; color: string; accent?: string; flip?: boolean; tile?: boolean }) {
  const pid = `dv${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const style: CSSProperties = { display: 'block', width: '100%', height: kind === 'line' ? 28 : 34, transform: flip ? 'scaleY(-1)' : undefined };
  let shape: ReactNode;
  switch (kind) {
    case 'torn': {
      let d = 'M0 40V18';
      for (let x = 0; x <= 400; x += 8) d += `L${x} ${10 + rnd(x, 3) * 14}`;
      d += 'L400 40Z';
      let d2 = 'M0 40V24';
      for (let x = 0; x <= 400; x += 11) d2 += `L${x} ${18 + rnd(x, 8) * 10}`;
      d2 += 'L400 40Z';
      shape = (
        <>
          <path d={d} fill={color} opacity={0.55} />
          <path d={d2} fill={color} />
        </>
      );
      break;
    }
    case 'scallop':
      shape = <path d={`M0 40V22${Array.from({ length: 20 }, (_, i) => `A10 10 0 0 1 ${(i + 1) * 20} 22`).join('')}V40Z`} fill={color} />;
      break;
    case 'arches':
      shape = (
        <>
          <path d={`M0 40V30${Array.from({ length: 10 }, (_, i) => `V18Q${i * 40 + 20} -4 ${(i + 1) * 40} 18`).join('')}V40Z`} fill={color} />
          {accent && Array.from({ length: 10 }, (_, i) => <circle key={i} cx={i * 40 + 20} cy={14} r={2} fill={accent} />)}
        </>
      );
      break;
    case 'wave':
      shape = <path d="M0 40V20Q50 4 100 20T200 20T300 20T400 20V40Z" fill={color} />;
      break;
    case 'line':
      shape = (
        <>
          <rect x={0} y={20} width={400} height={20} fill={color} />
          <line x1={140} y1={14} x2={260} y2={14} stroke={accent ?? color} strokeWidth={0.8} />
          <circle cx={200} cy={14} r={2.5} fill={accent ?? color} />
        </>
      );
      break;
  }
  if (!tile || kind === 'line') {
    return (
      <svg viewBox="0 0 400 40" preserveAspectRatio={kind === 'line' ? 'xMidYMax meet' : 'none'} aria-hidden style={kind === 'line' ? { ...style, background: `linear-gradient(transparent 50%, ${color} 50%)` } : style}>
        {shape}
      </svg>
    );
  }
  // Repeat a fixed-size tile so scallops / arches keep their shape on any screen width
  // (a single stretched shape turns flat and wide on tablets and desktops).
  const h = style.height as number;
  return (
    <svg aria-hidden style={style}>
      <defs>
        <pattern id={pid} patternUnits="userSpaceOnUse" width={h * 9} height={h} viewBox="0 0 400 40" preserveAspectRatio="none">
          {shape}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}

// ---------------- wax seal ----------------

/** Wax seal with monogram (opening, RSVP button). */
export function WaxSeal({ size, color, text, font, ink = '#FFFFFF', light = false }: { size: number; color: string; text: string; font: string; ink?: string; light?: boolean }) {
  const pts = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r = 46 + rnd(i, 13) * 4 + (i % 2) * 2;
    return `${q(50 + Math.cos(a) * r)} ${q(50 + Math.sin(a) * r)}`;
  });
  const base = light ? '#F4E6DA' : color;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id={`seal-${size}`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.45} />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="1" stopColor="#000000" stopOpacity={0.3} />
        </radialGradient>
      </defs>
      <path d={`M${pts.join('L')}Z`} fill={base} />
      <path d={`M${pts.join('L')}Z`} fill={`url(#seal-${size})`} />
      <circle cx={50} cy={50} r={33} fill="none" stroke={light ? color : '#000'} strokeOpacity={light ? 0.5 : 0.22} strokeWidth={2.5} />
      <circle cx={50} cy={50} r={29} fill="none" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={1} />
      <text x={50} y={50} dominantBaseline="central" textAnchor="middle" fontFamily={font} fontSize={text.length > 3 ? 18 : 30} fill={light ? color : ink} style={{ letterSpacing: text.length > 3 ? 1 : 0 }}>
        {text}
      </text>
    </svg>
  );
}

// ---------------- timeline marker ----------------

export function Marker({ kind, color, accent, size = 30 }: { kind: MarkerKind; color: string; accent: string; size?: number }) {
  let shape: ReactNode;
  switch (kind) {
    case 'rose':
      shape = <Rose x={0} y={0} r={9} color={color} light="#FFFFFF" />;
      break;
    case 'marigold':
      shape = <Marigold x={0} y={0} r={8} color={accent} dark={color} />;
      break;
    case 'lotus':
      shape = (
        <g>
          {[-50, -25, 0, 25, 50].map((a) => (
            <ellipse key={a} cx={0} cy={-3} rx={3.5} ry={8} transform={`rotate(${a})`} fill={a === 0 ? color : accent} />
          ))}
        </g>
      );
      break;
    case 'diya':
      shape = (
        <g>
          <path d="M-9 1Q0 10 9 1Z" fill={color} />
          <path d="M0 -10q3 5 0 9q-3 -4 0 -9z" fill={accent} />
        </g>
      );
      break;
    case 'lantern':
      shape = <path d="M-5 -9Q0 -11 5 -9L7 8Q0 10 -7 8Z" fill={accent} stroke={color} strokeWidth={1.5} />;
      break;
    case 'leaf':
      shape = <path d="M0 -10C8 -4 8 4 0 10C-8 4 -8 -4 0 -10Z" fill={color} />;
      break;
    case 'star':
      shape = <path d="M0 -10L2.5 -2.5L10 0L2.5 2.5L0 10L-2.5 2.5L-10 0L-2.5 -2.5Z" fill={accent} />;
      break;
    case 'dot':
      shape = <circle r={5} fill={color} />;
      break;
  }
  return (
    <svg width={size} height={size} viewBox="-12 -12 24 24" aria-hidden>
      {shape}
    </svg>
  );
}

// ---------------- dress code figures ----------------

/** A row of guests dressed in the dress-code colours (placeholder for painted figures). */
export function DressFigures({ colors, skin = '#C68C64', hair = '#2A1B14' }: { colors: string[]; skin?: string; hair?: string }) {
  const palette = colors.length ? colors : ['#7A1F2B', '#C9A27A', '#3A2A20'];
  const people = [
    { x: 40, kind: 'saree' },
    { x: 95, kind: 'sherwani' },
    { x: 150, kind: 'lehenga' },
    { x: 205, kind: 'suit' },
    { x: 260, kind: 'gown' },
    { x: 315, kind: 'kurta' },
    { x: 365, kind: 'lehenga' },
  ] as const;
  return (
    <svg viewBox="0 0 400 220" aria-hidden style={{ width: '100%', height: 'auto', display: 'block' }}>
      <ellipse cx={200} cy={212} rx={190} ry={6} fill="#000" opacity={0.07} />
      {people.map((p, i) => {
        const c = palette[i % palette.length]!;
        const c2 = palette[(i + 1) % palette.length]!;
        const tall = p.kind === 'sherwani' || p.kind === 'suit' || p.kind === 'kurta';
        const top = tall ? 30 : 42;
        return (
          <g key={i}>
            <circle cx={p.x} cy={top} r={11} fill={skin} />
            <path d={tall ? `M${p.x - 11} ${top - 2}q11 -14 22 0q-2 -8 -11 -10q-9 2 -11 10z` : `M${p.x - 12} ${top + 4}q0 -20 12 -18q12 -2 12 18q-4 -10 -12 -12q-8 2 -12 12z`} fill={hair} />
            {tall ? (
              <>
                <path d={`M${p.x - 15} ${top + 14}h30l3 ${p.kind === 'sherwani' ? 110 : 70}h-36z`} fill={c} />
                {p.kind === 'suit' && <path d={`M${p.x - 4} ${top + 14}l4 16l4 -16z`} fill="#FFFFFF" />}
                {p.kind === 'sherwani' && <path d={`M${p.x - 16} ${top + 14}q16 10 32 0`} stroke={c2} strokeWidth={4} fill="none" />}
                <rect x={p.x - 12} y={top + (p.kind === 'sherwani' ? 124 : 84)} width={10} height={p.kind === 'sherwani' ? 46 : 86} fill={p.kind === 'kurta' ? '#F3EDE2' : c} />
                <rect x={p.x + 2} y={top + (p.kind === 'sherwani' ? 124 : 84)} width={10} height={p.kind === 'sherwani' ? 46 : 86} fill={p.kind === 'kurta' ? '#F3EDE2' : c} />
              </>
            ) : (
              <>
                <path d={`M${p.x - 12} ${top + 12}h24l2 34h-28z`} fill={p.kind === 'gown' ? c : c2} />
                <path d={`M${p.x - 14} ${top + 44}h28l${p.kind === 'gown' ? 22 : 18} ${206 - top - 44}h${p.kind === 'gown' ? -72 : -64}z`} fill={c} />
                {p.kind === 'saree' && <path d={`M${p.x + 12} ${top + 12}q-20 40 -28 120`} stroke={c2} strokeWidth={8} fill="none" opacity={0.85} />}
                {p.kind === 'lehenga' && <path d={`M${p.x - 30} ${190}h60`} stroke={c2} strokeWidth={6} />}
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ---------------- vintage car ("See the route") ----------------

export function VintageCar({ body, trim = '#D9D4C7' }: { body: string; trim?: string }) {
  return (
    <svg viewBox="0 0 260 110" aria-hidden style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
      <ellipse cx={130} cy={102} rx={115} ry={6} fill="#000" opacity={0.12} />
      <path d="M20 78Q18 56 44 52L84 48Q100 22 140 20H170Q190 22 204 48L232 54Q248 58 246 78Z" fill={body} />
      <path d="M96 48Q108 28 138 26H166Q182 28 194 48Z" fill="#DDEFF3" opacity={0.85} />
      <line x1={146} y1={26} x2={146} y2={48} stroke={body} strokeWidth={4} />
      <rect x={14} y={74} width={236} height={8} rx={4} fill={trim} />
      <circle cx={234} cy={62} r={6} fill="#FFF4C2" stroke={trim} strokeWidth={2} />
      {[66, 196].map((x) => (
        <g key={x}>
          <circle cx={x} cy={84} r={19} fill="#2A2A2A" />
          <circle cx={x} cy={84} r={10} fill={trim} />
          <circle cx={x} cy={84} r={3} fill="#2A2A2A" />
        </g>
      ))}
      <Flower x={120} y={20} r={8} color="#F2B5C4" center="#FFF" />
      <Flower x={170} y={18} r={7} color="#FFFFFF" center="#F2B5C4" />
    </svg>
  );
}
