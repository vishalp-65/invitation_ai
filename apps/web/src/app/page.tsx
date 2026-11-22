import { getLocale, getTranslations } from 'next-intl/server';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { MobileDock } from '@/components/marketing/mobile-dock';
import { StudioCta } from '@/components/studio/cta';
import { StudioVideoCarousel } from '@/components/studio/design-showcase';
import { StudioFeatures } from '@/components/studio/features';
import { StudioHero } from '@/components/studio/hero';
import { StudioLanguages } from '@/components/studio/languages';
import { StudioLiveRsvp } from '@/components/studio/live-rsvp';
import { StudioOccasions } from '@/components/studio/occasions';
import { StudioPremiumTunnel } from '@/components/studio/premium-tunnel';
import { StudioPricing } from '@/components/studio/pricing';
import { StudioPrivacy } from '@/components/studio/privacy';
import { StudioProcess } from '@/components/studio/process';
import { StudioSculpture } from '@/components/studio/sculpture';
import { StudioShare } from '@/components/studio/share';
import { StudioSiteDeck } from '@/components/studio/site-deck';
import { StudioVoice } from '@/components/studio/voice';
import { ArtProvider, Frame, Kicker } from '@/components/studio/primitives';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { BRAND } from '@cardai/shared';
import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/seo/json-ld';
import { FaqList } from '@/components/seo/faq-list';
import { homeFaq } from '@/features/faq/content';
import { loadOffers } from '@/lib/offers-server';
import { WHATSAPP_CHAT_URL } from '@/lib/whatsapp';

const WHATSAPP_BOT = WHATSAPP_CHAT_URL;

const TITLE = `Wedding Invitation Maker: Card, Video & Website · ${BRAND.name}`;
const DESCRIPTION =
  'Free online wedding invitation maker for Indian families. Make a card, video and RSVP website in Hindi or 11 more languages and share on WhatsApp. Start free.';

export const metadata: Metadata = {
  // Main search term first; the brand tagline stays the default title for other pages.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  // Repeats the layout's siteName / locale: Next replaces nested openGraph objects instead of merging them.
  openGraph: { siteName: BRAND.name, type: 'website', locale: 'en_IN', alternateLocale: ['hi_IN'], url: '/', title: TITLE, description: DESCRIPTION },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};

/**
 * Landing page, "studio" theme: full-screen video hero, then numbered sections with huge serif
 * headlines, mono labels and hairline panels. Section order follows the studio template.
 */
export default async function HomePage() {
  const t = await getTranslations();
  const hi = (await getLocale()) === 'hi';
  const { products, designs } = await loadOffers();
  const plans = [products.card, products.video, products.combo, products.website];
  const art = await landingArt();
  const prices = plans.map((p) => p.pricePaise / 100);
  const faq = homeFaq(products);

  return (
    <ArtProvider names={art}>
      <JsonLd data={structuredData(Math.max(...prices), faq)} />
      <div className="grain bg-ivory">
        <SiteHeader overlay />
        <StudioHero hi={hi} cta={t('hero.cta')} whatsappHref={WHATSAPP_BOT} />

        <main id="main">
          <StudioFeatures hi={hi} />
          {/* No cv-auto: the WebGL canvas sizes itself from layout, which content-visibility skips. */}
          <StudioSculpture hi={hi} />
          <StudioPremiumTunnel hi={hi} hidden={designs.hiddenTemplates} />
          <div className="cv-auto">
            <StudioProcess hi={hi} />
          </div>
          <div className="cv-auto">
            <StudioVideoCarousel hi={hi} />
          </div>
          {/* No cv-auto here: content-visibility would break the deck's sticky scroll stage. */}
          <StudioSiteDeck hi={hi} />
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
                  <span className="sr-only">{hi ? 'निमंत्रण कार्ड से जुड़े सवाल और जवाब' : 'Invitation maker questions, answered'}</span>
                  <span aria-hidden>
                    {hi ? 'सवाल,' : 'Questions,'}
                    <br />
                    <span className="text-ink-soft">{hi ? 'जवाब।' : 'answered.'}</span>
                  </span>
                </h2>
              </div>
              <div className="lg:col-span-7">
                <FaqList items={faq} />
                <p className="mt-8 flex flex-wrap gap-x-8 gap-y-3 font-mono text-sm text-ink-soft">
                  <Link href="/faq" className="underline decoration-ink/20 underline-offset-4 hover:text-ink hover:decoration-ink">
                    {hi ? 'सारे सवाल देखें' : 'All questions'}
                  </Link>
                  <Link href="/blog" className="underline decoration-ink/20 underline-offset-4 hover:text-ink hover:decoration-ink">
                    {hi ? 'निमंत्रण के शब्द और गाइड' : 'Invitation wording & guides'}
                  </Link>
                </p>
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

/** Organization, WebSite, the app itself (free to try, paid plans up to `highPrice` INR) and the FAQ below. */
function structuredData(highPrice: number, faq: Array<[string, string]>) {
  // Google's logo guidelines want a crawlable raster image of at least 112×112, so the 512px PNG, not the SVG favicon.
  const logo = { '@type': 'ImageObject', '@id': `${BRAND.url}/#logo`, url: `${BRAND.url}/icons/icon-512.png`, contentUrl: `${BRAND.url}/icons/icon-512.png`, width: 512, height: 512, caption: BRAND.name };
  const org = {
    '@type': 'Organization',
    '@id': `${BRAND.url}/#org`,
    name: BRAND.name,
    alternateName: BRAND.domain,
    url: BRAND.url,
    logo,
    image: { '@id': logo['@id'] },
    description: 'Online invitation maker for Indian families: invitation cards, WhatsApp video invites and RSVP websites in 12 Indian languages.',
    email: BRAND.supportEmail,
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', email: BRAND.supportEmail, availableLanguage: ['English', 'Hindi'] },
  };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      org,
      // WebSite name + alternateName feed the site name Google shows above the result.
      { '@type': 'WebSite', '@id': `${BRAND.url}/#site`, url: `${BRAND.url}/`, name: BRAND.name, alternateName: [`${BRAND.name} Invitations`, BRAND.domain], inLanguage: ['en-IN', 'hi-IN'], publisher: { '@id': org['@id'] } },
      {
        '@type': 'WebApplication',
        name: BRAND.name,
        url: BRAND.url,
        description: BRAND.tagline,
        applicationCategory: 'DesignApplication',
        operatingSystem: 'Any (web browser)',
        inLanguage: ['en-IN', 'hi-IN'],
        publisher: { '@id': org['@id'] },
        offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: 0, highPrice, offerCount: 5 },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
      },
    ],
  };
}
