import type { OccasionWithPage } from '@/features/occasions/routes';

/**
 * Blog content is typed data rather than MDX: no extra build step or dependency, every page is a
 * static server component (zero client JS), and the same blocks feed the page, the TOC and the schema.
 */
export type Block =
  | { t: 'p'; text: string }
  /** Section heading. `id` becomes the anchor and the table-of-contents entry. */
  | { t: 'h2'; id: string; text: string }
  | { t: 'h3'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  /** A ready-to-copy wording sample (keeps line breaks). `lang` sets the text's language for screen readers and fonts. */
  | { t: 'sample'; title?: string; lang?: 'en' | 'hi' | 'mr'; text: string }
  | { t: 'tip'; text: string }
  /** Mid-article call to action into the maker. */
  | { t: 'cta'; text: string; href: string; label: string }
  | { t: 'table'; head: string[]; rows: string[][] };

export interface BlogPost {
  slug: string;
  /** <title> before " · Noyta": the main search phrase first, at most ~55 characters. */
  title: string;
  /** On-page H1 (can be longer and friendlier than the title). */
  h1: string;
  /** Meta description, 140–160 characters. */
  description: string;
  /** One-paragraph summary under the H1; also the RSS item description. */
  excerpt: string;
  /** ISO dates (YYYY-MM-DD). `updated` drives the sitemap lastmod and "Updated" line. */
  published: string;
  updated: string;
  category: 'Wording' | 'Guides' | 'Planning';
  /** Occasion pages this post supports; they link back to it ("Guides" section). */
  occasions: OccasionWithPage[];
  /** Search phrases the post targets (used for schema `keywords`). */
  keywords: string[];
  readMinutes: number;
  body: Block[];
  /** Optional Q&A at the end, also sent as FAQPage schema. */
  faq?: Array<[string, string]>;
}
