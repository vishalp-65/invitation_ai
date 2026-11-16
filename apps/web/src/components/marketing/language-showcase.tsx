'use client';

import { LANGUAGES, RTL_LANGUAGES, type LanguageCode } from '@cardai/shared';
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';

/** "You are cordially invited", as it would be written on a card in each language. */
const GREETING: Record<LanguageCode, string> = {
  en: 'You are cordially invited',
  hi: 'आप सादर आमंत्रित हैं',
  mr: 'आपणास सस्नेह निमंत्रण',
  gu: 'આપને સાદર આમંત્રણ',
  ta: 'தங்களை அன்புடன் அழைக்கிறோம்',
  te: 'మీకు సాదర ఆహ్వానం',
  kn: 'ನಿಮಗೆ ಆತ್ಮೀಯ ಆಹ್ವಾನ',
  ml: 'നിങ്ങളെ സ്നേഹപൂർവ്വം ക്ഷണിക്കുന്നു',
  bn: 'আপনাকে সাদর আমন্ত্রণ',
  pa: 'ਤੁਹਾਨੂੰ ਸਾਦਰ ਸੱਦਾ',
  or: 'ଆପଣଙ୍କୁ ସାଦର ନିମନ୍ତ୍ରଣ',
  ur: 'آپ کو دلی دعوت ہے',
};

/**
 * Language picker with a live line of card wording. Cycles through the languages while it is on
 * screen; the first hover, focus or tap hands control to the visitor and stops the cycle.
 */
export function LanguageShowcase() {
  const [active, setActive] = useState<LanguageCode>('hi');
  const [touched, setTouched] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (touched || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = ref.current;
    if (!el) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(([e]) => {
      clearInterval(timer);
      if (e?.isIntersecting)
        timer = setInterval(() => {
          setActive((cur) => {
            const i = LANGUAGES.findIndex((l) => l.code === cur);
            return LANGUAGES[(i + 1) % LANGUAGES.length]!.code;
          });
        }, 2200);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, [touched]);

  const pick = (code: LanguageCode) => {
    setTouched(true);
    setActive(code);
  };
  const lang = LANGUAGES.find((l) => l.code === active)!;

  return (
    <div ref={ref} className="flex flex-col gap-4">
      {/* The line of wording, set large the way it sits on a card. */}
      <div className="relative flex min-h-[9.5rem] flex-col justify-between overflow-hidden rounded-[var(--radius-card)] bg-plum p-6 text-white sm:min-h-[11rem] sm:p-8 dark:bg-plum-deep" aria-live="polite">
        <span className="text-xs font-medium text-white/55">{lang.name}</span>
        <p
          key={active}
          lang={active}
          dir={RTL_LANGUAGES.has(active) ? 'rtl' : 'ltr'}
          className="animate-[fade-up_0.5s_var(--ease-out-quint)_both] text-[1.6rem] font-medium leading-snug text-gold-soft sm:text-[2.1rem]"
        >
          {GREETING[active]}
        </p>
      </div>
      <ul className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" role="listbox" aria-label="Languages">
        {LANGUAGES.map((l) => {
          const on = l.code === active;
          return (
            <li key={l.code}>
              <button
                type="button"
                role="option"
                aria-selected={on}
                onPointerEnter={(e) => e.pointerType === 'mouse' && pick(l.code)}
                onFocus={() => pick(l.code)}
                onClick={() => pick(l.code)}
                className={clsx(
                  'flex w-full flex-col items-start gap-0.5 rounded-lg border px-3.5 py-2.5 text-left transition-colors duration-200',
                  on ? 'border-primary bg-tint' : 'border-hairline bg-surface hover:border-ink/25',
                )}
              >
                <span lang={l.code} className="text-[1.05rem] font-medium leading-snug">
                  {l.nativeName}
                </span>
                <span className="text-xs text-ink-soft">{l.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
