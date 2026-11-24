import { getLanguage, getSiteDesign, heroInk, setArtOrigin, type EventContent, type SiteDesign } from '@cardai/shared';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFamily } from '../fonts';
import { planPhotoStory, PhotoStory } from './PhotoStory';
import { Ambient, Divider, Marker, SceneLayer, SceneStill, VintageCar, WaxSeal, type ImgLike } from '../scenes';
import { BrandOutro } from '../components/BrandOutro';

/**
 * Cinematic 9:16 video invite built from a website design pack: the same painted scene,
 * colours, fonts, opening and music as the invitation website, so the video and the link the
 * guest opens feel like one invitation.
 */

export interface SiteVideoFunction {
  name: string;
  startsAt: string;
  venueName: string;
  venueAddress?: string | null;
  dressCode?: string | null;
}

export interface SiteVideoProps {
  [key: string]: unknown;
  designId: string;
  language: string;
  timezone: string;
  content: EventContent;
  functions: SiteVideoFunction[];
  musicUrl: string | null;
  watermark: boolean;
  watermarkText: string;
  /** Short link printed on the last scene ("Open your invitation"). */
  link: string | null;
  /** cinematic (full film) | teaser (15 s save-the-date reel) | storybook (page turns). */
  style?: 'cinematic' | 'teaser' | 'storybook';
  /** The event's photos (painted photo designs show them; first = cover). */
  photos?: string[];
  /** Corner QR on the last scene (venue map by default). */
  qr?: { src: string; label: string; corner: 'br' | 'bl' | 'tr' | 'tl' } | null;
  /** Where the painted art (`/art/...`) is served; the renderer runs on another origin. */
  artOrigin?: string | null;
}

/** Length of the video for these props (photo storybook for painted photo designs). */
export function siteVideoFrames(props: Pick<SiteVideoProps, 'designId' | 'functions' | 'style'>, fps: number): number {
  return getSiteDesign(props.designId)?.look ? planPhotoStory(props.functions.length, fps).durationInFrames : planSiteVideo(props.functions.length, fps, props.style ?? 'cinematic').durationInFrames;
}

/** Seconds per scene. Functions beyond five are summarised on the venue scene. */
export const SITE_VIDEO = { opening: 4.2, cover: 6, invite: 4.5, fn: 3.6, venue: 4.5, closing: 5.5, fade: 0.6, turn: 0.9, maxFunctions: 5 } as const;

export type SiteVideoStyle = NonNullable<SiteVideoProps['style']>;

interface Scene {
  kind: 'opening' | 'cover' | 'invite' | 'fn' | 'venue' | 'savedate' | 'closing';
  from: number;
  duration: number;
  index?: number;
}

/** Overlap between scenes: crossfade (cinematic / teaser) or page turn (storybook). */
export const transitionSeconds = (style: SiteVideoStyle) => (style === 'storybook' ? SITE_VIDEO.turn : SITE_VIDEO.fade);

export function planSiteVideo(fnCount: number, fps: number, style: SiteVideoStyle = 'cinematic'): { scenes: Scene[]; durationInFrames: number } {
  const fns = Array.from({ length: Math.min(fnCount, SITE_VIDEO.maxFunctions) }, (_, i) => ['fn', SITE_VIDEO.fn + (style === 'storybook' ? 0.6 : 0), i] as [Scene['kind'], number, number]);
  const list: Array<[Scene['kind'], number, number?]> =
    style === 'teaser'
      ? [
          ['opening', 3.2],
          ['cover', 5],
          ['savedate', 4.5],
          ['closing', 3.8],
        ]
      : [
          ['opening', SITE_VIDEO.opening],
          ['cover', SITE_VIDEO.cover],
          ['invite', SITE_VIDEO.invite],
          ...fns,
          ['venue', SITE_VIDEO.venue],
          ['closing', SITE_VIDEO.closing],
        ];
  const fade = Math.round(transitionSeconds(style) * fps);
  const scenes: Scene[] = [];
  let at = 0;
  for (const [kind, sec, index] of list) {
    const duration = Math.round(sec * fps);
    scenes.push({ kind, from: at, duration, index });
    at += duration - fade; // scenes overlap by the crossfade
  }
  return { scenes, durationInFrames: at + fade };
}

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const RImg = Img as unknown as ImgLike;

