import type { EventTypeId } from '@cardai/shared';

/**
 * Occasions that have their own landing page (`/<slug>`), in menu order. This map stays tiny and has
 * no copy in it, so client components (footer, homepage) can import it without pulling the page text.
 */
export const OCCASION_SLUGS = {
  wedding: 'wedding-invitation',
  engagement: 'engagement-invitation',
  'griha-pravesh': 'griha-pravesh-invitation',
  birthday: 'birthday-invitation',
  nikah: 'nikah-invitation',
  puja: 'puja-invitation',
  'naming-ceremony': 'naming-ceremony-invitation',
  mundan: 'mundan-invitation',
  'baby-shower': 'baby-shower-invitation',
  anniversary: 'anniversary-invitation',
} as const satisfies Partial<Record<EventTypeId, string>>;

export type OccasionWithPage = keyof typeof OCCASION_SLUGS;

/** Landing page for an occasion when it has one, otherwise straight into the maker. */
export function occasionHref(type: string): string {
  const slug = (OCCASION_SLUGS as Record<string, string>)[type];
  return slug ? `/${slug}` : `/create?type=${type}`;
}
