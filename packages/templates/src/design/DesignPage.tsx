import {
  DESIGN_H,
  DESIGN_W,
  detectScript,
  curvedTextPath,
  displayText,
  getLanguage,
  imageFilterCss,
  resolveBinding,
  type DesignData,
  type DesignElement,
  type DesignPage as Page,
  type ImageElement,
  type TextElement,
} from '@cardai/shared';
import { memo, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Pattern } from '../components/Pattern';
import { withAlpha } from '../utils/color';
import { ASSETS } from './assets';
import { elementMotion } from './motion';

/** Lets Remotion hold a frame until text has been measured (stills/video). No-op in the browser. */
export interface RenderGate {
  hold: (label: string) => number;
  release: (handle: number) => void;
}

export interface DesignPageProps {
  page: Page;
  data: DesignData | null;
  /** Rendered width in CSS px (height follows 9:16). */
  width: number;
  /** Seconds into this page's video scene; undefined = static (final) state. */
  t?: number;
  /** Elements to hide (the editor hides the one being typed into). */
  hidden?: ReadonlySet<string>;
  /** Show "add photo" placeholders for empty photo frames (editor only). */
  placeholders?: boolean;
  /** Called with each element's measured height (editor uses it for selection boxes). */
  onMeasure?: (id: string, h: number) => void;
  gate?: RenderGate;
  /** Fallback fonts for the invitation's script. */
  language?: string;
  fontsReady?: boolean;
  className?: string;
  style?: CSSProperties;
}

const FALLBACK_BY_SCRIPT: Record<string, string> = {
  Deva: 'Tiro Devanagari Hindi',
  Gujr: 'Noto Serif Gujarati',
  Taml: 'Noto Serif Tamil',
  Telu: 'Noto Serif Telugu',
  Knda: 'Noto Serif Kannada',
  Mlym: 'Noto Serif Malayalam',
  Beng: 'Noto Serif Bengali',
  Guru: 'Noto Serif Gurmukhi',
  Orya: 'Noto Serif Oriya',
  Arab: 'Noto Naskh Arabic',
};

export function fontStack(font: string, text: string, language?: string): string {
  const script = detectScript(text);
  const fb = FALLBACK_BY_SCRIPT[script] ?? (language ? getLanguage(language).fonts.display : undefined);
  return [`"${font}"`, fb && fb !== font ? `"${fb}"` : null, '"Noto Sans"', 'sans-serif'].filter(Boolean).join(', ');
}

/** Fonts a page needs (families + scripts) so callers can preload them. */
export function fontsForPages(pages: Page[], data: DesignData | null): Array<{ family: string; script: string }> {
  const out = new Map<string, { family: string; script: string }>();
  for (const p of pages)
    for (const e of p.elements) {
      if (e.type !== 'text') continue;
      const text = displayText(e, data);
      const script = detectScript(text);
      out.set(`${e.font}|${script}`, { family: e.font, script });
      const fb = FALLBACK_BY_SCRIPT[script];
      if (fb) out.set(`${fb}|${script}`, { family: fb, script });
    }
  return [...out.values()];
}

function lighten(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * k));
  return `rgb(${ch.join(',')})`;
}
function darken(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - k)));
  return `rgb(${ch.join(',')})`;
}

function textStyle(el: TextElement, size: number, language?: string, text = ''): CSSProperties {
  const base: CSSProperties = {
    fontFamily: fontStack(el.font, text, language),
    fontSize: size,
    fontWeight: el.weight,
    fontStyle: el.italic ? 'italic' : 'normal',
    lineHeight: el.lh,
    letterSpacing: `${el.ls}em`,
    textTransform: el.upper ? 'uppercase' : 'none',
    textAlign: el.align,
    color: el.color,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
  };
  const fx = el.effectColor ?? el.color;
  switch (el.effect) {
    case 'shadow':
      return { ...base, textShadow: `0 ${size * 0.05}px ${size * 0.16}px rgba(0,0,0,0.35)` };
    case 'glow':
      return { ...base, textShadow: `0 0 ${size * 0.18}px ${withAlpha(fx, 0.85)}, 0 0 ${size * 0.4}px ${withAlpha(fx, 0.45)}` };
    case 'outline':
      return { ...base, WebkitTextStroke: `${Math.max(1.5, size * 0.03)}px ${fx}`, paintOrder: 'stroke fill' };
    default:
      return base;
  }
}

