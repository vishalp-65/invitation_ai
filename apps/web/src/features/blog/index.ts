import type { OccasionWithPage } from '@/features/occasions/routes';
import { post as birthday } from './posts/birthday-invitation-message';
import { post as grihaPravesh } from './posts/griha-pravesh-invitation-message';
import { post as rsvp } from './posts/indian-wedding-rsvp-guide';
import { post as hindiMatter } from './posts/shadi-card-matter-in-hindi';
import { post as wording } from './posts/wedding-invitation-wording';
import { post as video } from './posts/wedding-invitation-video-for-whatsapp';
import { post as timeline } from './posts/when-to-send-wedding-invitations';
import type { BlogPost } from './types';

export type { BlogPost, Block } from './types';

/** Every post, newest first (ties keep this order). Add a post: create it in ./posts and list it here. */
export const POSTS: BlogPost[] = [wording, hindiMatter, video, rsvp, timeline, grihaPravesh, birthday].sort((a, b) =>
  b.published.localeCompare(a.published),
);

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);

export const postHref = (p: Pick<BlogPost, 'slug'>) => `/blog/${p.slug}`;

/** Posts that support an occasion landing page. */
export const postsForOccasion = (type: OccasionWithPage) => POSTS.filter((p) => p.occasions.includes(type));

/** Up to `n` other posts, ranked by shared occasions, then same category. */
export function relatedPosts(post: BlogPost, n = 3): BlogPost[] {
  const score = (p: BlogPost) => p.occasions.filter((o) => post.occasions.includes(o)).length * 2 + (p.category === post.category ? 1 : 0);
  return POSTS.filter((p) => p.slug !== post.slug)
    .map((p) => [p, score(p)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([p]) => p);
}

/** Readable date for India, e.g. "22 Nov 2026". */
export const formatPostDate = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
