import { artAspect, artSrc, getLanguage, getPhotoLook, getSiteDesign, layerBox, PAINTED_MASKS, setArtOrigin, type EventContent } from '@cardai/shared';
import { useEffect, useState, type CSSProperties } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFamily } from '../fonts';

/**
 * Countdown clip for WhatsApp / Instagram Status (9:16, 8 s): "7 days to go" with the couple's
 * photo, names and date, in the invitation's own design. Made on demand; the day count is
 * worked out when it renders, so a host can post a fresh one each day.
 */

export interface StatusVideoProps {
  [key: string]: unknown;
  designId: string;
  language: string;
  timezone: string;
  content: EventContent;
  /** The day being counted down to (the wedding itself). */
  target: { name: string; startsAt: string; venueName: string };
  /** Whole days left (0 = today). */
  days: number;
  photos: string[];
  musicUrl: string | null;
  watermark: boolean;
  watermarkText: string;
  link: string | null;
  artOrigin?: string | null;
}

export const STATUS_VIDEO_SECONDS = 8;


const W = 1080;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const k = (t: number, a: number, d = 0.8) => interpolate(t, [a, a + d], [0, 1], { ...clamp, easing: ease });

const WORDS: Record<string, { only: string; days: (n: number) => string; today: string; tomorrow: string }> = {
  en: { only: 'Only', days: (n) => (n === 1 ? 'day to go' : 'days to go'), today: 'Today is the day!', tomorrow: 'Tomorrow!' },
  hi: { only: 'बस', days: () => 'दिन बाकी', today: 'आज शुभ दिन है!', tomorrow: 'कल है शुभ दिन!' },
  mr: { only: 'फक्त', days: () => 'दिवस बाकी', today: 'आज शुभ दिवस!', tomorrow: 'उद्या शुभ दिवस!' },
  gu: { only: 'માત્ર', days: () => 'દિવસ બાકી', today: 'આજે શુભ દિવસ!', tomorrow: 'કાલે શુભ દિવસ!' },
  pa: { only: 'ਬੱਸ', days: () => 'ਦਿਨ ਬਾਕੀ', today: 'ਅੱਜ ਸ਼ੁਭ ਦਿਨ ਹੈ!', tomorrow: 'ਕੱਲ੍ਹ ਸ਼ੁਭ ਦਿਨ ਹੈ!' },
  bn: { only: 'আর মাত্র', days: () => 'দিন বাকি', today: 'আজ শুভ দিন!', tomorrow: 'কাল শুভ দিন!' },
};

