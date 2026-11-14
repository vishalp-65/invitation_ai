import type { Attire, CoupleStyle } from '@cardai/shared';
import type { CSSProperties, ReactNode, SVGProps } from 'react';
import { PaintFilter, useSvgId } from './svg-ids';

/**
 * Bride & groom illustration, drawn entirely in SVG.
 * One geometry, three renderings (watercolour / caricature / line-art) and seven regional attires.
 * viewBox 240×300; groom stands left, bride right, holding hands, wearing varmalas.
 */

interface Outfit {
  groom: {
    top: string; // sherwani / kurta / suit
    long: boolean; // long sherwani vs short kurta
    lower: 'churidar' | 'dhoti' | 'trousers';
    lowerColor: string;
    trim: string;
    stole?: string;
    head: 'safa' | 'dastar' | 'topor' | 'pheta' | 'sehra' | 'hair';
    headColor: string;
    beard?: boolean;
  };
  bride: {
    skirt: 'lehenga' | 'saree' | 'nauvari' | 'gown';
    skirtColor: string;
    border: string;
    blouse: string;
    veil: string;
    veilOpacity: number;
    extra: Array<'mukut' | 'mundavalya' | 'jasmine' | 'nath' | 'jhoomar' | 'phulkari' | 'bouquet' | 'sindoor'>;
  };
  garland: [string, string];
}

const OUTFITS: Record<Attire, Outfit> = {
  north: {
    groom: { top: '#F1DDB0', long: true, lower: 'churidar', lowerColor: '#F6EBD3', trim: '#C9973F', stole: '#9B1C31', head: 'safa', headColor: '#E9A21A' },
    bride: { skirt: 'lehenga', skirtColor: '#B3122B', border: '#E2B04A', blouse: '#9E0F25', veil: '#D93A4E', veilOpacity: 0.72, extra: ['nath', 'sindoor'] },
    garland: ['#D7263D', '#FFF3E0'],
  },
  south: {
    groom: { top: '#FFFFFF', long: false, lower: 'dhoti', lowerColor: '#FFFDF5', trim: '#D4A53A', stole: '#FFF2D6', head: 'hair', headColor: '#24160F' },
    bride: { skirt: 'saree', skirtColor: '#8A1538', border: '#E0B048', blouse: '#2F6B3A', veil: '#8A1538', veilOpacity: 0, extra: ['jasmine', 'nath'] },
    garland: ['#FFFFFF', '#F2A900'],
  },
  bengali: {
    groom: { top: '#F8F1DF', long: false, lower: 'dhoti', lowerColor: '#FFFFFF', trim: '#C9973F', head: 'topor', headColor: '#FFFDF7' },
    bride: { skirt: 'saree', skirtColor: '#C8102E', border: '#E7B442', blouse: '#A50D25', veil: '#C8102E', veilOpacity: 0.7, extra: ['mukut', 'sindoor'] },
    garland: ['#FFFFFF', '#E53950'],
  },
  marathi: {
    groom: { top: '#FFFFFF', long: false, lower: 'dhoti', lowerColor: '#FFFDF5', trim: '#E3B23C', head: 'pheta', headColor: '#F28C0F' },
    bride: { skirt: 'nauvari', skirtColor: '#1F7A4D', border: '#E3B23C', blouse: '#7B1F3A', veil: '#1F7A4D', veilOpacity: 0, extra: ['mundavalya', 'nath'] },
    garland: ['#F28C0F', '#FFFFFF'],
  },
  sikh: {
    groom: { top: '#F3E6C8', long: true, lower: 'churidar', lowerColor: '#FBF4E4', trim: '#C9973F', stole: '#C2185B', head: 'dastar', headColor: '#E2557A', beard: true },
    bride: { skirt: 'lehenga', skirtColor: '#C2185B', border: '#E2B04A', blouse: '#9C1250', veil: '#F28C0F', veilOpacity: 0.85, extra: ['phulkari', 'nath'] },
    garland: ['#F28C0F', '#FFFFFF'],
  },
  muslim: {
    groom: { top: '#FFFFFF', long: true, lower: 'churidar', lowerColor: '#FBF7EE', trim: '#C9973F', head: 'sehra', headColor: '#F3E6C8' },
    bride: { skirt: 'lehenga', skirtColor: '#8E1230', border: '#D4AF37', blouse: '#6E0D25', veil: '#D4AF37', veilOpacity: 0.62, extra: ['jhoomar', 'nath'] },
    garland: ['#FFFFFF', '#D7263D'],
  },
  christian: {
    groom: { top: '#1F2533', long: false, lower: 'trousers', lowerColor: '#1F2533', trim: '#FFFFFF', head: 'hair', headColor: '#24160F' },
    bride: { skirt: 'gown', skirtColor: '#FFFFFF', border: '#F1E6D6', blouse: '#FFFFFF', veil: '#FFFFFF', veilOpacity: 0.55, extra: ['bouquet'] },
    garland: ['#FFFFFF', '#F7C6D0'],
  },
};

