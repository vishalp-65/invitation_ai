import type { ReactNode } from 'react';
import type { ArtProps } from './Ornaments';
import { useSvgId } from './svg-ids';

/**
 * Indian festive and sacred art for the layered designs: kalash, temple bells, rangoli/kolam/
 * alpona, bandhanwar, lotus, peacock, decorated elephant, home, diya row, doves.
 */

const svg = (w: number, h: number, vb: string, children: ReactNode, par = 'xMidYMid meet') => (
  <svg width={w} height={h} viewBox={vb} preserveAspectRatio={par} style={{ display: 'block', overflow: 'visible' }}>
    {children}
  </svg>
);

function Metal({ id, c }: { id: string; c: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={c} />
      <stop offset="0.42" stopColor="#FFE9A8" />
      <stop offset="1" stopColor={c} />
    </linearGradient>
  );
}

const leafPath = 'M0 0 C6 -10 6 -26 0 -40 C-6 -26 -6 -10 0 0 Z';

/** Mangal kalash: brass pot, mango leaves, coconut with red cloth. c = [metal, leaf, cloth]. */
export function Kalash({ w, h, c }: ArtProps) {
  const [metal = '#C9973F', leaf = '#2F7D32', cloth = '#B5121B'] = c;
  const gid = useSvgId('kal');
  return svg(w, h, '0 0 100 130', <>
    <defs>
      <Metal id={gid} c={metal} />
    </defs>
    {[-60, -35, -12, 12, 35, 60].map((a, i) => (
      <path key={i} d={leafPath} fill={leaf} opacity={0.9 - (i % 2) * 0.15} transform={`translate(50 50) rotate(${a}) scale(0.9)`} />
    ))}
    <ellipse cx={50} cy={34} rx={15} ry={17} fill="#8B5A2B" />
    <path d="M38 30 Q50 18 62 30" fill="none" stroke="#6B3F1D" strokeWidth={1.4} />
    <path d="M33 44 Q50 36 67 44 L64 50 H36 Z" fill={cloth} />
    <path d="M36 50 H64 L60 58 H40 Z" fill={`url(#${gid})`} />
    <path d="M40 58 C14 64 12 104 30 116 H70 C88 104 86 64 60 58 Z" fill={`url(#${gid})`} />
    <path d="M24 82 Q50 92 76 82" fill="none" stroke={cloth} strokeWidth={3} />
    <path d="M26 92 Q50 102 74 92" fill="none" stroke="#FFFFFF" strokeWidth={1.2} strokeDasharray="2 3" opacity={0.8} />
    <circle cx={50} cy={74} r={4.5} fill={cloth} />
    <path d="M32 116 H68 L72 124 H28 Z" fill={`url(#${gid})`} />
  </>);
}

/** Hanging temple bells on chains. c = [metal]. */
export function Bells({ w, h, c }: ArtProps) {
  const gid = useSvgId('bell');
  const metal = c[0] ?? '#C9973F';
  const bell = (x: number, len: number, s: number, k: number) => (
    <g key={k}>
      <line x1={x} y1={0} x2={x} y2={len} stroke={metal} strokeWidth={2} strokeDasharray="5 3" />
      <g transform={`translate(${x} ${len}) scale(${s})`}>
        <circle cx={0} cy={2} r={4} fill="none" stroke={`url(#${gid})`} strokeWidth={2.4} />
        <path d="M0 6 C-14 8 -16 26 -18 40 H18 C16 26 14 8 0 6 Z" fill={`url(#${gid})`} />
        <path d="M-20 40 H20 Q22 46 0 46 Q-22 46 -20 40 Z" fill={metal} />
        <path d="M-12 26 H12" stroke="#FFFFFF" strokeWidth={1} opacity={0.5} />
        <circle cx={0} cy={50} r={4.5} fill={metal} />
      </g>
    </g>
  );
  return svg(w, h, '0 0 170 300', <>
    <defs>
      <Metal id={gid} c={metal} />
    </defs>
    <path d="M10 6 Q85 30 160 6" fill="none" stroke={metal} strokeWidth={3} />
    {bell(40, 140, 1.25, 1)}
    {bell(92, 205, 1.5, 2)}
    {bell(138, 110, 1.05, 3)}
  </>);
}