/** Gold-foil text: metallic gradient clipped to the glyphs. */
function goldSpan(color: string, children: ReactNode): ReactNode {
  return (
    <span
      style={{
        backgroundImage: `linear-gradient(180deg, ${lighten(color, 0.45)} 0%, ${color} 42%, ${darken(color, 0.28)} 58%, ${lighten(color, 0.3)} 100%)`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
        WebkitBoxDecorationBreak: 'clone',
        boxDecorationBreak: 'clone',
        filter: `drop-shadow(0 2px 2px ${withAlpha('#000000', 0.18)})`,
      }}
    >
      {children}
    </span>
  );
}

/** Text bent along an arc (SVG textPath): single line, same effects as flat text. */
function CurvedText({ el, text, language }: { el: TextElement; text: string; language?: string }) {
  const { d, height } = curvedTextPath(el.w, el.size, el.curve!);
  const pid = `curve-${el.id}`;
  const gid = `curve-gold-${el.id}`;
  const fx = el.effectColor ?? el.color;
  const line = text.replace(/\s*\n\s*/g, ' ');
  const anchor = el.align === 'left' ? 'start' : el.align === 'right' ? 'end' : 'middle';
  const shadow =
    el.effect === 'shadow'
      ? `0 ${el.size * 0.05}px ${el.size * 0.16}px rgba(0,0,0,0.35)`
      : el.effect === 'glow'
        ? `0 0 ${el.size * 0.18}px ${withAlpha(fx, 0.85)}, 0 0 ${el.size * 0.4}px ${withAlpha(fx, 0.45)}`
        : undefined;
  return (
    <svg width={el.w} height={Math.max(height, el.h)} style={{ display: 'block', overflow: 'visible' }} aria-label={line}>
      <defs>
        <path id={pid} d={d} />
        {el.effect === 'gold' && (
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={lighten(el.color, 0.45)} />
            <stop offset="0.45" stopColor={el.color} />
            <stop offset="0.6" stopColor={darken(el.color, 0.28)} />
            <stop offset="1" stopColor={lighten(el.color, 0.3)} />
          </linearGradient>
        )}
      </defs>
      <text
        fill={el.effect === 'gold' ? `url(#${gid})` : el.color}
        stroke={el.effect === 'outline' ? fx : undefined}
        strokeWidth={el.effect === 'outline' ? Math.max(1.5, el.size * 0.03) : undefined}
        paintOrder="stroke fill"
        style={{
          fontFamily: fontStack(el.font, line, language),
          fontSize: el.size,
          fontWeight: el.weight,
          fontStyle: el.italic ? 'italic' : 'normal',
          letterSpacing: `${el.ls}em`,
          textTransform: el.upper ? 'uppercase' : 'none',
          textShadow: shadow,
        }}
      >
        <textPath href={`#${pid}`} startOffset={anchor === 'start' ? '0%' : anchor === 'end' ? '100%' : '50%'} textAnchor={anchor}>
          {line}
        </textPath>
      </text>
    </svg>
  );
}

