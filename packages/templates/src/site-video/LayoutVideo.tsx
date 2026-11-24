import { getEventType, getLanguage, type EventContent, type SiteDesign, type SiteLayout } from '@cardai/shared';
import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { SiteVideoFunction } from './SiteVideo';

/**
 * Videos for the layout designs, each following its website: a stories reel (progress bars,
 * stickers), a streaming-show trailer (title card, episodes, premiere date), a chat that types
 * itself, and a scrapbook (magazine cover, polaroids dropping in, torn notes, ticket).
 * 1080×1920; music, watermark and outro come from SiteVideo.
 */

type Scene = { kind: string; from: number; duration: number; index?: number };

/** Seconds per scene for each layout; functions beyond five are left to the website. */
const PLAN: Record<SiteLayout, { fade: number; build: (fns: number) => Array<[string, number, number?]> }> = {
  stories: {
    fade: 0,
    build: (n) => [['cover', 4], ['invite', 3.5], ...fnScenes(n, 3), ['countdown', 3], ['rsvp', 3.2]],
  },
  movie: {
    fade: 0.4,
    build: (n) => [['logo', 2.8], ['title', 4.5], ['tagline', 3.6], ...fnScenes(n, 2.8), ['premiere', 4.8]],
  },
  chat: {
    fade: 0,
    // One continuous thread: ~1.7 s per message.
    build: (n) => [['thread', 4 + Math.min(n, 5) * 1.7 + 6 * 1.7]],
  },
  scrapbook: {
    fade: 0.5,
    build: (n) => [['cover', 4.5], ['polaroids', 4.2], ...fnScenes(n, 3.2), ['ticket', 4.5]],
  },
};
function fnScenes(n: number, sec: number): Array<[string, number, number]> {
  return Array.from({ length: Math.min(n, 5) }, (_, i) => ['fn', sec, i]);
}

export function planLayoutVideo(layout: SiteLayout, fnCount: number, fps: number): { scenes: Scene[]; durationInFrames: number; fade: number } {
  const p = PLAN[layout];
  const fade = Math.round(p.fade * fps);
  const scenes: Scene[] = [];
  let at = 0;
  for (const [kind, sec, index] of p.build(fnCount)) {
    const duration = Math.round(sec * fps);
    scenes.push({ kind, from: at, duration, index });
    at += duration - fade;
  }
  return { scenes, durationInFrames: at + fade, fade };
}

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

function In({ t, at, children, style, dur = 0.7, y = 50, scale }: { t: number; at: number; children: ReactNode; style?: CSSProperties; dur?: number; y?: number; scale?: number }) {
  const p = interpolate(t, [at, at + dur], [0, 1], { ...clamp, easing: ease });
  const s = scale === undefined ? 1 : scale + (1 - scale) * p;
  return <div style={{ ...style, opacity: p, transform: `translateY(${(1 - p) * y}px) scale(${s})` }}>{children}</div>;
}

const STORY_BG = [
  'linear-gradient(160deg, #F58529 0%, #DD2A7B 55%, #8134AF 100%)',
  'linear-gradient(160deg, #1D2B64 0%, #8134AF 100%)',
  'linear-gradient(160deg, #DD2A7B 0%, #F58529 100%)',
  'linear-gradient(160deg, #0F2027 0%, #2C5364 100%)',
  'linear-gradient(160deg, #8E2DE2 0%, #DD2A7B 100%)',
  'linear-gradient(160deg, #134E5E 0%, #71B280 100%)',
];
const PHOTO_FALLBACK = 'linear-gradient(160deg, #F2C7B5 0%, #C98A7A 45%, #5E3B3B 100%)';

function Photo({ src, style, zoom = 1 }: { src?: string; style?: CSSProperties; zoom?: number }) {
  return src ? (
    <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: `scale(${zoom})`, ...style }} />
  ) : (
    <div style={{ width: '100%', height: '100%', background: PHOTO_FALLBACK, ...style }} />
  );
}

function Sticker({ children, rot = 0, size = 46 }: { children: ReactNode; rot?: number; size?: number }) {
  return (
    <div style={{ display: 'inline-block', background: '#fff', color: '#111', borderRadius: 26, padding: '18px 34px', fontSize: size, fontWeight: 700, transform: `rotate(${rot}deg)`, boxShadow: '0 12px 30px rgba(0,0,0,0.25)' }}>{children}</div>
  );
}