/** Rangoli (flower), kolam (white dot-loop) or alpona (Bengali). c = [primary, secondary, white]. */
export function Rangoli({ w, h, c, opts }: ArtProps) {
  const [a = '#E2553D', b = '#F2A900', white = '#FFFFFF'] = c;
  const style = String(opts?.style ?? 'flower');
  const ring = (n: number, r: number, len: number, col: string, wid: number, rot = 0) =>
    Array.from({ length: n }, (_, i) => (
      <path
        key={`${r}-${i}`}
        d={`M0 0 C${wid} ${-len * 0.3} ${wid} ${-len * 0.7} 0 ${-len} C${-wid} ${-len * 0.7} ${-wid} ${-len * 0.3} 0 0 Z`}
        fill={col}
        transform={`rotate(${(i / n) * 360 + rot}) translate(0 ${-r})`}
      />
    ));
  let body: ReactNode;
  if (style === 'kolam') {
    const dots: ReactNode[] = [];
    for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) if (Math.abs(i) + Math.abs(j) <= 4) dots.push(<circle key={`${i}${j}`} cx={i * 20} cy={j * 20} r={2.6} fill={a} />);
    body = (
      <>
        {dots}
        {[0, 45, 90, 135].map((r) => (
          <ellipse key={r} rx={78} ry={26} fill="none" stroke={white} strokeWidth={3} transform={`rotate(${r})`} />
        ))}
        <circle r={40} fill="none" stroke={white} strokeWidth={3} />
        <circle r={92} fill="none" stroke={b} strokeWidth={2} strokeDasharray="3 6" />
      </>
    );
  } else if (style === 'alpona') {
    body = (
      <>
        <circle r={95} fill="none" stroke={a} strokeWidth={6} />
        {ring(12, 52, 40, a, 13)}
        {ring(12, 52, 30, white, 7)}
        {ring(16, 20, 28, a, 8, 11)}
        <circle r={18} fill={white} stroke={a} strokeWidth={4} />
        {Array.from({ length: 24 }, (_, i) => (
          <path key={i} d="M0 -96 q6 -10 0 -18 q-6 8 0 18" fill={white} stroke={a} strokeWidth={1.5} transform={`rotate(${i * 15})`} />
        ))}
      </>
    );
  } else {
    body = (
      <>
        <circle r={96} fill={b} opacity={0.25} />
        {ring(16, 60, 36, a, 12)}
        {ring(16, 60, 24, b, 7, 11.25)}
        {ring(12, 26, 34, b, 11)}
        {ring(12, 26, 22, white, 6, 15)}
        <circle r={22} fill={a} />
        <circle r={12} fill={white} />
        <circle r={5} fill={b} />
        {Array.from({ length: 32 }, (_, i) => (
          <circle key={i} cx={0} cy={-100} r={3} fill={i % 2 ? a : white} transform={`rotate(${i * 11.25})`} />
        ))}
      </>
    );
  }
  return svg(w, h, '-110 -110 220 220', body);
}

/** Bandhanwar: mango-leaf rope with hanging flower strings across the top edge. c = [leaf, flower]. */
export function Bandhanwar({ w, h, c, opts }: ArtProps) {
  const [leaf = '#2F7D32', flower = '#F28C0F'] = c;
  const jasmine = opts?.flowers === 'jasmine';
  const n = 15;
  const items: ReactNode[] = [];
  const sag = (x: number) => 26 + Math.sin((x / 1080) * Math.PI) * 28;
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 1080;
    const y = sag(x);
    items.push(<path key={`l${i}`} d="M0 0 C14 18 14 54 0 84 C-14 54 -14 18 0 0 Z" fill={leaf} opacity={i % 2 ? 0.9 : 0.75} transform={`translate(${x} ${y}) rotate(${i % 2 ? 8 : -8})`} />);
    items.push(<path key={`v${i}`} d="M0 6 V78" stroke="#1E5A22" strokeWidth={1.4} transform={`translate(${x} ${y}) rotate(${i % 2 ? 8 : -8})`} />);
    if (i < n) {
      const fx = x + 1080 / n / 2;
      const len = i % 3 === 1 ? 190 : i % 2 ? 140 : 110;
      const fy = sag(fx);
      items.push(<line key={`s${i}`} x1={fx} y1={fy} x2={fx} y2={fy + len} stroke={flower} strokeWidth={1.4} />);
      for (let k = 0; k < len / 22; k++) {
        const cy = fy + 14 + k * 22;
        items.push(
          jasmine ? (
            <g key={`f${i}-${k}`} transform={`translate(${fx} ${cy})`}>
              {[0, 72, 144, 216, 288].map((r) => (
                <ellipse key={r} cx={0} cy={-5} rx={3.4} ry={6} fill="#FFFFFF" transform={`rotate(${r})`} />
              ))}
              <circle r={2} fill="#F2C94C" />
            </g>
          ) : (
            <g key={`f${i}-${k}`} transform={`translate(${fx} ${cy})`}>
              <circle r={10} fill={flower} />
              <circle r={6.5} fill="#FFB627" />
              <circle r={2.5} fill="#B84A06" />
            </g>
          ),
        );
      }
      items.push(<path key={`t${i}`} d={`M${fx - 6} ${fy + len + 4} L${fx} ${fy + len + 22} L${fx + 6} ${fy + len + 4} Z`} fill={leaf} />);
    }
  }
  return svg(w, h, '0 0 1080 300', <>
    <path d={`M0 26 Q540 ${26 + 56} 1080 26`} fill="none" stroke="#8B5A2B" strokeWidth={5} />
    {items}
  </>, 'none');
}