function useFonts(families: string[]) {
  const [handle] = useState(() => delayRender('status-video-fonts', { timeoutInMilliseconds: 60_000 }));
  useEffect(() => {
    Promise.allSettled(families.map((f) => loadFamily(f))).finally(() => continueRender(handle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function StatusVideo(props: StatusVideoProps) {
  setArtOrigin(props.artOrigin);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const d = getSiteDesign(props.designId) ?? getSiteDesign('rose-seal')!;
  const look = getPhotoLook(d.look);
  const lang = getLanguage(props.language);
  const latin = lang.script === 'Latn';
  const script = latin ? d.fonts.script : lang.fonts.display;
  const serif = latin ? d.fonts.serif : lang.fonts.display;
  const body = latin ? d.fonts.body : lang.fonts.body;
  useFonts([...new Set([script, serif, body])]);

  const words = WORDS[props.language] ?? WORDS.en!;
  // Drawn-scene packs use their first section band (its text colours are made for that background).
  const band = d.bands[0]!;
  const ink = look ? look.ink : band.ink;
  const primary = look ? look.primary : band.primary;
  const bg = look ? look.paperColor : band.bg;
  const names = props.content.primaryNames.filter(Boolean);
  const date = new Intl.DateTimeFormat(lang.locale, { timeZone: props.timezone, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(props.target.startsAt));

  // The number ticks down from a few days more to the real count, then settles with a bounce.
  const from = props.days + 4;
  const shown = props.days <= 0 ? 0 : Math.round(interpolate(t, [0.5, 2.2], [from, props.days], { ...clamp, easing: Easing.out(Easing.cubic) }));
  const pop = interpolate(t, [2.2, 2.45, 2.7], [1, 1.12, 1], clamp);
  const photo = props.photos[0];
  const mask = look?.photo.mask ?? 'circle';
  const maskCss: CSSProperties =
    mask in PAINTED_MASKS
      ? (() => {
          const url = `url("${artSrc(PAINTED_MASKS[mask as keyof typeof PAINTED_MASKS])}")`;
          return { WebkitMaskImage: url, maskImage: url, WebkitMaskSize: '100% 100%', maskSize: '100% 100%' };
        })()
      : { borderRadius: '50%' };
  const end = interpolate(t, [STATUS_VIDEO_SECONDS - 0.5, STATUS_VIDEO_SECONDS], [0, 1], clamp);
  const big = props.days <= 1 ? (props.days === 0 ? words.today : words.tomorrow) : null;

  return (
    <AbsoluteFill style={{ background: bg, color: ink, textAlign: 'center' }}>
      {look && <Img src={artSrc(look.paper)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      {look?.layers.map((l, i) => {
        const b = layerBox(l, W, 1920, artAspect(l.art));
        const a = k(t, 0.1 + i * 0.2, 1.2);
        return (
          <Img
            key={i}
            src={artSrc(l.art)}
            style={{ position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, objectFit: l.at === 'frame' ? 'fill' : 'contain', opacity: a * (l.opacity ?? 1), transform: `scale(${l.flipX ? -1 : 1}, ${l.flipY ? -1 : 1}) rotate(${Math.sin(t + i) * 0.6}deg)` }}
          />
        );
      })}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: '0 110px' }}>
        {photo && (
          <div style={{ width: 440, height: 440, overflow: 'hidden', marginBottom: 40, opacity: k(t, 0.2, 1), transform: `scale(${0.9 + 0.1 * k(t, 0.2, 1)})`, ...maskCss, boxShadow: mask in PAINTED_MASKS ? undefined : `0 0 0 8px ${primary}` }}>
            <Img src={photo} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${interpolate(t, [0, STATUS_VIDEO_SECONDS], [1.12, 1], clamp)})` }} />
          </div>
        )}
        {big ? (
          <div style={{ fontFamily: script, fontSize: latin ? 170 : 120, color: primary, lineHeight: 1.1, opacity: k(t, 0.6, 1), transform: `scale(${0.8 + 0.2 * k(t, 0.6, 1)})` }}>{big}</div>
        ) : (
          <>
            <div style={{ fontFamily: serif, fontSize: 54, letterSpacing: latin ? '0.3em' : undefined, textTransform: latin ? 'uppercase' : undefined, opacity: k(t, 0.3) }}>{words.only}</div>
            <div style={{ fontFamily: serif, fontSize: 320, lineHeight: 1, color: primary, fontVariantNumeric: 'tabular-nums', transform: `scale(${pop})`, opacity: k(t, 0.4, 0.5) }}>{shown}</div>
            <div style={{ fontFamily: script, fontSize: latin ? 120 : 90, color: primary, marginTop: -10, opacity: k(t, 1.2) }}>{words.days(props.days)}</div>
          </>
        )}
        <div style={{ marginTop: 50, opacity: k(t, 2.6), transform: `translateY(${(1 - k(t, 2.6)) * 30}px)` }}>
          <div style={{ fontFamily: script, fontSize: 100, color: primary, lineHeight: 1.15 }}>{names.length ? names.join(` ${props.content.connector || '&'} `) : props.content.headline}</div>
          <div style={{ fontFamily: body, fontSize: 44, marginTop: 18 }}>
            {props.target.name} · {date}
          </div>
          <div style={{ fontFamily: body, fontSize: 38, marginTop: 8, opacity: 0.8 }}>{props.target.venueName}</div>
        </div>
        {props.link && (
          <div style={{ marginTop: 46, display: 'inline-block', padding: '16px 40px', borderRadius: 999, background: primary, color: look ? (look.dark ? bg : '#FFFFFF') : band.bg, fontFamily: body, fontSize: 34, opacity: k(t, 3.4) }}>
            {props.link.replace(/^https?:\/\//, '')}
          </div>
        )}
      </AbsoluteFill>
      {props.watermark && (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 }}>
          <div style={{ padding: '12px 32px', borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', fontFamily: 'sans-serif', fontSize: 32 }}>{props.watermarkText}</div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: '#000', opacity: end * 0.6 }} />
      {props.musicUrl && <Audio src={props.musicUrl} volume={(f) => interpolate(f, [0, fps * 0.6, durationInFrames - fps, durationInFrames], [0, 0.8, 0.8, 0], clamp)} />}
    </AbsoluteFill>
  );
}
