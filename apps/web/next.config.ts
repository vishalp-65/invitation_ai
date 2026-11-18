import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const apiUrl = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';
const storageUrl = process.env.STORAGE_PUBLIC_URL ?? 'http://localhost:9000/cardai';

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
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self)' },
        ],
      },
    ];
  },
};

export default createNextIntlPlugin('./src/i18n/request.ts')(config);
