'use client';

import { SHOWCASE } from '@cardai/shared';
import { clsx } from 'clsx';
import { EyeOff, KeyRound, Lock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { CardShot, Frame, Kicker, useInView, useOnScreen, useTicker } from './primitives';

/** "Your family, your guest list": privacy points that cycle alongside real card designs. */
export function StudioPrivacy({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();
  const [active, setActive] = useState(0);
  const live = useOnScreen(ref);
  useTicker(() => setActive((n) => (n + 1) % 4), 3000, live);

  const points = [
    { Icon: Lock, t: hi ? 'निजी लिंक' : 'Private links', d: hi ? 'आपका निमंत्रण सिर्फ़ उन्हीं को दिखता है जिन्हें आप लिंक भेजते हैं।' : 'Your invitation is seen only by the people you send the link to.', card: SHOWCASE.nikah },
    { Icon: EyeOff, t: hi ? 'मेहमानों को कोई विज्ञापन नहीं' : 'No ads to your guests', d: hi ? 'मेहमान सिर्फ़ आपका निमंत्रण देखते हैं, और कुछ नहीं।' : 'Guests see your invitation and nothing else.', card: SHOWCASE.garden },
    { Icon: KeyRound, t: hi ? 'OTP से लॉग इन' : 'OTP sign-in', d: hi ? 'कोई पासवर्ड नहीं। ईमेल कोड या Google से लॉग इन।' : 'No passwords. Sign in with an email code or Google.', card: SHOWCASE.romantic },
    { Icon: Trash2, t: hi ? 'कभी भी हटाएँ' : 'Delete any time', d: hi ? 'निमंत्रण और मेहमान सूची जब चाहें मिटा दें।' : 'Remove an invitation and its guest list whenever you like.', card: SHOWCASE.party },
  ];

  return (
    <section id="privacy" ref={ref} className="relative overflow-clip py-24 sm:py-32 lg:py-40">
      <Frame>
        <div className="mb-20">
          <Kicker className={clsx('mb-8 transition-opacity duration-700', on ? 'opacity-100' : 'opacity-0')}>{hi ? 'निजता' : 'Privacy'}</Kicker>
          <h2 className={clsx('display-xl mb-12 transition-[opacity,transform] duration-1000', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
            {hi ? 'आपका परिवार,' : 'Your family,'}
            <br />
            <span className="text-ink-soft">{hi ? 'आपकी मेहमान सूची।' : 'your guest list.'}</span>
          </h2>
          <p className={clsx('max-w-2xl text-xl leading-relaxed text-ink-soft transition-opacity delay-100 duration-1000', on ? 'opacity-100' : 'opacity-0')}>
            {hi
              ? 'फ़ोन नंबर, पते और जवाब आपके हैं। हम उन्हें बेचते नहीं, और मेहमानों को संदेश तभी भेजते हैं जब आप कहें।'
              : 'Phone numbers, addresses and replies belong to you. We don’t sell them, and we message your guests only when you ask us to.'}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className={clsx('relative min-h-[320px] overflow-clip border border-ink/10 p-6 transition-[opacity,transform] duration-700 sm:min-h-[420px] sm:p-8 lg:col-span-7 lg:p-12', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
            <div aria-hidden className="pointer-events-none absolute inset-y-8 right-8 hidden w-[40%] lg:block">
              {points.map((p, k) => (
                <div key={p.card} className="absolute inset-0 flex justify-end transition-opacity duration-500" style={{ opacity: active === k ? 1 : 0 }}>
                  <CardShot id={p.card} className="h-full w-auto border border-ink/10" />
                </div>
              ))}
            </div>
            <div className="relative z-10">
              <span className="font-mono text-sm text-ink-soft">{hi ? 'हमेशा चालू' : 'Always on'}</span>
              <div className="mt-8">
                <span className="font-display text-7xl lg:text-8xl">0</span>
                <span className="mt-2 block max-w-[16rem] text-ink-soft">{hi ? 'विज्ञापन आपके मेहमानों को दिखाए गए' : 'ads ever shown to your guests'}</span>
              </div>
            </div>
            <div className="absolute inset-x-6 bottom-6 flex flex-wrap gap-2 sm:inset-x-8 sm:bottom-8">
              {(hi ? ['निजी लिंक', 'OTP लॉग इन', 'विज्ञापन नहीं', 'कभी भी हटाएँ'] : ['Private links', 'OTP sign-in', 'No ads', 'Delete any time']).map((b, k) => (
                <span
                  key={b}
                  className={clsx('border border-ink/10 bg-ivory px-3 py-1 font-mono text-xs text-ink-soft transition-[opacity,transform] duration-500', on ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')}
                  style={{ transitionDelay: `${k * 100 + 300}ms` }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-5">
            {points.map((p, k) => (
              <button
                type="button"
                key={p.t}
                className={clsx(
                  'border p-5 text-left transition-[opacity,transform,border-color,background-color] duration-500 sm:p-6',
                  active === k ? 'border-ink/30 bg-ink/[0.04]' : 'border-ink/10',
                  on ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0',
                )}
                style={{ transitionDelay: `${k * 80}ms` }}
                onClick={() => setActive(k)}
                onPointerEnter={() => setActive(k)}
              >
                <div className="flex items-start gap-4">
                  <div className={clsx('flex size-10 shrink-0 items-center justify-center border transition-colors', active === k ? 'border-ink bg-ink text-ivory' : 'border-ink/20')}>
                    <p.Icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-medium">{p.t}</h3>
                    <p className="text-sm text-ink-soft">{p.d}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </Frame>
    </section>
  );
}
