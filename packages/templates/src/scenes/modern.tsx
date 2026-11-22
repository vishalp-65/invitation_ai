import type { ReactNode } from 'react';
import { BloomCorner, BloomFrame, BloomRing, Greenery, LineFlower } from '../art/Botanicals';
import { ArchPanel, GendaLadi } from '../art/Architecture';
import { Butterfly, GoldDust, LaceBand, Wash } from '../art/Atelier';
import { Cluster } from '../art/Florals';
import { BabyMoon } from '../art/Kids';
import { Clouds, Lantern, Rings, Stars } from '../art/Ornaments';
import { Bunting, GiftBoxes, GlossyBalloons, Streamers } from '../art/Party';
import { PaintFilter, useSvgId } from '../art/svg-ids';
import { loop, type Loop } from './anim';
import type { SceneDef } from './types';

/**
 * Modern collection scenes (Nov 2026). Each one is built from the same vector art as the card
 * family of the same name (arches, lanterns, roses, gold ring, butterflies, balloons…), so the
 * card, the website and the video invite read as one suite. Drawn crisp over a plain gradient
 * sky; the 110–450 band stays light so the names on the cover read clearly.
 * Coordinates are in the shared 400 × 800 scene box (bottom-anchored).
 */

interface Place {
  x: number;
  y: number;
  w: number;
  h: number;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  /** Gentle idle motion: CSS loop on the website, per-frame transform in the video. */
  move?: Loop;
  time?: number;
  phase?: number;
  children: ReactNode;
}

/** Puts one art piece (drawn at w × h from its own top-left) into the scene. */
function At({ x, y, w, h, flipX, flipY, opacity, move, time, phase = 0, children }: Place) {
  const flip = flipX || flipY ? ` translate(${flipX ? w : 0} ${flipY ? h : 0}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})` : '';
  const m = move ? loop(move, time, phase) : null;
  return (
    <g transform={`translate(${x} ${y})${flip}`} opacity={opacity}>
      {m ? (
        <g className={m.className} style={m.style}>
          {children}
        </g>
      ) : (
        children
      )}
    </g>
  );
}


/** Marigold / rose bouquet from the card florals, as an SVG piece. */
function Bouquet({ w, h, kind }: { w: number; h: number; kind: 'marigold' | 'rose' | 'jasmine' }) {
  const fid = useSvgId('mb');
  return (
    <svg width={w} height={h} viewBox="0 0 440 440" style={{ overflow: 'visible' }}>
      <defs>
        <PaintFilter id={fid} strength={6} />
      </defs>
      {/* scn-paint: the website drops this filter (it re-renders every frame under the sway loop). */}
      <g className="scn-paint" filter={`url(#${fid})`}>
        <Cluster kind={kind} unit={100} />
      </g>
    </svg>
  );
}

const laceBands = (gold: string) => (
  <>
    <At x={0} y={0} w={400} h={30}>
      <LaceBand w={400} h={30} c={[gold]} />
    </At>
    <At x={0} y={770} w={400} h={30} flipY>
      <LaceBand w={400} h={30} c={[gold]} />
    </At>
  </>
);

