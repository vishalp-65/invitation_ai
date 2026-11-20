import { BRAND } from '@cardai/shared';
import type { MetadataRoute } from 'next';
import { OCCASION_SLUGS } from '@/features/occasions/routes';

const base = process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url;

/** Public marketing pages only. User invites are private and stay out of the sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/templates`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/create`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    ...Object.values(OCCASION_SLUGS).map((slug) => ({
      url: `${base}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
