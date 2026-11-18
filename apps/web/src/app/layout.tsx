import { BRAND } from '@cardai/shared';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Instrument_Sans, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import '@/styles/globals.css';

/**
 * Instrument Sans for UI and body text; Noto Sans Devanagari picks up Hindi and Marathi.
 */
// No width axis any more (nothing uses font-stretch), so the font file is smaller.
const instrument = Instrument_Sans({ subsets: ['latin'], variable: '--font-instrument', display: 'swap' });
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-deva', display: 'swap' });
/** Mono for section labels, numbers and small meta text. */
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--font-jetbrains', display: 'swap' });

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
    { media: '(prefers-color-scheme: light)', color: '#F7F6F2' },
    { media: '(prefers-color-scheme: dark)', color: '#050608' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${instrument.variable} ${deva.variable} ${mono.variable}`} data-theme="dark" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
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
      </body>
    </html>
  );
}
