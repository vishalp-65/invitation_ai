import { BRAND, EVENT_TYPES, formatINR, type Product, type ProductCode } from '@cardai/shared';
import { clsx } from 'clsx';
import { Check, Minus, Plus } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { Reveal, Words } from '@/components/fx/reveal';
import { FamilyShowcase } from '@/components/marketing/family-showcase';
import { CountUp } from '@/components/marketing/count-up';
import { HeroStudio } from '@/components/marketing/hero-studio';
import { HowItWorks } from '@/components/marketing/how-it-works';
import { LanguageShowcase } from '@/components/marketing/language-showcase';
import { MobileDock } from '@/components/marketing/mobile-dock';
import { OutputsBento } from '@/components/marketing/outputs-bento';
import { ButtonLink } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { loadOffers } from '@/lib/offers-server';

const WHATSAPP_BOT = 'https://wa.me/910000000000?text=Hi';
const QUICK_START = ['wedding', 'griha-pravesh', 'birthday', 'engagement', 'puja', 'naming-ceremony'] as const;

export default async function HomePage() {
  const t = await getTranslations();
  const hi = (await getLocale()) === 'hi';
  const { products: PRODUCTS } = await loadOffers();
  const COMPARE = compareRows(PRODUCTS);

  return (
    <div className="bg-ivory">
      <SiteHeader />

      {/* ================= HERO =================
       * Left: what it is and where to start. Right: the whole story in one picture
       * (card, shared in a family WhatsApp group, replies counted). */}
      <section className="relative overflow-x-clip">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-10 sm:px-6 sm:pt-14 lg:grid-cols-[1fr_1.08fr] lg:gap-12 lg:pb-28 lg:pt-16">
          <div className="max-w-xl">
            <p className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-hairline bg-surface py-1 pl-1 pr-3 text-[0.8125rem] text-ink-soft">
              <span className="rounded-full bg-tint px-2 py-0.5 font-semibold text-primary">{hi ? 'नया' : 'New'}</span>
              {t('hero.kicker')}
            </p>
            <h1 className="mt-5 text-[2.75rem] leading-[1.02] sm:text-[3.75rem] lg:text-[4.25rem]">
              <Words text={t('hero.title')} />
            </h1>
            <p className="mt-5 max-w-[34rem] animate-fade-up text-lg leading-relaxed text-ink-soft [animation-delay:380ms]">{t('hero.body')}</p>
            <div className="mt-8 flex animate-fade-up flex-col gap-3 [animation-delay:460ms] sm:flex-row">
              <ButtonLink href="/create" variant="solid" size="lg">
                {t('hero.cta')}
              </ButtonLink>
              <ButtonLink href={WHATSAPP_BOT} variant="line" size="lg" target="_blank" rel="noopener">
                <WhatsAppIcon className="size-[18px] text-[#1fa855]" />
                {t('hero.whatsapp')}
              </ButtonLink>
            </div>
            <div className="mt-8 animate-fade-up [animation-delay:540ms]">
              <p className="text-sm text-ink-soft">{hi ? 'या सीधे अवसर चुनें' : 'Or start with your occasion'}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {QUICK_START.map((id) => {
                  const e = EVENT_TYPES.find((x) => x.id === id)!;
                  return (
                    <li key={id}>
                      <Link
                        href={`/create?type=${id}`}
                        className="inline-flex h-9 items-center gap-2 rounded-full border border-hairline bg-surface px-3.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-tint"
                      >
                        <span aria-hidden>{e.emoji}</span>
                        {hi ? e.labelHi : e.label.split(' / ')[0]}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <HeroStudio />
        </div>

        {/* Proof strip */}
        <div className="border-y border-hairline bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 px-5 sm:px-6 md:grid-cols-4">
            {[
              ['140+', hi ? 'डिज़ाइन, हर परंपरा के लिए' : 'designs for every tradition'],
              ['12', hi ? 'भारतीय भाषाएँ, सही लिपि में' : 'Indian languages, correct script'],
              ['2 min', hi ? 'फ़ॉर्म से तैयार निमंत्रण तक' : 'from form to ready invite'],
              ['<16 MB', hi ? 'वीडियो, WhatsApp पर साफ़' : 'video, stays sharp on WhatsApp'],
            ].map(([v = '', l = ''], i) => (
              <div key={l} className={clsx('flex flex-col gap-0.5 py-6 md:px-6', i > 0 && 'md:border-l md:border-hairline', i % 2 === 1 && 'max-md:border-l max-md:border-hairline max-md:pl-5', i < 2 && 'max-md:border-b max-md:border-hairline')}>
                <dt className="order-2 text-sm text-ink-soft">{l}</dt>
                <dd className="font-display text-2xl text-ink sm:text-3xl">
                  <CountUp value={v} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <main id="main">
        {/* ================= HOW IT WORKS ================= */}
        <HowItWorks
          hi={hi}
          title={t('how.title')}
          steps={[
            { title: t('how.s1'), body: t('how.s1b') },
            { title: t('how.s2'), body: t('how.s2b') },
            { title: t('how.s3'), body: t('how.s3b') },
          ]}
        />

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
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-20 sm:py-24">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Reveal as="h2" className="max-w-xl text-[1.875rem] sm:text-[2.5rem]">
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

        {/* ================= LANGUAGES ================= */}
        <section className="border-y border-hairline bg-surface">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 py-20 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:items-center">
            <div>
              <Reveal as="h2" className="text-[1.875rem] sm:text-[2.5rem]">
                {t('languages.title')}
              </Reveal>
              <p className="mt-4 max-w-md text-ink-soft">
                {hi
                  ? 'हर लिपि सही जुड़ाक्षरों के साथ। "श्री" और "प्रिया" वैसे ही दिखते हैं जैसे छपे कार्ड में।'
                  : 'Every script shaped correctly. Conjuncts like “श्री” and “ப்ரியா” look exactly like a printed card.'}
              </p>
            </div>
            <Reveal>
              <LanguageShowcase />
            </Reveal>
          </div>
        </section>

        {/* ================= COMPARISON ================= */}
        <section className="border-y border-hairline bg-surface">
          <div className="mx-auto max-w-6xl px-5 sm:px-6 py-20 sm:py-24">
            <Reveal as="h2" className="max-w-2xl text-[1.875rem] sm:text-[2.5rem]">
              {hi ? 'इंतज़ार नहीं, समझौता नहीं' : 'No waiting. No compromises.'}
            </Reveal>
            <Reveal className="mt-10 overflow-x-auto rounded-[var(--radius-card)] border border-hairline">
              <table className="w-full min-w-[640px] text-left text-[0.95rem]">
                <thead>
                  <tr className="border-b border-hairline bg-surface-2 text-sm">
                    <th className="p-4 font-semibold sm:p-5">
                      <span className="sr-only">Feature</span>
                    </th>
                    <th className="bg-tint p-4 font-semibold sm:p-5">{BRAND.name}</th>
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
                      <td className="bg-tint/50 p-4 font-medium sm:p-5">
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
        <section className="mx-auto max-w-6xl px-5 sm:px-6 py-20 sm:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Reveal as="h2" className="max-w-xl text-[1.875rem] sm:text-[2.5rem]">
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
                  className={`panel lift flex flex-col rounded-[var(--radius-card)] p-6 ${p.highlight ? '!border-primary' : ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg">{p.name}</h3>
                    {p.highlight && <span className="badge">Most chosen</span>}
                  </div>
                  <p className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-semibold tracking-[-0.03em]">{formatINR(p.pricePaise)}</span>
                    {p.mrpPaise && <s className="text-sm text-ink-soft">{formatINR(p.mrpPaise)}</s>}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{p.description}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* ================= FAQ (no JS) ================= */}
        <section className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-6 pb-20 sm:pb-28 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <Reveal as="h2" className="text-[1.875rem] sm:text-[2.5rem]">
              {hi ? 'अक्सर पूछे जाने वाले सवाल' : 'Questions, answered'}
            </Reveal>
          </div>
          <div className="divide-y divide-hairline border-y border-hairline">
            {FAQ.map(([q, a]) => (
              <details key={q} className="faq group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="grid size-7 shrink-0 place-items-center text-ink-soft transition-transform duration-300 ease-[var(--ease-out-quint)] group-open:rotate-45">
                    <Plus className="size-4" aria-hidden />
                  </span>
                </summary>
                <p className="max-w-2xl pb-6 text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="px-5 pb-20 sm:px-6">
          <Reveal className="relative mx-auto flex max-w-6xl flex-col gap-8 overflow-hidden rounded-[20px] bg-plum px-6 py-12 text-white sm:px-12 sm:py-16 md:flex-row md:items-center dark:bg-plum-deep">
            <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full border border-white/10" />
            <span aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-44 rounded-full border border-white/10" />
            <div className="flex-1">
              <h2 className="text-[1.75rem] sm:text-[2.25rem]">{hi ? 'वेबसाइट नहीं चाहिए? WhatsApp पर "Hi" भेजिए।' : 'Prefer WhatsApp? Just send “Hi”.'}</h2>
              <p className="mt-3 max-w-xl text-white/70">
                {hi
                  ? 'बोलकर या लिखकर बताइए, कार्ड सीधे आपकी चैट में आ जाएगा।'
                  : 'Describe your function in a voice note or text, in any language. Your card arrives in the same chat.'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={WHATSAPP_BOT} target="_blank" rel="noopener" size="lg" className="!bg-white !text-[#2e1031] hover:!bg-white/90">
                <WhatsAppIcon className="size-5 text-[#1fa855]" />
                {hi ? 'WhatsApp खोलें' : 'Open WhatsApp'}
              </ButtonLink>
              <ButtonLink href="/create" variant="quiet" size="lg" className="border border-white/25 !text-white hover:!bg-white/10">
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
    <Link href={href} className="group inline-flex items-center gap-1.5 text-sm font-medium text-ink">
      <span className="underline decoration-hairline underline-offset-4 transition-colors group-hover:decoration-ink">{children}</span>
    </Link>
  );
}

type CellValue = string | boolean;
function Cell({ v }: { v: CellValue }) {
  if (v === true) return <Check className="size-5 text-ink" aria-label="Yes" />;
  if (v === false) return <Minus className="size-5 text-ink-soft/50" aria-label="No" />;
  return <>{v}</>;
}

const compareRows = (PRODUCTS: Record<ProductCode, Product>): Array<[string, CellValue, CellValue, CellValue]> => [
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
  ['Can I write in Hindi, Marathi or Tamil?', 'Yes, in 12 Indian languages with correct script. Type in English and convert names to your script, or speak and let AI write the wording.'],
  ['Will the video play properly on WhatsApp?', 'Every video is encoded to stay under 16 MB, so WhatsApp forwards it without blurring.'],
  ['Can guests reply for each function separately?', 'Yes. Guests choose Haldi, Sangeet, Wedding and so on individually, with headcount and meal preference. You get a live list for the caterer.'],
  ['Can I print the same design?', 'Yes. Get a print-ready 5×7 inch PDF with bleed and crop marks, or order printed cards from a partner press.'],
];
