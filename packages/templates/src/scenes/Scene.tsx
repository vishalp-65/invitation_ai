import type { PaintLayer, SceneKind, ScenePalette, SiteDesign } from '@cardai/shared';
import { useId, type ComponentType, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from 'react';
import { loop, q, rnd } from './anim';
import { MODERN_SCENES } from './modern';
import { MORE_SCENES } from './more';
import type { SceneDef } from './types';
import {
  ArchRow,
  BandhaniBand,
  Boat,
  Bouquet,
  Chhatri,
  Crenels,
  Cypress,
  Dome,
  Flower,
  Garland,
  HangingLantern,
  Hills,
  Jharokha,
  LampStand,
  Leaf,
  Palm,
  Peacock,
  PhulkariBand,
  pointedArch,
  Rose,
  roundArch,
  Swan,
  Toran,
  Tree,
  Water,
} from './parts';

/**
 * Placeholder painted scenes. Each design's scene is split into four depth layers (sky, far,
 * mid, near) so the website can move them at different speeds on scroll and the video can
 * push the camera through them. When a design gets real painted art (`design.paint`), the
 * matching WebP replaces the drawn layer with no other change.
 */

const BASE: Record<string, SceneDef> = {
  palace: {
    far: (c) => (
      <g opacity={0.9}>
        {[30, 95, 300, 360].map((x, i) => (
          <g key={x}>
            <rect x={x - 22} y={600 - i * 6} width={44} height={220} fill={c.far} />
            <Dome cx={x} y={600 - i * 6} r={20} fill={c.far} trim={c.far} />
          </g>
        ))}
        <rect x={-10} y={640} width={420} height={170} fill={c.far} />
      </g>
    ),
    mid: (c) => (
      <g>
        <rect x={20} y={540} width={360} height={270} fill={c.mid} />
        <Crenels x={20} y={540} w={360} size={8} fill={c.mid} />
        <ArchRow x={28} y={600} w={344} h={58} n={7} fill={c.midShade} />
        <ArchRow x={28} y={690} w={344} h={70} n={7} fill={c.midShade} />
        <rect x={20} y={668} width={360} height={6} fill={c.trim} />
        {/* central tower with jharokha */}
        <rect x={140} y={490} width={120} height={60} fill={c.mid} />
        <Jharokha cx={200} y={538} w={70} fill={c.mid} shade={c.midShade} trim={c.trim} />
        <Chhatri cx={200} y={492} w={80} fill={c.mid} shade={c.midShade} trim={c.trim} />
        <Chhatri cx={52} y={542} w={46} fill={c.mid} shade={c.midShade} trim={c.trim} />
        <Chhatri cx={348} y={542} w={46} fill={c.mid} shade={c.midShade} trim={c.trim} />
        {/* lit windows */}
        {[60, 108, 156, 244, 292, 340].map((x, i) => (
          <circle key={x} cx={x} cy={628} r={4} fill={c.glow} opacity={0.7 - (i % 2) * 0.2} />
        ))}
      </g>
    ),
    near: (c, t) => (
      <g>
        <rect x={-10} y={760} width={420} height={50} fill={c.near} />
        {Array.from({ length: 21 }, (_, i) => (
          <rect key={i} x={i * 20} y={738} width={6} height={26} rx={3} fill={c.near} />
        ))}
        <rect x={-10} y={734} width={420} height={7} fill={c.near} />
        <Bouquet x={20} y={740} s={1.1} colors={c.bloom} leaf="#2F5D3A" kind="marigold" seed={1} />
        <Bouquet x={385} y={745} s={1.1} colors={c.bloom} leaf="#2F5D3A" kind="marigold" seed={4} />
        <LampStand x={70} y={735} h={50} brass={c.trim} flame={c.glow} time={t} />
        <LampStand x={330} y={735} h={50} brass={c.trim} flame={c.glow} time={t} phase={0.4} />
      </g>
    ),
  },
  'swan-lake': {
    far: (c) => (
      <g>
        <Hills y={560} amp={40} color={c.far} seed={2} opacity={0.7} />
        {[70, 120, 290, 340].map((x, i) => (
          <Tree key={x} x={x} y={590} r={26 + (i % 2) * 8} color={c.near} trunk={c.midShade} />
        ))}
      </g>
    ),
    mid: (c, t) => {
      const g1 = loop('glide', t, 0, 0.6);
      const g2 = loop('glide', t, 0.08, 0.6);
      return (
        <g>
          <Water y={600} color={c.water} glint="#FFFFFF" time={t} />
          {/* classical arch frame */}
          <path d="M-10 0H410V810H360V210A160 160 0 0 0 40 210V810H-10Z" fill={c.mid} />
          <path d="M40 810V210A160 160 0 0 1 360 210V810" stroke={c.trim} strokeWidth={3} fill="none" />
          <path d="M56 810V214A144 144 0 0 1 344 214V810" stroke={c.trim} strokeWidth={1} fill="none" opacity={0.6} />
          {[16, 384].map((x) => (
            <g key={x}>
              <rect x={x - 14} y={200} width={28} height={610} fill={c.midShade} opacity={0.5} />
              {Array.from({ length: 6 }, (_, i) => (
                <line key={i} x1={x - 9 + i * 3.6} y1={210} x2={x - 9 + i * 3.6} y2={800} stroke={c.trim} strokeOpacity={0.35} />
              ))}
            </g>
          ))}
          <g className={g1.className} style={g1.style}>
            <Swan x={165} y={680} s={1.1} />
          </g>
          <g className={g2.className} style={g2.style}>
            <Swan x={235} y={682} s={1.1} flip />
          </g>
        </g>
      );
    },
    near: (c) => (
      <g>
        <Bouquet x={30} y={760} s={1.6} colors={c.bloom} leaf={c.near} seed={2} />
        <Bouquet x={372} y={770} s={1.5} colors={c.bloom} leaf={c.near} seed={6} />
        <Bouquet x={20} y={70} s={1.1} colors={c.bloom} leaf={c.near} seed={9} />
        <Bouquet x={385} y={60} s={1} colors={c.bloom} leaf={c.near} seed={12} />
      </g>
    ),
  },
  'temple-court': {
    far: (c, t) => (
      <g>
        <Hills y={590} amp={30} color={c.far} seed={3} />
        <Palm x={40} y={640} s={1.1} color={c.near} time={t} />
        <Palm x={360} y={630} s={1} color={c.near} time={t} phase={0.3} />
        <Palm x={300} y={650} s={0.8} color={c.near} time={t} phase={0.6} />
      </g>
    ),
    mid: (c) => (
      <g>
        {/* tiered roof */}
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${70 + i * 22} ${560 - i * 26}H${330 - i * 22}L${318 - i * 22} ${540 - i * 26}H${82 + i * 22}Z`} fill={i % 2 ? c.midShade : c.mid} />
        ))}
        <rect x={180} y={452} width={40} height={10} fill={c.trim} />
        <circle cx={200} cy={446} r={7} fill={c.trim} />
        <rect x={60} y={560} width={280} height={14} fill={c.trim} />
        {Array.from({ length: 7 }, (_, i) => (
          <g key={i}>
            <rect x={72 + i * 42} y={574} width={16} height={170} fill={c.mid} />
            <rect x={68 + i * 42} y={574} width={24} height={10} fill={c.midShade} />
            <rect x={68 + i * 42} y={734} width={24} height={10} fill={c.midShade} />
          </g>
        ))}
        <rect x={40} y={744} width={320} height={22} fill={c.midShade} />
        <rect x={20} y={766} width={360} height={44} fill={c.mid} />
      </g>
    ),
    near: (c, t) => (
      <g>
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} cx={40 + i * 21} cy={790} r={2.4} fill="#FFFFFF" opacity={0.85} />
        ))}
        <LampStand x={34} y={790} h={90} brass={c.bloom[0]!} flame={c.glow} time={t} />
        <LampStand x={366} y={790} h={90} brass={c.bloom[0]!} flame={c.glow} time={t} phase={0.5} />
        {[-30, -10, 15].map((a, i) => (
          <Leaf key={i} x={10} y={700 + i * 20} len={120} angle={a - 50} color={c.near} />
        ))}
        {[30, 10, -15].map((a, i) => (
          <Leaf key={i} x={392} y={700 + i * 20} len={120} angle={a + 230} color={c.near} />
        ))}
        <Toran y={0} color={c.trim} leaf={c.near} bell={c.bloom[0]!} />
      </g>
    ),
  },
  riverside: {
    far: (c) => (
      <g>
        <Hills y={600} amp={22} color={c.far} seed={4} />
        {[40, 90, 330, 375].map((x, i) => (
          <Tree key={x} x={x} y={612} r={22 + (i % 2) * 6} color={c.near} trunk={c.midShade} />
        ))}
      </g>
    ),
    mid: (c, t) => {
      const b = loop('glide', t, 0.3, 1.4);
      return (
        <g>
          {/* terracotta pavilion with curved chala roof */}
          <rect x={110} y={505} width={180} height={115} fill={c.mid} />
          <path d="M92 510Q200 440 308 510Q200 478 92 510Z" fill={c.midShade} />
          <path d="M92 510Q200 470 308 510" stroke={c.trim} strokeWidth={2} fill="none" />
          <ArchRow x={118} y={530} w={164} h={90} n={3} fill={c.midShade} gap={0.24} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={116 + i * 20} y={512} width={8} height={8} fill={c.trim} opacity={0.6} />
          ))}
          <rect x={96} y={618} width={208} height={8} fill={c.midShade} />
          <Water y={626} color={c.water} glint="#FFFFFF" time={t} />
          <g className={b.className} style={b.style}>
            <Boat x={300} y={700} s={1} color="#5B3A29" sail={c.trim} />
          </g>
        </g>
      );
    },
    near: (c) => (
      <g>
        {[30, 80, 330, 380].map((x, i) => (
          <g key={x}>
            <ellipse cx={x} cy={772 - (i % 2) * 12} rx={30} ry={9} fill={c.near} />
            <Flower x={x + 4} y={758 - (i % 2) * 12} r={11} color={c.bloom[1]!} center={c.bloom[2]!} />
          </g>
        ))}
        <path d="M0 20Q200 70 400 20" stroke={c.bloom[0]} strokeWidth={10} fill="none" />
        {Array.from({ length: 18 }, (_, i) => (
          <circle key={i} cx={i * 23 + 6} cy={q(20 + Math.sin(((i * 23) / 400) * Math.PI) * 26 + 8)} r={4} fill="#FFFFFF" />
        ))}
      </g>
    ),
  },
  haveli: {
    far: (c) => (
      <g>
        <rect x={-10} y={640} width={420} height={170} fill={c.far} />
        {Array.from({ length: 60 }, (_, i) => (
          <circle key={i} cx={rnd(i, 1) * 400} cy={650 + rnd(i, 2) * 140} r={2 + rnd(i, 3) * 2} fill="#FFF3A6" opacity={0.7} />
        ))}
        {[30, 370].map((x) => (
          <Tree key={x} x={x} y={650} r={30} color="#5E8B3A" trunk="#6B4A2A" />
        ))}
      </g>
    ),
    mid: (c) => (
      <g>
        <rect x={80} y={470} width={240} height={200} fill={c.mid} />
        <Crenels x={80} y={470} w={240} size={7} fill={c.mid} />
        <Jharokha cx={140} y={540} w={50} fill={c.mid} shade={c.midShade} trim={c.trim} />
        <Jharokha cx={260} y={540} w={50} fill={c.mid} shade={c.midShade} trim={c.trim} />
        <path d={roundArch(170, 560, 60, 110)} fill={c.midShade} />
        <path d="M170 590A30 30 0 0 1 230 590" stroke={c.trim} strokeWidth={4} fill="none" />
        <rect x={80} y={554} width={240} height={5} fill={c.trim} />
        <rect x={70} y={668} width={260} height={10} fill={c.midShade} />
      </g>
    ),
    near: (c, t) => (
      <g>
        <PhulkariBand y={760} h={50} bg={c.trim} colors={c.bloom} />
        {[20, 60, 340, 380].map((x, i) => (
          <Garland key={x} x={x} y={0} len={120 + (i % 2) * 40} color={c.bloom[1]!} dark={c.bloom[0]!} time={t} phase={i * 0.2} />
        ))}
      </g>
    ),
  },
  stepwell: {
    far: (c) => (
      <g>
        <Hills y={560} amp={26} color={c.far} seed={6} />
      </g>
    ),
    mid: (c, t) => (
      <g>
        {[0, 1, 2].map((r) => (
          <g key={r}>
            <rect x={30 + r * 40} y={540 + r * 60} width={340 - r * 80} height={60} fill={r % 2 ? c.midShade : c.mid} />
            <ArchRow x={36 + r * 40} y={548 + r * 60} w={328 - r * 80} h={46} n={7 - r * 2} fill={r % 2 ? c.mid : c.midShade} pointed />
            <rect x={30 + r * 40} y={538 + r * 60} width={340 - r * 80} height={5} fill={c.trim} />
          </g>
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={150 - i * 12} y={720 + i * 9} width={100 + i * 24} height={9} fill={i % 2 ? c.mid : c.midShade} />
        ))}
        <Water y={766} color={c.water} glint="#FFFFFF" time={t} />
      </g>
    ),
    near: (c) => (
      <g>
        <Toran y={8} color={c.trim} leaf={c.near} bell={c.bloom[1]!} />
        <BandhaniBand y={776} h={34} bg={c.trim} dot="#FFF3D6" />
      </g>
    ),
  },
  fort: {
    far: (c) => (
      <g>
        <Hills y={520} amp={60} color={c.far} seed={7} opacity={0.6} />
        <Hills y={600} amp={50} color={c.far} seed={8} />
      </g>
    ),
    mid: (c) => (
      <g>
        <path d="M-10 640Q120 560 210 580Q310 600 410 560V810H-10Z" fill={c.midShade} />
        <rect x={60} y={500} width={280} height={90} fill={c.mid} />
        <Crenels x={60} y={500} w={280} size={9} fill={c.mid} />
        {[60, 200, 340].map((x) => (
          <g key={x}>
            <rect x={x - 26} y={470} width={52} height={120} rx={20} fill={c.mid} />
            <Crenels x={x - 26} y={470} w={52} size={7} fill={c.mid} />
          </g>
        ))}
        <path d={roundArch(185, 530, 30, 60)} fill={c.midShade} />
        <rect x={60} y={520} width={280} height={4} fill={c.trim} />
      </g>
    ),
    near: (c) => (
      <g>
        <path d="M-10 720Q100 690 200 720Q300 750 410 710V810H-10Z" fill={c.near} />
        <Peacock x={80} y={720} s={0.9} body="#0D4F86" tail={c.near} eye={c.trim} />
        <Bouquet x={370} y={740} s={1.2} colors={c.bloom} leaf={c.near} kind="flower" seed={3} />
      </g>
    ),
  },
  'mughal-garden': {
    far: (c) => (
      <g>
        <rect x={130} y={430} width={140} height={130} fill={c.far} />
        <Dome cx={200} y={430} r={58} fill={c.far} trim={c.far} />
        {[110, 290].map((x) => (
          <rect key={x} x={x - 6} y={380} width={12} height={180} fill={c.far} />
        ))}
      </g>
    ),
    mid: (c, t) => (
      <g>
        <rect x={20} y={520} width={360} height={130} fill={c.mid} />
        <ArchRow x={30} y={540} w={340} h={110} n={5} fill={c.midShade} pointed gap={0.22} />
        {Array.from({ length: 5 }, (_, i) => (
          <path key={i} d={pointedArch(30 + i * 68 + 7.5, 548, 53, 102)} stroke={c.trim} strokeWidth={1.5} fill="none" />
        ))}
        <rect x={20} y={516} width={360} height={6} fill={c.trim} />
        <rect x={10} y={650} width={380} height={14} fill={c.midShade} />
        <Water y={664} color={c.water} glint={c.glow} time={t} />
        <rect x={185} y={664} width={30} height={146} fill={c.mid} opacity={0.35} />
      </g>
    ),
    near: (c, t) => (
      <g>
        <Cypress x={22} y={800} h={300} color={c.near} />
        <Cypress x={64} y={810} h={220} color={c.near} />
        <Cypress x={378} y={800} h={300} color={c.near} />
        <Cypress x={336} y={810} h={220} color={c.near} />
        {[70, 150, 250, 330].map((x, i) => (
          <HangingLantern key={x} x={x} y={0} len={60 + (i % 2) * 50} metal={c.trim} glow={c.glow} time={t} phase={i * 0.23} />
        ))}
      </g>
    ),
  },
  'rose-arbor': {
    far: (c) => (
      <g>
        <Hills y={600} amp={30} color={c.far} seed={9} />
        {[50, 110, 300, 360].map((x, i) => (
          <Tree key={x} x={x} y={620} r={28 + (i % 2) * 6} color={c.far} trunk={c.midShade} />
        ))}
      </g>
    ),
    mid: (c) => (
      <g>
        <path d="M-10 810L150 640H250L410 810Z" fill={c.mid} />
        <path d="M70 800V420A130 130 0 0 1 330 420V800" stroke={c.midShade} strokeWidth={10} fill="none" />
        <path d="M84 800V420A116 116 0 0 1 316 420V800" stroke={c.midShade} strokeWidth={3} fill="none" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={70} y1={440 + i * 40} x2={84} y2={440 + i * 40} stroke={c.midShade} strokeWidth={3} />
        ))}
      </g>
    ),
    near: (c) => {
      const pts: Array<[number, number]> = [];
      for (let i = 0; i <= 16; i++) {
        const a = Math.PI + (i / 16) * Math.PI;
        pts.push([q(200 + Math.cos(a) * 123), q(420 + Math.sin(a) * 123)]);
      }
      return (
        <g>
          {pts.map(([x, y], i) => (
            <g key={i}>
              <Leaf x={x - 8} y={y + 6} len={22} angle={i * 30} color={c.near} />
              <Rose x={x} y={y} r={9 + rnd(i, 2) * 5} color={c.bloom[i % c.bloom.length]!} light="#FFFFFF" />
            </g>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <g key={`s${i}`}>
              <Rose x={77 + (i % 2) * 4} y={480 + i * 32} r={8} color={c.bloom[i % c.bloom.length]!} light="#FFFFFF" />
              <Rose x={323 - (i % 2) * 4} y={490 + i * 32} r={8} color={c.bloom[(i + 1) % c.bloom.length]!} light="#FFFFFF" />
            </g>
          ))}
          <Bouquet x={40} y={780} s={1.5} colors={c.bloom} leaf={c.near} seed={5} />
          <Bouquet x={360} y={780} s={1.5} colors={c.bloom} leaf={c.near} seed={8} />
        </g>
      );
    },
  },
  'marigold-court': {
    far: (c) => (
      <g>
        <rect x={-10} y={380} width={420} height={430} fill={c.far} />
        {Array.from({ length: 40 }, (_, i) => (
          <circle key={i} cx={20 + (i % 10) * 40} cy={420 + Math.floor(i / 10) * 40} r={10} fill="none" stroke={c.midShade} strokeWidth={2} opacity={0.5} />
        ))}
      </g>
    ),
    mid: (c) => (
      <g>
        <path d="M90 810V460A110 110 0 0 1 310 460V810Z" fill={c.mid} />
        <path d="M120 810V470A80 80 0 0 1 280 470V810Z" fill={c.midShade} opacity={0.6} />
        <path d="M90 810V460A110 110 0 0 1 310 460V810" stroke={c.trim} strokeWidth={6} fill="none" />
        <path d="M120 810V470A80 80 0 0 1 280 470V810" stroke={c.trim} strokeWidth={2} fill="none" />
        <rect x={-10} y={770} width={420} height={40} fill={c.midShade} />
      </g>
    ),
    near: (c, t) => (
      <g>
        {Array.from({ length: 9 }, (_, i) => (
          <Garland key={i} x={20 + i * 45} y={0} len={110 + ((i * 37) % 70)} color={c.bloom[i % 2]!} dark={c.bloom[2]!} time={t} phase={i * 0.13} />
        ))}
        <ellipse cx={200} cy={790} rx={70} ry={14} fill={c.trim} />
        {Array.from({ length: 7 }, (_, i) => (
          <circle key={i} cx={150 + i * 17} cy={782} r={7} fill={c.bloom[i % 3]!} />
        ))}
      </g>
    ),
  },
  'bloom-meadow': {
    far: (c) => (
      <g>
        <Hills y={560} amp={50} color={c.far} seed={10} />
        <Hills y={640} amp={40} color={c.mid} seed={11} />
      </g>
    ),
    mid: (c) => (
      <g>
        {Array.from({ length: 26 }, (_, i) => (
          <Flower key={i} x={rnd(i, 4) * 400} y={680 + rnd(i, 5) * 110} r={8 + rnd(i, 6) * 8} color={c.bloom[i % c.bloom.length]!} center="#FFF4D6" />
        ))}
      </g>
    ),
    near: (c) => (
      <g>
        <Bouquet x={20} y={770} s={2} colors={c.bloom} leaf={c.near} kind="flower" seed={1} />
        <Bouquet x={380} y={780} s={2} colors={c.bloom} leaf={c.near} kind="flower" seed={2} />
        <Bouquet x={0} y={30} s={1.4} colors={c.bloom} leaf={c.near} kind="flower" seed={3} />
        <Bouquet x={400} y={20} s={1.4} colors={c.bloom} leaf={c.near} kind="flower" seed={4} />
      </g>
    ),
  },
  'minimal-arch': {
    far: () => null,
    mid: (c) => (
      <g>
        <path d="M110 760V330A90 90 0 0 1 290 330V760" stroke={c.trim} strokeWidth={1.4} fill="none" />
        <circle cx={200} cy={560} r={46} fill={c.glow} opacity={0.6} />
        <line x1={60} y1={760} x2={340} y2={760} stroke={c.near} strokeWidth={1} />
      </g>
    ),
    near: (c) => (
      <g>
        <path d="M300 760C300 700 320 660 350 630" stroke={c.near} strokeWidth={1.2} fill="none" />
        {[0, 1, 2, 3].map((i) => (
          <Leaf key={i} x={310 + i * 10} y={720 - i * 24} len={22} angle={-40 - i * 8} color={c.near} />
        ))}
      </g>
    ),
  },
};

const S = { ...BASE, ...MORE_SCENES, ...MODERN_SCENES } as Record<SceneKind, SceneDef>;

function Sky({ c, night, gid, time, modern }: { c: ScenePalette; night: boolean; gid: string; time?: number; modern?: boolean }) {
  // Modern scenes: a clean gradient with a soft glow — no clouds, moon or painted stars.
  if (modern)
    return (
      <g>
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={c.skyTop} />
            <stop offset="1" stopColor={c.skyBottom} />
          </linearGradient>
          <radialGradient id={`${gid}-glow`}>
            <stop offset="0" stopColor={c.glow} stopOpacity={night ? 0.22 : 0.6} />
            <stop offset="1" stopColor={c.glow} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect x={-20} y={-20} width={440} height={840} fill={`url(#${gid}-sky)`} />
        <ellipse cx={200} cy={night ? 300 : 340} rx={260} ry={300} fill={`url(#${gid}-glow)`} />
      </g>
    );
  return (
    <g>
      <defs>
        <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.skyTop} />
          <stop offset="1" stopColor={c.skyBottom} />
        </linearGradient>
        <radialGradient id={`${gid}-glow`}>
          <stop offset="0" stopColor={c.glow} stopOpacity={0.9} />
          <stop offset="1" stopColor={c.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-20} y={-20} width={440} height={840} fill={`url(#${gid}-sky)`} />
      <circle cx={night ? 300 : 200} cy={night ? 130 : 520} r={night ? 120 : 220} fill={`url(#${gid}-glow)`} />
      {night ? (
        <>
          <circle cx={300} cy={130} r={22} fill="#FFF6DD" opacity={0.92} />
          {/* Three twinkling groups (one animation each) instead of one per star: far cheaper on phones. */}
          {[0, 1, 2].map((g) => {
            const m = loop('twinkle', time, g / 3);
            return (
              <g key={g} className={m.className} style={m.style}>
                {Array.from({ length: 16 }, (_, k) => {
                  const i = g * 16 + k;
                  return <circle key={i} cx={q(rnd(i, 1) * 400)} cy={q(rnd(i, 2) * 460)} r={q(0.6 + rnd(i, 3) * 1.4)} fill="#FFFFFF" />;
                })}
              </g>
            );
          })}
        </>
      ) : (
        Array.from({ length: 5 }, (_, i) => <ellipse key={i} cx={rnd(i, 4) * 400} cy={60 + rnd(i, 5) * 260} rx={60 + rnd(i, 6) * 60} ry={14 + rnd(i, 7) * 10} fill="#FFFFFF" opacity={0.35} />)
      )}
    </g>
  );
}

/** Paper grain + slight edge wobble so flat shapes read as painted. */
function Paint({ gid, lite, children }: { gid: string; lite: boolean; children: ReactNode }) {
  if (lite) return <g>{children}</g>;
  return (
    <>
      <defs>
        <filter id={`${gid}-wc`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={3} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={3.5} />
        </filter>
      </defs>
      <g filter={`url(#${gid}-wc)`}>{children}</g>
    </>
  );
}

export type ImgLike = ComponentType<ImgHTMLAttributes<HTMLImageElement>>;

const fill: CSSProperties = { position: 'absolute', inset: 0, width: '100%', height: '100%' };

/**
 * One depth layer of a design's scene, filling its box (bottom-anchored, cropped at the sides
 * on wide screens). `time` (seconds) drives animation for video; omit it on the website.
 */
export function SceneLayer({
  design,
  layer,
  time,
  lite = false,
  Img = 'img' as unknown as ImgLike,
  className,
}: {
  design: SiteDesign;
  layer: PaintLayer;
  time?: number;
  lite?: boolean;
  Img?: ImgLike;
  className?: string;
}) {
  const gid = `s${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const painted = design.paint[`hero.${layer}`];
  if (painted) return <Img src={painted} alt="" aria-hidden className={className} style={{ ...fill, objectFit: 'cover', objectPosition: '50% 100%' }} />;
  const c = design.scene.colors;
  const def = S[design.scene.kind];
  const modern = design.scene.style === 'modern';
  return (
    <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMax slice" aria-hidden className={className} style={fill}>
      {layer === 'sky' ? (
        <Sky c={c} night={design.scene.night} gid={gid} time={time} modern={modern} />
      ) : (
        <Paint gid={gid} lite={lite || modern || layer === 'far'}>
          {def[layer](c, time)}
        </Paint>
      )}
    </svg>
  );
}

/**
 * The whole scene flattened into one picture, cropped to a slot: `venue` (the building, for
 * the location section) or `closing` (full scene, for the ending).
 */
export function SceneStill({ design, slot, time, lite = false, Img = 'img' as unknown as ImgLike, className }: { design: SiteDesign; slot: 'venue' | 'closing'; time?: number; lite?: boolean; Img?: ImgLike; className?: string }) {
  const gid = `v${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const painted = design.paint[slot];
  if (painted) return <Img src={painted} alt="" aria-hidden className={className} style={{ width: '100%', height: 'auto', display: 'block' }} />;
  const c = design.scene.colors;
  const def = S[design.scene.kind];
  const view = slot === 'venue' ? '0 380 400 430' : '0 0 400 800';
  return (
    <svg viewBox={view} aria-hidden className={className} style={{ width: '100%', height: 'auto', display: 'block' }}>
      <Sky c={c} night={design.scene.night} gid={gid} time={time} modern={design.scene.style === 'modern'} />
      <Paint gid={gid} lite={lite || design.scene.style === 'modern'}>
        {def.far(c, time)}
        {def.mid(c, time)}
        {slot === 'closing' && def.near(c, time)}
      </Paint>
    </svg>
  );
}
