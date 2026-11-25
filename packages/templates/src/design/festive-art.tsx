import type { ReactNode } from 'react';
import type { AssetRenderProps } from './assets';

/**
 * Festival, celebration and travel art (Nov 2026): flat SVG illustrations with colour slots,
 * drawn in code (no images to download), so every card, sticker and colourway can recolour them.
 * Each is drawn in its own viewBox and scaled to the layer box.
 */

type Art = (p: AssetRenderProps) => ReactNode;

const svg = (w: number, h: number, vw: number, vh: number, body: ReactNode) => (
  <svg width={w} height={h} viewBox={`0 0 ${vw} ${vh}`} preserveAspectRatio="xMidYMid meet" aria-hidden>
    {body}
  </svg>
);

/** Christmas tree with a star, baubles and a garland. c = [green, gold, red] */
export const XmasTree: Art = ({ w, h, c }) =>
  svg(w, h, 200, 260, (
    <>
      <rect x="88" y="222" width="24" height="30" rx="3" fill="#7A4B2A" />
      {[
        [100, 40, 60, 110],
        [100, 85, 78, 165],
        [100, 135, 96, 228],
      ].map(([cx, top, half, bottom], i) => (
        <path key={i} d={`M${cx} ${top}L${cx! + half!} ${bottom}H${cx! - half!}Z`} fill={c[0]} stroke={c[0]} strokeWidth="6" strokeLinejoin="round" />
      ))}
      <path d="M58 118q42 22 84 -4M44 172q56 26 114 -6" stroke={c[1]} strokeWidth="4" fill="none" strokeLinecap="round" />
      {[[80, 100], [124, 128], [70, 160], [130, 182], [100, 205], [62, 214]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="7" fill={i % 2 ? c[1] : c[2]} />
      ))}
      <path d="M100 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z" fill={c[1]} />
    </>
  ));

/** Rakhi: a centre flower medallion on a thread. c = [thread, gold, centre] */
export const Rakhi: Art = ({ w, h, c }) =>
  svg(w, h, 300, 140, (
    <>
      <path d="M8 70C70 60 110 70 150 70S230 80 292 70" stroke={c[0]} strokeWidth="6" fill="none" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <ellipse key={i} cx="150" cy="36" rx="16" ry="30" fill={c[1]} transform={`rotate(${i * 45} 150 70)`} opacity="0.95" />
      ))}
      <circle cx="150" cy="70" r="30" fill={c[2]} />
      <circle cx="150" cy="70" r="16" fill={c[1]} />
      <circle cx="150" cy="70" r="6" fill={c[0]} />
      {[22, 278].map((x) => (
        <g key={x}>
          <circle cx={x} cy="70" r="7" fill={c[1]} />
          <path d={`M${x} 77l-6 26M${x} 77l6 26`} stroke={c[0]} strokeWidth="3" />
        </g>
      ))}
    </>
  ));

/** Holi colour burst: overlapping powder clouds. c = 4 colours */
export const ColorBurst: Art = ({ w, h, c }) =>
  svg(w, h, 300, 300, (
    <>
      {[
        [110, 120, 80, 0],
        [190, 110, 72, 1],
        [150, 190, 86, 2],
        [90, 200, 56, 3],
        [215, 200, 60, 0],
      ].map(([x, y, r, k], i) => (
        <g key={i} opacity="0.85">
          <circle cx={x} cy={y} r={r} fill={c[k!]} opacity="0.55" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((j) => {
            const a = (j / 9) * Math.PI * 2 + i;
            return <circle key={j} cx={x! + Math.cos(a) * r! * 0.95} cy={y! + Math.sin(a) * r! * 0.95} r={r! * 0.22} fill={c[k!]} opacity="0.6" />;
          })}
        </g>
      ))}
      {[...Array(26)].map((_, i) => {
        const a = i * 2.39;
        const d = 120 + (i % 5) * 7;
        return <circle key={i} cx={150 + Math.cos(a) * d} cy={150 + Math.sin(a) * d * 0.9} r={2 + (i % 3)} fill={c[i % 4]} />;
      })}
    </>
  ));