function useFonts(families: string[]) {
  const [handle] = useState(() => delayRender('site-video-fonts', { timeoutInMilliseconds: 60_000 }));
  useEffect(() => {
    Promise.allSettled(families.map((f) => loadFamily(f))).finally(() => continueRender(handle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Text that rises and fades in at `at` seconds (local to the scene). */
function In({ t, at, children, style, dur = 0.9, y = 40 }: { t: number; at: number; children: ReactNode; style?: CSSProperties; dur?: number; y?: number }) {
  const p = interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: ease });
  return <div style={{ ...style, opacity: p, transform: `translateY(${(1 - p) * y}px)` }}>{children}</div>;
}

function Opening({ d, t, monogram, names, connector, scriptFont, serifFont }: { d: SiteDesign; t: number; monogram: string; names: string[]; connector: string; scriptFont: string; serifFont: string }) {
  if (d.opening === 'lanterns') {
    const push = interpolate(t, [0, SITE_VIDEO.opening], [1, 1.18], clamp);
    return (
      <AbsoluteFill style={{ background: d.scene.colors.skyTop }}>
        <AbsoluteFill style={{ transform: `scale(${push})` }}>
          <SceneLayer design={d} layer="sky" time={t} Img={RImg} />
          <div style={{ position: 'absolute', inset: 0, transform: 'translateY(24%)' }}>
            <SceneLayer design={d} layer="mid" time={t} Img={RImg} />
          </div>
        </AbsoluteFill>
        <Ambient kind="lanterns" colors={['#FFB547']} glow={d.scene.colors.glow} time={t + 12} density={2} />
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', color: '#FFF8EC', textAlign: 'center', fontFamily: serifFont, textShadow: '0 4px 40px rgba(0,0,0,0.5)' }}>
          <In t={t} at={0.6}>
            <div style={{ fontSize: 120, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.05 }}>{names[0]}</div>
          </In>
          <In t={t} at={1.1}>
            <div style={{ fontSize: 40, letterSpacing: '0.6em', margin: '18px 0', textTransform: 'uppercase' }}>{connector}</div>
          </In>
          <In t={t} at={1.5}>
            <div style={{ fontSize: 120, letterSpacing: '0.08em', textTransform: 'uppercase', lineHeight: 1.05 }}>{names[1] ?? ''}</div>
          </In>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }
  // Wax-seal envelope (also used for packs whose website opening is doors / curtain / petals).
  const sealScale = interpolate(t, [1.2, 1.7], [1, 0.3], clamp);
  const sealOpacity = interpolate(t, [1.2, 1.7], [1, 0], clamp);
  const flap = interpolate(t, [1.4, 2.5], [0, 178], { ...clamp, easing: ease });
  const light = interpolate(t, [2.0, 3.6], [0.2, 9], { ...clamp, easing: ease });
  const lightOpacity = interpolate(t, [2.0, 2.4, 3.8, 4.2], [0, 1, 1, 0.6], clamp);
  const glow = 0.25 + (Math.sin(t * 2.4) + 1) * 0.2;
  const paper = d.palette.primary;
  return (
    <AbsoluteFill style={{ background: paper, perspective: 2400 }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <polygon points="0,0 50,55 0,100" fill="#000" fillOpacity="0.12" />
        <polygon points="100,0 50,55 100,100" fill="#000" fillOpacity="0.16" />
        <polyline points="0,100 50,55 100,100" fill="none" stroke={d.palette.accent} strokeOpacity="0.5" strokeWidth="0.2" />
      </svg>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: glow }}>
        <defs>
          <pattern id="sv-emboss" width="110" height="110" patternUnits="userSpaceOnUse">
            <g fill="none" stroke={d.palette.accent} strokeWidth="2" strokeLinecap="round" transform="scale(2.4)">
              <circle cx="23" cy="20" r="6" />
              <path d="M17 23c-6 2-9 7-8 11c5-1 8-5 8-11zM29 23c6 2 9 7 8 11c-5-1-8-5-8-11zM23 26v12" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#sv-emboss)" />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: '0 0 45% 0',
          background: paper,
          clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
          transformOrigin: '50% 0',
          transform: `rotateX(${flap}deg)`,
          backfaceVisibility: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.25))' }} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '55%',
          width: 600,
          height: 600,
          marginLeft: -300,
          marginTop: -300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fffaf0 0%, rgba(255,236,200,0.85) 25%, rgba(255,214,150,0.35) 50%, transparent 70%)',
          transform: `scale(${light})`,
          opacity: lightOpacity,
        }}
      />
      <div style={{ position: 'absolute', left: '50%', top: '55%', transform: `translate(-50%, -50%) scale(${sealScale})`, opacity: sealOpacity }}>
        <WaxSeal size={300} color={d.palette.primary} text={[...monogram].slice(0, 2).join('&')} font={scriptFont} light />
      </div>
    </AbsoluteFill>
  );
}