const SKIN = { groom: '#D9A07A', bride: '#E9B892', hair: '#24160F', lip: '#B4344A', blush: '#F28B9B' };

interface CoupleProps {
  style: CoupleStyle;
  attire: Attire;
  /** Line-art colour (usually the template's gold). */
  ink: string;
  /** Soft backdrop wash colour for watercolour. */
  wash: string;
  size: number;
  css?: CSSProperties;
}

export function Couple({ style, attire, ink, wash, size, css }: CoupleProps) {
  const paintId = useSvgId('paint');
  const washId = useSvgId('wash');
  const o = OUTFITS[attire];
  const line = style === 'lineart';
  const cartoon = style === 'caricature';
  const H = cartoon ? 1.65 : 1; // head scale

  /** Fill helper per rendering style. */
  const p = (fill: string, extra: SVGProps<SVGPathElement> = {}): SVGProps<SVGPathElement> =>
    line
      ? { fill: 'none', stroke: ink, strokeWidth: 1.3, strokeLinejoin: 'round', strokeLinecap: 'round', ...extra }
      : cartoon
        ? { fill, stroke: '#3B2A22', strokeWidth: 1, strokeLinejoin: 'round', ...extra }
        : { fill, filter: `url(#${paintId})`, ...extra };
  const detail = (color: string, w = 1.1): SVGProps<SVGPathElement> => ({
    fill: 'none',
    stroke: line ? ink : color,
    strokeWidth: w,
    strokeLinecap: 'round',
    opacity: line ? 0.85 : 1,
  });

  const gHead = { cx: 82, cy: 70 - (H - 1) * 10, r: 16 * H };
  const bHead = { cx: 158, cy: 76 - (H - 1) * 10, r: 15 * H };

  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 240 300" style={css} aria-hidden>
      <defs>
        <PaintFilter id={paintId} strength={2.2} />
        <radialGradient id={washId}>
          <stop offset="0" stopColor={wash} stopOpacity={0.55} />
          <stop offset="1" stopColor={wash} stopOpacity={0} />
        </radialGradient>
      </defs>

      {/* Backdrop wash + ground shadow */}
      {!line && <circle cx={120} cy={150} r={118} fill={`url(#${washId})`} />}
      {!line && <ellipse cx={120} cy={288} rx={86} ry={6} fill="#000" opacity={0.12} />}

      {/* ---------- Back layers ---------- */}
      {o.bride.veilOpacity > 0 && (
        <path {...p(o.bride.veil, { opacity: line ? 1 : o.bride.veilOpacity })} d="M140 70 Q158 50 176 70 L190 206 Q181 212 172 206 L170 112 Q158 105 146 112 L144 206 Q135 212 126 206 Z" />
      )}
      {o.bride.extra.includes('jasmine') && <Beads x1={171} y1={72} x2={178} y2={176} n={16} color="#FFFFFF" r={2.1} line={line} ink={ink} />}
      <circle {...(p(SKIN.hair) as SVGProps<SVGCircleElement>)} cx={bHead.cx + 13 * H} cy={bHead.cy - 6 * H} r={6.5 * H} />
      {(o.groom.head === 'safa' || o.groom.head === 'pheta') && (
        <path {...p(o.groom.headColor)} d="M66 62 Q50 82 54 112 L61 110 Q59 86 70 66 Z" />
      )}

      {/* ---------- Groom ---------- */}
      <Groom o={o} p={p} detail={detail} line={line} />

      {/* ---------- Bride ---------- */}
      <Bride o={o} p={p} detail={detail} line={line} ink={ink} />

      {/* ---------- Heads ---------- */}
      <Face {...gHead} skin={SKIN.groom} style={style} p={p} detail={detail} ink={ink} bride={false} />
      <Face {...bHead} skin={SKIN.bride} style={style} p={p} detail={detail} ink={ink} bride />

      {/* Groom hair / headgear */}
      <GroomHead o={o} head={gHead} p={p} detail={detail} line={line} ink={ink} />
      {/* Bride hair cap + head jewellery */}
      <path {...p(SKIN.hair)} d={`M${bHead.cx - bHead.r} ${bHead.cy - 1} Q${bHead.cx - bHead.r + 1} ${bHead.cy - bHead.r - 3} ${bHead.cx} ${bHead.cy - bHead.r - 1} Q${bHead.cx + bHead.r - 1} ${bHead.cy - bHead.r - 3} ${bHead.cx + bHead.r} ${bHead.cy - 1} Q${bHead.cx + bHead.r * 0.5} ${bHead.cy - bHead.r * 0.55} ${bHead.cx} ${bHead.cy - bHead.r * 0.55} Q${bHead.cx - bHead.r * 0.5} ${bHead.cy - bHead.r * 0.55} ${bHead.cx - bHead.r} ${bHead.cy - 1} Z`} />
      <BrideHead o={o} head={bHead} p={p} detail={detail} line={line} ink={ink} />

      {/* Varmalas */}
      <Garland cx={82} top={104} depth={46} width={30} colors={o.garland} line={line} ink={ink} />
      <Garland cx={158} top={104} depth={40} width={26} colors={o.garland} line={line} ink={ink} />
    </svg>
  );
}