export interface LayoutVideoProps {
  design: SiteDesign;
  layout: SiteLayout;
  language: string;
  timezone: string;
  content: EventContent;
  functions: SiteVideoFunction[];
  photos: string[];
  link: string | null;
  eventType?: string;
  scriptFont: string;
  serifFont: string;
  bodyFont: string;
}

export function LayoutVideo(props: LayoutVideoProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { design: d, layout, content: c, functions: fns, photos, scriptFont, serifFont, bodyFont } = props;
  const lang = getLanguage(props.language);
  const hi = props.language === 'hi' || props.language === 'mr';
  const tr = (en: string, h: string) => (hi ? h : en);
  const names = c.primaryNames.filter(Boolean);
  const title = names.length ? names.join(` ${c.connector || '&'} `) : c.headline;
  const ev = getEventType(props.eventType ?? 'wedding');
  const occasion = hi ? ev.labelHi : ev.label.split(' / ')[0]!;
  const fmtDate = new Intl.DateTimeFormat(lang.locale, { timeZone: props.timezone, weekday: 'short', day: 'numeric', month: 'long' });
  const fmtTime = new Intl.DateTimeFormat(lang.locale, { timeZone: props.timezone, hour: 'numeric', minute: '2-digit' });
  const first = fns[0];
  const days = first ? Math.max(0, Math.ceil((new Date(first.startsAt).getTime() - Date.now()) / 86_400_000)) : 0;
  const { scenes, fade } = planLayoutVideo(layout, fns.length, fps);

  // ---------------------------------------------------------------- stories
  const story = (s: Scene, t: number, i: number): ReactNode => {
    const bg = STORY_BG[i % STORY_BG.length]!;
    const bars = (
      <div style={{ position: 'absolute', left: 24, right: 24, top: 24, display: 'flex', gap: 8, zIndex: 5 }}>
        {scenes.map((x, j) => (
          <div key={j} style={{ flex: 1, height: 7, borderRadius: 4, background: 'rgba(255,255,255,0.35)', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#fff', width: j < i ? '100%' : j === i ? `${Math.min(1, t / (s.duration / fps)) * 100}%` : 0 }} />
          </div>
        ))}
      </div>
    );
    const photo = s.kind === 'cover' ? photos[0] : s.kind === 'fn' ? photos[(s.index ?? 0) + 1] : s.kind === 'countdown' ? photos[2] : undefined;
    let body: ReactNode;
    if (s.kind === 'cover')
      body = (
        <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 340, textAlign: 'center', color: '#fff' }}>
          <In t={t} at={0.3} scale={0.6}>
            <Sticker rot={-3}>✨ {tr('SAVE THE DATE', 'तारीख़ याद रखें')}</Sticker>
          </In>
          <In t={t} at={0.7}>
            <div style={{ fontFamily: scriptFont, fontSize: 170, lineHeight: 1.02, marginTop: 30, textShadow: '0 6px 40px rgba(0,0,0,0.45)', padding: '0 60px' }}>{title}</div>
          </In>
          {first && (
            <In t={t} at={1.3} scale={0.6}>
              <div style={{ marginTop: 40 }}>
                <Sticker rot={2}>📅 {fmtDate.format(new Date(first.startsAt))}</Sticker>
              </div>
            </In>
          )}
        </AbsoluteFill>
      );
    else if (s.kind === 'invite')
      body = (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#fff', padding: '0 110px' }}>
          <In t={t} at={0.2}>
            <div style={{ fontFamily: serifFont, fontSize: 78, lineHeight: 1.25 }}>{c.hostLine || c.headline}</div>
          </In>
          <In t={t} at={0.9}>
            <div style={{ fontFamily: scriptFont, fontSize: 120, marginTop: 70 }}>{title}</div>
          </In>
        </AbsoluteFill>
      );
    else if (s.kind === 'fn') {
      const f = fns[s.index ?? 0]!;
      body = (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#fff' }}>
          <In t={t} at={0.1}>
            <div style={{ fontSize: 36, letterSpacing: '0.3em', fontWeight: 700 }}>
              {tr('FUNCTION', 'कार्यक्रम')} {(s.index ?? 0) + 1}/{fns.length}
            </div>
          </In>
          <In t={t} at={0.3}>
            <div style={{ fontFamily: serifFont, fontSize: 190, lineHeight: 1, marginTop: 20, textShadow: '0 6px 40px rgba(0,0,0,0.4)' }}>{f.name}</div>
          </In>
          <In t={t} at={0.8} scale={0.6}>
            <div style={{ marginTop: 50 }}>
              <Sticker rot={-2}>
                🗓 {fmtDate.format(new Date(f.startsAt))} · {fmtTime.format(new Date(f.startsAt))}
              </Sticker>
            </div>
          </In>
          <In t={t} at={1.2} scale={0.6}>
            <div style={{ marginTop: 30 }}>
              <Sticker rot={1}>
                <span style={{ color: '#C1356F' }}>📍 {f.venueName.toUpperCase()}</span>
              </Sticker>
            </div>
          </In>
        </AbsoluteFill>
      );
    } else if (s.kind === 'countdown')
      body = (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <In t={t} at={0.2} scale={0.7}>
            <div style={{ width: 720, background: 'rgba(255,255,255,0.96)', borderRadius: 48, padding: 60, textAlign: 'center', color: '#111' }}>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '0.2em', color: '#8134AF' }}>{tr('COUNTDOWN', 'उलटी गिनती')}</div>
              <div style={{ fontSize: 54, fontWeight: 600, marginTop: 10 }}>{occasion}</div>
              <div style={{ fontSize: 220, fontWeight: 900, lineHeight: 1, marginTop: 20, color: '#DD2A7B' }}>{Math.round(interpolate(t, [0.4, 1.6], [days + 30, days], { ...clamp, easing: ease }))}</div>
              <div style={{ fontSize: 40, color: '#555' }}>{tr('days to go', 'दिन बाकी')}</div>
            </div>
          </In>
        </AbsoluteFill>
      );
    else
      body = (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <In t={t} at={0.2} scale={0.7}>
            <div style={{ width: 760, background: '#fff', borderRadius: 48, padding: 56, textAlign: 'center', color: '#111' }}>
              <div style={{ fontSize: 66, fontWeight: 800 }}>{tr('Will you come? 🥹', 'आप आएँगे? 🥹')}</div>
              <div style={{ marginTop: 40, borderRadius: 28, padding: '30px 0', fontSize: 56, fontWeight: 800, color: '#fff', background: 'linear-gradient(90deg,#F58529,#DD2A7B,#8134AF)' }}>{tr('Yes! 🎉', 'हाँ! 🎉')}</div>
              <div style={{ marginTop: 18, borderRadius: 28, padding: '30px 0', fontSize: 50, fontWeight: 600, background: '#EFEFEF' }}>{tr("Can't make it", 'नहीं आ पाऊँगा')}</div>
              {props.link && <div style={{ marginTop: 34, fontSize: 36, color: '#00376B' }}>{props.link.replace(/^https?:\/\//, '')}</div>}
            </div>
          </In>
        </AbsoluteFill>
      );
    return (
      <AbsoluteFill style={{ background: bg }}>
        {photo && (
          <AbsoluteFill>
            <Photo src={photo} zoom={interpolate(t, [0, s.duration / fps], [1.1, 1], clamp)} />
            <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.55))' }} />
          </AbsoluteFill>
        )}
        {bars}
        {body}
      </AbsoluteFill>
    );
  };

  // ---------------------------------------------------------------- movie
  const movie = (s: Scene, t: number): ReactNode => {
    const red = d.palette.primary;
    const gold = d.palette.accent;
    if (s.kind === 'logo')
      return (
        <AbsoluteFill style={{ background: '#000', justifyContent: 'center', alignItems: 'center', color: '#F4F1EA', textAlign: 'center' }}>
          <div style={{ width: interpolate(t, [0.2, 1.2], [0, 14], clamp), height: 160, background: red, marginBottom: 40 }} />
          <In t={t} at={0.6} y={0} scale={1.3}>
            <div style={{ fontFamily: serifFont, fontSize: 96, letterSpacing: '0.35em', color: red }}>{tr('A FAMILY', 'एक पारिवारिक')}</div>
            <div style={{ fontFamily: serifFont, fontSize: 96, letterSpacing: '0.35em' }}>{tr('ORIGINAL', 'प्रस्तुति')}</div>
          </In>
        </AbsoluteFill>
      );
    if (s.kind === 'title')
      return (
        <AbsoluteFill style={{ background: '#0B0B0F' }}>
          <AbsoluteFill style={{ opacity: 0.85 }}>
            <Photo src={photos[0]} zoom={interpolate(t, [0, 4.5], [1.18, 1], clamp)} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: 'linear-gradient(to top, #0B0B0F 18%, rgba(11,11,15,0.2) 60%, rgba(0,0,0,0.4))' }} />
          <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 80px 260px', color: '#F4F1EA' }}>
            <In t={t} at={0.4} y={0} scale={1.15}>
              <div style={{ fontFamily: serifFont, fontSize: names.length > 1 ? 230 : 200, lineHeight: 0.88, textTransform: 'uppercase' }}>
                {names[0] ?? title}
                {names[1] && (
                  <>
                    <div style={{ fontFamily: scriptFont, fontSize: 100, textTransform: 'none', color: gold, lineHeight: 1.1 }}>{c.connector || '&'}</div>
                    {names[1]}
                  </>
                )}
              </div>
            </In>
            <In t={t} at={1.2}>
              <div style={{ display: 'flex', gap: 30, alignItems: 'center', fontSize: 40, marginTop: 30 }}>
                <span style={{ color: '#46D369', fontWeight: 800 }}>{tr('100% Match', '100% मैच')}</span>
                <span>{first ? new Date(first.startsAt).getFullYear() : ''}</span>
                <span style={{ border: '2px solid rgba(255,255,255,0.6)', padding: '0 12px' }}>U</span>
                <span>
                  {fns.length} {tr('Episodes', 'एपिसोड')}
                </span>
              </div>
            </In>
          </AbsoluteFill>
        </AbsoluteFill>
      );
    if (s.kind === 'tagline')
      return (
        <AbsoluteFill style={{ background: '#0B0B0F', justifyContent: 'center', alignItems: 'center', padding: '0 110px', textAlign: 'center', color: '#F4F1EA' }}>
          <In t={t} at={0.2} y={0} scale={1.08}>
            <div style={{ fontFamily: serifFont, fontSize: 104, lineHeight: 1.1, textTransform: 'uppercase' }}>{c.hostLine || c.headline}</div>
          </In>
        </AbsoluteFill>
      );
    if (s.kind === 'fn') {
      const i = s.index ?? 0;
      const f = fns[i]!;
      return (
        <AbsoluteFill style={{ background: '#0B0B0F', color: '#F4F1EA' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 1000, opacity: 0.7 }}>
            <Photo src={photos[(i + 1) % Math.max(1, photos.length)]} zoom={interpolate(t, [0, 2.8], [1.12, 1], clamp)} />
          </div>
          <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(11,11,15,0.1), #0B0B0F 55%)' }} />
          <AbsoluteFill style={{ justifyContent: 'flex-end', padding: '0 90px 320px' }}>
            <In t={t} at={0.2}>
              <div style={{ fontFamily: serifFont, fontSize: 64, color: red, letterSpacing: '0.2em' }}>
                {tr('EPISODE', 'एपिसोड')} {i + 1}
              </div>
            </In>
            <In t={t} at={0.4}>
              <div style={{ fontFamily: serifFont, fontSize: 200, lineHeight: 0.95, textTransform: 'uppercase' }}>{f.name}</div>
            </In>
            <In t={t} at={0.8}>
              <div style={{ fontSize: 46, marginTop: 24 }}>
                {fmtDate.format(new Date(f.startsAt))} · {fmtTime.format(new Date(f.startsAt))}
              </div>
              <div style={{ fontSize: 40, marginTop: 10, opacity: 0.75 }}>{f.venueName}</div>
            </In>
          </AbsoluteFill>
        </AbsoluteFill>
      );
    }
    // Premiere card
    return (
      <AbsoluteFill style={{ background: 'radial-gradient(90% 60% at 50% 40%, #3A0D12 0%, #0B0B0F 70%)', justifyContent: 'center', alignItems: 'center', textAlign: 'center', color: '#F4F1EA' }}>
        <In t={t} at={0.2}>
          <div style={{ fontFamily: serifFont, fontSize: 70, letterSpacing: '0.3em', color: gold }}>{tr('PREMIERES', 'प्रीमियर')}</div>
        </In>
        <In t={t} at={0.5} y={0} scale={1.2}>
          <div style={{ fontFamily: serifFont, fontSize: 210, lineHeight: 1 }}>{first ? new Intl.DateTimeFormat('en-GB', { timeZone: props.timezone, day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(first.startsAt)).replace(/\//g, '.') : ''}</div>
        </In>
        <In t={t} at={1.1}>
          <div style={{ fontFamily: scriptFont, fontSize: 110, marginTop: 30, color: gold }}>{title}</div>
        </In>
        <In t={t} at={1.6}>
          <div style={{ marginTop: 60, display: 'inline-flex', gap: 24 }}>
            <span style={{ background: '#fff', color: '#000', borderRadius: 14, padding: '22px 50px', fontSize: 48, fontWeight: 800 }}>▶ RSVP</span>
          </div>
          {props.link && <div style={{ fontSize: 38, marginTop: 40, opacity: 0.85 }}>{props.link.replace(/^https?:\/\//, '')}</div>}
        </In>
      </AbsoluteFill>
    );
  };

  // ---------------------------------------------------------------- chat
  const chat = (t: number): ReactNode => {
    type M = { out?: boolean; node: ReactNode; h: number };
    const msgs: M[] = [
      { node: tr('Hi! 👋 We have some news…', 'नमस्ते! 👋 एक ख़ुशख़बरी है…'), h: 130 },
      { node: c.hostLine || c.headline, h: 250 },
      ...(photos[0] ? [{ node: <div style={{ width: 560, height: 680, borderRadius: 26, overflow: 'hidden' }}><Photo src={photos[0]} /></div>, h: 730 } as M] : []),
      { out: true, node: tr('Omg!! 😍 When and where?', 'वाह!! 😍 कब और कहाँ?'), h: 130 },
      ...fns.slice(0, 5).map<M>((f) => ({
        node: (
          <div>
            <div style={{ fontSize: 34, fontWeight: 800, color: d.palette.primary, textTransform: 'uppercase' }}>📅 {f.name}</div>
            <div style={{ fontWeight: 700 }}>{fmtDate.format(new Date(f.startsAt))}</div>
            <div>
              🕖 {fmtTime.format(new Date(f.startsAt))} · 📍 {f.venueName}
            </div>
          </div>
        ),
        h: 250,
      })),
      { node: tr('So… will you join us? 🥹', 'तो… आप आएँगे न? 🥹'), h: 130 },
      { out: true, node: tr("Yes, I'll be there! 🎉", 'हाँ, ज़रूर आऊँगा! 🎉'), h: 130 },
    ];
    const per = 1.7;
    const shown = msgs.filter((_, i) => t >= 1 + i * per);
    const total = shown.reduce((n, m) => n + m.h + 24, 0);
    // The thread scrolls up once it fills the screen.
    const scroll = Math.max(0, total - 1480);
    const typing = msgs.findIndex((_, i) => t < 1 + i * per && t >= 1 + i * per - 0.9);
    return (
      <AbsoluteFill style={{ background: '#EFEAE2', fontFamily: bodyFont, color: '#111B21' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 210, background: d.palette.primary, color: '#fff', display: 'flex', alignItems: 'center', gap: 30, padding: '60px 40px 0', zIndex: 3 }}>
          <div style={{ width: 110, height: 110, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
            <Photo src={photos[0]} />
          </div>
          <div>
            <div style={{ fontSize: 54, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 34, opacity: 0.85 }}>{typing >= 0 && !msgs[typing]!.out ? tr('typing…', 'टाइप कर रहे हैं…') : `${occasion} · ${tr('online', 'ऑनलाइन')}`}</div>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 240, left: 36, right: 36, bottom: 60, overflow: 'hidden' }}>
          <div style={{ transform: `translateY(${-scroll}px)`, display: 'flex', flexDirection: 'column', gap: 24 }}>
            {shown.map((m, i) => {
              const born = 1 + i * per;
              const p = interpolate(t, [born, born + 0.35], [0, 1], { ...clamp, easing: ease });
              return (
                <div key={i} style={{ display: 'flex', justifyContent: m.out ? 'flex-end' : 'flex-start', opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${0.95 + p * 0.05})` }}>
                  <div style={{ maxWidth: 820, background: m.out ? '#D9FDD3' : '#fff', borderRadius: 34, borderTopLeftRadius: m.out ? 34 : 6, borderTopRightRadius: m.out ? 6 : 34, padding: '22px 30px', fontSize: 44, lineHeight: 1.3, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
                    {m.node}
                    <div style={{ fontSize: 26, color: '#667781', textAlign: 'right', marginTop: 6 }}>{m.out ? '10:2' + i + ' ✓✓' : '10:2' + i}</div>
                  </div>
                </div>
              );
            })}
            {typing >= 0 && !msgs[typing]!.out && (
              <div style={{ alignSelf: 'flex-start', background: '#fff', borderRadius: 34, borderTopLeftRadius: 6, padding: '30px 36px', display: 'flex', gap: 12 }}>
                {[0, 1, 2].map((k) => (
                  <span key={k} style={{ width: 18, height: 18, borderRadius: 9, background: '#8696A0', transform: `translateY(${Math.sin(t * 9 + k) * 6}px)` }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </AbsoluteFill>
    );
  };

  // ---------------------------------------------------------------- scrapbook
  const kraft: CSSProperties = { background: '#EFE3CF', fontFamily: bodyFont, color: '#2B2622' };
  const tape = (color: string, style: CSSProperties) => <div style={{ position: 'absolute', width: 230, height: 64, background: color, opacity: 0.85, ...style }} />;
  const drop = (t: number, at: number, rot: number) => {
    const p = interpolate(t, [at, at + 0.55], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.9, 0.3, 1.25) });
    return { opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * -260}px) rotate(${rot * (2 - p)}deg) scale(${1.15 - p * 0.15})` } as CSSProperties;
  };
  const scrap = (s: Scene, t: number): ReactNode => {
    if (s.kind === 'cover')
      return (
        <AbsoluteFill style={{ background: '#1A1410', color: '#fff' }}>
          <AbsoluteFill>
            <Photo src={photos[0]} zoom={interpolate(t, [0, 4.5], [1.15, 1], clamp)} />
          </AbsoluteFill>
          <AbsoluteFill style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), transparent 35%, rgba(0,0,0,0.7))' }} />
          <div style={{ position: 'absolute', top: 70, left: 60, right: 60, fontSize: 30, letterSpacing: '0.2em', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
            <span>{tr('ISSUE 01', 'अंक 01')}</span>
            <span>{tr("COLLECTOR'S EDITION", 'विशेष संस्करण')}</span>
          </div>
          <In t={t} at={0.2} y={0} scale={1.2} style={{ position: 'absolute', top: 110, left: 50, right: 50 }}>
            {/* Masthead sized to fit the cover width whatever the occasion's length. */}
            <div style={{ fontFamily: serifFont, fontSize: Math.min(230, Math.round(1500 / Math.max(4, occasion.length))), lineHeight: 0.85, color: d.palette.accent, whiteSpace: 'nowrap' }}>{occasion.toUpperCase()}</div>
          </In>
          <div style={{ position: 'absolute', left: 60, right: 60, bottom: 300 }}>
            <In t={t} at={0.9}>
              <span style={{ background: d.palette.primary, padding: '6px 18px', fontSize: 30, fontWeight: 800, letterSpacing: '0.25em' }}>{tr('EXCLUSIVE', 'एक्सक्लूसिव')}</span>
              <div style={{ fontFamily: serifFont, fontSize: 130, lineHeight: 0.95, marginTop: 16 }}>{title}</div>
            </In>
            <In t={t} at={1.5}>
              <div style={{ fontSize: 44, marginTop: 24, fontWeight: 700 }}>✦ {first ? fmtDate.format(new Date(first.startsAt)) : ''}</div>
            </In>
          </div>
        </AbsoluteFill>
      );
    if (s.kind === 'polaroids') {
      const list = (photos.length ? photos : [undefined, undefined]).slice(0, 3);
      return (
        <AbsoluteFill style={kraft}>
          <In t={t} at={0.1}>
            <div style={{ fontFamily: scriptFont, fontSize: 140, textAlign: 'center', marginTop: 140, color: d.palette.primary }}>{tr('Our story', 'हमारी कहानी')}</div>
          </In>
          {list.map((src, i) => {
            const pos = [
              { left: 80, top: 420, rot: -6 },
              { left: 470, top: 700, rot: 5 },
              { left: 140, top: 1080, rot: -3 },
            ][i]!;
            return (
              <div key={i} style={{ position: 'absolute', left: pos.left, top: pos.top, width: 520, ...drop(t, 0.4 + i * 0.6, pos.rot) }}>
                {tape(['#F3C5C5', '#C9E4DE', '#F7E1A1'][i]!, { left: 145, top: -30, transform: 'rotate(-4deg)' })}
                <div style={{ background: '#FFFDF8', padding: '26px 26px 110px', boxShadow: '0 16px 40px rgba(60,40,20,0.3)' }}>
                  <div style={{ height: 470 }}>
                    <Photo src={src} />
                  </div>
                  <div style={{ position: 'absolute', left: 16, right: 16, bottom: 24, textAlign: 'center', fontFamily: scriptFont, fontSize: 52, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{[names.join(' + ') || title, tr('us ♡', 'हम ♡'), tr('forever', 'हमेशा')][i]}</div>
                </div>
              </div>
            );
          })}
        </AbsoluteFill>
      );
    }
    if (s.kind === 'fn') {
      const i = s.index ?? 0;
      const f = fns[i]!;
      return (
        <AbsoluteFill style={{ ...kraft, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 860, ...drop(t, 0.2, i % 2 ? 4 : -4) }}>
            {tape('#C9E4DE', { right: 60, top: -32, transform: 'rotate(6deg)' })}
            <div style={{ background: '#FFFDF3', padding: '70px 70px', boxShadow: '0 16px 40px rgba(60,40,20,0.25)' }}>
              <div style={{ fontFamily: scriptFont, fontSize: 150, lineHeight: 1, color: d.palette.primary }}>{f.name}</div>
              <div style={{ fontSize: 50, marginTop: 34, fontWeight: 700 }}>{fmtDate.format(new Date(f.startsAt))}</div>
              <div style={{ fontSize: 46, marginTop: 8 }}>{fmtTime.format(new Date(f.startsAt))}</div>
              <div style={{ fontSize: 44, marginTop: 8 }}>{f.venueName}</div>
            </div>
          </div>
        </AbsoluteFill>
      );
    }
    return (
      <AbsoluteFill style={{ ...kraft, justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ width: 860, display: 'flex', background: d.palette.primary, color: '#fff', borderRadius: 16, ...drop(t, 0.2, -3) }}>
          <div style={{ flex: 1, padding: '50px 50px', textAlign: 'left' }}>
            <div style={{ fontSize: 30, letterSpacing: '0.3em', fontWeight: 800, opacity: 0.85 }}>{tr('ADMIT ONE', 'प्रवेश पत्र')}</div>
            <div style={{ fontFamily: serifFont, fontSize: 84, lineHeight: 1.05, marginTop: 10 }}>{fns[fns.length - 1]?.name ?? occasion}</div>
            <div style={{ fontSize: 40, marginTop: 12 }}>{fns[fns.length - 1] ? fmtDate.format(new Date(fns[fns.length - 1]!.startsAt)) : ''}</div>
          </div>
          <div style={{ width: 230, borderLeft: '6px dashed rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontFamily: serifFont, fontSize: 110, lineHeight: 1 }}>{days}</div>
            <div style={{ fontSize: 28, letterSpacing: '0.1em' }}>{tr('DAYS TO GO', 'दिन बाकी')}</div>
          </div>
        </div>
        <In t={t} at={1.2}>
          <div style={{ fontFamily: scriptFont, fontSize: 110, marginTop: 90, color: d.palette.primary }}>{c.closing || tr('See you there!', 'ज़रूर आइए!')}</div>
          {props.link && <div style={{ fontSize: 40, marginTop: 30 }}>{props.link.replace(/^https?:\/\//, '')}</div>}
        </In>
      </AbsoluteFill>
    );
  };

  const render = (s: Scene, t: number, i: number): ReactNode =>
    layout === 'stories' ? story(s, t, i) : layout === 'movie' ? movie(s, t) : layout === 'chat' ? chat(t) : scrap(s, t);

  return (
    <AbsoluteFill style={{ background: d.palette.background, fontFamily: bodyFont }}>
      {scenes.map((s, i) => {
        const local = frame - s.from;
        if (local < 0 || local >= s.duration) return null;
        const last = i === scenes.length - 1;
        const opacity = fade ? interpolate(local, [0, fade, s.duration - fade, s.duration], [i === 0 ? 1 : 0, 1, 1, last ? 1 : 0], clamp) : 1;
        return (
          <AbsoluteFill key={`${s.kind}-${i}`} style={{ opacity }}>
            {render(s, local / fps, i)}
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
}
