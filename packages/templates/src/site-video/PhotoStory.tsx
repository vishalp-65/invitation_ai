import { artAspect, artSrc, getLanguage, getPhotoLook, layerBox, PAINTED_MASKS, photoBlock, type ArtId, type EventContent, type LookLayer, type PhotoLook } from '@cardai/shared';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Audio, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/**
 * Photo storybook video (9:16) for the painted photo looks, after the reference clip the
 * user shared: a handwritten title over sweeping brush strokes, the couple's photos inside
 * painted masks under a botanical crown, a "together" wash circle, one card per function,
 * and a sky "save the date" with the venue QR. Same paper, art, fonts and colours as the card
 * and the website of the same invitation.
 */

export interface PhotoStoryFunction {
  name: string;
  startsAt: string;
  venueName: string;
  venueAddress?: string | null;
}

export interface PhotoStoryProps {
  lookId: string;
  language: string;
  timezone: string;
  content: EventContent;
  functions: PhotoStoryFunction[];
  photos: string[];
  musicUrl: string | null;
  watermark: boolean;
  watermarkText: string;
  link: string | null;
  qr: { src: string; label: string; corner: 'br' | 'bl' | 'tr' | 'tl' } | null;
  scriptFont: string;
  serifFont: string;
  bodyFont: string;
}

export const PHOTO_STORY = { title: 4.6, photo: 6.2, together: 4.8, fn: 3.4, savedate: 6.8, fade: 0.7, maxFunctions: 4 } as const;

type Kind = 'title' | 'photo' | 'together' | 'fn' | 'savedate';
interface Scene {
  kind: Kind;
  from: number;
  duration: number;
  index?: number;
}

export function planPhotoStory(fnCount: number, fps: number): { scenes: Scene[]; durationInFrames: number } {
  const list: Array<[Kind, number, number?]> = [
    ['title', PHOTO_STORY.title],
    ['photo', PHOTO_STORY.photo],
    ['together', PHOTO_STORY.together],
    ...Array.from({ length: Math.min(fnCount, PHOTO_STORY.maxFunctions) }, (_, i) => ['fn', PHOTO_STORY.fn, i] as [Kind, number, number]),
    ['savedate', PHOTO_STORY.savedate],
  ];
  const fade = Math.round(PHOTO_STORY.fade * fps);
  const scenes: Scene[] = [];
  let at = 0;
  for (const [kind, sec, index] of list) {
    const duration = Math.round(sec * fps);
    scenes.push({ kind, from: at, duration, index });
    at += duration - fade;
  }
  return { scenes, durationInFrames: at + fade };
}

const W = 1080;
const H = 1920;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const p = (t: number, a: number, d = 0.9) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: ease });

function In({ t, at, children, style, dur = 0.9, y = 36 }: { t: number; at: number; children: ReactNode; style?: CSSProperties; dur?: number; y?: number }) {
  const k = p(t, at, dur);
  return <div style={{ ...style, opacity: k, transform: `translateY(${(1 - k) * y}px)` }}>{children}</div>;
}

/** Script text revealed left → right like a pen writing it. */
function Handwrite({ t, at, dur = 1.4, children, style }: { t: number; at: number; dur?: number; children: ReactNode; style?: CSSProperties }) {
  const k = interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  return <div style={{ ...style, clipPath: `inset(-20% ${(1 - k) * 100}% -20% -5%)`, WebkitClipPath: `inset(-20% ${(1 - k) * 100}% -20% -5%)` }}>{children}</div>;
}