function Cover({ d, t, c, date, scriptFont, serifFont }: { d: SiteDesign; t: number; c: EventContent; date: string | null; scriptFont: string; serifFont: string }) {
  const names = c.primaryNames.filter(Boolean);
  const ink = heroInk(d);
  // Slow camera push: back layers move less than front ones (depth).
  const z = (k: number) => `scale(${1 + interpolate(t, [0, SITE_VIDEO.cover], [0.12, 0], clamp) * k}) translateY(${interpolate(t, [0, SITE_VIDEO.cover], [40 * k, 0], clamp)}px)`;
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      {(['sky', 'far', 'mid'] as const).map((l, i) => (
        <AbsoluteFill key={l} style={{ transform: z(0.4 + i * 0.4), transformOrigin: '50% 100%' }}>
          <SceneLayer design={d} layer={l} time={t} Img={RImg} />
        </AbsoluteFill>
      ))}
      <Ambient kind={d.ambient} colors={d.scene.colors.bloom} glow={d.scene.colors.glow} time={t + 8} density={1.4} />
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 220, color: ink, textAlign: 'center' }}>
        <In t={t} at={0.3}>
          <div style={{ fontFamily: scriptFont, fontSize: 84 }}>{c.headline}</div>
        </In>
        {date && (
          <In t={t} at={0.6}>
            <div style={{ fontFamily: serifFont, fontSize: 46, letterSpacing: '0.25em', marginTop: 6 }}>{date}</div>
          </In>
        )}
        <In t={t} at={1.1} y={60} dur={1.3}>
          <div style={{ fontFamily: scriptFont, fontSize: 170, lineHeight: 1.05, marginTop: 40, textShadow: d.scene.night ? '0 4px 50px rgba(0,0,0,0.5)' : undefined }}>{names[0]}</div>
        </In>
        {names[1] && (
          <>
            <In t={t} at={1.7}>
              <div style={{ fontFamily: scriptFont, fontSize: 90, lineHeight: 1 }}>{c.connector || '&'}</div>
            </In>
            <In t={t} at={2.1} y={60} dur={1.3}>
              <div style={{ fontFamily: scriptFont, fontSize: 170, lineHeight: 1.05, textShadow: d.scene.night ? '0 4px 50px rgba(0,0,0,0.5)' : undefined }}>{names[1]}</div>
            </In>
          </>
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ transform: z(1.6), transformOrigin: '50% 100%' }}>
        <SceneLayer design={d} layer="near" time={t} Img={RImg} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** A section on one of the design's colour bands, with its divider on top. */
