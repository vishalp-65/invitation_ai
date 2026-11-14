/**
 * Pre-renders a static thumbnail for every built-in template into apps/web/public/showcase.
 * Galleries then load lightweight JPEGs (lazy, CDN-cacheable) instead of booting Remotion
 * in the browser for dozens of cards — the single biggest win for low-end phones.
 *
 *   npm run showcase -w @cardai/worker
 */
import { BUILTIN_TEMPLATES, COMPOSITION_IDS, sampleInviteProps, type TemplateDefinition } from '@cardai/shared';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { RemotionRuntime } from '../remotion.js';

const outDir = fileURLToPath(new URL('../../../web/public/showcase/', import.meta.url));
const log = pino({ transport: { target: 'pino-pretty', options: { singleLine: true } } });

/** Traditional families are shown in Hindi, modern ones in English. */
const lang = (t: TemplateDefinition): 'en' | 'hi' =>
  t.communities.includes('modern') || ['christian-wedding', 'corporate'].some((e) => (t.eventTypes as string[]).includes(e)) ? 'en' : 'hi';

const only = process.argv[2]?.split(','); // optional comma-separated id filter
const runtime = new RemotionRuntime(log);
await mkdir(outDir, { recursive: true });
const serveUrl = await runtime.getServeUrl();
const browser = await runtime.getBrowser();

const list = BUILTIN_TEMPLATES.filter((t) => !only || only.some((o) => t.id === o));
let i = 0;
for (const t of list) {
  const props = { ...sampleInviteProps(t, lang(t)), page: 0 };
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_IDS.card, inputProps: props, puppeteerInstance: browser });
  await renderStill({
    composition,
    serveUrl,
    inputProps: props,
    puppeteerInstance: browser,
    output: `${outDir}${t.id}.jpg`,
    imageFormat: 'jpeg',
    jpegQuality: 84,
    scale: 0.4, // 432×768: crisp at 2× DPR for phone-sized tiles
  });
  log.info(`${++i}/${list.length} ${t.id}`);
}
await runtime.close();
process.exit(0);
