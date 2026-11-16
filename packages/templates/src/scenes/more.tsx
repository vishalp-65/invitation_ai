import type { ReactNode } from 'react';
import { loop, q, rnd } from './anim';
import { ArchRow, Bouquet, Chhatri, Crenels, Dome, Flower, Hills, Leaf, Palm, roundArch, Water } from './parts';
import type { SceneDef } from './types';

/**
 * 2026 premium collection scenes (placeholders until painted art lands): Udaipur lake palace,
 * Goa beach, Kerala backwaters, Varanasi ghats, Himalayan pines, Jaipur blue pottery,
 * Bombay art deco and a Pichwai lotus pond. No sacred marks: faith art comes from the event.
 */

// ---------------- extra parts ----------------

function Lotus({ x, y, s, color, light }: { x: number; y: number; s: number; color: string; light: string }) {
  return (
    <g transform={`translate(${q(x)} ${q(y)}) scale(${q(s)})`}>
      {[-60, -30, 0, 30, 60].map((a, i) => (
        <ellipse key={a} cx={0} cy={-9} rx={5} ry={12} transform={`rotate(${a})`} fill={i === 2 ? light : color} />
      ))}
      <ellipse cx={0} cy={0} rx={14} ry={3} fill={color} opacity={0.6} />
    </g>
  );
}

function LotusLeaf({ x, y, r, color, vein }: { x: number; y: number; r: number; color: string; vein: string }) {
  return (
    <g>
      <ellipse cx={q(x)} cy={q(y)} rx={q(r)} ry={q(r * 0.38)} fill={color} />
      <path d={`M${q(x)} ${q(y)}L${q(x + r * 0.9)} ${q(y - r * 0.1)}`} stroke={vein} strokeWidth={1} opacity={0.5} />
    </g>
  );
}

function Crane({ x, y, s, color, accent, flip = false }: { x: number; y: number; s: number; color: string; accent: string; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0C-14 -4 -20 -18 -10 -26C-4 -30 6 -28 8 -20L10 0Z" fill={color} />
      <path d="M6 -22C8 -40 4 -56 12 -62" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
      <circle cx={13} cy={-63} r={3.2} fill={color} />
      <circle cx={13.5} cy={-65} r={1.6} fill={accent} />
      <path d="M15 -63l12 3l-12 0z" fill={accent} />
      <line x1={-2} y1={0} x2={-4} y2={26} stroke={color} strokeWidth={1.5} />
      <line x1={4} y1={0} x2={6} y2={26} stroke={color} strokeWidth={1.5} />
    </g>
  );
}

function Pine({ x, y, h, color }: { x: number; y: number; h: number; color: string }) {
  const tiers = 4;
  return (
    <g>
      <rect x={q(x - h * 0.03)} y={q(y - h * 0.15)} width={q(h * 0.06)} height={q(h * 0.15)} fill="#4A3424" />
      {Array.from({ length: tiers }, (_, i) => {
        const top = y - h + i * h * 0.2;
        const w = h * (0.16 + i * 0.07);
        return <path key={i} d={`M${q(x)} ${q(top)}L${q(x + w)} ${q(top + h * 0.32)}L${q(x - w)} ${q(top + h * 0.32)}Z`} fill={color} />;
      })}
    </g>
  );
}

/** A catenary of warm bulbs between two points (fairy / string lights). */
function StringLights({ x1, y1, x2, y2, sag, bulb, wire, time, phase = 0 }: { x1: number; y1: number; x2: number; y2: number; sag: number; bulb: string; wire: string; time?: number; phase?: number }) {
  const n = Math.max(6, Math.round(Math.abs(x2 - x1) / 18));
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [q(x1 + (x2 - x1) * t), q(y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * sag)] as const;
  });
  // Two flicker groups (alternate bulbs) instead of one animation per bulb.
  return (
    <g>
      <path d={`M${x1} ${y1}Q${(x1 + x2) / 2} ${q((y1 + y2) / 2 + sag * 2)} ${x2} ${y2}`} stroke={wire} strokeWidth={0.8} fill="none" opacity={0.7} />
      {[0, 1].map((g) => {
        const m = loop('flicker', time, phase + g * 0.5);
        return (
          <g key={g} className={m.className} style={m.style}>
            {pts
              .filter((_, i) => i % 2 === g)
              .map(([px, py], i) => (
                <g key={i}>
                  <circle cx={px} cy={py + 3} r={5} fill={bulb} opacity={0.25} />
                  <circle cx={px} cy={py + 3} r={2} fill={bulb} />
                </g>
              ))}
          </g>
        );
      })}
    </g>
  );
}