type P = (fill: string, extra?: SVGProps<SVGPathElement>) => SVGProps<SVGPathElement>;
type D = (color: string, w?: number) => SVGProps<SVGPathElement>;

function Groom({ o, p, detail, line }: { o: Outfit; p: P; detail: D; line: boolean }) {
  const g = o.groom;
  const parts: ReactNode[] = [];
  // Legs / lower garment
  if (g.lower === 'dhoti') {
    parts.push(<path key="dhoti" {...p(g.lowerColor)} d="M56 156 L108 156 L113 283 L51 283 Z" />);
    parts.push(<path key="dhoti-b" {...detail(g.trim, 2.2)} d="M52 274 L112 274" />);
    parts.push(<path key="dhoti-f" {...detail('#d9cdb4', 0.8)} d="M82 160 L80 280 M74 162 L70 280" />);
  } else {
    parts.push(<path key="leg1" {...p(g.lowerColor)} d="M67 200 L79 200 L79 283 L67 283 Z" />);
    parts.push(<path key="leg2" {...p(g.lowerColor)} d="M85 200 L97 200 L97 283 L85 283 Z" />);
  }
  parts.push(<ellipse key="shoe1" {...(p(line ? '' : '#8A5A2B') as SVGProps<SVGEllipseElement>)} cx={72} cy={286} rx={9} ry={3.6} />);
  parts.push(<ellipse key="shoe2" {...(p(line ? '' : '#8A5A2B') as SVGProps<SVGEllipseElement>)} cx={92} cy={286} rx={9} ry={3.6} />);

  // Torso garment
  if (g.lower === 'trousers') {
    parts.push(<path key="coat" {...p(g.top)} d="M58 100 Q82 92 106 100 L109 198 L55 198 Z" />);
    parts.push(<path key="shirt" {...p('#FFFFFF')} d="M75 99 L82 130 L89 99 Q82 96 75 99 Z" />);
    parts.push(<path key="bow" {...p('#1F2533')} d="M76 103 L82 106 L88 103 L88 109 L82 106 L76 109 Z" />);
    parts.push(<path key="lapel" {...detail(line ? '' : '#3A4256', 1.2)} d="M75 99 L82 132 L89 99 M82 132 L82 196" />);
  } else if (g.long) {
    parts.push(<path key="coat" {...p(g.top)} d="M58 100 Q82 92 106 100 L113 212 Q82 220 51 212 Z" />);
    parts.push(<path key="placket" {...detail(g.trim, 1.6)} d="M82 98 L82 214" />);
    parts.push(<path key="hem" {...detail(g.trim, 2)} d="M52 208 Q82 216 112 208" />);
    parts.push(<path key="collar" {...detail(g.trim, 1.6)} d="M74 98 Q82 104 90 98" />);
    for (let i = 0; i < 6; i++) parts.push(<circle key={`btn${i}`} cx={82} cy={112 + i * 16} r={1.4} fill={line ? 'none' : g.trim} stroke={line ? g.trim : 'none'} />);
  } else {
    parts.push(<path key="kurta" {...p(g.top)} d="M60 100 Q82 93 104 100 L108 162 Q82 168 56 162 Z" />);
    parts.push(<path key="collar" {...detail(g.trim, 1.4)} d="M76 98 Q82 104 88 98 M82 100 L82 124" />);
  }
  // Stole / angavastram
  if (g.stole) parts.push(<path key="stole" {...p(g.stole, { opacity: line ? 1 : 0.92 })} d="M62 100 Q86 140 104 204 L111 199 Q94 136 71 97 Z" />);
  // Arms
  const sleeve = g.top;
  parts.push(<path key="armL" {...p(sleeve)} d="M59 102 Q46 140 50 178 L58 178 Q58 142 67 108 Z" />);
  parts.push(<circle key="handL" {...(p(SKIN.groom) as SVGProps<SVGCircleElement>)} cx={54} cy={182} r={4.2} />);
  parts.push(<path key="armR" {...p(sleeve)} d="M104 102 Q118 126 124 145 L117 150 Q109 132 97 110 Z" />);
  parts.push(<circle key="handR" {...(p(SKIN.groom) as SVGProps<SVGCircleElement>)} cx={122} cy={150} r={4.2} />);
  // Neck
  parts.push(<path key="neck" {...p(SKIN.groom)} d="M77 84 L87 84 L88 98 L76 98 Z" />);
  return <g>{parts}</g>;
}