function Band({ d, i, children }: { d: SiteDesign; i: number; children: ReactNode }) {
  const b = d.bands[i % d.bands.length]!;
  return (
    <AbsoluteFill style={{ background: b.bg, color: b.ink, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 110px' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: 'scaleY(-1) scale(1, 2.4)', transformOrigin: '50% 0' }}>
        <Divider kind={d.divider} color={d.bands[(i + 1) % d.bands.length]!.bg} accent={b.primary} tile={false} />
      </div>
      {children}
    </AbsoluteFill>
  );
}

function ScriptTitle({ t, at, children, color, font }: { t: number; at: number; children: ReactNode; color: string; font: string }) {
  return (
    <In t={t} at={at}>
      <div style={{ fontFamily: font, fontSize: 120, color, lineHeight: 1.1 }}>{children}</div>
      <svg width="360" height="34" viewBox="0 0 150 14" style={{ margin: '6px auto 0', display: 'block', color }}>
        <path d="M2 7H58M92 7H148" stroke="currentColor" strokeWidth="0.8" />
        <path d="M62 7c4-6 9-6 13 0c4 6 9 6 13 0" stroke="currentColor" strokeWidth="1" fill="none" />
      </svg>
    </In>
  );
}

export function SiteVideo(props: SiteVideoProps) {
  setArtOrigin(props.artOrigin);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const d = getSiteDesign(props.designId) ?? getSiteDesign('rose-seal')!;
  const lang = getLanguage(props.language);
  const latin = lang.script === 'Latn';
  const scriptFont = latin ? d.fonts.script : lang.fonts.display;
  const serifFont = latin ? d.fonts.serif : lang.fonts.display;
  const bodyFont = latin ? d.fonts.body : lang.fonts.body;
  useFonts([...new Set([scriptFont, serifFont, bodyFont])]);

  // Painted photo designs play the photo storybook (same paper, art and fonts as the website).
  if (d.look) {
    return (
      <PhotoStory
        lookId={d.look}
        language={props.language}
        timezone={props.timezone}
        content={props.content}
        functions={props.functions}
        photos={props.photos ?? []}
        musicUrl={props.musicUrl}
        watermark={props.watermark}
        watermarkText={props.watermarkText}
        link={props.link}
        qr={props.qr ?? null}
        scriptFont={scriptFont}
        serifFont={serifFont}
        bodyFont={bodyFont}
      />
    );
  }

  const c = props.content;
  const names = c.primaryNames.filter(Boolean);
  const monogram = names.length ? names.map((n) => [...n][0]).join('') : [...(c.headline || 'I')][0]!;
  const fns = props.functions;
  const fmtDate = new Intl.DateTimeFormat(lang.locale, { timeZone: props.timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const fmtTime = new Intl.DateTimeFormat(lang.locale, { timeZone: props.timezone, hour: 'numeric', minute: '2-digit' });
  const short = fns[0] ? new Intl.DateTimeFormat('en-GB', { timeZone: props.timezone, day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(fns[0].startsAt)).replace(/\//g, '.') : null;
  const style: SiteVideoStyle = props.style ?? 'cinematic';
  const { scenes } = planSiteVideo(fns.length, fps, style);
  const fade = Math.round(transitionSeconds(style) * fps);
  const venueFn = fns[fns.length - 1];

  const render = (s: Scene, t: number): ReactNode => {
    switch (s.kind) {
      case 'opening':
        return <Opening d={d} t={t} monogram={monogram} names={names} connector={c.connector || '&'} scriptFont={scriptFont} serifFont={serifFont} />;
      case 'cover':
        return <Cover d={d} t={t} c={c} date={short} scriptFont={scriptFont} serifFont={serifFont} />;
      case 'invite': {
        const b = d.bands[0]!;
        return (
          <Band d={d} i={0}>
            {c.invocation && (
              <In t={t} at={0.2}>
                <div style={{ fontFamily: bodyFont, fontSize: 40, opacity: 0.85, marginBottom: 30 }}>{c.invocation}</div>
              </In>
            )}
            <ScriptTitle t={t} at={0.4} color={b.primary} font={scriptFont}>
              {names.join(' & ') || c.headline}
            </ScriptTitle>
            {c.hostLine && (
              <In t={t} at={1}>
                <div style={{ fontFamily: bodyFont, fontSize: 50, lineHeight: 1.45, marginTop: 50, fontStyle: 'italic' }}>{c.hostLine}</div>
              </In>
            )}
            {c.message && (
              <In t={t} at={1.6}>
                <div style={{ fontFamily: bodyFont, fontSize: 44, lineHeight: 1.5, marginTop: 40, opacity: 0.9 }}>{c.message}</div>
              </In>
            )}
          </Band>
        );
      }
      case 'fn': {
        const f = fns[s.index!]!;
        const b = d.bands[(s.index! + 1) % d.bands.length]!;
        if (style === 'storybook') {
          const zoom = interpolate(t, [0, SITE_VIDEO.fn + 0.6], [1.12, 1], clamp);
          return (
            <AbsoluteFill style={{ background: b.bg, color: b.ink, alignItems: 'center', textAlign: 'center', padding: '170px 110px 0' }}>
              <div style={{ width: 760, height: 900, borderRadius: '380px 380px 28px 28px', overflow: 'hidden', border: `6px solid ${b.primary}`, position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: '50% 100%' }}>
                  {(['sky', 'far', 'mid', 'near'] as const).map((l) => (
                    <SceneLayer key={l} design={d} layer={l} time={t + s.index! * 3} Img={RImg} />
                  ))}
                </div>
              </div>
              <ScriptTitle t={t} at={0.5} color={b.primary} font={scriptFont}>
                {f.name}
              </ScriptTitle>
              <In t={t} at={0.9}>
                <div style={{ fontFamily: serifFont, fontSize: 46, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 24 }}>
                  {fmtDate.format(new Date(f.startsAt))} · {fmtTime.format(new Date(f.startsAt))}
                </div>
                <div style={{ fontFamily: bodyFont, fontSize: 46, marginTop: 16 }}>{f.venueName}</div>
              </In>
            </AbsoluteFill>
          );
        }
        return (
          <Band d={d} i={s.index! + 1}>
            <In t={t} at={0.15}>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Marker kind={d.marker} color={b.primary} accent={d.palette.accent} size={110} />
              </div>
            </In>
            <ScriptTitle t={t} at={0.35} color={b.primary} font={scriptFont}>
              {f.name}
            </ScriptTitle>
            <In t={t} at={0.8}>
              <div style={{ fontFamily: serifFont, fontSize: 50, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 40 }}>{fmtDate.format(new Date(f.startsAt))}</div>
              <div style={{ fontFamily: serifFont, fontSize: 96, marginTop: 14 }}>{fmtTime.format(new Date(f.startsAt))}</div>
            </In>
            <In t={t} at={1.2}>
              <div style={{ fontFamily: bodyFont, fontSize: 52, marginTop: 30 }}>{f.venueName}</div>
              {f.dressCode && <div style={{ fontFamily: bodyFont, fontSize: 40, fontStyle: 'italic', marginTop: 16, opacity: 0.8 }}>{f.dressCode}</div>}
            </In>
          </Band>
        );
      }
      case 'venue': {
        const i = Math.min(fns.length, SITE_VIDEO.maxFunctions) + 1;
        const b = d.bands[i % d.bands.length]!;
        const car = interpolate(t, [1.4, 3.2], [-900, 0], { ...clamp, easing: ease });
        return (
          <Band d={d} i={i}>
            <ScriptTitle t={t} at={0.2} color={b.primary} font={scriptFont}>
              {props.language === 'hi' || props.language === 'mr' ? 'स्थान' : 'Venue'}
            </ScriptTitle>
            {venueFn && (
              <In t={t} at={0.5}>
                <div style={{ fontFamily: serifFont, fontSize: 64, marginTop: 20 }}>{venueFn.venueName}</div>
                {venueFn.venueAddress && <div style={{ fontFamily: bodyFont, fontSize: 40, marginTop: 10, opacity: 0.8 }}>{venueFn.venueAddress}</div>}
              </In>
            )}
            <In t={t} at={0.8} y={60}>
              <div style={{ width: 860, marginTop: 50, borderRadius: 36, overflow: 'hidden' }}>
                <SceneStill design={d} slot="venue" time={t} Img={RImg} />
              </div>
            </In>
            <div style={{ width: 420, marginTop: 40, transform: `translateX(${car}px)` }}>
              <VintageCar body={d.scene.colors.water} />
            </div>
          </Band>
        );
      }
      case 'savedate': {
        const b = d.bands[1 % d.bands.length]!;
        const first = fns[0];
        const parts = first
          ? new Intl.DateTimeFormat('en-GB', { timeZone: props.timezone, day: '2-digit', month: '2-digit', year: '2-digit' }).formatToParts(new Date(first.startsAt)).filter((x) => x.type !== 'literal')
          : [];
        return (
          <Band d={d} i={1}>
            <In t={t} at={0.1}>
              <div style={{ fontFamily: serifFont, fontSize: 56, letterSpacing: '0.4em', textTransform: 'uppercase' }}>Save the date</div>
            </In>
            <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 50 }}>
              {parts.map((p, i) => (
                <In key={i} t={t} at={0.5 + i * 0.25} y={80}>
                  <div style={{ fontFamily: serifFont, fontSize: 190, lineHeight: 1, color: b.primary }}>
                    {i > 0 && <span style={{ fontSize: 90, verticalAlign: 'middle', marginRight: 40, opacity: 0.6 }}>·</span>}
                    {p.value}
                  </div>
                </In>
              ))}
            </div>
            {first && (
              <In t={t} at={1.5}>
                <div style={{ fontFamily: scriptFont, fontSize: 100, marginTop: 50, color: b.primary }}>{first.name}</div>
                <div style={{ fontFamily: bodyFont, fontSize: 48, marginTop: 10 }}>{[first.venueName, first.venueAddress].filter(Boolean).join(' · ')}</div>
              </In>
            )}
          </Band>
        );
      }
      case 'closing': {
        const push = interpolate(t, [0, SITE_VIDEO.closing], [1.08, 1], clamp);
        const ink = heroInk(d);
        return (
          <AbsoluteFill style={{ background: d.scene.colors.skyTop }}>
            <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '50% 100%' }}>
              {(['sky', 'far', 'mid', 'near'] as const).map((l) => (
                <SceneLayer key={l} design={d} layer={l} time={t} Img={RImg} />
              ))}
            </AbsoluteFill>
            <Ambient kind={d.ambient} colors={d.scene.colors.bloom} glow={d.scene.colors.glow} time={t + 20} density={1.4} />
            <AbsoluteFill style={{ alignItems: 'center', paddingTop: 330, color: ink, textAlign: 'center', padding: '330px 100px 0' }}>
              <In t={t} at={0.3}>
                <div style={{ fontFamily: scriptFont, fontSize: 130 }}>{c.closing || (latin ? 'Hope to see you there!' : '')}</div>
              </In>
              <In t={t} at={0.9}>
                <div style={{ fontFamily: scriptFont, fontSize: 96, marginTop: 30 }}>{names.join(' & ')}</div>
              </In>
              {c.hashtag && (
                <In t={t} at={1.3}>
                  <div style={{ fontFamily: serifFont, fontSize: 44, letterSpacing: '0.1em', marginTop: 30 }}>{c.hashtag}</div>
                </In>
              )}
              {props.link && (
                <In t={t} at={1.8}>
                  <div style={{ marginTop: 60, display: 'inline-block', padding: '22px 46px', borderRadius: 999, background: d.palette.primary, color: '#FFF8EC', fontFamily: bodyFont, fontSize: 40 }}>{props.link.replace(/^https?:\/\//, '')}</div>
                </In>
              )}
            </AbsoluteFill>
          </AbsoluteFill>
        );
      }
    }
  };

  return (
    <AbsoluteFill style={{ background: d.palette.primary, fontFamily: bodyFont }}>
      {scenes.map((s, i) => {
        const local = frame - s.from;
        if (local < 0 || local >= s.duration) return null;
        const last = i === scenes.length - 1;
        if (style === 'storybook') {
          // Page turn: the next page swings in from the left edge over the previous one.
          const turn = i === 0 ? 0 : interpolate(local, [0, fade], [-100, 0], { ...clamp, easing: ease });
          const shade = i === 0 ? 0 : interpolate(local, [0, fade], [0.45, 0], clamp);
          return (
            <AbsoluteFill key={`${s.kind}-${i}`} style={{ transform: `perspective(2600px) rotateY(${turn}deg)`, transformOrigin: '0% 50%', backfaceVisibility: 'hidden' }}>
              {render(s, local / fps)}
              {shade > 0 && <AbsoluteFill style={{ background: `rgba(0,0,0,${shade})` }} />}
            </AbsoluteFill>
          );
        }
        const opacity = interpolate(local, [0, fade, s.duration - fade, s.duration], [i === 0 ? 1 : 0, 1, 1, last ? 1 : 0], clamp);
        return (
          <AbsoluteFill key={`${s.kind}-${i}`} style={{ opacity }}>
            {render(s, local / fps)}
          </AbsoluteFill>
        );
      })}
      {props.watermark && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40, pointerEvents: 'none' }}>
          <div style={{ padding: '12px 32px', borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', fontFamily: 'sans-serif', fontSize: 32 }}>{props.watermarkText}</div>
        </AbsoluteFill>
      )}
      {props.watermark && <BrandOutro />}
      {props.musicUrl && (
        <Audio src={props.musicUrl} volume={(f) => interpolate(f, [0, fps, durationInFrames - fps * 1.5, durationInFrames], [0, 0.8, 0.8, 0], clamp)} />
      )}
    </AbsoluteFill>
  );
}