function TextLayer({ el, data, language, gate, onMeasure, fontsReady }: { el: TextElement; data: DesignData | null; language?: string; gate?: RenderGate; onMeasure?: (id: string, h: number) => void; fontsReady: boolean }) {
  const text = displayText(el, data);
  const inner = useRef<HTMLDivElement>(null);
  // Shrink factor, reset whenever anything that affects wrapping changes.
  const signature = `${text}|${el.font}|${el.size}|${el.w}|${el.h}|${el.lh}|${el.ls}|${el.upper}|${el.weight}|${fontsReady}`;
  const [fit, setFit] = useState({ signature, k: 1 });
  const k = fit.signature === signature ? fit.k : 1;
  const [handle] = useState(() => (gate && el.fit ? gate.hold(`fit:${el.id}`) : null));
  const released = useRef(false);

  // Shrink-to-fit: only ever shrinks for a given signature, so it always converges.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) {
      // Curved text has a fixed box (no wrapping to measure).
      if (handle !== null && !released.current) {
        released.current = true;
        requestAnimationFrame(() => gate!.release(handle));
      }
      return;
    }
    if (el.fit && node.scrollHeight > el.h + 1 && k > 0.36) {
      setFit({ signature, k: Math.max(0.35, k * Math.max(0.8, Math.min(0.98, el.h / node.scrollHeight))) });
      return;
    }
    onMeasure?.(el.id, node.scrollHeight);
    if (handle !== null && fontsReady && !released.current) {
      released.current = true;
      requestAnimationFrame(() => gate!.release(handle));
    }
  });

  if (el.curve) return <CurvedText el={el} text={text} language={language} />;

  const style = textStyle(el, el.size * k, language, text);
  return (
    <div
      style={{
        width: '100%',
        height: el.fit ? '100%' : 'auto',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div ref={inner} style={style} dir="auto">
        {el.effect === 'gold' ? goldSpan(el.color, text) : text}
      </div>
    </div>
  );
}

function ImageLayer({ el, data, placeholders }: { el: ImageElement; data: DesignData | null; placeholders?: boolean }) {
  const src = el.src ?? (el.bind && data ? resolveBinding(el.bind, data) : null);
  const radius = el.mask === 'circle' ? '50%' : el.mask === 'arch' ? `${el.w / 2}px ${el.w / 2}px 18px 18px` : el.mask === 'rounded' ? 36 : 0;
  const frame: CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: radius,
    overflow: 'hidden',
    boxSizing: 'border-box',
    border: el.borderW && el.border ? `${el.borderW}px solid ${el.border}` : undefined,
    boxShadow: el.borderW ? '0 18px 40px rgba(0,0,0,0.18)' : undefined,
  };
  if (!src) {
    if (!placeholders) return null;
    return (
      <div style={{ ...frame, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(6px)', border: `4px dashed ${el.border ?? '#999'}` }}>
        <svg width={120} height={120} viewBox="0 0 24 24" fill="none" stroke={el.border ?? '#666'} strokeWidth={1.4} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M21 17l-5-5-8 7" />
        </svg>
      </div>
    );
  }
  return (
    <div style={frame}>
      <img
        src={src}
        alt=""
        crossOrigin="anonymous"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: `${el.fx ?? 50}% ${el.fy ?? 50}%`,
          display: 'block',
          filter: imageFilterCss(el),
          transform: el.zoom && el.zoom !== 1 ? `scale(${el.flipX ? -el.zoom : el.zoom}, ${el.zoom})` : el.flipX ? 'scaleX(-1)' : undefined,
          transformOrigin: `${el.fx ?? 50}% ${el.fy ?? 50}%`,
        }}
      />
    </div>
  );
}