function Bride({ o, p, detail, line, ink }: { o: Outfit; p: P; detail: D; line: boolean; ink: string }) {
  const b = o.bride;
  const parts: ReactNode[] = [];
  if (b.skirt === 'lehenga' || b.skirt === 'gown') {
    const flare = b.skirt === 'gown' ? 8 : 0;
    parts.push(<path key="skirt" {...p(b.skirtColor)} d={`M140 136 Q158 130 176 136 L${210 + flare} 283 Q158 296 ${106 - flare} 283 Z`} />);
    parts.push(<path key="border" {...p(b.border)} d={`M${108 - flare} 273 Q158 286 ${208 + flare} 273 L${210 + flare} 283 Q158 296 ${106 - flare} 283 Z`} />);
    // Embroidered kalis
    for (let i = -3; i <= 3; i++) parts.push(<path key={`kali${i}`} {...detail(b.border, 0.8)} d={`M${158 + i * 5} 142 L${158 + i * 13} 272`} />);
    if (b.skirt === 'gown') for (let i = 0; i < 14; i++) parts.push(<circle key={`lace${i}`} cx={118 + i * 6.4} cy={262 + Math.sin(i) * 2} r={1.2} fill={line ? 'none' : '#E7DCCB'} stroke={line ? ink : 'none'} />);
  } else {
    parts.push(<path key="saree" {...p(b.skirtColor)} d="M143 136 L175 136 L186 284 L132 284 Z" />);
    parts.push(<path key="sborder" {...p(b.border)} d="M133 273 L185 273 L186 284 L132 284 Z" />);
    for (let i = 0; i < 4; i++) parts.push(<path key={`pleat${i}`} {...detail(b.border, 0.8)} d={`M${153 + i * 3} 150 L${148 + i * 4} 272`} />);
    if (b.skirt === 'nauvari') parts.push(<path key="tuck" {...detail('#0f4a2e', 1.2)} d="M159 140 L159 284" />);
  }
  // Blouse / bodice
  parts.push(<path key="choli" {...p(b.blouse)} d="M144 102 Q158 97 172 102 L176 138 L140 138 Z" />);
  parts.push(<path key="neck" {...p(SKIN.bride)} d="M153 88 L163 88 L164 101 L152 101 Z" />);
  // Pallu over the shoulder for sarees
  if (b.skirt !== 'lehenga' && b.skirt !== 'gown') {
    parts.push(<path key="pallu" {...p(b.skirtColor)} d="M171 101 Q150 128 139 178 L131 176 Q143 124 164 98 Z" />);
    parts.push(<path key="pallub" {...detail(b.border, 2)} d="M168 101 Q147 128 136 177" />);
  }
  // Arms (left reaches to the groom's hand)
  parts.push(<path key="armL" {...p(SKIN.bride)} d="M145 104 Q132 128 126 147 L132 151 Q139 132 152 110 Z" />);
  parts.push(<path key="armR" {...p(SKIN.bride)} d="M171 104 Q184 140 182 176 L176 176 Q176 140 165 110 Z" />);
  // Bangles (chooda)
  parts.push(<path key="bangle" {...detail(line ? ink : '#C8102E', 2.2)} d="M127 141 L133 144 M177 166 L183 166" />);
  parts.push(<circle key="handR" {...(p(SKIN.bride) as SVGProps<SVGCircleElement>)} cx={179} cy={180} r={3.8} />);
  // Necklace
  parts.push(<path key="haar" {...detail(line ? ink : '#E2B04A', 1.6)} d="M150 100 Q158 114 166 100" />);
  if (b.extra.includes('phulkari')) for (let i = 0; i < 9; i++) parts.push(<circle key={`ph${i}`} cx={146 + (i % 3) * 8 + (i > 5 ? 22 : 0)} cy={130 + Math.floor(i / 3) * 22} r={1.5} fill={line ? 'none' : '#FFD54F'} stroke={line ? ink : 'none'} />);
  if (b.extra.includes('bouquet')) {
    [[124, 150, '#F7C6D0'], [130, 146, '#FFFFFF'], [127, 156, '#F4A7B9'], [133, 153, '#FFFFFF']].forEach(([x, y, c], i) =>
      parts.push(<circle key={`bq${i}`} {...(p(c as string) as SVGProps<SVGCircleElement>)} cx={x as number} cy={y as number} r={5} />),
    );
  }
  return <g>{parts}</g>;
}

