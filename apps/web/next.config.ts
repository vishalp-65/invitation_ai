import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';
const storageUrl = process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/cardai';
const storageOrigin = new URL(storageUrl).origin;
// Photo and song uploads go straight to the API origin (set API_PUBLIC_URL here too, e.g. https://api.noyta.in).
const apiOrigin = new URL(process.env.API_PUBLIC_URL ?? apiUrl).origin;
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Enforced now: who may frame us (only ourselves: the site builder previews /preview/site in an
 * iframe), plus no plugins and no <base> hijacking. These can't break any feature.
 */
const enforcedCsp = ["frame-ancestors 'self'", "base-uri 'self'", "object-src 'none'", "form-action 'self'"].join('; ');

/**
 * The full policy runs in report-only mode first: violations show in the browser console without
 * blocking anything. Once a week of real traffic shows none, move it into the enforced header.
 * Third parties: Google sign-in, Razorpay Checkout, YouTube and Google Maps embeds on invitation
 * sites, Google Fonts, and the storage bucket (images, music, direct uploads).
 */
const reportOnlyCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://accounts.google.com https://checkout.razorpay.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `media-src 'self' blob: ${storageOrigin}`,
  `connect-src 'self' ${storageOrigin} ${apiOrigin} https://accounts.google.com https://*.razorpay.com${isDev ? ' ws: http://localhost:*' : ''}`,
  "frame-src 'self' https://accounts.google.com https://*.razorpay.com https://www.youtube-nocookie.com https://www.youtube.com https://www.google.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join('; ');

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Remotion layouts are shipped as TypeScript source from the monorepo.
  transpilePackages: ['@cardai/templates'],
  poweredByHeader: false,
  images: {
    // Serve AVIF/WebP to browsers that take them (card renders shrink a lot).
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [new URL(`${storageUrl}/**`)],
  },
  // Same-origin API: cookies stay first-party and no CORS preflight on every call.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Clickjacking: older browsers read X-Frame-Options, newer ones frame-ancestors.
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: enforcedCsp },
          { key: 'Content-Security-Policy-Report-Only', value: reportOnlyCsp },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]),
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
        ],
      },
      {
        // Painted art library: the video/image renderer (another origin) loads it with CORS, and
        // the files never change in place (new art gets a new name), so they cache for a year.
        source: '/art/:file*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
