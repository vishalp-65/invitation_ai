import { BRAND } from '@cardai/shared';
import type { Metadata, Viewport } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Instrument_Sans, JetBrains_Mono, Noto_Sans_Devanagari } from 'next/font/google';
import type { ReactNode } from 'react';
import { ErrorReporter } from '@/components/error-reporter';
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
    'Create premium wedding, griha pravesh, birthday and puja invitations in minutes: a designer card, WhatsApp video and RSVP website in Hindi and 11 more Indian languages. Preview free.',
  applicationName: BRAND.name,
  keywords: [
    'Noyta', 'Nyota', 'invitation card maker', 'card invitation making', 'invite card making', 'invitation card maker free',
    'invitation card image free', 'invitation video free', 'video invitation maker', 'wedding card maker', 'wedding invitation maker',
    'shaadi card', 'shadi card maker', 'shaadi video invitation', 'birthday invitation card', 'birthday invitation video',
    'griha pravesh invitation card', 'e invite', 'e invitation card', 'digital invitation', 'wedding website', 'RSVP website',
    'Hindi wedding card', 'WhatsApp video invitation',
  ],
  category: 'design',
  // Google wants favicons in multiples of 48px; listing them explicitly (plus the SVG) beats relying on auto-discovery.
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icons/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icons/favicon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
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
  // Tells browsers with forced "dark mode for websites" (Samsung Internet, Chrome auto-dark) that
  // the site handles dark itself, so they don't invert our light theme or the templates.
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const tCommon = await getTranslations('common');
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
          {tCommon('skipToContent')}
        </a>
        {/*
          Lean on purpose: guest pages (invitation websites, short links, builder preview) render
          straight from here. The app's providers (data fetching, toasts, tooltips, translations)
          live in app/(app)/layout.tsx so guests on cheap phones never download them.
        */}
        <ErrorReporter />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