function Face({ cx, cy, r, skin, style, p, detail, ink, bride }: { cx: number; cy: number; r: number; skin: string; style: CoupleStyle; p: P; detail: D; ink: string; bride: boolean }) {
  const cartoon = style === 'caricature';
  return (
    <g>
      <circle {...(p(skin) as SVGProps<SVGCircleElement>)} cx={cx} cy={cy} r={r} />
      {cartoon ? (
        <>
          {[-1, 1].map((s) => (
            <g key={s}>
              <ellipse cx={cx + s * r * 0.36} cy={cy + r * 0.02} rx={r * 0.17} ry={r * 0.21} fill="#fff" stroke="#3B2A22" strokeWidth={0.8} />
              <circle cx={cx + s * r * 0.36 + r * 0.02} cy={cy + r * 0.05} r={r * 0.1} fill="#2B1A12" />
              <circle cx={cx + s * r * 0.36 + r * 0.05} cy={cy + r * 0.01} r={r * 0.035} fill="#fff" />
              <circle cx={cx + s * r * 0.58} cy={cy + r * 0.32} r={r * 0.11} fill={SKIN.blush} opacity={0.55} />
            </g>
          ))}
          <path d={`M${cx - r * 0.22} ${cy + r * 0.38} Q${cx} ${cy + r * 0.62} ${cx + r * 0.22} ${cy + r * 0.38}`} fill={bride ? SKIN.lip : '#7A3B2E'} stroke="#3B2A22" strokeWidth={0.8} />
        </>
      ) : (
        <>
          <path {...detail(style === 'lineart' ? ink : '#3B2A22', 0.9)} d={`M${cx - r * 0.48} ${cy + r * 0.02} q${r * 0.15} ${r * 0.13} ${r * 0.3} 0 M${cx + r * 0.18} ${cy + r * 0.02} q${r * 0.15} ${r * 0.13} ${r * 0.3} 0`} />
          <path {...detail(style === 'lineart' ? ink : SKIN.lip, 1.2)} d={`M${cx - r * 0.16} ${cy + r * 0.45} q${r * 0.16} ${r * 0.14} ${r * 0.32} 0`} />
        </>
      )}
      {bride ? <circle cx={cx} cy={cy - r * 0.42} r={r * 0.07} fill={style === 'lineart' ? 'none' : '#C8102E'} stroke={style === 'lineart' ? ink : 'none'} /> : <path {...detail(style === 'lineart' ? ink : '#C8102E', 1.4)} d={`M${cx} ${cy - r * 0.55} L${cx} ${cy - r * 0.3}`} />}
    </g>
  );
}