function Houseboat({ x, y, s, hull, roof, trim }: { x: number; y: number; s: number; hull: string; roof: string; trim: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-90 0Q-100 -16 -112 -24Q-60 14 0 14Q60 14 112 -24Q100 -16 90 0Z" fill={hull} />
      <path d="M-62 -2Q-60 -46 0 -50Q60 -46 62 -2Z" fill={roof} />
      {[-40, -16, 8, 32].map((wx) => (
        <rect key={wx} x={wx} y={-30} width={12} height={16} rx={3} fill={trim} opacity={0.85} />
      ))}
      <path d="M-62 -2H62" stroke={trim} strokeWidth={2} />
    </g>
  );
}

function Vase({ x, y, s, body, ink }: { x: number; y: number; s: number; body: string; ink: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 -70C-14 -62 -10 -58 -18 -46C-34 -26 -30 -4 -18 0H18C30 -4 34 -26 18 -46C10 -58 14 -62 14 -70Z" fill={body} stroke={ink} strokeWidth={2} />
      <path d="M-22 -30C-10 -38 10 -38 22 -30" stroke={ink} strokeWidth={2} fill="none" />
      {[-14, 0, 14].map((cx) => (
        <circle key={cx} cx={cx} cy={-18} r={4} fill="none" stroke={ink} strokeWidth={1.6} />
      ))}
      <path d="M-14 -70H14" stroke={ink} strokeWidth={3} />
    </g>
  );
}

/** Blue pottery tile: circle rosette in cobalt on white. */
function Tile({ x, y, s, ink, light }: { x: number; y: number; s: number; ink: string; light: string }) {
  return (
    <g transform={`translate(${q(x)} ${q(y)})`}>
      <rect x={-s / 2} y={-s / 2} width={s} height={s} fill="#FFFFFF" stroke={light} strokeWidth={0.8} />
      {[0, 45, 90, 135].map((a) => (
        <ellipse key={a} cx={0} cy={0} rx={s * 0.4} ry={s * 0.12} transform={`rotate(${a})`} fill={a % 90 ? light : ink} />
      ))}
      <circle r={s * 0.1} fill={ink} />
    </g>
  );
}

// ---------------- scenes ----------------

