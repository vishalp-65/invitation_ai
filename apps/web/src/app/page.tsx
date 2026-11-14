import { EVENT_TYPES, formatINR, LANGUAGES, PRODUCTS } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowRight, Check, MessageCircle, Minus, Plus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { Reveal, Words } from '@/components/fx/reveal';
import { FamilyShowcase } from '@/components/marketing/family-showcase';
import { HeroShowcase } from '@/components/marketing/hero-showcase';
import { MobileDock } from '@/components/marketing/mobile-dock';
import { OutputsBento } from '@/components/marketing/outputs-bento';
import { ButtonLink } from '@/components/ui/button';

const WHATSAPP_BOT = 'https://wa.me/910000000000?text=Hi';

const MARQUEE = [
  'varmala-maroon', 'golden-vows-onyx', 'genda-jharokha-royal-blue', 'kalyanam-temple', 'dulha-dulhan-marigold', 'qubool-emerald',
  'shubho-bibaho-maroon', 'forever-blush', 'ganesh-vandana-ivory', 'balle-balle-mustard', 'shubh-mangal-jade', 'deepotsav-navy',
];

export default async function HomePage() {
  const t = await getTranslations();
  const hi = (await getLocale()) === 'hi';

  return (
    <div className="bg-ivory">
      <SiteHeader />

      {/* ================= HERO ================= */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pb-24">
        <div className="max-w-xl">
          <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-hairline bg-surface px-3 py-1 text-sm font-medium text-ink-soft">
            <span className="size-1.5 rounded-full bg-sindoor" aria-hidden />
            {t('hero.kicker')}
          </p>
          <h1 className="mt-6 text-[2.7rem] leading-[1.04] sm:text-6xl lg:text-[4.2rem]">
            <Words text={t('hero.title')} />
          </h1>
          <p className="mt-6 max-w-[34rem] animate-fade-up text-lg leading-relaxed text-ink-soft [animation-delay:450ms]">{t('hero.body')}</p>
          <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:550ms] sm:flex-row">
            <ButtonLink href="/create" variant="solid" size="lg" className="group">
              {t('hero.cta')}
              <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
            </ButtonLink>
            <ButtonLink href={WHATSAPP_BOT} variant="line" size="lg" target="_blank" rel="noopener">
              <MessageCircle className="size-5 text-leaf" aria-hidden />
              {t('hero.whatsapp')}
            </ButtonLink>
          </div>
          <ul className="mt-8 flex animate-fade-up flex-wrap gap-x-6 gap-y-2 text-[0.95rem] text-ink-soft [animation-delay:650ms]">
            {(hi
              ? ['बनाना मुफ़्त', `HD ${formatINR(PRODUCTS.card.pricePaise)} से`, '2 मिनट में तैयार']
              : ['Free to make', `HD from ${formatINR(PRODUCTS.card.pricePaise)}`, 'Ready in 2 minutes']
            ).map((x) => (
              <li key={x} className="flex items-center gap-1.5">
                <Check className="size-4 text-leaf" strokeWidth={2.5} aria-hidden />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <HeroShowcase />
      </section>

      {/* ================= STATS ================= */}
      <section className="border-y border-hairline bg-surface">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 md:grid-cols-4">
          {[
            ['140+', hi ? 'डिज़ाइन' : 'Designs'],
            ['12', hi ? 'भारतीय भाषाएँ' : 'Indian languages'],
            ['3', hi ? 'कार्ड, वीडियो, वेबसाइट' : 'Formats from one form'],
            ['<16 MB', hi ? 'WhatsApp-तैयार वीडियो' : 'WhatsApp-ready video'],
          ].map(([v, l], i) => (
            <Reveal
              key={l}
              delay={i}
              className={clsx(
                'flex flex-col gap-1 px-5 py-7 sm:py-9 md:px-8',
                i % 2 === 1 && 'border-l border-hairline',
                i === 2 && 'md:border-l md:border-hairline',
                i < 2 && 'max-md:border-b max-md:border-hairline',
              )}
            >
              <dt className="order-2 text-sm text-ink-soft">{l}</dt>
              <dd className="font-display text-3xl sm:text-4xl">{v}</dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ================= TEMPLATE STRIP ================= */}
      <div className="edge-fade overflow-hidden py-12" aria-label="Example designs">
        <div className="flex w-max gap-4 px-5 motion-safe:animate-marquee hover:[animation-play-state:paused] max-sm:w-full max-sm:animate-none max-sm:snap-x max-sm:overflow-x-auto max-sm:[scrollbar-width:none]">
          {[...MARQUEE, ...MARQUEE].map((id, i) => (
            <Image
              key={`${id}-${i}`}
              src={`/showcase/${id}.jpg`}
              alt=""
              width={432}
              height={768}
              sizes="150px"
              loading="lazy"
              className="aspect-[9/16] w-[38vw] max-w-[150px] shrink-0 snap-start rounded-xl border border-hairline bg-sand object-cover sm:w-[150px]"
            />
          ))}
        </div>
      </div>

      <main>
        {/* ================= OUTPUTS ================= */}
        <OutputsBento
          eyebrow={hi ? 'एक फ़ॉर्म' : 'What you get'}
          title={t('outputs.title')}
          card={{ title: t('outputs.card'), body: t('outputs.cardBody') }}
          video={{ title: t('outputs.video'), body: t('outputs.videoBody') }}
          site={{ title: t('outputs.site'), body: t('outputs.siteBody') }}
        />

        {/* ================= DESIGN FAMILIES ================= */}
        <section className="border-y border-hairline bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Reveal as="p" className="eyebrow">
                  {hi ? 'डिज़ाइन' : 'Designs'}
                </Reveal>
                <Reveal as="h2" className="mt-4 max-w-xl text-4xl sm:text-5xl">
                  {hi ? 'हर परंपरा के लिए डिज़ाइन' : 'Designs for every tradition'}
                </Reveal>
                <p className="mt-3 max-w-xl text-lg text-ink-soft">
                  {hi
                    ? '43 डिज़ाइन परिवार, हर एक कई रंगों में। रंग बदलने के लिए गोले पर टैप करें।'
                    : '43 design families, each in several colourways. Tap a swatch to change the colour.'}
                </p>
              </div>
              <TextLink href="/templates">{hi ? 'सभी 140 डिज़ाइन देखें' : 'See all 140 designs'}</TextLink>
            </div>
            <Reveal className="mt-10">
              <FamilyShowcase />
            </Reveal>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal as="p" className="eyebrow">
            {hi ? 'कैसे काम करता है' : 'How it works'}
          </Reveal>
          <Reveal as="h2" className="mt-4 max-w-2xl text-4xl sm:text-5xl">
            {t('how.title')}
          </Reveal>
          <ol className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            <span className="absolute left-5 right-5 top-5 hidden h-px bg-hairline md:block" aria-hidden />
            {(['s1', 's2', 's3'] as const).map((k, i) => (
              <Reveal as="li" key={k} delay={i} className="relative">
                <span className="relative grid size-10 place-items-center rounded-full border border-hairline bg-surface font-semibold text-ink shadow-sm">
                  {i + 1}
                </span>
                <h3 className="mt-6 text-2xl">{t(`how.${k}`)}</h3>
                <p className="mt-2 max-w-sm text-ink-soft">{t(`how.${k}b`)}</p>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ================= LANGUAGES ================= */}
        <section className="bg-primary text-on-primary">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <Reveal as="p" className="eyebrow !text-marigold">
                {hi ? 'भाषाएँ' : 'Languages'}
              </Reveal>
              <Reveal as="h2" className="mt-4 text-4xl sm:text-5xl">
                {t('languages.title')}
              </Reveal>
              <p className="mt-5 max-w-md text-white/70">
                {hi
                  ? 'हर लिपि सही जुड़ाक्षरों के साथ — "श्री" और "प्रिया" वैसे ही दिखते हैं जैसे छपे कार्ड में।'
                  : 'Every script shaped correctly. Conjuncts like “श्री” and “ப்ரியா” look exactly like a printed card.'}
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-surface/10 sm:grid-cols-3">
              {LANGUAGES.map((l) => (
                <li key={l.code} className="flex flex-col gap-0.5 bg-primary px-5 py-4 transition-colors duration-200 hover:bg-[#262b62]">
                  <span lang={l.code} className="font-display text-2xl leading-tight">
                    {l.nativeName}
                  </span>
                  <span className="text-xs uppercase tracking-wider text-white/50">{l.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ================= OCCASIONS ================= */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <Reveal as="p" className="eyebrow">
            {hi ? 'अवसर' : 'Occasions'}
          </Reveal>
          <Reveal as="h2" className="mt-4 text-4xl sm:text-5xl">
            {hi ? 'हर अवसर के लिए' : 'For every occasion'}
          </Reveal>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {EVENT_TYPES.filter((e) => e.id !== 'other').map((e) => (
              <li key={e.id}>
                <Link
                  href={`/create?type=${e.id}`}
                  className="panel lift group flex h-full min-h-16 items-center gap-3 rounded-2xl px-4 py-3 font-medium"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sand text-lg" aria-hidden>
                    {e.emoji}
                  </span>
                  <span className="leading-tight">{hi ? e.labelHi : e.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ================= COMPARISON ================= */}
        <section className="border-y border-hairline bg-surface">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
            <Reveal as="p" className="eyebrow">
              {hi ? 'तुलना' : 'Compare'}
            </Reveal>
            <Reveal as="h2" className="mt-4 max-w-2xl text-4xl sm:text-5xl">
              {hi ? 'इंतज़ार नहीं, समझौता नहीं' : 'No waiting. No compromises.'}
            </Reveal>
            <Reveal className="mt-10 overflow-x-auto rounded-[var(--radius-card)] border border-hairline">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-hairline bg-ivory text-[0.95rem]">
                    <th className="p-4 font-semibold sm:p-5">
                      <span className="sr-only">Feature</span>
                    </th>
                    <th className="bg-primary p-4 font-semibold text-on-primary sm:p-5">CardAI</th>
                    <th className="p-4 font-semibold text-ink-soft sm:p-5">{hi ? 'फ़्रीलांस डिज़ाइनर' : 'Freelance designer'}</th>
                    <th className="p-4 font-semibold text-ink-soft sm:p-5">{hi ? 'सामान्य डिज़ाइन ऐप' : 'Generic design apps'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {COMPARE.map(([label, us, a, b]) => (
                    <tr key={label}>
                      <th scope="row" className="p-4 font-medium sm:p-5">
                        {label}
                      </th>
                      <td className="bg-ink/[0.03] p-4 font-semibold sm:p-5">
                        <Cell v={us} />
                      </td>
                      <td className="p-4 text-ink-soft sm:p-5">
                        <Cell v={a} />
                      </td>
                      <td className="p-4 text-ink-soft sm:p-5">
                        <Cell v={b} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Reveal>
          </div>
        </section>

        {/* ================= PRICING ================= */}
        <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Reveal as="p" className="eyebrow">
                {hi ? 'कीमत' : 'Pricing'}
              </Reveal>
              <Reveal as="h2" className="mt-4 max-w-xl text-4xl sm:text-5xl">
                {hi ? 'बनाना मुफ़्त। HD के लिए छोटी-सी कीमत।' : 'Free to make. A small price for HD.'}
              </Reveal>
            </div>
            <TextLink href="/pricing">{hi ? 'सभी प्लान देखें' : 'See all plans'}</TextLink>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(['card', 'video', 'website', 'combo'] as const).map((code, i) => {
              const p = PRODUCTS[code];
              return (
                <Reveal
                  key={code}
                  delay={i}
                  className={`lift flex flex-col rounded-[var(--radius-card)] p-6 ${p.highlight ? 'bg-primary text-on-primary shadow-lift' : 'panel'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-2xl">{p.name}</h3>
                    {p.highlight && <span className="shrink-0 whitespace-nowrap rounded-full bg-marigold px-2.5 py-0.5 text-xs font-semibold text-night">Most chosen</span>}
                  </div>
                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="font-display text-4xl">{formatINR(p.pricePaise)}</span>
                    {p.mrpPaise && <s className="opacity-50">{formatINR(p.mrpPaise)}</s>}
                  </p>
                  <p className={`mt-3 text-[0.95rem] ${p.highlight ? 'text-white/75' : 'text-ink-soft'}`}>{p.description}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ================= FAQ (no JS) ================= */}
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-20 sm:pb-28 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <Reveal as="p" className="eyebrow">
              FAQ
            </Reveal>
            <Reveal as="h2" className="mt-4 text-4xl sm:text-5xl">
              {hi ? 'अक्सर पूछे जाने वाले सवाल' : 'Questions, answered'}
            </Reveal>
          </div>
          <div className="divide-y divide-hairline border-y border-hairline">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="grid size-8 shrink-0 place-items-center rounded-full border border-hairline transition-transform duration-300 group-open:rotate-45">
                    <Plus className="size-4" aria-hidden />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="px-3 pb-16 sm:px-5">
          <Reveal className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[28px] bg-primary px-6 py-12 text-on-primary sm:px-12 sm:py-16 md:flex-row md:items-center">
            <div className="flex-1">
              <h2 className="text-3xl sm:text-4xl">{hi ? 'वेबसाइट नहीं चाहिए? WhatsApp पर "Hi" भेजिए।' : 'Prefer WhatsApp? Just send “Hi”.'}</h2>
              <p className="mt-3 max-w-xl text-white/70">
                {hi
                  ? 'बोलकर या लिखकर बताइए — कार्ड सीधे आपकी चैट में आ जाएगा।'
                  : 'Describe your function in a voice note or text, in any language. Your card arrives in the same chat.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={WHATSAPP_BOT} target="_blank" rel="noopener" className="bg-leaf text-white hover:bg-[#276b43]" size="lg">
                <MessageCircle className="size-5" aria-hidden />
                {hi ? 'WhatsApp खोलें' : 'Open WhatsApp'}
              </ButtonLink>
              <ButtonLink href="/create" variant="line" size="lg" className="border-white">
                {t('hero.cta')}
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      </main>
      <MobileDock label={t('hero.cta')} whatsappHref={WHATSAPP_BOT} />
      <SiteFooter />
    </div>
  );
}

function TextLink({ href, children }: { href: string; children: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 font-semibold text-ink">
      <span className="border-b border-ink/30 transition-colors group-hover:border-ink">{children}</span>
      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

type CellValue = string | boolean;
function Cell({ v }: { v: CellValue }) {
  if (v === true) return <Check className="size-5 text-leaf" aria-label="Yes" />;
  if (v === false) return <Minus className="size-5 text-ink-soft/50" aria-label="No" />;
  return <>{v}</>;
}

const COMPARE: Array<[string, CellValue, CellValue, CellValue]> = [
  ['Time to first invite', '2 minutes', '1–5 days', '30–60 minutes'],
  ['Starting price', formatINR(PRODUCTS.card.pricePaise), '₹500 – ₹7,000', 'Subscription'],
  ['Card + video + website together', true, false, false],
  ['Correct Indian scripts, 12 languages', true, 'Depends', 'Limited'],
  ['RSVP for each function', true, false, false],
  ['Video always WhatsApp-sized', true, 'Varies', false],
  ['Unlimited edits until the event', true, 'Paid revisions', true],
];

const FAQ: Array<[string, string]> = [
  ['Is it really free to try?', 'Yes. Make your invitation, preview every design and share a watermarked card and website for free. Pay only for HD files, the video or RSVP.'],
  ['Can I write in Hindi, Marathi or Tamil?', 'Yes — 12 Indian languages with correct script. Type in English and convert names to your script, or speak and let AI write the wording.'],
  ['Will the video play properly on WhatsApp?', 'Every video is encoded to stay under 16 MB, so WhatsApp forwards it without blurring.'],
  ['Can guests reply for each function separately?', 'Yes. Guests choose Haldi, Sangeet, Wedding and so on individually, with headcount and meal preference. You get a live list for the caterer.'],
  ['Can I print the same design?', 'Yes. Get a print-ready 5×7 inch PDF with bleed and crop marks, or order printed cards from a partner press.'],
];