function GroomHead({ o, head, p, detail, line, ink }: { o: Outfit; head: { cx: number; cy: number; r: number }; p: P; detail: D; line: boolean; ink: string }) {
  const { cx, cy, r } = head;
  const g = o.groom;
  const top = cy - r;
  switch (g.head) {
    case 'safa':
    case 'pheta':
    case 'sehra':
      return (
        <g>
          <path {...p(g.headColor)} d={`M${cx - r * 1.12} ${cy - r * 0.25} Q${cx - r * 1.25} ${top - r * 0.95} ${cx} ${top - r * 0.9} Q${cx + r * 1.25} ${top - r * 0.95} ${cx + r * 1.12} ${cy - r * 0.25} Q${cx} ${cy - r * 0.62} ${cx - r * 1.12} ${cy - r * 0.25} Z`} />
          <path {...detail(line ? ink : '#00000033', 0.9)} d={`M${cx - r} ${cy - r * 0.55} Q${cx} ${top - r * 0.2} ${cx + r} ${cy - r * 0.55} M${cx - r * 0.95} ${cy - r * 0.85} Q${cx} ${top - r * 0.55} ${cx + r * 0.95} ${cy - r * 0.85}`} />
          {g.head === 'safa' && (
            <>
              <path {...p('#FFFFFF')} d={`M${cx + r * 0.45} ${top - r * 0.55} q${r * 0.55} ${-r * 0.95} ${r * 0.15} ${-r * 1.55} q${-r * 0.15} ${r * 0.7} ${-r * 0.5} ${r * 1.2} Z`} />
              <circle cx={cx + r * 0.42} cy={top - r * 0.42} r={r * 0.17} fill={line ? 'none' : '#E2B04A'} stroke={line ? ink : '#9B1C31'} strokeWidth={0.8} />
            </>
          )}
          {g.head === 'pheta' && <Mundavalya cx={cx} cy={cy} r={r} line={line} ink={ink} />}
          {g.head === 'sehra' && Array.from({ length: 7 }, (_, i) => <Beads key={i} x1={cx - r * 0.75 + i * r * 0.25} y1={cy - r * 0.55} x2={cx - r * 0.75 + i * r * 0.25} y2={cy + r * 1.05} n={7} color="#FFFFFF" r={r * 0.09} line={line} ink={ink} />)}
        </g>
      );
    case 'dastar':
      return (
        <g>
          <path {...p(g.headColor)} d={`M${cx - r * 1.08} ${cy - r * 0.2} Q${cx - r * 1.2} ${top - r * 1.1} ${cx} ${top - r * 1.25} Q${cx + r * 1.2} ${top - r * 1.1} ${cx + r * 1.08} ${cy - r * 0.2} L${cx} ${cy - r * 0.75} Z`} />
          <path {...detail(line ? ink : '#00000033', 0.9)} d={`M${cx - r * 0.9} ${cy - r * 0.5} L${cx} ${top - r * 0.9} L${cx + r * 0.9} ${cy - r * 0.5}`} />
          {g.beard && <path {...p(SKIN.hair)} d={`M${cx - r * 0.85} ${cy + r * 0.05} Q${cx - r * 0.8} ${cy + r * 1.45} ${cx} ${cy + r * 1.5} Q${cx + r * 0.8} ${cy + r * 1.45} ${cx + r * 0.85} ${cy + r * 0.05} Q${cx + r * 0.55} ${cy + r * 0.85} ${cx} ${cy + r * 0.75} Q${cx - r * 0.55} ${cy + r * 0.85} ${cx - r * 0.85} ${cy + r * 0.05} Z`} />}
        </g>
      );
    case 'topor':
      return (
        <g>
          <path {...p(g.headColor)} d={`M${cx - r * 0.85} ${cy - r * 0.55} L${cx} ${top - r * 2.4} L${cx + r * 0.85} ${cy - r * 0.55} Z`} />
          <path {...detail(line ? ink : '#C9973F', 1)} d={`M${cx - r * 0.65} ${cy - r * 0.9} L${cx - r * 0.3} ${cy - r * 1.4} L${cx} ${cy - r * 0.95} L${cx + r * 0.3} ${cy - r * 1.4} L${cx + r * 0.65} ${cy - r * 0.9} M${cx - r * 0.35} ${top - r * 0.8} L${cx} ${top - r * 1.4} L${cx + r * 0.35} ${top - r * 0.8}`} />
          <circle cx={cx} cy={top - r * 2.45} r={r * 0.12} fill={line ? 'none' : '#C9973F'} stroke={line ? ink : 'none'} />
        </g>
      );
    default:
      return <path {...p(SKIN.hair)} d={`M${cx - r} ${cy - r * 0.2} Q${cx - r * 0.95} ${top - r * 0.35} ${cx} ${top - r * 0.3} Q${cx + r * 0.95} ${top - r * 0.35} ${cx + r} ${cy - r * 0.2} Q${cx + r * 0.6} ${cy - r * 0.7} ${cx} ${cy - r * 0.62} Q${cx - r * 0.6} ${cy - r * 0.7} ${cx - r} ${cy - r * 0.2} Z`} />;
  }
}