/** Fireworks: three bursts of rays and sparks. c = [gold, pink, white] */
export const Fireworks: Art = ({ w, h, c, t }) =>
  svg(w, h, 320, 260, (
    <>
      {[
        [90, 90, 62, 0],
        [220, 70, 52, 1],
        [180, 175, 44, 2],
      ].map(([x, y, r, k], i) => {
        const pulse = 1 + 0.06 * Math.sin(t * 3 + i);
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${pulse})`}>
            {[...Array(16)].map((_, j) => {
              const a = (j / 16) * Math.PI * 2;
              return <line key={j} x1={Math.cos(a) * r! * 0.25} y1={Math.sin(a) * r! * 0.25} x2={Math.cos(a) * r!} y2={Math.sin(a) * r!} stroke={c[k!]} strokeWidth="3" strokeLinecap="round" />;
            })}
            {[...Array(8)].map((_, j) => {
              const a = (j / 8) * Math.PI * 2 + 0.2;
              return <circle key={j} cx={Math.cos(a) * r! * 1.15} cy={Math.sin(a) * r! * 1.15} r="3" fill={c[k!]} />;
            })}
          </g>
        );
      })}
    </>
  ));

/** Kite with a tail of bows. c = [kite, second, string] */
export const Kite: Art = ({ w, h, c }) =>
  svg(w, h, 200, 300, (
    <>
      <path d="M100 10L170 90L100 190L30 90Z" fill={c[0]} />
      <path d="M100 10L100 190M30 90H170" stroke={c[1]} strokeWidth="4" />
      <path d="M100 10L170 90L100 90Z" fill={c[1]} opacity="0.85" />
      <path d="M100 190C90 220 120 240 100 270S110 290 104 298" stroke={c[2]} strokeWidth="3" fill="none" />
      {[215, 245, 275].map((y, i) => (
        <path key={y} d={`M${100 + (i % 2 ? 6 : -6)} ${y}l-14 -8v16zM${100 + (i % 2 ? 6 : -6)} ${y}l14 -8v16z`} fill={i % 2 ? c[0] : c[1]} />
      ))}
    </>
  ));

/** Dandiya: two crossed sticks with ribbons and a garba pot. c = [stick, ribbon, pot] */
export const Dandiya: Art = ({ w, h, c }) =>
  svg(w, h, 260, 240, (
    <>
      <ellipse cx="130" cy="200" rx="60" ry="34" fill={c[2]} />
      <ellipse cx="130" cy="172" rx="34" ry="8" fill="#000" opacity="0.15" />
      {[0, 1, 2, 3, 4].map((i) => (
        <circle key={i} cx={95 + i * 17} cy="205" r="5" fill="#FFF3D6" />
      ))}
      {[-1, 1].map((s) => (
        <g key={s} transform={`rotate(${s * 32} 130 120)`}>
          <rect x="124" y="10" width="12" height="190" rx="6" fill={c[0]} />
          {[40, 80, 120, 160].map((y) => (
            <rect key={y} x="124" y={y} width="12" height="8" fill={c[1]} />
          ))}
        </g>
      ))}
    </>
  ));

/** Lohri bonfire with logs and flames. c = [orange, yellow, wood] */
export const Bonfire: Art = ({ w, h, c, t }) => {
  const f = 1 + 0.05 * Math.sin(t * 8);
  return svg(w, h, 240, 240, (
    <>
      <g transform={`translate(120 160) scale(1 ${f}) translate(-120 -160)`}>
        <path d="M120 20C150 70 180 90 170 140C165 170 145 180 120 180S75 170 70 140C60 95 105 80 120 20Z" fill={c[0]} />
        <path d="M120 70C138 100 155 115 150 145C146 165 135 172 120 172S94 165 90 145C86 118 110 105 120 70Z" fill={c[1]} />
      </g>
      <rect x="40" y="178" width="160" height="22" rx="11" fill={c[2]} transform="rotate(12 120 189)" />
      <rect x="40" y="178" width="160" height="22" rx="11" fill={c[2]} transform="rotate(-12 120 189)" />
    </>
  ));
};

/** Pongal pot overflowing, with sugarcane. c = [pot, gold, cane] */
export const PongalPot: Art = ({ w, h, c }) =>
  svg(w, h, 260, 260, (
    <>
      {[-1, 1].map((s) => (
        <g key={s} transform={`rotate(${s * 14} 130 250)`}>
          <rect x={130 + s * 90 - 6} y="20" width="12" height="230" rx="6" fill={c[2]} />
          <path d={`M${130 + s * 90} 30q${s * 30} -10 ${s * 40} -30`} stroke={c[2]} strokeWidth="6" fill="none" />
        </g>
      ))}
      <path d="M70 120C70 210 190 210 190 120C190 100 170 92 130 92S70 100 70 120Z" fill={c[0]} />
      <rect x="78" y="88" width="104" height="18" rx="9" fill={c[1]} />
      <path d="M86 92C80 60 110 50 130 66C150 48 182 60 174 92Z" fill="#FFF6E5" />
      <path d="M84 150q46 18 92 0" stroke={c[1]} strokeWidth="5" fill="none" />
    </>
  ));

/** Shankh (conch). c = [shell, gold] */
export const Shankh: Art = ({ w, h, c }) =>
  svg(w, h, 260, 180, (
    <>
      <path d="M30 100C30 50 120 20 200 50C240 64 240 110 200 124C150 142 60 150 30 100Z" fill={c[0]} stroke={c[1]} strokeWidth="5" />
      <path d="M200 50C230 70 228 104 200 124" stroke={c[1]} strokeWidth="4" fill="none" />
      {[70, 105, 140, 170].map((x) => (
        <path key={x} d={`M${x} ${62 - (x - 70) * 0.05}C${x - 10} 90 ${x - 6} 115 ${x + 4} 132`} stroke={c[1]} strokeWidth="3" fill="none" opacity="0.7" />
      ))}
      <path d="M30 100l-20 10 18 6" fill={c[1]} />
    </>
  ));

/** Krishna's flute with a peacock feather. c = [flute, feather blue, feather green] */
export const Flute: Art = ({ w, h, c }) =>
  svg(w, h, 320, 200, (
    <>
      <rect x="20" y="120" width="280" height="18" rx="9" fill={c[0]} transform="rotate(-12 160 129)" />
      {[70, 110, 150, 190].map((x) => (
        <circle key={x} cx={x} cy={150 - (x - 20) * 0.21} r="4" fill="#3B2412" />
      ))}
      <g transform="rotate(-38 230 90)">
        <path d="M230 170C226 120 228 60 236 10" stroke={c[2]} strokeWidth="3" fill="none" />
        <ellipse cx="236" cy="44" rx="30" ry="46" fill={c[2]} opacity="0.9" />
        <ellipse cx="236" cy="40" rx="18" ry="26" fill="#E8B84A" />
        <ellipse cx="236" cy="38" rx="11" ry="16" fill={c[1]} />
        <ellipse cx="236" cy="36" rx="5" ry="7" fill="#0B2A4A" />
      </g>
      <path d="M60 142q-10 30 6 46M60 142q14 26 2 48" stroke="#C9973F" strokeWidth="3" fill="none" />
    </>
  ));

/** Graduation cap with tassel. c = [cap, tassel] */
export const GradCap: Art = ({ w, h, c }) =>
  svg(w, h, 260, 200, (
    <>
      <path d="M130 20L250 70L130 120L10 70Z" fill={c[0]} />
      <path d="M70 95V145C70 165 190 165 190 145V95L130 120Z" fill={c[0]} opacity="0.88" />
      <path d="M130 70L210 92V150" stroke={c[1]} strokeWidth="4" fill="none" />
      <path d="M204 150h12l4 30h-20z" fill={c[1]} />
      <circle cx="130" cy="70" r="6" fill={c[1]} />
    </>
  ));

/** Suitcase with travel stickers. c = [case, accent] */
export const Suitcase: Art = ({ w, h, c }) =>
  svg(w, h, 220, 240, (
    <>
      <rect x="80" y="20" width="60" height="34" rx="10" fill="none" stroke="#3A2A1A" strokeWidth="8" />
      <rect x="20" y="50" width="180" height="160" rx="18" fill={c[0]} />
      {[60, 110, 160].map((x) => (
        <rect key={x} x={x - 4} y="50" width="8" height="160" fill="#000" opacity="0.12" />
      ))}
      <circle cx="70" cy="110" r="22" fill={c[1]} />
      <rect x="120" y="140" width="56" height="34" rx="6" fill="#FFF6E5" transform="rotate(-10 148 157)" />
      {[60, 160].map((x) => (
        <circle key={x} cx={x} cy="222" r="10" fill="#2B2B2B" />
      ))}
    </>
  ));

/** Palm tree on a small island. c = [leaves, trunk, sand] */
export const Palm: Art = ({ w, h, c, t }) => {
  const sway = Math.sin(t * 1.4) * 3;
  return svg(w, h, 240, 280, (
    <>
      <ellipse cx="120" cy="262" rx="100" ry="16" fill={c[2]} />
      <path d="M124 262C120 200 110 140 126 80" stroke={c[1]} strokeWidth="14" fill="none" strokeLinecap="round" />
      <g transform={`rotate(${sway} 126 80)`}>
        {[-150, -110, -70, -30, 10, 40].map((a) => (
          <path key={a} d="M126 80c30 -20 70 -16 96 6c-34 -6 -64 -2 -96 -6z" fill={c[0]} transform={`rotate(${a + 90} 126 80)`} />
        ))}
        <circle cx="122" cy="88" r="8" fill="#6B4423" />
        <circle cx="134" cy="90" r="8" fill="#6B4423" />
      </g>
    </>
  ));
};

/** Two cocktail glasses clinking. c = [drink, garnish] */
export const Cocktail: Art = ({ w, h, c }) =>
  svg(w, h, 260, 240, (
    <>
      {[-1, 1].map((s) => (
        <g key={s} transform={`rotate(${s * 14} 130 220)`}>
          <path d={`M${130 + s * 46 - 42} 50h84l-42 60z`} fill={c[0]} opacity="0.85" />
          <path d={`M${130 + s * 46 - 42} 50h84l-42 60z`} fill="none" stroke="#FFFFFF" strokeWidth="3" />
          <path d={`M${130 + s * 46} 110v78M${130 + s * 46 - 22} 190h44`} stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" />
          <circle cx={130 + s * 46 + 26} cy="50" r="10" fill={c[1]} />
        </g>
      ))}
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${120 + i * 10} ${24 - i * 4}l4 -12`} stroke={c[1]} strokeWidth="3" strokeLinecap="round" />
      ))}
    </>
  ));

