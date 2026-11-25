'use client';

import type { SiteDoc } from '@cardai/shared';
import { daysUntil, KitImg, mapHref, useKit, useLayoutData, useSeen } from './common';

/**
 * Level Up: an 8-bit game. Title screen with Player 1 and Player 2 (their photos in pixel
 * frames), a HUD (hi-score = days to go), a level map where each function is a level (the
 * last one is the "final level"), and a CONTINUE? screen that leads to the RSVP.
 */
export function ArcadeLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const k = useKit(doc, 'arcade');
  const { t, fmt, fns, names, first, content: c } = L;
  const days = daysUntil(first?.startsAt);
  const [mapRef, mapSeen] = useSeen<HTMLOListElement>();
  const players = names.length > 1 ? [0, 1] : [0];

  return (
    <section className="inv-ar relative overflow-hidden bg-[#0A0820] text-[#F2F2FF]" aria-label={L.title}>
      <div aria-hidden className="inv-ar-stars pointer-events-none absolute inset-0" />

      {/* HUD */}
      <div className="inv-pixel relative z-[1] flex justify-between px-4 pt-4 text-[0.6rem] leading-relaxed">
        <span>
          {t('HI-SCORE', 'हाई-स्कोर')}
          <br />
          <b className="text-[#FFD84A]">{String(days).padStart(5, '0')}</b>
        </span>
        <span className="text-right">
          {t('LIVES', 'जीवन')}
          <br />
          <b className="text-[#E8336D]">♥♥♥</b>
        </span>
      </div>

      {/* Title screen */}
      <header className="relative z-[1] flex min-h-[88svh] flex-col items-center justify-center px-5 pb-24 text-center">
        <div className="flex items-center gap-5">
          {players.map((i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="inv-pixel text-[0.55rem] text-[#7CF9FF]">{k.text(i === 0 ? 'ar.p1' : 'ar.p2')}</span>
              <div className="inv-ar-frame size-28 overflow-hidden">
                <KitImg photo={k.photo(i === 0 ? 'p1' : 'p2')} eager className="inv-ar-sprite size-full" fallback={<span className="grid size-full place-items-center bg-[#151238] text-3xl">{[...(names[i] ?? '?')][0]}</span>} />
              </div>
            </div>
          ))}
        </div>
        <h1 className="inv-pixel mt-8 text-[clamp(1.1rem,6vw,2rem)] leading-[1.5] text-[#FFD84A] [text-shadow:4px_4px_0_#E8336D]">{L.title}</h1>
        <p className="mt-3 text-sm opacity-80">{c.hostLine || L.occasion}</p>
        <a href="#levels" className="inv-pixel inv-ar-blink mt-10 text-sm">
          ▶ {k.text('ar.start')}
        </a>
      </header>

      {/* Level map */}
      <div id="levels" className="relative z-[1] mx-auto max-w-md px-5 pb-10">
        <h2 className="inv-pixel text-center text-sm text-[#7CF9FF]">{k.text('ar.levels')}</h2>
        <ol ref={mapRef} className="relative mt-8 flex flex-col gap-10">
          <span aria-hidden className="inv-ar-path absolute bottom-6 left-1/2 top-6 w-1 -translate-x-1/2" />
          {fns.map((f, i) => {
            const boss = i === fns.length - 1 && fns.length > 1;
            return (
              <li key={f.id} className={`relative flex ${i % 2 ? 'justify-end' : 'justify-start'} ${mapSeen ? 'inv-ar-pop' : 'opacity-0'}`} style={{ animationDelay: `${i * 140}ms` }}>
                <span aria-hidden className={`inv-ar-node absolute left-1/2 top-4 grid size-9 -translate-x-1/2 place-items-center text-xs ${boss ? 'bg-[#E8336D]' : 'bg-[#FFD84A] text-black'}`}>
                  {boss ? '★' : i + 1}
                </span>
                <a href={mapHref(f)} target="_blank" rel="noopener" className="inv-ar-card w-[44%] p-3">
                  <span className="inv-pixel block text-[0.55rem] text-[#7CF9FF]">{boss ? k.text('ar.boss') : `${t('LEVEL', 'लेवल')} ${i + 1}`}</span>
                  <span className="mt-1.5 block font-bold">{f.name}</span>
                  <span className="block text-xs opacity-75">{fmt.short.format(new Date(f.startsAt))} · {fmt.time.format(new Date(f.startsAt))}</span>
                  <span className="block truncate text-xs opacity-75">{f.venueName}</span>
                </a>
              </li>
            );
          })}
        </ol>

        {/* Continue? */}
        <div className="inv-ar-card mt-14 p-5 text-center">
          <p className="inv-pixel text-sm text-[#FFD84A]">{t('CONTINUE?', 'जारी रखें?')}</p>
          <p className="mt-3 text-[0.95rem]">{k.text('ar.win')}</p>
          <div className="mt-4 flex justify-center gap-3">
            <a href="#rsvp" className="inv-pixel bg-[#E8336D] px-4 py-3 text-[0.65rem] text-white">
              {t('YES', 'हाँ')}
            </a>
            <a href="#rsvp" className="inv-pixel border-2 border-white/60 px-4 py-3 text-[0.65rem]">
              {t('NO', 'नहीं')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