function BrideHead({ o, head, p, detail, line, ink }: { o: Outfit; head: { cx: number; cy: number; r: number }; p: P; detail: D; line: boolean; ink: string }) {
  const { cx, cy, r } = head;
  const gold = line ? ink : '#E2B04A';
  const ex = o.bride.extra;
  return (
    <g>
      {/* Maang tikka */}
      <path {...detail(gold, 1)} d={`M${cx} ${cy - r * 0.95} L${cx} ${cy - r * 0.62}`} />
      <circle cx={cx} cy={cy - r * 0.57} r={r * 0.1} fill={line ? 'none' : gold} stroke={line ? ink : 'none'} />
      {ex.includes('sindoor') && <path {...detail(line ? ink : '#C8102E', 1.4)} d={`M${cx} ${cy - r * 1.02} L${cx} ${cy - r * 0.8}`} />}
      {ex.includes('nath') && <circle cx={cx - r * 0.22} cy={cy + r * 0.28} r={r * 0.2} fill="none" stroke={gold} strokeWidth={0.9} />}
      {ex.includes('mukut') && (
        <path {...p('#FFFDF7')} d={`M${cx - r * 0.95} ${cy - r * 0.7} Q${cx - r * 0.7} ${cy - r * 1.9} ${cx} ${cy - r * 1.75} Q${cx + r * 0.7} ${cy - r * 1.9} ${cx + r * 0.95} ${cy - r * 0.7} Q${cx} ${cy - r * 1.1} ${cx - r * 0.95} ${cy - r * 0.7} Z`} />
      )}
      {ex.includes('mundavalya') && <Mundavalya cx={cx} cy={cy} r={r} line={line} ink={ink} />}
      {ex.includes('jhoomar') && <path {...detail(gold, 1)} d={`M${cx - r * 0.7} ${cy - r * 0.8} l${-r * 0.35} ${r * 0.5} M${cx - r * 0.7} ${cy - r * 0.8} l${-r * 0.15} ${r * 0.62} M${cx - r * 0.7} ${cy - r * 0.8} l${r * 0.05} ${r * 0.62}`} />}
      {/* Earrings */}
      <circle cx={cx - r * 0.98} cy={cy + r * 0.3} r={r * 0.11} fill={line ? 'none' : gold} stroke={line ? ink : 'none'} />
      <circle cx={cx + r * 0.98} cy={cy + r * 0.3} r={r * 0.11} fill={line ? 'none' : gold} stroke={line ? ink : 'none'} />
    </g>
  );
}

