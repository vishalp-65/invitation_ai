import type { Attire, CoupleStyle, FloralKind, LayoutId, MotifId, Theme } from '@cardai/shared';
import type { ReactNode } from 'react';
import { Couple, COUPLE_CROP } from '../art/Couple';
import { DiyaArt, MandalaWatermark } from '../art/Diya';
import { Cluster, FloralCorners } from '../art/Florals';
import { Ganesha } from '../art/Ganesha';
import { Balloons, BabyMoon, Cake, Cradle } from '../art/Kids';
import { Arch, Border, Clouds, Confetti, Corner, Divider, Gift, Lantern, Rainbow, Ribbon, Rings, Skyline, Sprig, Stars, Sunburst, Wreath } from '../art/Ornaments';
import { Bandhanwar, Bells, DiyaRow, Doves, Elephant, House, Kalash, LotusBloom, Peacock, Rangoli } from '../art/Sacred';
import { ArchPanel, Bow, Chhatri, Filigree, FnIcon, GendaLadi, GeoFrame, GoldRing, PalaceArch } from '../art/Architecture';
import { BloomCorner, BloomFrame, BloomRing, Greenery, LineFlower } from '../art/Botanicals';
import { Bunting, GiftBoxes, GlossyBalloons, Streamers } from '../art/Party';
import { Butterfly, GoldDust, LaceBand, Wash } from '../art/Atelier';
import { PaintFilter, useSvgId } from '../art/svg-ids';
import { Toran } from '../art/Toran';
import { Frame } from '../components/Frames';
import { Motif } from '../components/Motif';

export interface AssetRenderProps {
  w: number;
  h: number;
  c: string[];
  opts: Record<string, string | number | boolean>;
  /** Seconds into the video (0 for stills); drives sway / flicker. */
  t: number;
}

export type StickerCategory = 'wedding' | 'kids' | 'religious' | 'business' | 'ornament';

export interface AssetDef {
  label: string;
  /** Default colours (also defines how many colour slots the editor shows). */
  colors: string[];
  /** Natural aspect ratio w/h for new stickers. */
  aspect: number;
  /** Full-bleed page decorations aren't offered as stickers. */
  page?: boolean;
  /** Gentle idle motion in the video. */
  motion?: 'sway' | 'float' | 'twinkle' | 'flicker';
  render: (p: AssetRenderProps) => ReactNode;
}