/** Memoized: elements are replaced immutably, so dragging one layer re-renders only that layer. */
const Layer = memo(function Layer(props: { el: DesignElement; index: number; total: number; data: DesignData | null; t?: number; language?: string; gate?: RenderGate; placeholders?: boolean; onMeasure?: (id: string, h: number) => void; fontsReady: boolean }) {
  const { el, t } = props;
  const motion = t === undefined ? null : elementMotion(el, props.index, t);
  const flip = el.type === 'art' && (el.flipX || el.flipY) ? `scale(${el.flipX ? -1 : 1}, ${el.flipY ? -1 : 1})` : '';

  let body: ReactNode = null;
  switch (el.type) {
    case 'text':
      body = <TextLayer el={el} data={props.data} language={props.language} gate={props.gate} onMeasure={props.onMeasure} fontsReady={props.fontsReady} />;
      break;
    case 'art': {
      const def = ASSETS[el.asset];
      if (!def) break;
      body = def.render({ w: el.w, h: el.h, c: el.colors.length ? el.colors : def.colors, opts: el.opts ?? {}, t: t ?? 0 });
      break;
    }
    case 'image':
      body = <ImageLayer el={el} data={props.data} placeholders={props.placeholders} />;
      break;
    case 'shape': {
      const fill = el.fill ? withAlpha(el.fill, el.fillOpacity) : 'transparent';
      body =
        el.shape === 'line' ? (
          <div style={{ width: '100%', height: '100%', background: el.fill ?? el.stroke ?? '#000', borderRadius: el.h }} />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              boxSizing: 'border-box',
              background: fill,
              border: el.stroke && el.strokeW ? `${el.strokeW}px solid ${el.stroke}` : undefined,
              borderRadius: el.shape === 'ellipse' ? '50%' : el.radius,
            }}
          />
        );
      break;
    }
  }

  return (
    <div
      data-el={el.id}
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.w,
        height: el.h,
        transform: `rotate(${el.rot}deg) ${motion?.transform ?? ''}`,
        transformOrigin: motion?.origin ?? 'center center',
        opacity: el.opacity * (motion?.opacity ?? 1),
        filter: motion?.filter,
        pointerEvents: 'none',
      }}
    >
      <div style={{ width: '100%', height: '100%', transform: flip || undefined }}>{body}</div>
    </div>
  );
});

/** Renders one card page. Pure React (no Remotion hooks) so the editor can use it directly. */
export const DesignPage = memo(function DesignPage({ page, data, width, t, hidden, placeholders, onMeasure, gate, language, fontsReady = true, className, style }: DesignPageProps) {
  const scale = width / DESIGN_W;
  const bg = page.bg;
  const background =
    bg.gradient === 'radial' && bg.color2
      ? `radial-gradient(120% 80% at 50% 30%, ${bg.color} 0%, ${bg.color2} 100%)`
      : bg.gradient === 'linear' && bg.color2
        ? `linear-gradient(${bg.angle ?? 180}deg, ${bg.color} 0%, ${bg.color2} 100%)`
        : bg.color;
  const zoom = t === undefined ? 1 : 1 + Math.min(t, 8) * 0.006;
  const visible = page.elements.filter((e) => !e.hidden && !hidden?.has(e.id));

  return (
    <div className={className} style={{ position: 'relative', width, height: (width * DESIGN_H) / DESIGN_W, overflow: 'hidden', ...style }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})`, transformOrigin: '0 0', background: bg.color }}>
        <div style={{ position: 'absolute', inset: 0, background, transform: `scale(${zoom})` }} />
        {bg.image && (
          <img
            src={bg.image}
            alt=""
            crossOrigin="anonymous"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: bg.imageOpacity ?? 1,
              filter: bg.imageBlur ? `blur(${bg.imageBlur}px)` : undefined,
              // Slight over-scale hides the soft edge a blur leaves.
              transform: `scale(${zoom * (bg.imageBlur ? 1 + bg.imageBlur / 400 : 1)})`,
            }}
          />
        )}
        {bg.overlay && (bg.overlayOpacity ?? 0) > 0 && <div style={{ position: 'absolute', inset: 0, background: bg.overlay, opacity: bg.overlayOpacity }} />}
        {bg.pattern !== 'none' && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <Pattern pattern={bg.pattern} color={bg.patternColor ?? '#C9973F'} accent={bg.patternAccent ?? bg.patternColor ?? '#C9973F'} opacity={bg.patternOpacity} width={DESIGN_W} height={DESIGN_H} seed={page.id} />
          </div>
        )}
        {visible.map((el, i) => (
          <Layer key={el.id} el={el} index={i} total={visible.length} data={data} t={t} language={language} gate={gate} placeholders={placeholders} onMeasure={onMeasure} fontsReady={fontsReady} />
        ))}
      </div>
    </div>
  );
});