export const MODERN_SCENES: Record<string, SceneDef> = {
  // Raat Mahal: maroon scalloped arch on cream, hanging lanterns, white peonies + mimosa.
  'mahal-arch': {
    far: (c) => (
      <g>
        {Array.from({ length: 13 }, (_, r) =>
          Array.from({ length: 7 }, (_, k) => <circle key={`${r}-${k}`} cx={k * 64 + (r % 2) * 32} cy={r * 64} r={3} fill={c.far} opacity={0.7} />),
        )}
        {laceBands(c.trim)}
      </g>
    ),
    mid: (c, t) => (
      <g>
        <At x={34} y={40} w={332} h={770}>
          <ArchPanel w={332} h={770} c={[c.mid, c.trim, c.glow]} opts={{ shape: 'scallop' }} />
        </At>
        {[
          [62, 160, 28],
          [98, 112, 24],
          [302, 112, 24],
          [338, 160, 28],
        ].map(([x, len, w], i) => (
          <At key={i} x={x! - w! / 2} y={0} w={w!} h={len!} move="sway" time={t} phase={i * 0.27}>
            <Lantern w={w!} h={len!} c={[c.trim, '#FFE29A']} />
          </At>
        ))}
        <At x={-46} y={330} w={130} h={130} flipY>
          <BloomCorner w={130} h={130} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
        <At x={316} y={330} w={130} h={130} flipX flipY>
          <BloomCorner w={130} h={130} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-34} y={-24} w={120} h={120}>
          <BloomCorner w={120} h={120} c={c.bloom} opts={{ kind: 'daisy' }} />
        </At>
        <At x={314} y={-24} w={120} h={120} flipX>
          <BloomCorner w={120} h={120} c={c.bloom} opts={{ kind: 'daisy' }} />
        </At>
        <At x={-46} y={590} w={230} h={230} flipY move="sway" time={t}>
          <BloomCorner w={230} h={230} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
        <At x={216} y={590} w={230} h={230} flipX flipY move="sway" time={t} phase={0.5}>
          <BloomCorner w={230} h={230} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
      </g>
    ),
  },

  // Gulab Ring: blush washes, a gold ring with climbing roses behind the names.
  'rose-ring': {
    far: (c) => (
      <g>
        <At x={210} y={-50} w={260} h={280}>
          <Wash w={260} h={280} c={[c.far, '#FFFFFF']} opts={{ seed: 5 }} />
        </At>
        <At x={-90} y={300} w={220} h={260}>
          <Wash w={220} h={260} c={[c.far, '#FFFFFF']} opts={{ seed: 11 }} />
        </At>
        <At x={-60} y={580} w={320} h={260}>
          <Wash w={320} h={260} c={[c.far, '#FFFFFF']} opts={{ seed: 14 }} />
        </At>
      </g>
    ),
    mid: (c) => (
      <g>
        <At x={0} y={0} w={400} h={800} opacity={0.5}>
          <GoldDust w={400} h={800} c={[c.trim]} opts={{ seed: 23 }} />
        </At>
        <At x={55} y={175} w={290} h={290}>
          <BloomRing w={290} h={290} c={[c.trim, c.bloom[0]!, c.bloom[1]!, c.near]} opts={{ kind: 'rose', layout: 'left', scale: 0.85 }} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-30} y={610} w={210} h={210} flipY move="sway" time={t}>
          <BloomCorner w={210} h={210} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
        <At x={226} y={626} w={190} h={190} flipX flipY move="sway" time={t} phase={0.5}>
          <BloomCorner w={190} h={190} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
      </g>
    ),
  },

  // Neel Gulab: dusty-blue roses on a soft watercolour wash.
  'blue-roses': {
    far: (c) => (
      <g>
        <At x={170} y={-70} w={300} h={300}>
          <Wash w={300} h={300} c={[c.far, c.mid]} opts={{ seed: 2 }} />
        </At>
        <At x={-110} y={250} w={220} h={240}>
          <Wash w={220} h={240} c={[c.far, c.mid]} opts={{ seed: 12 }} />
        </At>
        <At x={-110} y={560} w={340} h={300}>
          <Wash w={340} h={300} c={[c.far, c.mid]} opts={{ seed: 7 }} />
        </At>
      </g>
    ),
    mid: (c, t) => (
      <At x={302} y={330} w={120} h={120} flipX move="sway" time={t}>
        <BloomCorner w={120} h={120} c={c.bloom} opts={{ kind: 'rose' }} />
      </At>
    ),
    near: (c, t) => (
      <g>
        <At x={-24} y={-14} w={150} h={150}>
          <BloomCorner w={150} h={150} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
        <At x={228} y={612} w={190} h={190} flipX flipY move="sway" time={t} phase={0.4}>
          <BloomCorner w={190} h={190} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
      </g>
    ),
  },

  // Titli Bagh: lavender hydrangeas, leafy sprays, gold flecks and butterflies.
  'butterfly-garden': {
    far: (c) => (
      <g>
        <At x={-80} y={-60} w={300} h={280}>
          <Wash w={300} h={280} c={[c.far, '#FFFFFF']} opts={{ seed: 4 }} />
        </At>
        <At x={180} y={560} w={300} h={280}>
          <Wash w={300} h={280} c={[c.far, '#FFFFFF']} opts={{ seed: 9 }} />
        </At>
        <At x={200} y={0} w={200} h={200}>
          <GoldDust w={200} h={200} c={[c.trim]} opts={{ seed: 3 }} />
        </At>
        <At x={0} y={600} w={200} h={200}>
          <GoldDust w={200} h={200} c={[c.trim]} opts={{ seed: 8 }} />
        </At>
      </g>
    ),
    mid: (c, t) => (
      <g>
        <At x={-46} y={270} w={160} h={160} opacity={0.75}>
          <Greenery w={160} h={160} c={[c.mid, c.midShade]} opts={{ kind: 'olive' }} />
        </At>
        <At x={286} y={300} w={160} h={160} flipX opacity={0.75}>
          <Greenery w={160} h={160} c={[c.mid, c.midShade]} opts={{ kind: 'olive' }} />
        </At>
        <At x={300} y={190} w={60} h={48} move="bob" time={t}>
          <Butterfly w={60} h={48} c={[c.mid, c.midShade, '#3B2A4A']} />
        </At>
        <At x={40} y={520} w={48} h={38} move="bob" time={t} phase={0.5}>
          <Butterfly w={48} h={38} c={[c.mid, c.midShade, '#3B2A4A']} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-30} y={-20} w={170} h={170}>
          <BloomCorner w={170} h={170} c={c.bloom} opts={{ kind: 'hydrangea' }} />
        </At>
        <At x={-20} y={650} w={150} h={150} flipY move="sway" time={t}>
          <BloomCorner w={150} h={150} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
        <At x={216} y={600} w={210} h={210} flipX flipY move="sway" time={t} phase={0.5}>
          <BloomCorner w={210} h={210} c={c.bloom} opts={{ kind: 'hydrangea' }} />
        </At>
      </g>
    ),
  },

  // Raat ki Rani: blush roses and gold flecks on black, fine gold frame.
  'noir-roses': {
    far: (c, t) => {
      const m = loop('twinkle', t);
      return (
        <g>
          <g className={m.className} style={m.style}>
            <GoldDust w={400} h={800} c={[c.trim]} opts={{ seed: 41 }} />
          </g>
          <Stars w={400} h={520} c={[c.trim]} opts={{ seed: 9 }} />
        </g>
      );
    },
    mid: (c) => (
      <g fill="none" stroke={c.trim}>
        <rect x={16} y={16} width={368} height={768} strokeWidth={1.2} />
        <rect x={24} y={24} width={352} height={752} strokeWidth={0.5} opacity={0.6} />
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-30} y={-20} w={180} h={180}>
          <BloomCorner w={180} h={180} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
        <At x={-10} y={680} w={120} h={120} flipY opacity={0.9}>
          <BloomCorner w={120} h={120} c={c.bloom} opts={{ kind: 'mixed' }} />
        </At>
        <At x={206} y={596} w={214} h={214} flipX flipY move="sway" time={t}>
          <BloomCorner w={214} h={214} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
      </g>
    ),
  },

  // Mr & Mrs: cream dome arch with a gold rim on mauve, coral blooms, banner flags, rings.
  'mauve-arch': {
    far: () => null,
    mid: (c, t) => (
      <g>
        <At x={24} y={70} w={352} h={760}>
          <ArchPanel w={352} h={760} c={[c.mid, c.trim, c.glow]} opts={{ shape: 'dome' }} />
        </At>
        <At x={132} y={0} w={136} h={64} move="sway" time={t}>
          <Bunting w={136} h={64} c={[c.midShade, c.far, '#5A4440']} opts={{ style: 'banner', swags: 1 }} />
        </At>
        <At x={176} y={700} w={48} h={36}>
          <Rings w={48} h={36} c={[c.trim, '#F7E2A6']} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-44} y={-30} w={170} h={170}>
          <BloomCorner w={170} h={170} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
        <At x={274} y={-30} w={170} h={170} flipX>
          <BloomCorner w={170} h={170} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
        <At x={-34} y={666} w={150} h={150} flipY move="sway" time={t}>
          <BloomCorner w={150} h={150} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
        <At x={284} y={666} w={150} h={150} flipX flipY move="sway" time={t} phase={0.5}>
          <BloomCorner w={150} h={150} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
      </g>
    ),
  },

  // Gulistan: vintage daisies and roses, names on a floral hexagon frame.
  'vintage-bloom': {
    far: (c) => (
      <g opacity={0.55}>
        <At x={-30} y={300} w={140} h={140}>
          <Greenery w={140} h={140} c={[c.trim, c.near]} opts={{ kind: 'olive' }} />
        </At>
        <At x={290} y={300} w={140} h={140} flipX>
          <Greenery w={140} h={140} c={[c.trim, c.near]} opts={{ kind: 'olive' }} />
        </At>
      </g>
    ),
    mid: (c) => (
      <At x={30} y={196} w={340} h={272}>
        <BloomFrame w={340} h={272} c={[c.mid, c.bloom[0]!, c.bloom[1]!, c.near]} opts={{ shape: 'hex' }} />
      </At>
    ),
    near: (c, t) => (
      <g>
        <At x={-30} y={-24} w={150} h={150}>
          <BloomCorner w={150} h={150} c={c.bloom} opts={{ kind: 'daisy' }} />
        </At>
        <At x={280} y={-24} w={150} h={150} flipX>
          <BloomCorner w={150} h={150} c={c.bloom} opts={{ kind: 'daisy' }} />
        </At>
        <At x={-30} y={640} w={170} h={170} flipY move="sway" time={t}>
          <BloomCorner w={170} h={170} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
        <At x={260} y={640} w={170} h={170} flipX flipY move="sway" time={t} phase={0.5}>
          <BloomCorner w={170} h={170} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
      </g>
    ),
  },

  // Pampas Boho: soft dome, dried pampas and fine line flowers.
  'pampas-arch': {
    far: () => null,
    mid: (c) => (
      <At x={60} y={120} w={280} h={720}>
        <ArchPanel w={280} h={720} c={[c.mid, c.mid, c.mid]} opts={{ shape: 'dome' }} />
      </At>
    ),
    near: (c, t) => (
      <g>
        <At x={240} y={-6} w={170} h={190} flipX>
          <LineFlower w={170} h={190} c={[c.trim]} opts={{ kind: 'poppy' }} />
        </At>
        <At x={-20} y={590} w={210} h={210} move="sway" time={t} opacity={0.85}>
          <Greenery w={210} h={210} c={[c.midShade, c.trim]} opts={{ kind: 'fern' }} />
        </At>
        <At x={260} y={610} w={150} h={180} flipX opacity={0.85}>
          <LineFlower w={150} h={180} c={[c.trim]} opts={{ kind: 'wild' }} />
        </At>
      </g>
    ),
  },

  // Haldi Rasam: turmeric washes, marigold strings and bouquets.
  'haldi-marigold': {
    far: (c) => (
      <g>
        <At x={-90} y={120} w={300} h={300}>
          <Wash w={300} h={300} c={[c.far, c.water]} opts={{ seed: 2 }} />
        </At>
        <At x={190} y={430} w={300} h={320}>
          <Wash w={300} h={320} c={[c.far, c.water]} opts={{ seed: 9 }} />
        </At>
      </g>
    ),
    mid: (c, t) => (
      <At x={0} y={0} w={400} h={220} move="sway" time={t}>
        <GendaLadi w={400} h={220} c={[c.mid, c.midShade, c.trim]} opts={{ count: 7 }} />
      </At>
    ),
    near: (_c, t) => (
      <g>
        <At x={-40} y={630} w={190} h={190} flipY move="sway" time={t}>
          <Bouquet w={190} h={190} kind="marigold" />
        </At>
        <At x={250} y={630} w={190} h={190} flipX flipY move="sway" time={t} phase={0.5}>
          <Bouquet w={190} h={190} kind="marigold" />
        </At>
      </g>
    ),
  },

  // Gubbare: bunting, glossy balloons and gift boxes (birthdays).
  'balloon-party': {
    far: (c) => (
      <g opacity={0.5}>
        <At x={-40} y={330} w={140} h={196}>
          <GlossyBalloons w={140} h={196} c={[c.far, '#FFFFFF', c.mid]} opts={{ bunch: 'single' }} />
        </At>
        <At x={300} y={370} w={130} h={182}>
          <GlossyBalloons w={130} h={182} c={[c.far, '#FFFFFF', c.mid]} opts={{ bunch: 'single' }} />
        </At>
      </g>
    ),
    mid: (c, t) => (
      <g>
        <At x={0} y={0} w={400} h={96}>
          <Bunting w={400} h={96} c={[c.midShade, c.mid, c.midShade]} opts={{ swags: 2 }} />
        </At>
        <At x={8} y={110} w={110} h={154} move="bob" time={t}>
          <GlossyBalloons w={110} h={154} c={[c.mid, c.far, c.midShade]} opts={{ bunch: 'pair' }} />
        </At>
        <At x={282} y={110} w={110} h={154} flipX move="bob" time={t} phase={0.5}>
          <GlossyBalloons w={110} h={154} c={[c.mid, c.far, c.midShade]} opts={{ bunch: 'pair' }} />
        </At>
      </g>
    ),
    near: (c) => (
      <At x={-10} y={664} w={420} h={140}>
        <GiftBoxes w={420} h={140} c={[c.near, c.midShade, '#ECE4D9']} />
      </At>
    ),
  },

  // Sunehri Shaam: black and gold party, foil balloons and streamers.
  'gold-party': {
    far: (c, t) => {
      const m = loop('twinkle', t);
      return (
        <g>
          <Stars w={400} h={300} c={[c.trim]} opts={{ seed: 9 }} />
          <g className={m.className} style={m.style}>
            <GoldDust w={400} h={260} c={[c.trim]} opts={{ seed: 12 }} />
          </g>
        </g>
      );
    },
    mid: (c, t) => (
      <g>
        <At x={0} y={0} w={80} h={380} move="sway" time={t}>
          <Streamers w={80} h={380} c={[c.trim, c.bloom[3]!]} opts={{ seed: 5 }} />
        </At>
        <At x={320} y={0} w={80} h={380} move="sway" time={t} phase={0.5}>
          <Streamers w={80} h={380} c={[c.trim, c.bloom[3]!]} opts={{ seed: 8 }} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-50} y={560} w={170} h={238} move="bob" time={t}>
          <GlossyBalloons w={170} h={238} c={[c.trim, c.bloom[1]!, c.midShade]} opts={{ bunch: 'cluster', metal: true }} />
        </At>
        <At x={280} y={560} w={170} h={238} flipX move="bob" time={t} phase={0.5}>
          <GlossyBalloons w={170} h={238} c={[c.trim, c.bloom[1]!, c.midShade]} opts={{ bunch: 'cluster', metal: true }} />
        </At>
      </g>
    ),
  },

  // Chanda Mama: crescent moon, stars and clouds (baby shower, naamkaran).
  'moon-cradle': {
    far: (c, t) => {
      const m = loop('twinkle', t);
      return (
        <g className={m.className} style={m.style}>
          <Stars w={400} h={520} c={[c.far]} opts={{ seed: 6 }} />
        </g>
      );
    },
    mid: (c, t) => (
      <g>
        {/* Below the top ~100 units: the 9:16 video crops the top of the 1:2 scene. */}
        <At x={300} y={112} w={88} h={80} move="bob" time={t}>
          <BabyMoon w={88} h={80} c={[c.bloom[0]!, c.bloom[1]!, '#FFFFFF']} />
        </At>
        <At x={-60} y={120} w={200} h={60} move="glide" time={t} opacity={0.85}>
          <Clouds w={200} h={60} c={[c.mid, c.midShade]} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <At x={-20} y={676} w={440} h={134} move="glide" time={t} phase={0.3}>
        <Clouds w={440} h={134} c={[c.near, c.midShade]} />
      </At>
    ),
  },

  // ---------------- Premium collection (Nov 2026, website-first) ----------------

  // Sheesh Mahal: a gold Mughal arch on a night sky, mirror-work stars and three lanterns.
  'jharokha-night': {
    far: (c, t) => {
      const m = loop('twinkle', t);
      return (
        <g>
          <g className={m.className} style={m.style}>
            <Stars w={400} h={800} c={[c.trim]} opts={{ seed: 17 }} />
          </g>
          <At x={0} y={0} w={400} h={800} opacity={0.35}>
            <GoldDust w={400} h={800} c={[c.trim]} opts={{ seed: 29 }} />
          </At>
        </g>
      );
    },
    mid: (c, t) => (
      <g>
        <At x={28} y={60} w={344} h={760}>
          <ArchPanel w={344} h={760} c={[c.mid, c.trim, c.glow]} opts={{ shape: 'mughal' }} />
        </At>
        {[
          [120, 150, 30],
          [200, 110, 26],
          [280, 150, 30],
        ].map(([x, len, w], i) => (
          <At key={i} x={x! - w! / 2} y={0} w={w!} h={len!} move="sway" time={t} phase={i * 0.33}>
            <Lantern w={w!} h={len!} c={[c.trim, c.glow]} />
          </At>
        ))}
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-40} y={612} w={200} h={200} flipY move="sway" time={t}>
          <BloomCorner w={200} h={200} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
        <At x={240} y={612} w={200} h={200} flipX flipY move="sway" time={t} phase={0.5}>
          <BloomCorner w={200} h={200} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
      </g>
    ),
  },

  // Mogra: ivory and champagne, a floral hexagon frame, lace edges and soft greenery.
  'champa-frame': {
    far: (c) => (
      <g>
        <At x={-80} y={-40} w={320} h={300}>
          <Wash w={320} h={300} c={[c.far, '#FFFFFF']} opts={{ seed: 21 }} />
        </At>
        <At x={160} y={540} w={320} h={300}>
          <Wash w={320} h={300} c={[c.far, '#FFFFFF']} opts={{ seed: 6 }} />
        </At>
        {laceBands(c.trim)}
      </g>
    ),
    mid: (c) => (
      <g>
        <At x={0} y={0} w={400} h={800} opacity={0.45}>
          <GoldDust w={400} h={800} c={[c.trim]} opts={{ seed: 12 }} />
        </At>
        <At x={40} y={150} w={320} h={340}>
          <BloomFrame w={320} h={340} c={[c.mid, c.bloom[0]!, c.bloom[1]!, c.near]} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-50} y={560} w={190} h={190} opacity={0.9}>
          <Greenery w={190} h={190} c={[c.near, c.midShade]} opts={{ kind: 'eucalyptus' }} />
        </At>
        <At x={-26} y={640} w={180} h={180} flipY move="sway" time={t}>
          <BloomCorner w={180} h={180} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
        <At x={246} y={640} w={180} h={180} flipX flipY move="sway" time={t} phase={0.5}>
          <BloomCorner w={180} h={180} c={c.bloom} opts={{ kind: 'peony' }} />
        </At>
      </g>
    ),
  },

  // Kesariya: saffron dusk, marigold strings across the top, brass lanterns, marigold bouquets.
  'genda-toran': {
    far: (c) => (
      <g>
        <At x={-60} y={360} w={520} h={460}>
          <Wash w={520} h={460} c={[c.far, c.glow]} opts={{ seed: 33 }} />
        </At>
        <At x={0} y={0} w={400} h={800} opacity={0.4}>
          <GoldDust w={400} h={800} c={[c.trim]} opts={{ seed: 44 }} />
        </At>
      </g>
    ),
    mid: (c, t) => (
      <g>
        <At x={-10} y={-6} w={420} h={118}>
          <GendaLadi w={420} h={118} c={[c.bloom[0]!, c.bloom[1]!, c.near]} opts={{ count: 9 }} />
        </At>
        {[
          [60, 230, 30],
          [340, 230, 30],
        ].map(([x, len, w], i) => (
          <At key={i} x={x! - w! / 2} y={0} w={w!} h={len!} move="sway" time={t} phase={i * 0.4}>
            <Lantern w={w!} h={len!} c={[c.trim, c.glow]} />
          </At>
        ))}
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-60} y={600} w={230} h={230} move="sway" time={t}>
          <Bouquet w={230} h={230} kind="marigold" />
        </At>
        <At x={230} y={600} w={230} h={230} flipX move="sway" time={t} phase={0.5}>
          <Bouquet w={230} h={230} kind="marigold" />
        </At>
      </g>
    ),
  },

  // Chandni: moonlit indigo, silver-gold rings, clouds drifting below.
  'moon-rings': {
    far: (c, t) => {
      const m = loop('twinkle', t);
      return (
        <g className={m.className} style={m.style}>
          <Stars w={400} h={600} c={[c.far]} opts={{ seed: 23 }} />
        </g>
      );
    },
    mid: (c, t) => (
      <g>
        <At x={130} y={530} w={140} h={105} move="bob" time={t}>
          <Rings w={140} h={105} c={[c.trim]} />
        </At>
        <At x={-80} y={600} w={260} h={80} move="glide" time={t} opacity={0.6}>
          <Clouds w={260} h={80} c={[c.mid, c.midShade]} />
        </At>
      </g>
    ),
    near: (c, t) => (
      <g>
        <At x={-30} y={680} w={460} h={140} move="glide" time={t} phase={0.4}>
          <Clouds w={460} h={140} c={[c.near, c.midShade]} />
        </At>
        <At x={-34} y={-20} w={150} h={150}>
          <BloomCorner w={150} h={150} c={c.bloom} opts={{ kind: 'rose' }} />
        </At>
      </g>
    ),
  },
};