function Mundavalya({ cx, cy, r, line, ink }: { cx: number; cy: number; r: number; line: boolean; ink: string }) {
  return (
    <g>
      <Beads x1={cx - r * 0.9} y1={cy - r * 0.7} x2={cx - r * 0.95} y2={cy + r * 0.9} n={8} color="#FFF8E7" r={r * 0.08} line={line} ink={ink} />
      <Beads x1={cx + r * 0.9} y1={cy - r * 0.7} x2={cx + r * 0.95} y2={cy + r * 0.9} n={8} color="#FFF8E7" r={r * 0.08} line={line} ink={ink} />
    </g>
  );
}

function Beads({ x1, y1, x2, y2, n, color, r, line, ink }: { x1: number; y1: number; x2: number; y2: number; n: number; color: string; r: number; line: boolean; ink: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = i / Math.max(n - 1, 1);
        return <circle key={i} cx={x1 + (x2 - x1) * t} cy={y1 + (y2 - y1) * t} r={r} fill={line ? 'none' : color} stroke={line ? ink : '#00000022'} strokeWidth={0.5} />;
      })}
    </g>
  );
}

/** Varmala: alternating flowers along a U-shaped curve. */
function Garland({ cx, top, depth, width, colors, line, ink }: { cx: number; top: number; depth: number; width: number; colors: [string, string]; line: boolean; ink: string }) {
  const n = 15;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const t = i / (n - 1);
        const x = cx - width / 2 + width * t;
        const y = top + depth * Math.sin(Math.PI * t);
        return <circle key={i} cx={x} cy={y} r={2.9} fill={line ? 'none' : colors[i % 2]} stroke={line ? ink : '#00000026'} strokeWidth={0.6} />;
      })}
    </g>
  );
}
