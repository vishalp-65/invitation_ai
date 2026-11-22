import { BRAND } from '@cardai/shared';
import { POSTS, postHref, type Block } from '@/features/blog';
import { faqSections } from '@/features/faq/content';
import { OCCASION_PAGES } from '@/features/occasions/content';
import { loadOffers } from '@/lib/offers-server';

/**
 * /llms-full.txt: the site's public knowledge in one Markdown file (FAQ, every occasion page, every
 * guide), so an AI assistant can read and quote Noyta accurately in a single fetch. Built from the
 * same sources as the pages, so it never drifts from them. English only, like the blog.
 */
export const revalidate = 3600;

const md = (b: Block): string => {
  switch (b.t) {
    case 'p':
      return b.text;
    case 'h2':
      return `### ${b.text}`;
    case 'h3':
      return `#### ${b.text}`;
    case 'ul':
      return b.items.map((i) => `- ${i}`).join('\n');
    case 'ol':
      return b.items.map((i, k) => `${k + 1}. ${i}`).join('\n');
    case 'sample':
      return `${b.title ? `**${b.title}**\n\n` : ''}${b.text
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n')}`;
    case 'tip':
      return `Tip: ${b.text}`;
    case 'cta':
      return `${b.text} → ${BRAND.url}${b.href}`;
    case 'table':
      return [`| ${b.head.join(' | ')} |`, `| ${b.head.map(() => '---').join(' | ')} |`, ...b.rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
  }
};

export async function GET() {
  const { products } = await loadOffers();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url;

  const faq = faqSections(products)
    .map((s) => `### ${s.title}\n\n${s.items.map(([q, a]) => `**${q}**\n${a}`).join('\n\n')}`)
    .join('\n\n');

  const occasions = OCCASION_PAGES.map(
    (o) =>
      `### ${o.h1.en}\n\nURL: ${base}/${o.slug} · Make one: ${base}/create?type=${o.type}\n\n${o.intro.en}\n\n${o.faq.map((f) => `**${f.q.en}**\n${f.a.en}`).join('\n\n')}`,
  ).join('\n\n');

  const guides = POSTS.map(
    (p) =>
      `## ${p.h1}\n\nURL: ${base}${postHref(p)} · Updated ${p.updated}\n\n${p.excerpt}\n\n${p.body.map(md).join('\n\n')}${
        p.faq?.length ? `\n\n### Questions\n\n${p.faq.map(([q, a]) => `**${q}**\n${a}`).join('\n\n')}` : ''
      }`,
  ).join('\n\n---\n\n');

  const body = `# ${BRAND.name}: full reference

> ${BRAND.name} (${BRAND.domain}) is an Indian online invitation maker: one form makes an invitation card, a WhatsApp-ready video and an RSVP website for weddings and every family occasion, in 12 Indian languages. Free to try; pay once per event. Summary: ${base}/llms.txt

## Frequently asked questions

${faq}

## Invitations by occasion

${occasions}

# Guides and wording samples

${guides}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
