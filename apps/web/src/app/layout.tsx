import { BRAND } from '@cardai/shared';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { Mukta, Tiro_Devanagari_Hindi } from 'next/font/google';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import '@/styles/globals.css';

const tiro = Tiro_Devanagari_Hindi({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin', 'devanagari'],
  variable: '--font-tiro',
  display: 'swap',
});
const mukta = Mukta({ weight: ['400', '500', '600', '700'], subsets: ['latin', 'devanagari'], variable: '--font-mukta', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: { default: `${BRAND.name} — ${BRAND.tagline}`, template: `%s · ${BRAND.name}` },
  description:
    'Make wedding, griha pravesh, birthday and puja invitations in Hindi and 11 more Indian languages: image card, video invite and website with RSVP. Share on WhatsApp.',
};

export const viewport: Viewport = {
  themeColor: '#FBF8F3',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${tiro.variable} ${mukta.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        {/* Sets data-theme before first paint (no flash of the wrong theme). */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div className="ambient" aria-hidden />
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
