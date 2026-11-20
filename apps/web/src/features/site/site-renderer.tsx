'use client';

import { BRAND, getLanguage, getSiteDesign, RTL_LANGUAGES, siteMusicUrl, type LanguageCode, type PublicSiteDto, type SiteDoc } from '@cardai/shared';
import { Ambient, Divider } from '@cardai/templates/scenes';
import { CalendarHeart, Languages, MapPin, Music2, Pause, Share2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { safeHref, SiteProvider } from './context';
import { MotionContext, Petals, useEffectiveMotion } from './motion';
import { Opening } from './opening';
import { SectionView } from './sections';
import { bandVars, googleFontsHref, siteVars } from './theme';
import './scenes.css';
import './site.css';

const OPEN_LABEL: Record<string, string> = {
  hi: 'निमंत्रण खोलें',
  mr: 'निमंत्रण उघडा',
  gu: 'આમંત્રણ ખોલો',
  bn: 'আমন্ত্রণ খুলুন',
  ta: 'அழைப்பைத் திறக்கவும்',
  te: 'ఆహ్వానం తెరవండి',
  kn: 'ಆಹ್ವಾನ ತೆರೆಯಿರಿ',
  ml: 'ക്ഷണം തുറക്കുക',
  pa: 'ਸੱਦਾ ਖੋਲ੍ਹੋ',
  ur: 'دعوت نامہ کھولیں',
};

/**
 * The invitation website. Same component for the public page and the builder preview
 * (`preview`), so what the host designs is exactly what guests get.
 */
export function SiteRenderer({
  data,
  doc: docOverride,
  guestToken,
  accessKey,
  preview = false,
  replayKey = 0,
}: {
  data: PublicSiteDto;
  doc?: SiteDoc;
  guestToken?: string;
  accessKey?: string;
  preview?: boolean;
  replayKey?: number;
}) {
  const doc = docOverride ?? data.site;
  const [useAlt, setUseAlt] = useState(false);
  const alt = doc.alt;
  const language = useAlt && alt ? alt.language : data.event.language;
  const content = useAlt && alt ? alt.content : data.event.content;
  const lang = getLanguage(language);
  const level = useEffectiveMotion(doc.motion.level);
  // Builder preview shows the page straight away; the opening plays when the host taps Replay.
  const openingKind = preview && replayKey === 0 ? 'none' : doc.opening.kind;
  const [started, setStarted] = useState(openingKind === 'none');
  const [playing, setPlaying] = useState(false);
  const [musicBroken, setMusicBroken] = useState(false);
  const design = getSiteDesign(doc.design);
  const latin = lang.script === 'Latn';
  const musicUrl = siteMusicUrl({
    uploaded: doc.music?.assetId ? data.media.assets[doc.music.assetId] : null,
    track: doc.music?.track ?? 'auto',
    eventTrackUrl: data.media.musicUrl,
    design,
    library: data.media.musicLibrary ?? {},
  });
  const audio = useRef<HTMLAudioElement>(null);

  // Builder: replaying the opening re-arms the scene.
  useEffect(() => setStarted(openingKind === 'none'), [replayKey, openingKind]);

  useEffect(() => {
    if (preview) return;
    void fetch(`/api/public/events/${data.event.slug}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestToken ? { g: guestToken } : {}),
    });
  }, [data.event.slug, guestToken, preview]);

  const fontsHref = useMemo(() => {
    const families: string[] =
      design && latin
        ? [design.fonts.script, design.fonts.serif, design.fonts.body]
        : [lang.fonts.display, lang.fonts.body, getLanguage(data.event.language).fonts.display];
    return googleFontsHref(families);
  }, [lang, data.event.language, design, latin]);

  const vars = siteVars(data.template.theme, doc.look, lang.fonts, design, latin);
  const ctxData = useMemo(() => ({ ...data, site: doc }), [data, doc]);
  const has = (t: SiteDoc['sections'][number]['type']) => doc.sections.some((s) => s.type === t && !s.hidden);
  const greeting = data.guest ? data.guest.salutation || data.guest.name : null;
  const names = content.primaryNames.filter(Boolean);
  const monogram = names.length ? names.map((n) => [...n][0]).join('') : [...(content.headline || data.event.title)][0] ?? '';
  const first = data.functions[0];

  function playMusic() {
    if (!audio.current || !musicUrl || musicBroken) return;
    void audio.current
      .play()
      .then(() => setPlaying(true))
      .catch((e: unknown) => {
        // Missing library file (not added yet) → hide the button; autoplay blocks are ignored.
        if (e instanceof DOMException && e.name === 'NotSupportedError') setMusicBroken(true);
      });
  }

  async function share() {
    const url = data.shortUrl;
    const text = `${data.event.title}`;
    if (navigator.share) await navigator.share({ title: text, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url).catch(() => undefined);
  }

  const motionClass = level === 'off' ? 'inv-motion-off' : level === 'subtle' ? 'inv-subtle' : '';
  const petalColors = [doc.look.accent ?? data.template.theme.palette.accent, '#F28C0F', '#E8577D'];

  return (
    <MotionContext.Provider value={level}>
      <SiteProvider data={ctxData} content={content} language={language} guestToken={guestToken} accessKey={accessKey} preview={preview}>
        <link rel="stylesheet" href={fontsHref} />
        <div
          key={replayKey}
          className={`inv-root min-h-svh ${motionClass}`}
          style={vars}
          lang={lang.code}
          dir={RTL_LANGUAGES.has(lang.code as LanguageCode) ? 'rtl' : 'ltr'}
        >
          <Opening
            design={design}
            names={names}
            connector={content.connector}
            kind={openingKind}
            label={doc.opening.label || OPEN_LABEL[language] || 'Open invitation'}
            greeting={greeting}
            title={content.headline || data.event.title}
            monogram={monogram}
            motionOff={level === 'off'}
            onOpen={() => {
              setStarted(true);
              playMusic();
            }}
          />
          {doc.motion.petals && level === 'full' && started && <Petals colors={petalColors} />}
          {design && design.ambient !== 'none' && level !== 'off' && started && (
            <div aria-hidden className="pointer-events-none fixed inset-0 z-[5]">
              <Ambient kind={design.ambient} colors={design.scene.colors.bloom} glow={design.scene.colors.glow} density={level === 'subtle' ? 0.4 : 1} />
            </div>
          )}

          {(() => {
            let band = 0;
            return doc.sections.map((s, i) => {
              const anchor = i === 1 ? 'main' : undefined;
              if (!design || s.type === 'hero') {
                return (
                  <div key={s.id} id={anchor} data-section={s.id}>
                    <SectionView section={s} doc={doc} started={started} />
                  </div>
                );
              }
              // Design pages: each section sits on the next colour band, joined by the pack's divider.
              const b = design.bands[band++ % design.bands.length]!;
              return (
                <div key={s.id} id={anchor} data-section={s.id} className="inv-band relative" style={bandVars(b)}>
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] -translate-y-[calc(100%-1px)]">
                    <Divider kind={design.divider} color={b.bg} accent={b.primary} />
                  </div>
                  <SectionView section={s} doc={doc} started={started} />
                </div>
              );
            });
          })()}

          {data.features.showBranding && (
            <footer className="pb-28 text-center text-sm opacity-75">
              <a href="/" className="underline underline-offset-4">
                {BRAND.watermarkText} — make yours free
              </a>
            </footer>
          )}

          {/* Floating controls */}
          <div className="fixed right-3 top-3 z-40 flex flex-col gap-2">
            {musicUrl && !musicBroken && (
              <>
                <audio ref={audio} src={musicUrl} loop preload="none" onError={() => setMusicBroken(true)} />
                <button
                  type="button"
                  onClick={() => {
                    if (!audio.current) return;
                    if (playing) {
                      audio.current.pause();
                      setPlaying(false);
                    } else playMusic();
                  }}
                  className="grid size-11 place-items-center rounded-full bg-black/35 text-white"
                  aria-label={playing ? 'Pause music' : 'Play music'}
                >
                  {playing ? <Pause className="size-5" /> : <Music2 className="size-5" />}
                </button>
              </>
            )}
            {alt && (
              <button
                type="button"
                onClick={() => setUseAlt((v) => !v)}
                className="flex h-11 items-center gap-1.5 rounded-full bg-black/35 px-3 text-sm font-semibold text-white"
                aria-label="Change language"
              >
                <Languages className="size-4" aria-hidden />
                {useAlt ? getLanguage(data.event.language).nativeName : getLanguage(alt.language).nativeName}
              </button>
            )}
          </div>

          {/* Bottom action bar (thumb zone) */}
          {started && (
            <nav
              aria-label="Quick actions"
              className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-md items-center justify-around gap-1 rounded-full bg-[var(--inv-primary)] p-1.5 text-[var(--inv-on-primary)] shadow-[0_12px_30px_-12px_rgb(0_0_0/0.6)]"
            >
              {has('rsvp') && data.features.rsvp && (
                <a href="#rsvp" className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold hover:bg-white/10">
                  <CalendarHeart className="size-4" aria-hidden /> RSVP
                </a>
              )}
              {first && (
                <a
                  href={safeHref(first.mapUrl) ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([first.venueName, first.venueAddress].filter(Boolean).join(', '))}`}
                  target="_blank"
                  rel="noopener"
                  className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold hover:bg-white/10"
                >
                  <MapPin className="size-4" aria-hidden /> {language === 'hi' ? 'स्थान' : 'Venue'}
                </a>
              )}
              <button type="button" onClick={share} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-sm font-semibold hover:bg-white/10">
                <Share2 className="size-4" aria-hidden /> {language === 'hi' ? 'भेजें' : 'Share'}
              </button>
            </nav>
          )}
        </div>
      </SiteProvider>
    </MotionContext.Provider>
  );
}