/** Lotus in bloom with pads. c = [petal, leaf, gold]. */
export function LotusBloom({ w, h, c }: ArtProps) {
  const [petal = '#F4A6B7', leaf = '#5D8C4A', gold = '#C9973F'] = c;
  const gid = useSvgId('lot');
  const p = (rot: number, len: number, wid: number, op: number) => (
    <path key={`${rot}-${len}`} d={`M0 0 C${wid} ${-len * 0.35} ${wid * 0.6} ${-len * 0.8} 0 ${-len} C${-wid * 0.6} ${-len * 0.8} ${-wid} ${-len * 0.35} 0 0 Z`} fill={`url(#${gid})`} opacity={op} stroke={gold} strokeWidth={0.8} transform={`rotate(${rot})`} />
  );
  return svg(w, h, '0 0 360 260', <>
    <defs>
      <linearGradient id={gid} x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor={petal} />
        <stop offset="1" stopColor="#FFFFFF" />
      </linearGradient>
    </defs>
    <ellipse cx={80} cy={228} rx={80} ry={22} fill={leaf} />
    <ellipse cx={290} cy={232} rx={70} ry={20} fill={leaf} opacity={0.85} />
    <path d="M80 228 L80 206 M290 232 L290 212" stroke={leaf} strokeWidth={3} />
    <g transform="translate(180 214)">
      {p(-62, 120, 40, 0.85)}
      {p(62, 120, 40, 0.85)}
      {p(-36, 150, 44, 0.92)}
      {p(36, 150, 44, 0.92)}
      {p(-12, 172, 44, 1)}
      {p(12, 172, 44, 1)}
      {p(0, 186, 40, 1)}
      <ellipse cx={0} cy={0} rx={70} ry={12} fill={leaf} />
    </g>
  </>);
}

/** Peacock with fanned tail, facing right. c = [body, feather, gold]. */
export function Peacock({ w, h, c }: ArtProps) {
  const [blue = '#1B4F9C', green = '#2E8B57', gold = '#C9973F'] = c;
  const feathers: ReactNode[] = [];
  for (let i = 0; i < 13; i++) {
    const a = 120 + i * 9;
    const len = 210 + (i % 2) * 20;
    const rad = (a * Math.PI) / 180;
    const x = 170 + Math.cos(rad) * len;
    const y = 210 + Math.sin(rad) * len * 0.75;
    feathers.push(
      <g key={i}>
        <path d={`M170 210 Q${(170 + x) / 2} ${(210 + y) / 2 + 10} ${x} ${y}`} stroke={green} strokeWidth={2} fill="none" />
        <ellipse cx={x} cy={y} rx={20} ry={28} fill={green} transform={`rotate(${a + 90} ${x} ${y})`} />
        <ellipse cx={x} cy={y} rx={12} ry={17} fill={gold} transform={`rotate(${a + 90} ${x} ${y})`} />
        <ellipse cx={x} cy={y} rx={6} ry={9} fill={blue} transform={`rotate(${a + 90} ${x} ${y})`} />
      </g>,
    );
  }
  return svg(w, h, '0 0 360 360', <>
    <g transform="translate(360 0) scale(-1 1)">{feathers}</g>
    <path d="M196 214 C240 220 266 198 262 168 C258 140 232 124 228 96 C226 78 238 66 254 70 C266 74 270 86 262 92" fill="none" stroke={blue} strokeWidth={18} strokeLinecap="round" />
    <path d="M150 220 C150 180 200 170 230 190 C250 206 240 240 210 246 C180 252 150 246 150 220 Z" fill={blue} />
    <path d="M170 226 C190 214 214 216 228 228" fill="none" stroke={gold} strokeWidth={2} />
    <circle cx={258} cy={76} r={3} fill="#FFFFFF" />
    <path d="M266 80 L282 84 L266 88 Z" fill={gold} />
    {[0, 1, 2].map((i) => (
      <g key={i} transform={`translate(${248 + i * 6} 66) rotate(${-20 + i * 18})`}>
        <line x1={0} y1={0} x2={0} y2={-20} stroke={blue} strokeWidth={1.5} />
        <circle cx={0} cy={-22} r={3.4} fill={gold} />
      </g>
    ))}
  </>);
}

