import { Plus } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteFooter, SiteHeader } from '@/components/layout/site-header';
import { MobileDock } from '@/components/marketing/mobile-dock';
import { StudioCta } from '@/components/studio/cta';
import { StudioFeatures } from '@/components/studio/features';
import { StudioHero } from '@/components/studio/hero';
import { StudioLanguages } from '@/components/studio/languages';
import { StudioLiveRsvp } from '@/components/studio/live-rsvp';
import { StudioOccasions } from '@/components/studio/occasions';
import { StudioPremiumTunnel } from '@/components/studio/premium-tunnel';
import { StudioPricing } from '@/components/studio/pricing';
import { StudioPrivacy } from '@/components/studio/privacy';
import { StudioProcess } from '@/components/studio/process';
import { StudioShare } from '@/components/studio/share';
import { StudioVoice } from '@/components/studio/voice';
import { ArtProvider, Frame, Kicker } from '@/components/studio/primitives';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { loadOffers } from '@/lib/offers-server';

const WHATSAPP_BOT = 'https://wa.me/910000000000?text=Hi';

/**
 * Landing page, "studio" theme: full-screen video hero, then numbered sections with huge serif
 * headlines, mono labels and hairline panels. Section order follows the studio template.
 */
export default async function HomePage() {
  const t = await getTranslations();
  const hi = (await getLocale()) === 'hi';
  const { products } = await loadOffers();
  const plans = [products.card, products.video, products.combo, products.website];
  const art = await landingArt();

  return (
    <ArtProvider names={art}>
      <div className="grain bg-ivory">
        <SiteHeader overlay />
        <StudioHero hi={hi} cta={t('hero.cta')} whatsappHref={WHATSAPP_BOT} />

        <main id="main">
          <StudioFeatures hi={hi} />
          <StudioPremiumTunnel hi={hi} />
          <div className="cv-auto">
            <StudioProcess hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioLanguages hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioLiveRsvp hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioShare hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioPrivacy hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioVoice hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioOccasions hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioPricing hi={hi} plans={plans} />
          </div>

          {/* ================= FAQ (no JS) ================= */}
          <section id="faq" className="cv-auto py-20 sm:py-24 lg:py-32">
            <Frame className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <Kicker className="mb-8">FAQ</Kicker>
                <h2 className="display-md">
                  {hi ? 'सवाल,' : 'Questions,'}
                  <br />
                  <span className="text-ink-soft">{hi ? 'जवाब।' : 'answered.'}</span>
                </h2>
              </div>
              <div className="divide-y divide-ink/10 border-y border-ink/10 lg:col-span-7">
                {FAQ.map(([q, a], k) => (
                  <details key={q} className="faq group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-5 text-base sm:gap-6 sm:py-6 sm:text-lg [&::-webkit-details-marker]:hidden">
                      <span className="font-mono text-xs text-ink-soft">
                        {String(k + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1">{q}</span>
                      <span className="grid size-8 shrink-0 place-items-center border border-ink/15 text-ink-soft transition-transform duration-300 ease-[var(--ease-out-quint)] group-open:rotate-45">
                        <Plus className="size-4" aria-hidden />
                      </span>
                    </summary>
                    <p className="max-w-2xl pb-6 pl-9 text-ink-soft sm:pl-11">{a}</p>
                  </details>
                ))}
              </div>
            </Frame>
          </section>

          <StudioCta hi={hi} cta={t('hero.cta')} whatsappHref={WHATSAPP_BOT} />
        </main>
        <MobileDock label={t('hero.cta')} whatsappHref={WHATSAPP_BOT} />
        <SiteFooter banner />
      </div>
    </ArtProvider>
  );
}

/** Names of the art images present in public/landing (empty slots then skip the request entirely). */
async function landingArt(): Promise<string[]> {
  try {
    const files = await readdir(path.join(process.cwd(), 'public', 'landing'));
    return files.filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4));
  } catch {
    return [];
  }
}

const FAQ: Array<[string, string]> = [
  [
    'Is it really free to try?',
    'Yes. Make your invitation, preview every design and share a watermarked card and website for free. Pay only for HD files, the video or RSVP.',
  ],
  [
    'Can I write in Hindi, Marathi or Tamil?',
    'Yes, in 12 Indian languages with correct script. Type in English and convert names to your script, or speak and let AI write the wording.',
  ],
  [
    'Will the video play properly on WhatsApp?',
    'Every video is encoded to stay under 16 MB, so WhatsApp forwards it without blurring.',
  ],
  [
    'Can guests reply for each function separately?',
    'Yes. Guests choose Haldi, Sangeet, Wedding and so on individually, with headcount and meal preference. You get a live list for the caterer.',
  ],
  [
    'Can I print the same design?',
    'Yes. Get a print-ready 5×7 inch PDF with bleed and crop marks, or order printed cards from a partner press.',
  ],
];