const box = (w: number, h: number, node: ReactNode) => (
  <div style={{ width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>{node}</div>
);

function ClusterArt({ w, h, kind }: { w: number; h: number; kind: Exclude<FloralKind, 'none'> }) {
  const fid = useSvgId('cl');
  return (
    <svg width={w} height={h} viewBox="0 0 440 440" preserveAspectRatio="xMidYMid meet" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <PaintFilter id={fid} strength={8} />
      </defs>
      <g filter={`url(#${fid})`}>
        <Cluster kind={kind} unit={100} />
      </g>
    </svg>
  );
}

function legacyTheme(c: string[]): Theme {
  const [primary = '#C9973F', accent = '#F4D58D', surface = '#FFF6E5', background = '#5B0F1B', backgroundAlt = background, text = '#FFF6E5'] = c;
  return { palette: { primary, accent, surface, background, backgroundAlt, text, muted: text }, motif: 'none', pattern: 'none', ornamentOpacity: 0.18 };
}

const s = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

export const ASSETS: Record<string, AssetDef> = {
  // ---- illustrations
  ganesha: {
    label: 'Shree Ganesha',
    colors: ['#C9973F', '#F4D58D'],
    aspect: 1 / 1.1,
    motion: 'float',
    render: ({ w, h, c, opts }) => box(w, h, <Ganesha size={Math.min(w, h / 1.1)} color={c[0]!} glow={c[1] ?? c[0]!} light={Boolean(opts.light)} />),
  },
  couple: {
    label: 'Bride & groom',
    colors: ['#C9973F', '#F6E7CB'],
    aspect: 0.8,
    render: ({ w, h, c, opts }) =>
      box(
        w,
        h,
        (() => {
          const only = opts.only === 'groom' || opts.only === 'bride' ? opts.only : undefined;
          const k = only ? COUPLE_CROP[only][1] / 240 : 1;
          return <Couple style={s(opts.style, 'watercolor') as CoupleStyle} attire={s(opts.attire, 'north') as Attire} ink={c[0]!} wash={c[1] ?? '#F6E7CB'} size={Math.min(w / k, h / 1.25)} only={only} />;
        })(),
      ),
  },
  diya: { label: 'Diya', colors: ['#C9973F'], aspect: 1 / 0.62, motion: 'flicker', render: ({ w, h, c }) => box(w, h, <DiyaArt size={Math.min(w, h / 0.62)} gold={c[0]!} />) },
  motif: {
    label: 'Symbol',
    colors: ['#C9973F', '#F4D58D'],
    aspect: 1,
    motion: 'float',
    render: ({ w, h, c, opts }) => box(w, h, <Motif motif={s(opts.motif, 'om') as MotifId} color={c[0]!} accent={c[1] ?? c[0]!} size={Math.min(w, h)} />),
  },
  kalash: { label: 'Kalash', colors: ['#C9973F', '#2F7D32', '#B5121B'], aspect: 100 / 130, motion: 'float', render: (p) => <Kalash {...p} /> },
  'floral-cluster': {
    label: 'Flower bouquet',
    colors: [],
    aspect: 1,
    motion: 'sway',
    render: ({ w, h, opts }) => <ClusterArt w={w} h={h} kind={s(opts.kind, 'rose') as Exclude<FloralKind, 'none'>} />,
  },
  sprig: { label: 'Leafy branch', colors: ['#6E8B5A', '#C9973F'], aspect: 1, motion: 'sway', render: (p) => <Sprig {...p} /> },
  wreath: { label: 'Wreath', colors: ['#7A9A6B', '#C9973F'], aspect: 1, render: (p) => <Wreath {...p} /> },
  lotus: { label: 'Lotus', colors: ['#F4A6B7', '#5D8C4A', '#C9973F'], aspect: 360 / 260, motion: 'float', render: (p) => <LotusBloom {...p} /> },
  peacock: { label: 'Peacock', colors: ['#1B4F9C', '#2E8B57', '#C9973F'], aspect: 1, render: (p) => <Peacock {...p} /> },
  elephant: { label: 'Elephant', colors: ['#7E8796', '#B5121B', '#C9973F'], aspect: 420 / 380, render: (p) => <Elephant {...p} /> },
  house: { label: 'Home', colors: ['#FFF6E5', '#B5121B', '#C9973F'], aspect: 380 / 330, render: (p) => <House {...p} /> },
  doves: { label: 'Doves', colors: ['#FFFFFF', '#C9973F'], aspect: 260 / 180, motion: 'float', render: (p) => <Doves {...p} /> },
  rings: { label: 'Rings', colors: ['#C9973F', '#F7E2A6'], aspect: 200 / 150, motion: 'float', render: (p) => <Rings {...p} /> },
  'diya-row': { label: 'Row of diyas', colors: ['#C9973F', '#FFB627'], aspect: 940 / 220, motion: 'flicker', render: (p) => <DiyaRow {...p} /> },
  bells: { label: 'Temple bells', colors: ['#C9973F'], aspect: 170 / 300, motion: 'sway', render: (p) => <Bells {...p} /> },
  lantern: { label: 'Lantern', colors: ['#E9B949', '#FFE29A'], aspect: 0.4, motion: 'sway', render: (p) => <Lantern {...p} /> },
  rangoli: { label: 'Rangoli', colors: ['#E2553D', '#F2A900', '#FFFFFF'], aspect: 1, render: (p) => <Rangoli {...p} w={p.w} h={p.h} /> },
  balloons: { label: 'Balloons', colors: ['#E0533D', '#2B6CB0', '#F2A900'], aspect: 460 / 640, motion: 'float', render: (p) => <Balloons {...p} /> },
  cake: { label: 'Cake', colors: ['#FFF4E6', '#D6336C', '#2B6CB0'], aspect: 340 / 360, render: (p) => <Cake {...p} /> },
  'baby-moon': { label: 'Moon & stars', colors: ['#F8D57E', '#C08B2C', '#FFFFFF'], aspect: 330 / 300, motion: 'float', render: (p) => <BabyMoon {...p} /> },
  cradle: { label: 'Cradle', colors: ['#C9973F', '#2F6FA3', '#FFFFFF'], aspect: 320 / 260, motion: 'sway', render: (p) => <Cradle {...p} /> },
  gift: { label: 'Gift', colors: ['#C2543A', '#E9B949'], aspect: 1, render: (p) => <Gift {...p} /> },
  rainbow: { label: 'Rainbow', colors: ['#F28B82', '#FBBC04', '#81C995', '#8AB4F8'], aspect: 660 / 360, render: (p) => <Rainbow {...p} /> },
  // ---- ornaments
  corner: { label: 'Corner flourish', colors: ['#C9973F'], aspect: 1, render: (p) => <Corner {...p} /> },
  divider: { label: 'Divider', colors: ['#C9973F'], aspect: 10, render: (p) => <Divider {...p} /> },
  mandala: { label: 'Mandala', colors: ['#C9973F'], aspect: 1, render: ({ w, h, c }) => box(w, h, <MandalaWatermark size={Math.min(w, h)} color={c[0]!} opacity={1} />) },
  sunburst: { label: 'Sun rays', colors: ['#F2C462'], aspect: 1, render: (p) => <Sunburst {...p} /> },
  arch: { label: 'Arch window', colors: ['#C9973F', '#FFF8EC'], aspect: 0.55, render: (p) => <Arch {...p} /> },
  ribbon: { label: 'Ribbon & bow', colors: ['#C8102E', '#E9B949'], aspect: 3, render: (p) => <Ribbon {...p} /> },
  skyline: { label: 'Mosque skyline', colors: ['#062319', '#E9B949'], aspect: 2.7, render: (p) => <Skyline {...p} /> },
  clouds: { label: 'Clouds', colors: ['#FFFFFF', '#EEF6FF'], aspect: 3.3, motion: 'float', render: (p) => <Clouds {...p} /> },
  stars: { label: 'Sparkles', colors: ['#F2C462'], aspect: 1, motion: 'twinkle', render: (p) => <Stars {...p} /> },
  confetti: { label: 'Confetti', colors: ['#E0533D', '#F2A900', '#2B6CB0'], aspect: 2, render: (p) => <Confetti {...p} /> },
  bandhanwar: { label: 'Bandhanwar', colors: ['#2F7D32', '#F28C0F'], aspect: 3.6, motion: 'sway', render: (p) => <Bandhanwar {...p} /> },
  toran: {
    label: 'Toran',
    colors: ['#FFC93C'],
    aspect: 3.6,
    motion: 'sway',
    // The toran draws relative to a full card height; its visible part is ~20% of that.
    render: ({ w, h, c, t }) => (
      <div style={{ width: w, height: h, position: 'relative', overflow: 'visible' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h / 0.2 }}>
          <ToranArt w={w} h={h / 0.2} glow={c[0]!} sway={Math.sin(t * 1.6) * 2.4} />
        </div>
      </div>
    ),
  },
  border: { label: 'Border', colors: ['#C9973F', '#F4D58D'], aspect: 1080 / 1920, page: true, render: (p) => <Border {...p} /> },
  frame: {
    label: 'Frame',
    colors: ['#C9973F', '#F4D58D', '#FFF6E5'],
    aspect: 1080 / 1920,
    page: true,
    render: ({ w, h, c, opts }) => (
      <div style={{ width: w, height: h, position: 'relative' }}>
        <Frame layout={s(opts.layout, 'royal-arch') as LayoutId} theme={legacyTheme(c)} width={w} height={h} />
      </div>
    ),
  },
  'arch-panel': { label: 'Arch panel', colors: ['#FFF6E5', '#C9973F', '#C9973F'], aspect: 0.62, render: (p) => <ArchPanel {...p} /> },
  'palace-arch': { label: 'Palace arch', colors: ['#F2B8B5', '#D98E8B', '#C9973F'], aspect: 1080 / 1920, page: true, render: (p) => <PalaceArch {...p} /> },
  filigree: { label: 'Gold filigree', colors: ['#C9973F'], aspect: 1, render: (p) => <Filigree {...p} /> },
  'geo-frame': { label: 'Geometric frame', colors: ['#C9973F'], aspect: 0.62, render: (p) => <GeoFrame {...p} /> },
  'gold-ring': { label: 'Gold hoop', colors: ['#C9973F'], aspect: 1, render: (p) => <GoldRing {...p} /> },
  bow: { label: 'Satin bow', colors: ['#B9BEC6', '#8D939C'], aspect: 0.2, render: (p) => <Bow {...p} /> },
  chhatri: { label: 'Royal umbrella', colors: ['#C2185B', '#1B4F9C', '#E9B949'], aspect: 0.8, motion: 'sway', render: (p) => <Chhatri {...p} /> },
  'genda-ladi': { label: 'Marigold strings', colors: ['#F28C0F', '#FFC93C', '#2F7D32'], aspect: 0.35, motion: 'sway', render: (p) => <GendaLadi {...p} /> },
  'fn-icon': { label: 'Function icon', colors: ['#C9973F', '#F4D58D'], aspect: 1, motion: 'float', render: (p) => <FnIcon {...p} /> },
  'bloom-corner': { label: 'Watercolour bouquet', colors: ['#B58FD1', '#6A4C93', '#7A9A6B', '#E9C46A'], aspect: 1, motion: 'sway', render: (p) => <BloomCorner {...p} /> },
  greenery: { label: 'Greenery', colors: ['#6E8B5A', '#3F5A35'], aspect: 1, motion: 'sway', render: (p) => <Greenery {...p} /> },
  'line-flower': { label: 'Line-art flower', colors: ['#3B2A1A'], aspect: 0.9, render: (p) => <LineFlower {...p} /> },
  'bloom-ring': { label: 'Floral gold ring', colors: ['#C9973F', '#E58FAB', '#A8243A', '#7A9A6B'], aspect: 1, render: (p) => <BloomRing {...p} /> },
  butterfly: { label: 'Butterfly', colors: ['#9A7FD1', '#5B4391', '#3B2A4A'], aspect: 200 / 160, motion: 'float', render: (p) => <Butterfly {...p} /> },
  'gold-dust': { label: 'Gold flecks', colors: ['#C9973F'], aspect: 1, motion: 'twinkle', render: (p) => <GoldDust {...p} /> },
  wash: { label: 'Watercolour wash', colors: ['#BFD7EA', '#DCEAF5'], aspect: 1, render: (p) => <Wash {...p} /> },
  'lace-band': { label: 'Gold lace band', colors: ['#C9973F', '#F4E2B0'], aspect: 9, render: (p) => <LaceBand {...p} /> },
  'bloom-frame': { label: 'Floral name frame', colors: ['#FFFFFF', '#E8B4B8', '#9A5A60', '#9AA77F'], aspect: 1.25, render: (p) => <BloomFrame {...p} /> },
  'glossy-balloons': { label: 'Glossy balloons', colors: ['#5FA8D3', '#8EC3E3', '#7A8A99'], aspect: 300 / 420, motion: 'float', render: (p) => <GlossyBalloons {...p} /> },
  'gift-boxes': { label: 'Gift boxes', colors: ['#F4EEE6', '#3D97B8', '#E9E1D6'], aspect: 3, render: (p) => <GiftBoxes {...p} /> },
  bunting: { label: 'Bunting', colors: ['#3D97B8', '#7FBFD8', '#4A5A66'], aspect: 4, motion: 'sway', render: (p) => <Bunting {...p} /> },
  streamers: { label: 'Streamers', colors: ['#D4A63A', '#F6E2A8'], aspect: 1, motion: 'sway', render: (p) => <Streamers {...p} /> },
  florals: {
    label: 'Corner flowers',
    colors: [],
    aspect: 1080 / 1920,
    page: true,
    render: ({ w, h, opts }) => (
      <div style={{ width: w, height: h, position: 'relative' }}>
        <FloralCorners kind={s(opts.kind, 'rose') as FloralKind} placement={s(opts.placement, 'bottom') as 'bottom'} width={w} height={h} />
      </div>
    ),
  },
};

function ToranArt({ w, h, glow, sway }: { w: number; h: number; glow: string; sway: number }) {
  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <Toran width={w} height={h} glow={glow} sway={sway} />
    </div>
  );
}

export interface Sticker {
  id: string;
  asset: string;
  label: string;
  category: StickerCategory;
  opts?: Record<string, string | number | boolean>;
  colors?: string[];
  /** Default width on the 1080 canvas. */
  w: number;
}

const ATTIRE_LABEL: Record<string, string> = {
  north: 'North Indian',
  south: 'South Indian',
  bengali: 'Bengali',
  marathi: 'Marathi',
  sikh: 'Sikh',
  muslim: 'Nikah',
  christian: 'Church',
};
const STYLE_LABEL: Record<string, string> = { watercolor: 'painted', caricature: 'cute', lineart: 'line art' };

/** Sticker library shown in the editor, grouped by category. */
export const STICKERS: Sticker[] = [
  { id: 'ganesha', asset: 'ganesha', label: 'Shree Ganesha', category: 'wedding', w: 220 },
  ...(['watercolor', 'caricature', 'lineart'] as const).flatMap((style) =>
    Object.keys(ATTIRE_LABEL).map((attire) => ({
      id: `couple-${style}-${attire}`,
      asset: 'couple',
      label: `${ATTIRE_LABEL[attire]} couple, ${STYLE_LABEL[style]}`,
      category: 'wedding' as const,
      opts: { style, attire },
      w: 420,
    })),
  ),
  ...(['rose', 'marigold', 'lotus', 'jasmine', 'mixed'] as const).map((kind) => ({ id: `flowers-${kind}`, asset: 'floral-cluster', label: `${kind[0]!.toUpperCase()}${kind.slice(1)} flowers`, category: 'wedding' as const, opts: { kind }, w: 360 })),
  { id: 'rings', asset: 'rings', label: 'Rings', category: 'wedding', w: 260 },
  { id: 'doves', asset: 'doves', label: 'Doves', category: 'wedding', w: 300 },
  { id: 'elephant', asset: 'elephant', label: 'Elephant', category: 'wedding', w: 380 },
  { id: 'peacock', asset: 'peacock', label: 'Peacock', category: 'wedding', w: 360 },
  { id: 'toran', asset: 'toran', label: 'Toran', category: 'wedding', w: 1080 },
  { id: 'bandhanwar', asset: 'bandhanwar', label: 'Bandhanwar', category: 'wedding', w: 1080 },
  { id: 'bandhanwar-jasmine', asset: 'bandhanwar', label: 'Jasmine garland', category: 'wedding', opts: { flowers: 'jasmine' }, colors: ['#2F7D32', '#FFFFFF'], w: 1080 },
  { id: 'balloons', asset: 'balloons', label: 'Balloons', category: 'kids', w: 360 },
  { id: 'cake', asset: 'cake', label: 'Cake', category: 'kids', w: 320 },
  { id: 'baby-moon', asset: 'baby-moon', label: 'Moon & stars', category: 'kids', w: 320 },
  { id: 'cradle', asset: 'cradle', label: 'Cradle', category: 'kids', w: 320 },
  { id: 'gift', asset: 'gift', label: 'Gift', category: 'kids', w: 220 },
  { id: 'rainbow', asset: 'rainbow', label: 'Rainbow', category: 'kids', w: 520 },
  { id: 'clouds', asset: 'clouds', label: 'Clouds', category: 'kids', w: 1080 },
  { id: 'confetti', asset: 'confetti', label: 'Confetti', category: 'kids', w: 1080 },
  { id: 'kalash', asset: 'kalash', label: 'Kalash', category: 'religious', w: 220 },
  { id: 'diya', asset: 'diya', label: 'Diyas', category: 'religious', w: 280 },
  { id: 'diya-row', asset: 'diya-row', label: 'Row of diyas', category: 'religious', w: 900 },
  { id: 'bells', asset: 'bells', label: 'Temple bells', category: 'religious', w: 180 },
  { id: 'lotus', asset: 'lotus', label: 'Lotus', category: 'religious', w: 420 },
  { id: 'house', asset: 'house', label: 'Home', category: 'religious', w: 380 },
  ...(['flower', 'kolam', 'alpona'] as const).map((style) => ({ id: `rangoli-${style}`, asset: 'rangoli', label: style === 'flower' ? 'Rangoli' : style === 'kolam' ? 'Kolam' : 'Alpona', category: 'religious' as const, opts: { style }, w: 380 })),
  ...(['om', 'shree', 'kalash', 'diya', 'lotus', 'khanda', 'crescent', 'cross', 'peacock', 'heart', 'balloons'] as const).map((m) => ({ id: `motif-${m}`, asset: 'motif', label: m === 'om' ? 'Om' : m === 'shree' ? 'Shree' : `${m[0]!.toUpperCase()}${m.slice(1)} symbol`, category: 'religious' as const, opts: { motif: m }, w: 160 })),
  { id: 'lantern', asset: 'lantern', label: 'Lantern', category: 'religious', w: 140 },
  { id: 'skyline', asset: 'skyline', label: 'Mosque skyline', category: 'religious', w: 1080 },
  { id: 'ribbon', asset: 'ribbon', label: 'Ribbon & bow', category: 'business', w: 1080 },
  { id: 'sunburst', asset: 'sunburst', label: 'Sun rays', category: 'business', w: 700 },
  { id: 'stars', asset: 'stars', label: 'Sparkles', category: 'business', w: 600 },
  { id: 'corner', asset: 'corner', label: 'Corner flourish', category: 'ornament', w: 240 },
  ...(['ornate', 'lotus', 'leaf', 'dots', 'simple', 'hearts', 'stars', 'deco'] as const).map((style) => ({ id: `divider-${style}`, asset: 'divider', label: `${style[0]!.toUpperCase()}${style.slice(1)} divider`, category: 'ornament' as const, opts: { style }, w: 460 })),
  { id: 'mandala', asset: 'mandala', label: 'Mandala', category: 'ornament', w: 600 },
  { id: 'wreath', asset: 'wreath', label: 'Wreath', category: 'ornament', w: 500 },
  { id: 'sprig', asset: 'sprig', label: 'Leafy branch', category: 'ornament', w: 300 },
  { id: 'arch', asset: 'arch', label: 'Arch window', category: 'ornament', w: 700 },
  ...(['scallop', 'mughal', 'dome', 'oval'] as const).map((shape) => ({ id: `arch-panel-${shape}`, asset: 'arch-panel', label: `${shape[0]!.toUpperCase()}${shape.slice(1)} arch panel`, category: 'ornament' as const, opts: { shape }, w: 760 })),
  { id: 'filigree', asset: 'filigree', label: 'Gold filigree', category: 'ornament', w: 300 },
  { id: 'geo-frame', asset: 'geo-frame', label: 'Geometric frame', category: 'ornament', w: 800 },
  { id: 'gold-ring', asset: 'gold-ring', label: 'Gold hoop', category: 'ornament', w: 520 },
  { id: 'bloom-ring-rose', asset: 'bloom-ring', label: 'Rose gold ring', category: 'wedding', opts: { kind: 'rose' }, w: 620 },
  { id: 'bloom-ring-hydrangea', asset: 'bloom-ring', label: 'Hydrangea gold ring', category: 'wedding', opts: { kind: 'hydrangea' }, w: 620 },
  { id: 'butterfly', asset: 'butterfly', label: 'Butterfly', category: 'ornament', w: 180 },
  { id: 'gold-dust', asset: 'gold-dust', label: 'Gold flecks', category: 'ornament', w: 600 },
  { id: 'wash', asset: 'wash', label: 'Watercolour wash', category: 'ornament', w: 700 },
  { id: 'lace-band', asset: 'lace-band', label: 'Gold lace band', category: 'ornament', w: 1080 },
  { id: 'bloom-frame', asset: 'bloom-frame', label: 'Floral name frame', category: 'wedding', w: 640 },
  ...(['single', 'pair', 'trio', 'cluster'] as const).map((bunch) => ({ id: `balloons-${bunch}`, asset: 'glossy-balloons', label: `Balloons (${bunch})`, category: 'kids' as const, opts: { bunch }, w: 300 })),
  { id: 'balloons-gold', asset: 'glossy-balloons', label: 'Gold foil balloons', category: 'kids', opts: { bunch: 'cluster', metal: true }, colors: ['#D4A63A', '#E8C66A', '#B08A3A'], w: 320 },
  { id: 'gift-boxes', asset: 'gift-boxes', label: 'Gift boxes', category: 'kids', w: 1080 },
  { id: 'bunting', asset: 'bunting', label: 'Bunting', category: 'kids', w: 1080 },
  { id: 'bunting-banner', asset: 'bunting', label: 'Banner flags', category: 'wedding', opts: { style: 'banner', swags: 1 }, w: 420 },
  { id: 'streamers', asset: 'streamers', label: 'Streamers', category: 'kids', w: 600 },
  { id: 'groom', asset: 'couple', label: 'Groom', category: 'wedding', opts: { style: 'caricature', attire: 'north', only: 'groom' }, w: 220 },
  { id: 'bride', asset: 'couple', label: 'Bride', category: 'wedding', opts: { style: 'caricature', attire: 'north', only: 'bride' }, w: 200 },
  { id: 'bow', asset: 'bow', label: 'Satin bow', category: 'wedding', w: 220 },
  { id: 'chhatri', asset: 'chhatri', label: 'Royal umbrella', category: 'wedding', w: 260 },
  { id: 'genda-ladi', asset: 'genda-ladi', label: 'Marigold strings', category: 'wedding', opts: { count: 3 }, w: 240 },
  ...(['haldi', 'mehendi', 'sangeet', 'baraat', 'wedding', 'pheras', 'reception', 'rings', 'puja', 'nikah', 'cake', 'dinner', 'flower'] as const).map((icon) => ({ id: `fn-icon-${icon}`, asset: 'fn-icon', label: `${icon[0]!.toUpperCase()}${icon.slice(1)} icon`, category: 'wedding' as const, opts: { icon }, w: 150 })),
  ...(['peony', 'rose', 'hydrangea', 'tulip', 'daisy', 'mixed'] as const).map((kind) => ({ id: `bloom-${kind}`, asset: 'bloom-corner', label: `Watercolour ${kind}`, category: 'wedding' as const, opts: { kind }, w: 420 })),
  ...(['eucalyptus', 'olive', 'fern', 'mixed'] as const).map((kind) => ({ id: `greenery-${kind}`, asset: 'greenery', label: `${kind[0]!.toUpperCase()}${kind.slice(1)} greenery`, category: 'ornament' as const, opts: { kind }, w: 420 })),
  ...(['poppy', 'lily', 'rose', 'wild'] as const).map((kind) => ({ id: `line-${kind}`, asset: 'line-flower', label: `Line-art ${kind === 'wild' ? 'wildflowers' : kind}`, category: 'ornament' as const, opts: { kind }, w: 360 })),
];
