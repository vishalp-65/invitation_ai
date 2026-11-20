import { BRAND } from '@cardai/shared';
import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url;

/**
 * Keep crawlers on the marketing pages. Invite pages (/i, /s) are not blocked here on purpose:
 * they send `noindex` themselves, and a crawler has to fetch them to see it.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/editor', '/builder', '/designer', '/preview', '/dev', '/auth', '/email'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
