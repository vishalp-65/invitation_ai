'use client';

import { clsx } from 'clsx';
import { ArtImage, Frame, Kicker, useInView } from './primitives';

/** "Say it. Or type it." — AI wording and the WhatsApp bot, text over art anchored bottom-right. */
export function StudioVoice({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();
  const points = hi
    ? [
        ['वॉइस नोट से', 'किसी भी भाषा में बोलिए, AI निमंत्रण के शब्द लिख देगा।'],
        ['सही लिपि', 'नाम अंग्रेज़ी में टाइप करें, हिन्दी, मराठी या तमिल में बदल जाएँगे।'],
        ['परंपरा के शब्द', 'हर अवसर के लिए पहले से लिखे, आदरपूर्ण शब्द।'],
        ['WhatsApp पर भी', '"Hi" भेजिए, कार्ड उसी चैट में आ जाएगा।'],
      ]
    : [
        ['From a voice note', 'Speak in any language and AI writes the invitation wording.'],
        ['Right script', 'Type names in English; they convert to Hindi, Marathi or Tamil.'],
        ['Traditional wording', 'Respectful, ready-written lines for every occasion.'],
        ['On WhatsApp too', 'Send “Hi” and your card arrives in the same chat.'],
      ];

  return (
    <section id="voice" ref={ref} className="relative overflow-clip py-20 sm:py-24 lg:py-32">
      <div className={clsx('pointer-events-none absolute bottom-0 right-0 h-[85%] w-full transition-opacity delay-300 duration-1000 lg:w-[55%]', on ? 'opacity-100' : 'opacity-0')}>
        <ArtImage name="voice-garden" className="parallax-slow absolute inset-0" imgClassName="object-cover object-left-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-ivory via-ivory/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-ivory via-transparent to-transparent" />
      </div>

      <Frame className="z-10">
        <div className={clsx('mb-16 transition-[opacity,transform] duration-700', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
          <Kicker className="mb-6">{hi ? 'AI शब्द' : 'AI wording'}</Kicker>
          <h2 className="display-xl">
            {hi ? 'बोलिए।' : 'Say it.'}
            <br />
            <span className="text-ink-soft">{hi ? 'या लिखिए।' : 'Or type it.'}</span>
          </h2>
        </div>
        <div className={clsx('transition-[opacity,transform] delay-100 duration-700 lg:max-w-[50%]', on ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0')}>
          <p className="mb-12 max-w-md text-xl leading-relaxed text-ink-soft">
            {hi
              ? 'शब्द ढूँढने में समय नहीं लगेगा। बताइए किसकी शादी है, कब और कहाँ, बाकी हम लिख देंगे।'
              : 'No more hunting for the right words. Say whose function it is, when and where, and the rest is written for you.'}
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {points.map(([t, d], k) => (
              <div key={t} className={clsx('transition-[opacity,transform] duration-500', on ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0')} style={{ transitionDelay: `${k * 50 + 200}ms` }}>
                <h3 className="mb-1 font-medium">{t}</h3>
                <p className="text-sm text-ink-soft">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </Frame>
    </section>
  );
}
