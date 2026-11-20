'use client';

import { clsx } from 'clsx';
import { CardShot, Frame, Kicker, ParticleField, rise, useInView } from './primitives';

/** "What you get": one big card-design panel, then video / website / RSVP tiles. */
export function StudioFeatures({ hi }: { hi: boolean }) {
  const [ref, on] = useInView<HTMLElement>();
  const tiles = hi
    ? [
        { n: '02', t: 'वीडियो निमंत्रण', d: 'संगीत और हल्की हलचल वाला 9:16 वीडियो, 16 MB से कम ताकि WhatsApp पर धुंधला न हो।', v: '<16 MB', l: 'हर वीडियो' },
        { n: '03', t: 'निमंत्रण वेबसाइट', d: 'हर समारोह, नक्शा, गैलरी और संगीत के साथ आपकी अपनी छोटी लिंक।', v: '1 लिंक', l: 'पूरा कार्यक्रम' },
        { n: '04', t: 'हर समारोह का RSVP', d: 'मेहमान हल्दी, संगीत, शादी अलग-अलग चुनें। गिनती सीधे आपकी सूची में।', v: 'लाइव', l: 'मेहमान सूची' },
      ]
    : [
        { n: '02', t: 'Video invite', d: 'A 9:16 video with music and gentle motion, always under 16 MB so WhatsApp never blurs it.', v: '<16 MB', l: 'every video' },
        { n: '03', t: 'Invitation website', d: 'Every function, a map, gallery and music on your own short link.', v: '1 link', l: 'for the whole event' },
        { n: '04', t: 'RSVP per function', d: 'Guests pick Haldi, Sangeet and Wedding separately. Headcounts land in your list.', v: 'Live', l: 'guest list' },
      ];

  return (
    <section id="features" ref={ref} className="relative overflow-clip py-20 sm:py-24 lg:py-32">
      <Frame>
        <div className="mb-20 grid items-end gap-8 lg:mb-28 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Kicker className="mb-6">{hi ? 'आपको क्या मिलेगा' : 'What you get'}</Kicker>
            <h2 className={clsx('display-xl', rise(on))}>
              {hi ? 'एक फ़ॉर्म।' : 'One form.'}
              <br />
              <span className="text-ink-soft">{hi ? 'तीन निमंत्रण।' : 'Three invites.'}</span>
            </h2>
          </div>
          <p className={clsx('text-xl leading-relaxed text-ink-soft lg:col-span-5 lg:pb-4', rise(on, 'sm'), 'delay-200')}>
            {hi
              ? 'नाम, तारीख़ और जगह एक बार भरिए। कार्ड, वीडियो और वेबसाइट एक साथ तैयार होते हैं, हर एक आपकी भाषा और परंपरा में।'
              : 'Fill in names, dates and venues once. The card, the video and the website are made together, each in your language and tradition.'}
          </p>
        </div>

        {/* Big panel: always the dark "studio" surface so the card renders glow in both themes */}
        <div className={clsx('group relative flex flex-col overflow-clip border border-ink/10 bg-black text-white [color-scheme:dark] lg:min-h-[520px] lg:flex-row', rise(on, 'lg'))}>
          <div className="relative flex-1 p-6 text-white sm:p-8 lg:p-12">
            <ParticleField className="text-white" />
            <div className="relative z-10">
              <span className="font-mono text-sm text-white/50">01</span>
              <h3 className="mt-4 mb-6 font-display text-4xl font-normal transition-transform duration-500 group-hover:translate-x-2 lg:text-5xl">
                {hi ? 'छपाई जैसा कार्ड' : 'A print-quality card'}
              </h3>
              <p className="mb-10 max-w-md text-lg leading-relaxed text-white/60">
                {hi
                  ? '43 डिज़ाइन परिवार, कई रंगों में। देवनागरी, तमिल, बांग्ला, हर लिपि सही जुड़ाक्षरों के साथ। HD PNG और 5×7 इंच प्रिंट PDF।'
                  : '43 design families in many colourways. Devanagari, Tamil, Bengali, every script shaped correctly. HD PNG and a 5×7 inch print PDF.'}
              </p>
              <span className="font-display text-6xl lg:text-7xl">140+</span>
              <span className="mt-2 block font-mono text-sm text-white/50">{hi ? 'डिज़ाइन' : 'designs'}</span>
            </div>
          </div>
          {/* Phones / tablets: the same designs as a short fanned row under the text */}
          <div aria-hidden className="relative flex h-64 items-end justify-center overflow-clip px-6 sm:h-80 lg:hidden">
            {[
              ['genda-jharokha-emerald', '-rotate-[8deg] translate-x-[38%] translate-y-6'],
              ['rajwada-gold-maroon', 'z-10'],
              ['golden-vows-onyx', 'rotate-[8deg] -translate-x-[38%] translate-y-6'],
            ].map(([id, pos]) => (
              <CardShot key={id} id={id!} alt={DESIGN_ALT[id!]} sizes="40vw" className={clsx('-mb-16 w-[36%] max-w-[190px] border border-white/10', pos)} />
            ))}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black to-transparent" />
          </div>
          {/* Fan of real designs (desktop: right column) */}
          <div className="parallax relative hidden w-[46%] shrink-0 lg:block">
            <div className="absolute inset-0 flex items-center justify-center">
              {[
                ['genda-jharokha-emerald', '-rotate-[10deg] -translate-x-36 translate-y-6'],
                ['rajwada-gold-maroon', 'z-10 -translate-y-2'],
                ['golden-vows-onyx', 'rotate-[10deg] translate-x-36 translate-y-6'],
              ].map(([id, pos]) => (
                <CardShot
                  key={id}
                  id={id!}
                  alt={DESIGN_ALT[id!]}
                  sizes="230px"
                  className={clsx('absolute w-[42%] max-w-[230px] border border-white/10 transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]', pos)}
                />
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent" />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3 lg:mt-6 lg:gap-6">
          {tiles.map((f, k) => (
            <div
              key={f.n}
              className={clsx('group flex flex-col justify-between gap-8 border border-ink/10 bg-ink/[0.02] p-6 hover:border-ink/30 sm:p-8', rise(on, 'lg'), 'transition-[opacity,transform,border-color]')}
              style={{ transitionDelay: `${(k + 1) * 100}ms` }}
            >
              <div>
                <span className="font-mono text-sm text-ink-soft">{f.n}</span>
                <h3 className="mt-4 mb-4 font-display text-3xl font-normal transition-transform duration-500 group-hover:translate-x-1">{f.t}</h3>
                <p className="leading-relaxed text-ink-soft">{f.d}</p>
              </div>
              <div>
                <span className="font-display text-5xl">{f.v}</span>
                <span className="mt-2 block font-mono text-sm text-ink-soft">{f.l}</span>
              </div>
            </div>
          ))}
        </div>
      </Frame>
    </section>
  );
}

/** Alt text for the real design renders shown in the feature fan. */
const DESIGN_ALT: Record<string, string> = {
  'genda-jharokha-emerald': 'Wedding invitation card with marigold jharokha arch on emerald',
  'rajwada-gold-maroon': 'Royal Rajwada wedding invitation card in gold and maroon',
  'golden-vows-onyx': 'Golden Vows wedding invitation card on black',
};
