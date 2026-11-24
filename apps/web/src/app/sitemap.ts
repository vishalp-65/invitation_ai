import { BRAND } from '@cardai/shared';
import type { MetadataRoute } from 'next';
import { POSTS, postHref } from '@/features/blog';
import { LANGUAGE_PAGES, languageHref } from '@/features/languages/content';
import { MAKER_SLUGS } from '@/features/makers/content';
import { OCCASION_SLUGS } from '@/features/occasions/routes';

const base = process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url;

/** Public marketing pages only. User invites are private and stay out of the sitemap. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  // Blog lastmod is the post's own "updated" date, so Google re-crawls a post only when it changed.
  const latestPost = POSTS.reduce((d, p) => (p.updated > d ? p.updated : d), '1970-01-01');
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/templates`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/create`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    ...Object.values(OCCASION_SLUGS).map((slug) => ({
      url: `${base}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    // Format / intent pages (invitation card maker, free invitation video...): broad, high-volume queries.
    ...MAKER_SLUGS.map((slug) => ({
      url: `${base}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    })),
    { url: `${base}/invitation-maker`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    ...LANGUAGE_PAGES.map((l) => ({
      url: `${base}${languageHref(l.slug)}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: `${base}/blog`, lastModified: new Date(latestPost), changeFrequency: 'weekly', priority: 0.7 },
    ...POSTS.map((p) => ({
      url: `${base}${postHref(p)}`,
      lastModified: new Date(p.updated),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