/** Decorated (Rajasthani) elephant facing right. c = [body, cloth, gold]. */
export function Elephant({ w, h, c }: ArtProps) {
  const [body = '#7E8796', cloth = '#B5121B', gold = '#C9973F'] = c;
  return svg(w, h, '0 0 420 380', <>
    <path d="M70 180 C70 110 140 80 220 84 C290 88 330 120 340 170 C352 166 372 172 376 196 C380 226 366 262 372 300 C374 316 360 322 352 312 C346 290 352 262 344 240 L332 250 V340 H296 V268 H160 V340 H124 V262 C90 250 70 220 70 180 Z" fill={body} />
    <path d="M330 150 C350 120 380 110 392 130 C400 146 390 164 372 168" fill="none" stroke={body} strokeWidth={22} strokeLinecap="round" />
    <path d="M300 140 C280 110 250 116 248 150 C246 180 270 200 296 196" fill={body} opacity={0.75} stroke="#00000022" />
    <circle cx={318} cy={150} r={5} fill="#1E1E1E" />
    <path d="M330 196 C340 210 352 214 360 206" fill="none" stroke="#F4F1EA" strokeWidth={6} strokeLinecap="round" />
    <path d="M140 96 C150 140 160 180 180 220 H300 C306 180 304 130 290 100 C240 80 180 80 140 96 Z" fill={cloth} />
    <path d="M140 96 C150 140 160 180 180 220 H300 C306 180 304 130 290 100" fill="none" stroke={gold} strokeWidth={6} />
    <path d="M170 130 H286 M176 170 H296" stroke={gold} strokeWidth={2} strokeDasharray="4 6" />
    {[190, 215, 240, 265, 290].map((x) => (
      <g key={x}>
        <line x1={x} y1={220} x2={x} y2={242} stroke={gold} strokeWidth={2} />
        <circle cx={x} cy={246} r={5} fill={gold} />
      </g>
    ))}
    <path d="M300 104 C320 100 344 116 350 140 L336 146 C330 126 318 116 300 118 Z" fill={gold} />
    <circle cx={346} cy={142} r={6} fill={cloth} />
    <path d="M124 330 H160 M296 330 H332" stroke={gold} strokeWidth={6} />
    <path d="M200 84 L220 40 L240 84 Z" fill={gold} />
    <circle cx={220} cy={36} r={8} fill={cloth} />
  </>);
}

/** Home with gable roof, toran over the door and diyas on the step. c = [wall, roof, gold]. */
export function House({ w, h, c }: ArtProps) {
  const [wall = '#FFF6E5', roof = '#B5121B', gold = '#C9973F'] = c;
  return svg(w, h, '0 0 380 330', <>
    <ellipse cx={190} cy={316} rx={180} ry={14} fill="#00000018" />
    <path d="M60 150 H320 V300 H60 Z" fill={wall} stroke={gold} strokeWidth={4} />
    <path d="M30 160 L190 40 L350 160 Z" fill={roof} stroke={gold} strokeWidth={4} strokeLinejoin="round" />
    <path d="M70 154 L190 64 L310 154" fill="none" stroke={gold} strokeWidth={2} strokeDasharray="6 6" />
    <circle cx={190} cy={112} r={20} fill={wall} stroke={gold} strokeWidth={4} />
    <path d="M190 100 V124 M178 112 H202" stroke={roof} strokeWidth={4} />
    <path d="M160 300 V214 a30 30 0 0 1 60 0 V300 Z" fill={roof} stroke={gold} strokeWidth={4} />
    <path d="M150 196 Q190 222 230 196" fill="none" stroke="#2F7D32" strokeWidth={4} />
    {[158, 172, 186, 200, 214, 226].map((x, i) => (
      <path key={x} d="M0 0 C5 6 5 16 0 24 C-5 16 -5 6 0 0 Z" fill={i % 2 ? '#2F7D32' : '#F28C0F'} transform={`translate(${x} ${200 + Math.sin((i / 5) * Math.PI) * 10})`} />
    ))}
    {[84, 252].map((x) => (
      <g key={x}>
        <rect x={x} y={190} width={44} height={50} rx={4} fill="#FFE29A" stroke={gold} strokeWidth={3} />
        <path d={`M${x + 22} 190 V240 M${x} 215 H${x + 44}`} stroke={gold} strokeWidth={2} />
      </g>
    ))}
    {[120, 260].map((x) => (
      <g key={x} transform={`translate(${x} 300)`}>
        <path d="M-14 -4 Q0 12 14 -4 Z" fill="#B5531F" />
        <path d="M0 -24 C5 -16 5 -10 0 -6 C-5 -10 -5 -16 0 -24 Z" fill="#FFB020" />
      </g>
    ))}
  </>);
}