export const MORE_SCENES: Record<string, SceneDef> = {
  'lake-palace': {
    far: (c) => <Hills y={560} amp={28} color={c.far} seed={21} />,
    mid: (c, t) => {
      const palace = (
        <g>
          <rect x={70} y={500} width={260} height={90} fill={c.mid} />
          <Crenels x={70} y={500} w={260} size={7} fill={c.mid} />
          <ArchRow x={78} y={530} w={244} h={50} n={9} fill={c.midShade} />
          <rect x={150} y={455} width={100} height={50} fill={c.mid} />
          <Dome cx={200} y={455} r={34} fill={c.mid} trim={c.trim} />
          <Chhatri cx={95} y={502} w={34} fill={c.mid} shade={c.midShade} trim={c.trim} />
          <Chhatri cx={305} y={502} w={34} fill={c.mid} shade={c.midShade} trim={c.trim} />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={q(91 + i * 27.1)} cy={560} r={3} fill={c.glow} opacity={0.85} />
          ))}
        </g>
      );
      return (
        <g>
          <Water y={588} color={c.water} glint={c.glow} time={t} />
          {palace}
          {/* reflection */}
          <g transform="translate(0 1176) scale(1 -1)" opacity={0.28}>
            {palace}
          </g>
        </g>
      );
    },
    near: (c, t) => (
      <g>
        <path d="M-10 760Q200 730 410 760V810H-10Z" fill={c.near} />
        <StringLights x1={-10} y1={40} x2={410} y2={40} sag={40} bulb={c.glow} wire={c.trim} time={t} />
        <Bouquet x={30} y={770} s={1.2} colors={c.bloom} leaf="#2E4A3A" kind="flower" seed={31} />
        <Bouquet x={372} y={772} s={1.2} colors={c.bloom} leaf="#2E4A3A" kind="flower" seed={32} />
      </g>
    ),
  },
  'beach-sunset': {
    far: (c, t) => (
      <g>
        <circle cx={200} cy={560} r={70} fill={c.glow} opacity={0.9} />
        <Water y={560} color={c.far} glint="#FFFFFF" time={t} />
      </g>
    ),
    mid: (c, t) => (
      <g>
        <path d="M-10 660Q200 630 410 660V810H-10Z" fill={c.mid} />
        {/* draped beach mandap */}
        {[120, 280].map((x) => (
          <rect key={x} x={x - 3} y={500} width={6} height={170} fill={c.midShade} />
        ))}
        <path d="M110 500H290" stroke={c.midShade} strokeWidth={6} />
        <path d="M117 504Q140 560 125 640M283 504Q260 560 275 640" stroke={c.trim} strokeWidth={10} fill="none" opacity={0.9} />
        <path d="M117 504Q200 540 283 504" stroke={c.trim} strokeWidth={8} fill="none" opacity={0.9} />
        <StringLights x1={20} y1={470} x2={380} y2={470} sag={30} bulb={c.glow} wire={c.midShade} time={t} />
      </g>
    ),
    near: (c, t) => (
      <g>
        <Palm x={20} y={800} s={1.6} color={c.near} time={t} />
        <Palm x={385} y={810} s={1.5} color={c.near} time={t} phase={0.4} />
      </g>
    ),
  },
  backwaters: {
    far: (c, t) => (
      <g>
        <rect x={-10} y={560} width={420} height={40} fill={c.far} />
        {[30, 70, 110, 300, 340, 380].map((x, i) => (
          <Palm key={x} x={x} y={600} s={0.7 + (i % 2) * 0.15} color={c.far} time={t} phase={i * 0.15} />
        ))}
      </g>
    ),
    mid: (c, t) => {
      const g = loop('glide', t, 0.2, 0.8);
      return (
        <g>
          <Water y={596} color={c.water} glint="#FFFFFF" time={t} />
          <g className={g.className} style={g.style}>
            <Houseboat x={200} y={680} s={1.1} hull={c.midShade} roof={c.mid} trim={c.trim} />
          </g>
        </g>
      );
    },
    near: (c) => (
      <g>
        {[-40, -18, 6].map((a, i) => (
          <Leaf key={i} x={18} y={720 + i * 26} len={150} angle={a - 40} color={c.near} />
        ))}
        {[40, 18, -6].map((a, i) => (
          <Leaf key={i} x={384} y={720 + i * 26} len={150} angle={a + 220} color={c.near} />
        ))}
        <Lotus x={90} y={780} s={1.2} color={c.bloom[2]!} light="#FFFFFF" />
        <Lotus x={320} y={786} s={1} color={c.bloom[2]!} light="#FFFFFF" />
      </g>
    ),
  },
  ghats: {
    far: (c) => (
      <g>
        {Array.from({ length: 10 }, (_, i) => {
          const w = 30 + rnd(i, 4) * 20;
          const h = 60 + rnd(i, 5) * 70;
          const x = i * 42 - 10;
          return (
            <g key={i}>
              <rect x={x} y={q(560 - h)} width={q(w)} height={q(h + 40)} fill={c.far} />
              {rnd(i, 6) > 0.6 && <Dome cx={q(x + w / 2)} y={q(560 - h)} r={q(w * 0.4)} fill={c.far} trim={c.far} />}
              <rect x={q(x + w * 0.3)} y={q(560 - h * 0.6)} width={4} height={6} fill={c.glow} opacity={0.6} />
            </g>
          );
        })}
      </g>
    ),
    mid: (c, t) => (
      <g>
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={-10} y={560 + i * 10} width={420} height={10} fill={i % 2 ? c.mid : c.midShade} />
        ))}
        <Water y={650} color={c.water} glint={c.glow} time={t} />
        {/* floating diyas: two flicker groups */}
        {[0, 1].map((g) => {
          const m = loop('flicker', t, g * 0.5);
          return (
            <g key={g} className={m.className} style={m.style}>
              {Array.from({ length: 7 }, (_, k) => {
                const i = k * 2 + g;
                const x = q(30 + rnd(i, 7) * 340);
                const y = q(680 + rnd(i, 8) * 110);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y - 4} r={9} fill={c.glow} opacity={0.25} />
                    <path d={`M${x - 6} ${y}q6 5 12 0z`} fill="#B5651D" />
                    <path d={`M${x} ${y - 9}q2.5 4 0 7q-2.5 -3 0 -7z`} fill={c.glow} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    ),
    near: (c) => (
      <g>
        <path d="M0 760Q60 740 120 770L130 810H0Z" fill={c.near} />
        <path d="M290 790Q330 760 400 770V810H280Z" fill={c.near} />
        <path d="M0 18Q200 70 400 18" stroke={c.bloom[0]} strokeWidth={9} fill="none" />
        {Array.from({ length: 17 }, (_, i) => (
          <circle key={i} cx={i * 25} cy={q(18 + Math.sin(((i * 25) / 400) * Math.PI) * 26 + 6)} r={4.5} fill={c.bloom[i % 2]!} />
        ))}
      </g>
    ),
  },
  mountains: {
    far: (c) => (
      <g>
        <path d="M-10 600L70 430L130 520L210 380L290 500L340 440L410 560V810H-10Z" fill={c.far} />
        <path d="M70 430L90 470L60 470ZM210 380L236 430L184 430ZM340 440L356 470L326 470Z" fill="#FFFFFF" opacity={0.9} />
        <Hills y={640} amp={30} color="#6E8A8E" seed={41} opacity={0.6} />
      </g>
    ),
    mid: (c, t) => (
      <g>
        {Array.from({ length: 9 }, (_, i) => (
          <Pine key={i} x={q(i * 50 - 5 + rnd(i, 2) * 10)} y={q(740 + rnd(i, 3) * 20)} h={q(120 + rnd(i, 4) * 60)} color={c.mid} />
        ))}
        {/* wooden gazebo with fairy lights */}
        <rect x={150} y={640} width={100} height={8} fill={c.midShade} />
        {[155, 245].map((x) => (
          <rect key={x} x={x - 3} y={648} width={6} height={110} fill={c.midShade} />
        ))}
        <path d="M140 642L200 600L260 642Z" fill={c.midShade} />
        <StringLights x1={150} y1={650} x2={250} y2={650} sag={14} bulb={c.trim} wire={c.midShade} time={t} />
        <rect x={-10} y={756} width={420} height={60} fill="#E9EFEC" />
      </g>
    ),
    near: (c) => (
      <g>
        <Pine x={20} y={830} h={260} color={c.near} />
        <Pine x={385} y={830} h={240} color={c.near} />
      </g>
    ),
  },
  'blue-tiles': {
    far: () => null,
    mid: (c) => {
      const tiles: ReactNode[] = [];
      // tile band framing a round arch, like a blue-pottery doorway
      // Wide arch so the names sit inside it, like a doorway.
      // Tall doorway whose crown sits above the cover text, so the names stay inside it.
      for (let y = 210; y < 800; y += 28) {
        tiles.push(<Tile key={`l${y}`} x={30} y={y} s={26} ink={c.trim} light={c.midShade} />);
        tiles.push(<Tile key={`r${y}`} x={370} y={y} s={26} ink={c.trim} light={c.midShade} />);
      }
      for (let i = 0; i <= 18; i++) {
        const a = Math.PI + (i / 18) * Math.PI;
        tiles.push(<Tile key={`a${i}`} x={q(200 + Math.cos(a) * 170)} y={q(210 + Math.sin(a) * 170)} s={26} ink={c.trim} light={c.midShade} />);
      }
      return (
        <g>
          <path d={roundArch(43, 53, 314, 760)} fill="#FFFFFF" opacity={0.6} />
          {tiles}
        </g>
      );
    },
    near: (c) => (
      <g>
        <Vase x={40} y={800} s={1.5} body="#FFFFFF" ink={c.trim} />
        <Vase x={360} y={800} s={1.5} body="#FFFFFF" ink={c.trim} />
        <Bouquet x={40} y={680} s={1.1} colors={c.bloom} leaf="#3E6B8C" kind="flower" seed={51} />
        <Bouquet x={360} y={680} s={1.1} colors={c.bloom} leaf="#3E6B8C" kind="flower" seed={52} />
      </g>
    ),
  },
  'art-deco': {
    far: (c) => (
      <g>
        {Array.from({ length: 9 }, (_, i) => {
          const x = i * 46 - 6;
          const h = 120 + rnd(i, 11) * 160;
          const w = 34 + rnd(i, 12) * 10;
          return (
            <g key={i}>
              <path d={`M${q(x)} 800V${q(700 - h)}h${q(w * 0.2)}v-14h${q(w * 0.6)}v14h${q(w * 0.2)}V800Z`} fill={c.far} />
              {Array.from({ length: 6 }, (_, k) => (
                <rect key={k} x={q(x + w * 0.3)} y={q(720 - h + k * 24)} width={3} height={8} fill={c.glow} opacity={rnd(i * 7 + k, 3) > 0.5 ? 0.7 : 0.15} />
              ))}
            </g>
          );
        })}
      </g>
    ),
    mid: (c) => (
      <g transform="translate(0 90)">
        {/* stepped deco arch with sunburst (lowered so the names sit above its crown) */}
        <path d="M70 810V330L110 290V260L150 240V220H250V240L290 260V290L330 330V810" stroke={c.trim} strokeWidth={4} fill={c.mid} fillOpacity={0.55} />
        <path d="M90 810V340L126 304V276L162 258V240H238V258L274 276V304L310 340V810" stroke={c.trim} strokeWidth={1.2} fill="none" />
        {Array.from({ length: 13 }, (_, i) => {
          const a = Math.PI + (i / 12) * Math.PI;
          return <line key={i} x1={200} y1={640} x2={q(200 + Math.cos(a) * 110)} y2={q(640 + Math.sin(a) * 110)} stroke={c.trim} strokeWidth={0.8} opacity={0.6} />;
        })}
        <path d="M90 640H310" stroke={c.trim} strokeWidth={1.2} />
      </g>
    ),
    near: (c) => (
      <g>
        {[
          [0, 800, 1],
          [400, 800, -1],
        ].map(([x, y, d]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${d} 1)`}>
            {Array.from({ length: 7 }, (_, i) => {
              const a = (-90 + i * 15) * (Math.PI / 180);
              return <path key={i} d={`M0 0L${q(Math.cos(a) * 120)} ${q(Math.sin(a) * 120)}`} stroke={c.near} strokeWidth={2} />;
            })}
            <path d="M0 -120A120 120 0 0 1 120 0" stroke={c.near} strokeWidth={2} fill="none" />
          </g>
        ))}
      </g>
    ),
  },
  'lotus-pond': {
    far: (c) => (
      <g>
        {Array.from({ length: 70 }, (_, i) => (
          <circle key={i} cx={q(rnd(i, 61) * 400)} cy={q(rnd(i, 62) * 520)} r={1.4} fill={c.trim} opacity={0.6} />
        ))}
        <path d="M-10 0H410V12Q200 40 -10 12Z" fill={c.trim} opacity={0.8} />
      </g>
    ),
    mid: (c, t) => (
      <g>
        <Water y={560} color={c.water} glint={c.glow} time={t} />
        {Array.from({ length: 12 }, (_, i) => (
          <LotusLeaf key={i} x={q(rnd(i, 71) * 400)} y={q(600 + rnd(i, 72) * 190)} r={q(26 + rnd(i, 73) * 18)} color={c.midShade} vein={c.trim} />
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <Lotus key={i} x={q(30 + rnd(i, 74) * 340)} y={q(610 + rnd(i, 75) * 170)} s={q(1 + rnd(i, 76) * 0.6)} color={c.bloom[i % 2]!} light={c.bloom[2]!} />
        ))}
        <Crane x={110} y={600} s={1.2} color="#FFFFFF" accent="#C9302C" />
        <Crane x={300} y={606} s={1.1} color="#FFFFFF" accent="#C9302C" flip />
      </g>
    ),
    near: (c) => (
      <g>
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i}>
            <line x1={q(i * 50)} y1={0} x2={q(i * 50)} y2={q(60 + (i % 3) * 30)} stroke={c.trim} strokeWidth={1} />
            {Array.from({ length: 3 + (i % 3) }, (_, k) => (
              <Flower key={k} x={q(i * 50)} y={q(14 + k * 18)} r={7} color={c.bloom[(i + k) % 3]!} center={c.trim} />
            ))}
          </g>
        ))}
        <path d="M-10 790Q100 770 200 790T410 790V810H-10Z" fill={c.near} />
        {[40, 120, 280, 360].map((x, i) => (
          <Lotus key={x} x={x} y={790} s={1.4} color={c.bloom[i % 2]!} light={c.bloom[2]!} />
        ))}
      </g>
    ),
  },
};
