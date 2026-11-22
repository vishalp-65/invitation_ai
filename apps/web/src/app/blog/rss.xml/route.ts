import { BRAND } from '@cardai/shared';
import { POSTS, postHref } from '@/features/blog';

export const dynamic = 'force-static';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** RSS 2.0 feed of the blog, for feed readers and faster discovery of new posts. */
export function GET() {
  const base = BRAND.url;
  const items = POSTS.map((p) => {
    const url = `${base}${postHref(p)}`;
    return `    <item>
      <title>${esc(p.h1)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(p.excerpt)}</description>
      <category>${esc(p.category)}</category>
      <pubDate>${new Date(`${p.published}T09:00:00+05:30`).toUTCString()}</pubDate>
    </item>`;
  }).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(BRAND.name)} blog</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Invitation wording and planning guides for Indian weddings and family occasions.</description>
    <language>en-IN</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
