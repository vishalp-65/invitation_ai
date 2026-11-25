import { artSrc, PAINTED_MASKS, photoBgBox, type PhotoBg, type PhotoBgFade, type PhotoBgShape } from '@cardai/shared';
import type { ComponentType, CSSProperties, ImgHTMLAttributes } from 'react';
import { photoCrossOrigin } from './cors';

/**
 * The host's photo behind a design (card cover, website hero, video opening): placed on a 3×3
 * grid or full, cut to a shape, faded into the design, blended or recoloured in its colours.
 * Positioned in % of its parent, so the same spec looks the same on a 9:16 card, a phone and
 * a desktop hero. CSS only (masks, blend modes, filters), no canvas work.
 */

type Img = ComponentType<ImgHTMLAttributes<HTMLImageElement>>;

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

/** Heart and torn-paper cut-outs as SVG masks (stretched to the box). */
const HEART = svgUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 92" preserveAspectRatio="none"><path d="M50 90C24 70 2 52 2 28 2 13 13 2 27 2c10 0 18 6 23 15C55 8 63 2 73 2c14 0 25 11 25 26 0 24-22 42-48 62z"/></svg>',
);
const TORN = svgUrl(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M3 4 9 2 15 5 22 1 29 4 36 2 43 5 50 1 57 4 64 2 71 5 78 1 85 4 92 2 97 5 99 12 96 19 99 26 97 33 99 40 96 47 99 54 97 61 99 68 96 75 99 82 97 89 98 96 91 99 84 96 77 98 70 95 63 99 56 96 49 98 42 95 35 99 28 96 21 98 14 95 7 98 2 95 4 88 1 81 4 74 2 67 5 60 1 53 4 46 2 39 5 32 1 25 4 18 2 11z"/></svg>',
);

const FADE: Record<Exclude<PhotoBgFade, 'none'>, string> = {
  soft: 'radial-gradient(closest-side, #000 58%, transparent 100%)',
  bottom: 'linear-gradient(to bottom, #000 50%, transparent 100%)',
  top: 'linear-gradient(to top, #000 50%, transparent 100%)',
  sides: 'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)',
};

function shapeMask(shape: PhotoBgShape): string | null {
  if (shape === 'heart') return HEART;
  if (shape === 'torn') return TORN;
  if (shape === 'brush') return `url("${artSrc(PAINTED_MASKS.brush)}")`;
  return null;
}

/** Mask layers (shape and fade intersect), with the WebKit spellings Chrome/Remotion need. */
function maskCss(layers: string[]): CSSProperties {
  if (!layers.length) return {};
  const size = layers.map(() => '100% 100%').join(', ');
  const repeat = layers.map(() => 'no-repeat').join(', ');
  return {
    WebkitMaskImage: layers.join(', '),
    maskImage: layers.join(', '),
    WebkitMaskSize: size,
    maskSize: size,
    WebkitMaskRepeat: repeat,
    maskRepeat: repeat,
    ...(layers.length > 1 ? { WebkitMaskComposite: 'source-in', maskComposite: 'intersect' } : {}),
  } as CSSProperties;
}

export function PhotoBackdrop({
  spec,
  src,
  tones,
  canvasAspect,
  Img: ImgEl,
  zoom = 1,
  style,
  ink,
}: {
  spec: PhotoBg;
  src: string;
  /** Dark and light colour of the design (duotone, frames). */
  tones: [string, string];
  /** Height ÷ width of the parent. */
  canvasAspect: number;
  /** Remotion's <Img> (waits for the image before the frame renders); plain <img> otherwise. */
  Img?: Img;
  /** Slow push-in for video / hero motion. */
  zoom?: number;
  style?: CSSProperties;
  /** Text colour drawn over a full-background photo: a light or dark wash keeps it readable. */
  ink?: string;
}) {
  const I: Img = ImgEl ?? ((p) => <img {...p} />);
  const box = photoBgBox(spec, canvasAspect);
  const full = spec.position === 'full';
  const shape = full ? 'none' : spec.shape;
  const framed = shape === 'polaroid' || shape === 'film';
  const fade = spec.fade !== 'none' && !framed ? [FADE[spec.fade]] : [];
  const cut = shapeMask(shape);
  const radius = shape === 'circle' ? '50%' : shape === 'arch' ? '999px 999px 0 0' : undefined;
  const [dark, light] = tones;

  const photo = (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: radius, isolation: 'isolate', background: spec.duotone ? light : undefined }}>
      <I
        src={src}
        alt=""
        crossOrigin={photoCrossOrigin()}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          transform: zoom !== 1 ? `scale(${zoom})` : undefined,
          // Duotone: greyscale photo multiplied over the light tone, dark tone lightened on top.
          filter: spec.duotone ? 'grayscale(1) contrast(1.15)' : undefined,
          mixBlendMode: spec.duotone ? 'multiply' : undefined,
        }}
      />
      {spec.duotone && <div style={{ position: 'absolute', inset: 0, background: dark, mixBlendMode: 'lighten' }} />}
    </div>
  );

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        left: `${box.x * 100}%`,
        top: `${box.y * 100}%`,
        width: `${box.w * 100}%`,
        height: `${box.h * 100}%`,
        opacity: spec.opacity,
        mixBlendMode: spec.blend === 'normal' ? undefined : spec.blend,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {shape === 'polaroid' ? (
        // White instant-photo card, a little tilted, wide bottom edge.
        <div style={{ position: 'absolute', inset: 0, background: '#FFFDF8', padding: '5% 5% 18%', transform: 'rotate(-3deg)', boxShadow: '0 12px 30px rgba(0,0,0,0.22)' }}>
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>{photo}</div>
        </div>
      ) : shape === 'film' ? (
        // Film strip: dark frame with sprocket holes down both sides.
        <div style={{ position: 'absolute', inset: 0, background: dark, padding: '6% 12%' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `radial-gradient(circle at center, ${light} 0 30%, transparent 33%), radial-gradient(circle at center, ${light} 0 30%, transparent 33%)`,
              backgroundSize: '9% 5.5%, 9% 5.5%',
              backgroundRepeat: 'repeat-y, repeat-y',
              backgroundPosition: '1.5% 0, 98.5% 0',
              opacity: 0.85,
            }}
          />
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>{photo}</div>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, ...maskCss([...(cut ? [cut] : []), ...fade]) }}>
          {photo}
          {/* Full background under text: a wash in the opposite tone of the text. */}
          {full && ink && <div style={{ position: 'absolute', inset: 0, background: isLight(ink) ? 'rgba(0,0,0,0.38)' : 'rgba(255,255,255,0.42)' }} />}
        </div>
      )}
    </div>
  );
}

function isLight(c: string) {
  const [r, g, b] = c.startsWith('#') ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (c.match(/\d+/g) ?? ['0', '0', '0']).map(Number);
  return 0.299 * r! + 0.587 * g! + 0.114 * b! > 150;
}

/** Dark and light tones of a palette for duotone (whichever of the two colours is darker). */
export function photoTones(a: string, b: string): [string, string] {
  // Accepts #RRGGBB or rgb(r,g,b).
  const lum = (c: string) => {
    const [r, g, b] = c.startsWith('#') ? [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) : (c.match(/\d+/g) ?? ['0', '0', '0']).map(Number);
    return 0.299 * r! + 0.587 * g! + 0.114 * b!;
  };
  return lum(a) <= lum(b) ? [a, b] : [b, a];
}
