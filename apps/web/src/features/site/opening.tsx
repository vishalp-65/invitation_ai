'use client';

import type { SiteDesign, SiteOpening } from '@cardai/shared';
import { Ambient, WaxSeal } from '@cardai/templates/scenes';
import { SceneLayer } from './lazy-art';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { mix, rgba } from './theme';
import './openings.css';
import { PlayfulOpening } from './opening-playful';

/** How long each scene plays after the tap before the page takes over (ms). */
const DURATION: Record<SiteOpening, number> = {
  none: 0, envelope: 2500, doors: 2500, curtain: 2300, scroll: 2900, petals: 2100, seal: 2600, lanterns: 2600,
  notification: 1500, story: 1600, boarding: 2200, newspaper: 2000, vinyl: 2300, arcade: 1900, menu: 2100, calendar: 2400,
};

/**
 * Tap-to-open scene in front of the page. The tap is also the user gesture that lets music
 * start on phones. Every scene is drawn with HTML/CSS + a little SVG (no images to download),
 * animates transforms and opacity only, then unmounts.
 */
export function Opening({
  design,
  names,
  connector,
  kind,
  label,
  greeting,
  title,
  monogram,
  date,
  onOpen,
  motionOff,
}: {
  design: SiteDesign | null;
  names: string[];
  connector?: string;
  kind: SiteOpening;
  label: string;
  greeting: string | null;
  title: string;
  monogram: string;
  /** "14 · 02 · 2027" under the names. */
  date?: string | null;
  onOpen: () => void;
  motionOff: boolean;
}) {
  const [state, setState] = useState<'closed' | 'opening' | 'gone'>(kind === 'none' ? 'gone' : 'closed');

  useEffect(() => {
    if (state !== 'opening') return;
    const t = setTimeout(() => setState('gone'), motionOff ? 0 : DURATION[kind]);
    return () => clearTimeout(t);
  }, [state, motionOff, kind]);

  // Lock page scroll while the scene is up.
  useEffect(() => {
    if (state === 'gone') return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [state]);

  if (state === 'gone') return null;

  const open = () => {
    if (state !== 'closed') return;
    setState('opening');
    onOpen();
  };

  // Palette for every scene: lacquer (deep primary), gold trim, paper.
  const P = design?.palette.primary ?? '#7A1F2B';
  const G = design?.palette.accent ?? '#D4AF6A';
  const paper = design?.palette.surface ?? '#FFF8EC';
  const ground = design?.palette.background ?? '#F6EBDA';
  const deep = mix(P, '#000000', 0.42);
  const script = design?.fonts.script;
  const pal = {
    '--op-p': P,
    '--op-deep': deep,
    '--op-deeper': mix(P, '#000000', 0.62),
    '--op-light': mix(P, '#FFFFFF', 0.12),
    '--op-gold': G,
    '--op-gold-soft': rgba(G, 0.55),
    '--op-gold-faint': rgba(G, 0.22),
    '--op-gold-hi': mix(G, '#FFFFFF', 0.45),
    '--op-gold-lo': mix(G, '#000000', 0.35),
    '--op-paper': paper,
    '--op-ground': ground,
    '--op-ink': mix(P, '#000000', 0.3),
    ...(script ? { '--op-script': `"${script}", var(--inv-script)` } : {}),
  } as CSSProperties;

  const shownNames =
    names.length > 1 ? (
      <>
        {names[0]}
        <span className="op-amp">{connector || '&'}</span>
        {names[1]}
      </>
    ) : (
      names[0] ?? title
    );

  /** Names + date + "tap to open", the same type system on every scene. */
  const Words = ({ tone, className = '', hint = true }: { tone: 'light' | 'dark'; className?: string; hint?: boolean }) => (
    <div className={`op-words inv-cta op-${tone} ${className}`}>
      {greeting && <p className="op-greet">{greeting}</p>}
      <p className="op-kicker">{names.length ? title : ''}</p>
      <p className="op-names">{shownNames}</p>
      {date && <p className="op-date">{date}</p>}
      {hint && (
        <p className="op-hint">
          <span aria-hidden />
          {label}
          <span aria-hidden />
        </p>
      )}
    </div>
  );

  let scene: ReactNode;
  switch (kind) {
    // ---------------- Palace doors: carved lacquer leaves, brass studs, light behind ----------------
    case 'doors':
      scene = (
        <button type="button" onClick={open} autoFocus aria-label={label} className="op-hit">
          <div className="inv-backdrop op-doors-ground" />
          <div className="op-doors-light" aria-hidden />
          {(['l', 'r'] as const).map((side) => (
            <div key={side} className={`op-leaf op-leaf-${side}`} aria-hidden>
              <div className="op-leaf-frame" />
              <div className="op-studs op-studs-top" />
              <div className="op-arch-panel">
                <div className="op-arch-inner" />
                <div className="op-jaali" />
              </div>
              <div className="op-low-panel">
                <span className="op-diamond" />
              </div>
              <div className="op-studs op-studs-bottom" />
              <span className="op-knocker" />
              {side === 'l' && (
                <span className="op-medallion">
                  <span>{[...monogram].slice(0, 2).join('')}</span>
                </span>
              )}
            </div>
          ))}
          <svg className="op-toran inv-cta" viewBox="0 0 600 60" preserveAspectRatio="none" aria-hidden>
            <path d="M0 0H600V14H0Z" fill="var(--op-deeper)" />
            <path d="M0 14 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0V0H0Z" fill="var(--op-deeper)" />
            <path d="M0 14 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0 q30 34 60 0" fill="none" stroke="var(--op-gold)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} cx={30 + i * 60} cy="38" r="3.2" fill="var(--op-gold)" />
            ))}
          </svg>
          <Words tone="light" className="op-doors-words" />
        </button>
      );
      break;

    // ---------------- Theatre curtain: velvet folds, swag valance, gold fringe ----------------
    case 'curtain':
      scene = (
        <button type="button" onClick={open} autoFocus aria-label={label} className="op-hit">
          <div className="inv-backdrop op-stage" />
          <div className="op-spot" aria-hidden />
          {(['l', 'r'] as const).map((side) => (
            <div key={side} className={`op-drape op-drape-${side}`} aria-hidden>
              <div className="op-fringe" />
              <span className="op-tassel" />
            </div>
          ))}
          <svg className="op-valance" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="op-val" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--op-deeper)" />
                <stop offset="1" stopColor="var(--op-p)" />
              </linearGradient>
            </defs>
            <path d="M0 0H600V58 C570 108 510 108 480 58 C450 108 390 108 360 58 C330 108 270 108 240 58 C210 108 150 108 120 58 C90 108 30 108 0 58Z" fill="url(#op-val)" />
            <path d="M0 58 C30 108 90 108 120 58 C150 108 210 108 240 58 C270 108 330 108 360 58 C390 108 450 108 480 58 C510 108 570 108 600 58" fill="none" stroke="var(--op-gold)" strokeWidth="2.4" vectorEffect="non-scaling-stroke" />
            <path d="M0 18H600" stroke="var(--op-gold)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" opacity="0.7" />
          </svg>
          <Words tone="light" className="op-curtain-words" />
        </button>
      );
      break;

    // ---------------- Envelope: flap lifts, letter rises with the names ----------------
    case 'envelope':
      scene = (
        <button type="button" onClick={open} autoFocus aria-label={label} className="op-hit">
          <div className="inv-backdrop op-linen" />
          <div className="op-env-top inv-cta">
            {greeting && <p className="op-greet">{greeting}</p>}
            <p className="op-kicker">{names.length ? title : ''}</p>
            <p className="op-env-names">{shownNames}</p>
          </div>
          <div className="op-env" aria-hidden>
            <div className="op-env-back" />
            <div className="op-letter">
              <div className="op-letter-border">
                <p className="op-letter-kicker">{names.length ? title : ''}</p>
                <p className="op-letter-names">{shownNames}</p>
                {date && <p className="op-letter-date">{date}</p>}
              </div>
            </div>
            <div className="op-env-pocket" />
            <div className="op-env-flap">
              <div className="op-flap-face op-flap-front" />
              <div className="op-flap-face op-flap-liner" />
              <span className="op-env-stamp">{[...monogram].slice(0, 2).join('')}</span>
            </div>
          </div>
          <p className="op-hint op-env-hint inv-cta">
            <span aria-hidden />
            {label}
            <span aria-hidden />
          </p>
        </button>
      );
      break;

    // ---------------- Royal scroll: ribbon slips off, parchment unrolls between gold rods ----------------
    case 'scroll':
      scene = (
        <button type="button" onClick={open} autoFocus aria-label={label} className="op-hit">
          <div className="inv-backdrop op-scroll-ground" />
          <div className="op-scroll-top inv-cta">
            {greeting && <p className="op-greet">{greeting}</p>}
            <p className="op-kicker">{title}</p>
          </div>
          <div className="op-scroll" aria-hidden>
            <div className="op-parchment">
              <div className="op-parchment-border">
                <p className="op-letter-kicker">{names.length ? title : ''}</p>
                <p className="op-letter-names">{shownNames}</p>
                {date && <p className="op-letter-date">{date}</p>}
              </div>
            </div>
            <div className="op-rod op-rod-top" />
            <div className="op-rod op-rod-bottom" />
            <div className="op-ribbon">
              <span />
            </div>
          </div>
          <p className="op-hint op-scroll-hint inv-cta">
            <span aria-hidden />
            {label}
            <span aria-hidden />
          </p>
        </button>
      );
      break;

    // ---------------- Bloom: a lotus of three petal rings opens from the monogram ----------------
    case 'petals': {
      const rings = [
        { n: 12, r: 0.5, size: 1, tone: 'var(--op-p)', delay: 0 },
        { n: 10, r: 0.33, size: 0.82, tone: 'var(--op-light)', delay: 90 },
        { n: 8, r: 0.17, size: 0.64, tone: 'var(--op-gold-hi)', delay: 180 },
      ];
      scene = (
        <button type="button" onClick={open} autoFocus aria-label={label} className="op-hit">
          <div className="inv-backdrop op-bloom-ground" />
          <div className="op-bloom" aria-hidden>
            {rings.map((ring, ri) =>
              Array.from({ length: ring.n }, (_, i) => {
                const a = (i / ring.n) * 360 + ri * 14;
                return (
                  <span
                    key={`${ri}-${i}`}
                    className="op-petal"
                    style={
                      {
                        '--a': `${a}deg`,
                        '--r': ring.r,
                        '--s': ring.size,
                        '--d': `${ring.delay + i * 18}ms`,
                        background: `linear-gradient(180deg, ${ring.tone}, var(--op-deep))`,
                      } as CSSProperties
                    }
                  />
                );
              }),
            )}
            <span className="op-bloom-heart">
              <span>{[...monogram].slice(0, 2).join('')}</span>
            </span>
          </div>
          <Words tone="dark" className="op-bloom-words" />
        </button>
      );
      break;
    }

    // ---------------- Wax seal (unchanged: the one guests loved) ----------------
    case 'seal': {
      const wax = design?.palette.primary ?? 'var(--inv-primary)';
      const paperDeep = design ? design.palette.primary : 'var(--inv-primary-deep)';
      const gold = design?.palette.accent ?? 'var(--inv-accent)';
      const sealFont = design?.fonts.script ?? 'serif';
      scene = (
        <>
          <div className="inv-backdrop absolute inset-0" style={{ background: paperDeep }} />
          {/* envelope back: four flaps meeting under the seal */}
          <svg className="inv-env-body absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <polygon points="0,0 50,55 0,100" fill="#000" fillOpacity="0.12" />
            <polygon points="100,0 50,55 100,100" fill="#000" fillOpacity="0.16" />
            <polygon points="0,100 50,55 100,100" fill="#000" fillOpacity="0.06" />
            <polyline points="0,100 50,55 100,100" fill="none" stroke={gold} strokeOpacity="0.5" strokeWidth="0.25" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* embossed roses that glow gold while waiting (unstretched, so the motif keeps its shape) */}
          <svg className="inv-env-body inv-emboss absolute inset-0 size-full" aria-hidden>
            <defs>
              <pattern id="inv-emboss" width="46" height="46" patternUnits="userSpaceOnUse">
                <g fill="none" stroke={gold} strokeWidth="0.8" strokeLinecap="round">
                  <circle cx="23" cy="20" r="6" />
                  <path d="M20 20c0-3 5-3 5 0s-3 3-3 1" />
                  <path d="M17 23c-6 2-9 7-8 11c5-1 8-5 8-11z" />
                  <path d="M29 23c6 2 9 7 8 11c-5-1-8-5-8-11z" />
                  <path d="M23 26v12" />
                </g>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#inv-emboss)" />
          </svg>
          <div className="inv-env-flap absolute inset-x-0 top-0 h-[55%]" style={{ background: paperDeep }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgb(0 0 0 / 0.05), rgb(0 0 0 / 0.22))' }} />
            <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <polyline points="0,0 50,100 100,0" fill="none" stroke={gold} strokeOpacity="0.55" strokeWidth="0.3" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div className="inv-env-light pointer-events-none absolute left-1/2 top-[55%] size-[30vmax] -translate-x-1/2 -translate-y-1/2 rounded-full" />
          <button type="button" onClick={open} autoFocus aria-label={label} className="inv-seal absolute left-1/2 top-[55%] z-10 w-[clamp(112px,18vmin,190px)] -translate-x-1/2 -translate-y-1/2 rounded-full active:scale-95">
            <WaxSeal size={112} color={wax} text={[...monogram].slice(0, 2).join('&')} font={sealFont} light />
          </button>
          <div className="inv-cta absolute inset-x-0 bottom-[11vh] z-10 flex flex-col items-center gap-2 px-8 text-center text-white">
            {greeting && <p className="text-lg italic opacity-90">{greeting}</p>}
            <p className="inv-script text-[clamp(1.9rem,4.5vmin,3rem)]">{title}</p>
            <p className="mt-1 text-sm uppercase tracking-[0.25em] opacity-80">{label}</p>
          </div>
        </>
      );
      break;
    }

    // ---------------- Sky lanterns over the design's own scene ----------------
    case 'lanterns': {
      const c = design?.scene.colors;
      scene = (
        <button type="button" onClick={open} autoFocus aria-label={label} className="op-hit">
          <div className="inv-backdrop absolute inset-0" style={{ background: c ? `linear-gradient(${c.skyTop}, ${c.skyBottom})` : 'linear-gradient(#16264F, #3E5C9A)' }}>
            {design && <SceneLayer design={design} layer="sky" lite />}
            {design && (
              <div className="inv-scene-frame absolute inset-x-0 bottom-0 h-[70%] opacity-90">
                <SceneLayer design={design} layer="mid" lite />
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 42%, rgb(0 0 0 / 0.38), transparent 62%)' }} />
          </div>
          <div className="inv-lantern-field absolute inset-0">
            <Ambient kind="lanterns" colors={['#FFB547']} glow={c?.glow ?? '#FFB547'} density={motionOff ? 0.3 : 1.6} />
          </div>
          <Words tone="light" className="op-lantern-words" />
        </button>
      );
      break;
    }
    default:
      // Playful openings (phone message, boarding pass, newspaper, vinyl, arcade, menu, calendar).
      scene = <PlayfulOpening kind={kind} open={open} label={label} names={names} connector={connector} title={title} date={date ?? null} greeting={greeting} monogram={monogram} />;
  }

  return (
    <div className={`inv-opening inv-open-${kind}`} data-state={state} role="dialog" aria-label={title} style={pal}>
      {scene}
    </div>
  );
}
