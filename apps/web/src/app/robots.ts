import { BRAND } from '@cardai/shared';
import type { MetadataRoute } from 'next';

const base = process.env.NEXT_PUBLIC_APP_URL ?? BRAND.url;

/** Private app areas and API routes: never useful in search, and they waste crawl budget. */
const PRIVATE = ['/api/', '/admin', '/dashboard', '/editor', '/builder', '/designer', '/preview', '/dev', '/auth', '/email', '/host'];

/**
 * AI search and assistant crawlers, allowed by name so answer engines can read and cite the
 * marketing pages, blog and /llms.txt: ChatGPT (OpenAI), Claude (Anthropic), Gemini (Google-Extended),
 * Grok (xAI), Perplexity, Copilot (via Bingbot, covered by `*`), Apple Intelligence, Meta AI,
 * Amazon (Alexa / Rufus), DuckDuckGo's DuckAssist, Mistral and Common Crawl (training data for many models).
 * `*` already allows all of them; naming them makes the intent explicit and survives any future `*` tightening.
 */
const AI_CRAWLERS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-User', 'Claude-SearchBot',
  'Google-Extended', 'GoogleOther',
  'xAI-Bot', 'GrokBot',
  'PerplexityBot', 'Perplexity-User',
  'Applebot', 'Applebot-Extended',
  'meta-externalagent', 'meta-externalfetcher',
  'Amazonbot', 'DuckAssistBot', 'MistralAI-User', 'CCBot',
];

/**
 * Keep crawlers on the marketing pages. Invite pages (/i, /s) are not blocked here on purpose:
 * they send `noindex` themselves, and a crawler has to fetch them to see it.
 * No `host` line: it is a Yandex-only directive that Google ignores.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
