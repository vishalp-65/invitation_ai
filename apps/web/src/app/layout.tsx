import { BRAND } from '@cardai/shared';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Instrument_Sans, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { LITE_BOOT_SCRIPT } from '@/lib/perf-boot';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import '@/styles/globals.css';

/**
 * Instrument Sans for UI and body text; Noto Sans Devanagari picks up Hindi and Marathi.
 */
// No width axis any more (nothing uses font-stretch), so the font file is smaller.
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' });
// Not preloaded: at ~117 KB it was the biggest download on English pages. Its unicode-range means
// the browser still fetches it as soon as Hindi / Marathi text (or ₹) is on screen.
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-deva', display: 'swap', preload: false });
/** Mono for section labels, numbers and small meta text. */
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    'Wedding, griha pravesh, birthday and puja invitations in Hindi and 11 more Indian languages: card, video and RSVP website for WhatsApp. Free to try.',
  applicationName: BRAND.name,
  // og:title / og:description fall back to each page's title and description; og:image comes
  // from app/opengraph-image.tsx, and Twitter reuses it.
  openGraph: { siteName: BRAND.name, type: 'website', locale: 'en_IN', alternateLocale: ['hi_IN'] },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7F6F2' },
    { media: '(prefers-color-scheme: dark)', color: '#050608' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} dir={locale === 'ur' ? 'rtl' : 'ltr'} className={`${instrument.variable} ${deva.variable} ${mono.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        {/* Marks low-end devices (data-perf="lite") so heavy effects can be skipped from first paint. */}
        <script dangerouslySetInnerHTML={{ __html: LITE_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <div className="ambient" aria-hidden />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
