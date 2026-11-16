import { BRAND } from '@cardai/shared';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Instrument_Sans, Noto_Sans_Devanagari } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import '@/styles/globals.css';

/**
 * Instrument Sans (variable width + weight) for Latin text: body at full width, headings in its
 * semi-condensed cut. Noto Sans Devanagari picks up Hindi and Marathi. Both are single variable files.
 */
const instrument = Instrument_Sans({ subsets: ['latin'], axes: ['wdth'], variable: '--font-instrument', display: 'swap' });
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-deva', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    'Make wedding, griha pravesh, birthday and puja invitations in Hindi and 11 more Indian languages: image card, video invite and website with RSVP. Share on WhatsApp.',
  applicationName: BRAND.name,
  openGraph: { siteName: BRAND.name, type: 'website', locale: 'en_IN' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF8F6' },
    { media: '(prefers-color-scheme: dark)', color: '#140F17' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${instrument.variable} ${deva.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-transform focus:translate-y-0"
        >
          Skip to content
        </a>
        <div className="ambient" aria-hidden />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