/** Six-armed snowflake. c = [ice] */
export const Snowflake: Art = ({ w, h, c, t }) =>
  svg(w, h, 200, 200, (
    <g transform={`rotate(${t * 8} 100 100)`} stroke={c[0]} strokeWidth="6" strokeLinecap="round" fill="none">
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 100 100)`}>
          <path d="M100 14V186" />
          {[44, 156].map((y) => (
            <path key={y} d={`M100 ${y}l-16 ${y < 100 ? -16 : 16}M100 ${y}l16 ${y < 100 ? -16 : 16}`} />
          ))}
        </g>
      ))}
    </g>
  ));

/** Puja thali with a diya, roli and rice. c = [plate, flame, roli] */
export const Thali: Art = ({ w, h, c, t }) => {
  const flick = 1 + 0.08 * Math.sin(t * 9);
  return svg(w, h, 280, 180, (
    <>
      <ellipse cx="140" cy="120" rx="130" ry="46" fill={c[0]} />
      <ellipse cx="140" cy="112" rx="112" ry="36" fill="#FFF3D6" opacity="0.35" />
      <path d="M118 104q22 18 44 0q-6 16 -22 16t-22 -16z" fill="#B8860B" />
      <g transform={`translate(140 100) scale(1 ${flick}) translate(-140 -100)`}>
        <path d="M140 56c10 16 12 28 0 42c-12 -14 -10 -26 0 -42z" fill={c[1]} />
      </g>
      <circle cx="80" cy="116" r="14" fill={c[2]} />
      <circle cx="200" cy="116" r="14" fill="#FFFFFF" />
      {[0, 1, 2, 3].map((i) => (
        <circle key={i} cx={196 + (i % 2) * 8} cy={112 + Math.floor(i / 2) * 7} r="2" fill="#E8D8A8" />
      ))}
    </>
  ));
};

/** Henna hand: a palm with mehendi patterns. c = [henna, skin] */
export const HennaHand: Art = ({ w, h, c }) =>
  svg(w, h, 200, 280, (
    <>
      <path d="M50 270V170C30 150 22 120 30 104C38 92 52 98 56 112L62 130V40C62 26 82 26 82 40V110V24C82 10 102 10 102 24V110V30C102 16 122 16 122 30V114V48C122 34 142 34 142 48V160C142 200 130 230 120 270Z" fill={c[1]} />
      <g stroke={c[0]} strokeWidth="2.6" fill="none">
        <circle cx="96" cy="170" r="22" />
        <circle cx="96" cy="170" r="12" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M96 142q6 -8 0 -14q-6 6 0 14" transform={`rotate(${a} 96 170)`} />
        ))}
        {[72, 92, 112, 132].map((x) => (
          <path key={x} d={`M${x} 60h${x === 72 ? 0 : 0}m-8 0h16M${x} 80l-6 10h12z`} />
        ))}
        <path d="M60 230q36 12 72 0M64 246q32 10 64 0" />
      </g>
      {[72, 92, 112, 132].map((x) => (
        <circle key={x} cx={x} cy="34" r="6" fill={c[0]} />
      ))}
    </>
  ));

/** Champagne bottle popping with bubbles. c = [bottle, foil, bubbles] */
export const Champagne: Art = ({ w, h, c, t }) =>
  svg(w, h, 200, 300, (
    <>
      <g transform="rotate(-18 100 200)">
        <path d="M80 120C80 100 88 90 90 60H110C112 90 120 100 120 120V280H80Z" fill={c[0]} />
        <rect x="88" y="40" width="24" height="34" rx="4" fill={c[1]} />
        <rect x="82" y="170" width="36" height="50" rx="4" fill={c[1]} opacity="0.85" />
      </g>
      {[...Array(12)].map((_, i) => {
        const y = (30 - ((t * 40 + i * 23) % 60)) + 10;
        return <circle key={i} cx={60 + (i % 4) * 12 + Math.sin(i) * 6} cy={y + i * 2} r={3 + (i % 3)} fill={c[2]} opacity="0.85" />;
      })}
    </>
  ));