/** Row of five diyas with warm glow. c = [rim, glow]. */
export function DiyaRow({ w, h, c }: ArtProps) {
  const [rim = '#C9973F', glow = '#FFB627'] = c;
  const gid = useSvgId('drg');
  const fid = useSvgId('drf');
  const xs = [90, 280, 470, 660, 850];
  return svg(w, h, '0 0 940 220', <>
    <defs>
      <radialGradient id={gid}>
        <stop offset="0" stopColor={glow} stopOpacity={0.8} />
        <stop offset="1" stopColor={glow} stopOpacity={0} />
      </radialGradient>
      <radialGradient id={fid} cx="0.5" cy="0.7" r="0.7">
        <stop offset="0" stopColor="#FFF3B0" />
        <stop offset="0.5" stopColor="#FFB020" />
        <stop offset="1" stopColor="#E8590C" />
      </radialGradient>
    </defs>
    {xs.map((x, i) => {
      const s = i === 2 ? 1.25 : i % 2 ? 1 : 0.85;
      return (
        <g key={x} transform={`translate(${x} 170) scale(${s})`}>
          <circle cy={-50} r={70} fill={`url(#${gid})`} />
          <path d="M0 -82 C14 -60 16 -46 0 -32 C-16 -46 -14 -60 0 -82 Z" fill={`url(#${fid})`} />
          <path d="M0 -66 C5 -56 5 -48 0 -40 C-5 -48 -5 -56 0 -66 Z" fill="#FFF6C8" />
          <path d="M-56 -20 Q0 50 56 -20 Q0 0 -56 -20 Z" fill="#B5531F" />
          <path d="M-56 -20 Q0 0 56 -20" fill="none" stroke={rim} strokeWidth={4} />
          <path d="M-38 -2 Q0 30 38 -2" fill="none" stroke={rim} strokeWidth={2} strokeDasharray="3 5" />
        </g>
      );
    })}
  </>);
}

/** Two doves holding a ribbon heart. c = [bird, ribbon]. */
export function Doves({ w, h, c }: ArtProps) {
  const [bird = '#FFFFFF', rib = '#C9973F'] = c;
  const dove = (
    <g>
      <path d="M0 60 C20 30 60 26 84 44 C96 30 110 26 120 30 C110 36 104 44 102 54 C110 80 90 104 60 104 C40 104 20 96 0 60 Z" fill={bird} stroke="#00000022" strokeWidth={1.5} />
      <path d="M40 64 C50 20 80 0 110 4 C96 20 84 44 70 62 Z" fill={bird} stroke="#00000022" strokeWidth={1.5} />
      <circle cx={110} cy={38} r={2.6} fill="#2B2B2B" />
      <path d="M120 34 L132 36 L120 40 Z" fill={rib} />
    </g>
  );
  return svg(w, h, '0 0 260 180', <>
    <g transform="translate(-6 30)">{dove}</g>
    <g transform="translate(266 30) scale(-1 1)">{dove}</g>
    <path d="M130 120 C110 104 108 92 116 86 C122 82 128 86 130 90 C132 86 138 82 144 86 C152 92 150 104 130 120 Z" fill="none" stroke={rib} strokeWidth={3} />
    <path d="M114 70 Q130 80 146 70" fill="none" stroke={rib} strokeWidth={2.4} />
  </>);
}