const maskCss = (mask: string): CSSProperties => {
  if (mask in PAINTED_MASKS) {
    const url = `url("${artSrc(PAINTED_MASKS[mask as keyof typeof PAINTED_MASKS])}")`;
    return { WebkitMaskImage: url, maskImage: url, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' };
  }
  return mask === 'circle' || mask === 'oval' ? { borderRadius: '50%' } : {};
};

function Paper({ art, color }: { art: ArtId; color: string }) {
  return (
    <AbsoluteFill style={{ background: color }}>
      <Img src={artSrc(art)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </AbsoluteFill>
  );
}

/** The look's corner / edge art, growing in from its anchor and swaying gently. */
function Layers({ look, t, over = false, delay = 0 }: { look: PhotoLook; t: number; over?: boolean; delay?: number }) {
  return (
    <>
      {look.layers
        .filter((l) => Boolean(l.over) === over)
        .map((l: LookLayer, i) => {
          const b = layerBox(l, W, H, artAspect(l.art));
          const k = p(t, delay + i * 0.2, 1.4);
          const sway = l.motion === 'sway' ? Math.sin(t * 0.9 + i) * 0.8 : 0;
          const glow = l.motion === 'glow' ? 0.8 + Math.sin(t * 2.2) * 0.2 : 1;
          const from = l.at === 'frame' ? 1.04 : 0.9;
          return (
            <Img
              key={`${l.art}-${i}`}
              src={artSrc(l.art)}
              style={{
                position: 'absolute',
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                objectFit: l.at === 'frame' ? 'fill' : 'contain',
                opacity: k * (l.opacity ?? 1) * glow,
                transform: `scale(${(l.flipX ? -1 : 1) * (from + (1 - from) * k)}, ${(l.flipY ? -1 : 1) * (from + (1 - from) * k)}) rotate(${sway}deg)`,
              }}
            />
          );
        })}
    </>
  );
}

/** Photo (or twin photos) in the look's mask with its painted frame / crown, `pw` px wide. */
function PhotoBlock({ look, photos, pw, t, at, initials }: { look: PhotoLook; photos: string[]; pw: number; t: number; at: number; initials: string }) {
  const ph = look.photo;
  const twin = Boolean(ph.twin) && photos.length !== 1;
  const b = photoBlock(ph, pw, ph.frame ? artAspect(ph.frame.art) : 1, ph.crown ? artAspect(ph.crown.art) : 1);
  const one = (src: string | undefined, box: { x: number; y: number; w: number; h: number }, a: number, label: string) => {
    const k = p(t, a, 1.2);
    const push = interpolate(t, [a, a + 8], [1.14, 1], clamp);
    return (
      <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', opacity: k, transform: `scale(${0.9 + 0.1 * k})`, ...maskCss(ph.mask), boxShadow: ph.ring && !(ph.mask in PAINTED_MASKS) ? `0 0 0 8px ${ph.ring}` : undefined }}>
        {src ? (
          <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${push})` }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: look.dark ? look.paperAlt : '#FFFFFF', color: look.primary, fontSize: box.w * 0.3 }}>{label}</div>
        )}
      </div>
    );
  };
  const crownK = p(t, at + 0.9, 1.3);
  const frameK = p(t, at, 1.2);
  return (
    <div style={{ position: 'relative', width: b.w, height: b.h, margin: '0 auto' }}>
      {b.crown && ph.crown && (
        <Img src={artSrc(ph.crown.art)} style={{ position: 'absolute', left: b.crown.x, top: b.crown.y, width: b.crown.w, height: b.crown.h, opacity: crownK, transform: `translateY(${(1 - crownK) * 30}px) scale(${0.88 + 0.12 * crownK})`, transformOrigin: '50% 100%' }} />
      )}
      {twin ? (
        <>
          {one(photos[0], { x: b.photo.x + b.photo.w * 0.06, y: b.photo.y + b.photo.h * 0.28, w: b.photo.h * 0.66, h: b.photo.h * 0.66 }, at + 0.2, initials.slice(0, 1))}
          {one(photos[1], { x: b.photo.x + b.photo.w * 0.41, y: b.photo.y + b.photo.h * 0.1, w: b.photo.h * 0.8, h: b.photo.h * 0.8 }, at + 0.6, initials.slice(-1))}
        </>
      ) : (
        one(photos[0], b.photo, at + 0.2, initials)
      )}
      {b.frame && ph.frame && <Img src={artSrc(ph.frame.art)} style={{ position: 'absolute', left: b.frame.x, top: b.frame.y, width: b.frame.w, height: b.frame.h, opacity: frameK }} />}
    </div>
  );
}

const SAVE: Record<string, { save: string; together: string; join: string; getting: string; on: string }> = {
  en: { save: 'Save the Date', together: 'Together', join: 'Please join us', getting: 'are getting married', on: 'for the wedding of' },
  hi: { save: 'तारीख़ याद रखें', together: 'साथ-साथ', join: 'आप सादर आमंत्रित हैं', getting: 'विवाह के पावन बंधन में', on: 'शुभ विवाह' },
};

export function PhotoStory(props: PhotoStoryProps) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const look = getPhotoLook(props.lookId)!;
  const { scenes } = planPhotoStory(props.functions.length, fps);
  const fade = Math.round(PHOTO_STORY.fade * fps);
  const c = props.content;
  const latin = getLanguage(props.language).script === 'Latn';
  const words = SAVE[props.language] ?? SAVE.en!;
  const names = c.primaryNames.filter(Boolean);
  const initials = names.map((n) => [...n][0]).join('');
  const fmt = new Intl.DateTimeFormat(getLanguage(props.language).locale, { timeZone: props.timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const time = new Intl.DateTimeFormat(getLanguage(props.language).locale, { timeZone: props.timezone, hour: 'numeric', minute: '2-digit' });
  const first = props.functions[props.functions.length - 1] ?? props.functions[0];
  const script: CSSProperties = { fontFamily: props.scriptFont, color: look.primary, lineHeight: 1.1 };
  const serif: CSSProperties = { fontFamily: props.serifFont, color: look.ink };
  const body: CSSProperties = { fontFamily: props.bodyFont, color: look.ink };

  const render = (s: Scene, t: number) => {
    switch (s.kind) {
      case 'title': {
        const strokes = look.strokes;
        return (
          <AbsoluteFill>
            <Paper art={look.paper} color={look.paperColor} />
            {strokes &&
              strokes.map((art, i) => {
                const k = interpolate(t, [0.3 + i * 0.35, 1.4 + i * 0.35], [0, 1], { ...clamp, easing: ease });
                return <Img key={art} src={artSrc(art)} style={{ position: 'absolute', left: 230 + i * 260, top: -60, width: 420, height: 2000, opacity: 0.85, transform: `scaleY(${k})`, transformOrigin: '50% 0%' }} />;
              })}
            <Layers look={look} t={t} delay={0.2} />
            <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 110px' }}>
              <In t={t} at={0.9}>
                <div style={{ ...serif, fontSize: 46, letterSpacing: '0.04em' }}>{latin ? 'Save the date for our' : words.save}</div>
              </In>
              <Handwrite t={t} at={1.4} dur={1.6}>
                <div style={{ ...script, fontSize: latin ? 190 : 120, marginTop: 10 }}>{c.headline || names.join(' & ')}</div>
              </Handwrite>
              <In t={t} at={2.8}>
                <div style={{ height: 2, width: 520, background: look.ink, opacity: 0.35, margin: '24px auto 0' }} />
              </In>
            </AbsoluteFill>
            <Layers look={look} t={t} over delay={0.4} />
          </AbsoluteFill>
        );
      }
      case 'photo': {
        const pw = W * (look.photo.frame ? Math.min(0.26, look.photo.w) : Math.min(look.photo.w * 1.12, 0.92));
        return (
          <AbsoluteFill>
            <Paper art={look.paper} color={look.paperColor} />
            <Layers look={look} t={t + 2} />
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 90px' }}>
              <PhotoBlock look={look} photos={props.photos} pw={pw} t={t} at={0.1} initials={initials} />
              <Handwrite t={t} at={1.5} dur={1.2}>
                <div style={{ ...script, fontSize: 150, marginTop: 40 }}>{names[0] ?? c.headline}</div>
              </Handwrite>
              {names[1] && (
                <>
                  <In t={t} at={2.4}>
                    <div style={{ ...serif, fontSize: 56 }}>{c.connector || '+'}</div>
                  </In>
                  <Handwrite t={t} at={2.7} dur={1.2}>
                    <div style={{ ...script, fontSize: 150 }}>{names[1]}</div>
                  </Handwrite>
                </>
              )}
              <In t={t} at={3.6}>
                <div style={{ ...body, fontSize: 44, marginTop: 20 }}>{latin && names.length === 2 ? words.getting : c.headline}</div>
              </In>
            </AbsoluteFill>
            <Layers look={look} t={t + 2} over />
          </AbsoluteFill>
        );
      }
      case 'together': {
        const art = look.accentArt ?? look.layers[0]?.art ?? 'wash-circle';
        const k = p(t, 0.2, 1.4);
        const aspect = artAspect(art);
        // Fit the art in a 600 × 560 box whatever its shape (wide garlands, tall windows).
        const aw = Math.min(600, 560 / aspect);
        const ah = aw * aspect;
        const wash = art === 'wash-circle';
        return (
          <AbsoluteFill>
            <Paper art={look.paper} color={look.paperColor} />
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 120px' }}>
              <div style={{ position: 'relative', width: aw, height: ah }}>
                <Img src={artSrc(art)} style={{ width: aw, height: ah, objectFit: 'contain', opacity: k, transform: `scale(${0.8 + 0.2 * k}) rotate(${(1 - k) * -8}deg)` }} />
                {wash && <div style={{ position: 'absolute', left: -60, right: -60, top: '52%', height: 3, background: look.ink, opacity: 0.3 * k }} />}
              </div>
              <Handwrite t={t} at={1.1} dur={1.3}>
                <div style={{ ...script, fontSize: 170, marginTop: 30 }}>{latin ? words.together : c.familyTitle || words.together}</div>
              </Handwrite>
              <In t={t} at={2.2}>
                <div style={{ ...body, fontSize: 48, lineHeight: 1.4, marginTop: 20, maxWidth: 820 }}>{c.hostLine || c.message || words.join}</div>
              </In>
            </AbsoluteFill>
          </AbsoluteFill>
        );
      }
      case 'fn': {
        const f = props.functions[s.index ?? 0]!;
        const d = new Date(f.startsAt);
        const left = (s.index ?? 0) % 2 === 0;
        const corner = cornerArt(look);
        return (
          <AbsoluteFill>
            <Paper art={(s.index ?? 0) % 2 ? (look.sky ?? look.paper) : look.paper} color={look.paperAlt} />
            {corner && <Img src={artSrc(corner.art)} style={{ position: 'absolute', [left ? 'left' : 'right']: -40, top: corner.top ? -30 : undefined, bottom: corner.top ? undefined : -30, width: corner.w, opacity: 0.9 * p(t, 0, 1.2), transform: left === corner.fromLeft ? undefined : 'scaleX(-1)' }} />}
            <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 120px' }}>
              <In t={t} at={0.3}>
                <div style={{ ...serif, fontSize: 40, letterSpacing: '0.3em', textTransform: latin ? 'uppercase' : undefined, color: look.primary }}>{fmt.format(d).split(',')[0]}</div>
              </In>
              <Handwrite t={t} at={0.6} dur={1.1}>
                <div style={{ ...script, fontSize: 170, marginTop: 10 }}>{f.name}</div>
              </Handwrite>
              <In t={t} at={1.3}>
                <div style={{ ...serif, fontSize: 64, marginTop: 10 }}>{fmt.format(d).split(',').slice(1).join(',').trim() || fmt.format(d)}</div>
                <div style={{ ...body, fontSize: 46, marginTop: 8, opacity: 0.85 }}>{time.format(d)}</div>
              </In>
              <In t={t} at={1.7}>
                <div style={{ ...body, fontSize: 48, marginTop: 40 }}>{f.venueName}</div>
                {f.venueAddress && <div style={{ ...body, fontSize: 36, marginTop: 6, opacity: 0.75 }}>{f.venueAddress}</div>}
              </In>
            </AbsoluteFill>
          </AbsoluteFill>
        );
      }
      case 'savedate': {
        const end = interpolate(t, [PHOTO_STORY.savedate - 1.2, PHOTO_STORY.savedate], [0, 0.85], clamp);
        const d = first ? new Date(first.startsAt) : null;
        const bottom = look.id === 'kahani' ? 'daisies' : look.layers.find((l) => l.at === 'bottom')?.art;
        const bk = p(t, 0.4, 1.6);
        return (
          <AbsoluteFill>
            <Paper art={look.sky ?? look.paper} color={look.paperColor} />
            {bottom && <Img src={artSrc(bottom)} style={{ position: 'absolute', left: 0, bottom: 0, width: W, height: W * artAspect(bottom), opacity: bk, transform: `translateY(${(1 - bk) * 120}px)` }} />}
            {!bottom && <Layers look={look} t={t + 2} />}
            <AbsoluteFill style={{ alignItems: 'center', paddingTop: 300, textAlign: 'center', padding: '300px 110px 0' }}>
              <Handwrite t={t} at={0.3} dur={1.4}>
                <div style={{ ...script, fontSize: latin ? 160 : 110 }}>{words.save}</div>
              </Handwrite>
              <In t={t} at={1.2}>
                <div style={{ ...serif, fontSize: 44, opacity: 0.8 }}>{latin ? words.on : ''}</div>
              </In>
              <In t={t} at={1.5}>
                <div style={{ ...script, fontSize: 120, marginTop: 20 }}>{names[0]}</div>
                {names[1] && <div style={{ ...serif, fontSize: 50 }}>{c.connector || '+'}</div>}
                {names[1] && <div style={{ ...script, fontSize: 120 }}>{names[1]}</div>}
              </In>
              {d && (
                <In t={t} at={2.1}>
                  <div style={{ ...serif, fontSize: 64, marginTop: 30 }}>{fmt.format(d)}</div>
                </In>
              )}
              {first && (
                <In t={t} at={2.5}>
                  <div style={{ ...body, fontSize: 46, marginTop: 14, lineHeight: 1.35 }}>{[first.venueName, first.venueAddress].filter(Boolean).join(', ')}</div>
                </In>
              )}
              {c.hashtag && (
                <In t={t} at={2.9}>
                  <div style={{ ...body, fontSize: 40, marginTop: 30, opacity: 0.85 }}>{c.hashtag}</div>
                </In>
              )}
              {props.link && (
                <In t={t} at={3.2}>
                  <div style={{ marginTop: 34, display: 'inline-block', padding: '18px 40px', borderRadius: 999, background: look.primary, color: look.dark ? look.paperColor : '#FFFFFF', fontFamily: props.bodyFont, fontSize: 36 }}>{props.link.replace(/^https?:\/\//, '')}</div>
                </In>
              )}
            </AbsoluteFill>
            {props.qr && <Qr qr={props.qr} t={t} />}
            <AbsoluteFill style={{ background: '#000', opacity: end }} />
          </AbsoluteFill>
        );
      }
    }
  };

  return (
    <AbsoluteFill style={{ background: look.paperColor, fontFamily: props.bodyFont }}>
      {scenes.map((s, i) => {
        const local = frame - s.from;
        if (local < 0 || local >= s.duration) return null;
        const last = i === scenes.length - 1;
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
      {props.musicUrl && <Audio src={props.musicUrl} volume={(f) => interpolate(f, [0, fps, durationInFrames - fps * 1.5, durationInFrames], [0, 0.8, 0.8, 0], clamp)} />}
    </AbsoluteFill>
  );
}

const CORNER_ART: Partial<Record<ArtId, { top: boolean; fromLeft: boolean; w: number }>> = {
  'rose-cluster': { top: false, fromLeft: true, w: 560 },
  'blush-corner': { top: true, fromLeft: true, w: 620 },
  'peony-corner': { top: true, fromLeft: true, w: 600 },
  'leaf-corner': { top: true, fromLeft: true, w: 600 },
  'pressed-sprig': { top: false, fromLeft: true, w: 560 },
  'peach-sprig': { top: true, fromLeft: false, w: 520 },
  'lotus-bud': { top: false, fromLeft: false, w: 460 },
};

/** A corner piece of the look for the function cards (never a frame or a garland). */
function cornerArt(look: PhotoLook): ({ art: ArtId } & NonNullable<(typeof CORNER_ART)[ArtId]>) | null {
  const candidates: ArtId[] = [...look.layers.map((l) => l.art), ...(look.accentArt ? [look.accentArt] : [])];
  const art = candidates.find((a) => CORNER_ART[a]);
  return art ? { art, ...CORNER_ART[art]! } : null;
}

function Qr({ qr, t }: { qr: NonNullable<PhotoStoryProps['qr']>; t: number }) {
  const k = p(t, 3.4, 0.8);
  const size = 190;
  const inset = 56;
  const style: CSSProperties = {
    position: 'absolute',
    [qr.corner.endsWith('l') ? 'left' : 'right']: inset,
    [qr.corner.startsWith('t') ? 'top' : 'bottom']: inset + (qr.corner.startsWith('b') ? 60 : 0),
    padding: 14,
    borderRadius: 20,
    background: '#FFFFFF',
    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
    textAlign: 'center',
    opacity: k,
    transform: `translateY(${(1 - k) * 20}px)`,
  };
  return (
    <div style={style}>
      <Img src={qr.src} style={{ width: size, height: size, display: 'block', imageRendering: 'pixelated' }} />
      <div style={{ marginTop: 8, fontFamily: 'Inter, "Noto Sans", "Noto Sans Devanagari", sans-serif', fontSize: 20, color: '#333' }}>{qr.label}</div>
    </div>
  );
}
