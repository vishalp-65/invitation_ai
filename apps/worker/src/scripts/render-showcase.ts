/**
 * Pre-renders a static thumbnail for every built-in template into apps/web/public/showcase.
 * Galleries then load lightweight JPEGs (lazy, CDN-cacheable) instead of booting Remotion
 * in the browser for dozens of cards — the single biggest win for low-end phones.
 *
 *   npm run showcase -w @cardai/worker
 *   npm run showcase -w @cardai/worker -- id1,id2 --out=DIR --lang=hi   (review renders)
 */
import { BRAND, BUILTIN_TEMPLATES, buildDesign, COMPOSITION_IDS, coverPageIndex, faithOf, resolveInvocation, sampleInviteProps, templateSampleLanguage, type DesignData, type TemplateDefinition } from '@cardai/shared';
import { renderStill, selectComposition } from '@remotion/renderer';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import { RemotionRuntime } from '../remotion.js';

const outDir = fileURLToPath(new URL('../../../web/public/showcase/', import.meta.url));
const log = pino({ transport: { target: 'pino-pretty', options: { singleLine: true } } });

/** Traditional families are shown in Hindi, modern ones in English (the wizard reads the same rule). */
const lang = (t: TemplateDefinition): 'en' | 'hi' => templateSampleLanguage(t);

const only = process.argv[2]?.split(','); // optional comma-separated id filter
const missingOnly = process.argv.includes('--missing'); // skip thumbnails that already exist
/** Dev review: `--all-pages --out=DIR` renders every page as <id>-<n>-<pageId>.jpg into DIR. */
const allPages = process.argv.includes('--all-pages');
const outArg = process.argv.find((a) => a.startsWith('--out='))?.slice(6);
/** Review in another language: `--lang=hi` renders every thumbnail in Hindi. */
const langArg = process.argv.find((a) => a.startsWith('--lang='))?.slice(7) as 'en' | 'hi' | undefined;
const runtime = new RemotionRuntime(log);
await mkdir(outDir, { recursive: true });
const serveUrl = await runtime.getServeUrl();
const browser = await runtime.getBrowser();

const list = BUILTIN_TEMPLATES.filter((t) => (!only || only[0]!.startsWith('--') || only.some((o) => t.id === o)) && (!missingOnly || !existsSync(`${outDir}${t.id}.jpg`)));
let i = 0;
for (const t of list) {
  const language = langArg ?? lang(t);
  const sample = sampleInviteProps(t, language);
  // Review renders also fill the optional details so every inner page has something on it.
  const content = allPages
    ? { ...sample.content, welcomeLines: ['Aarav & Diya', 'Kabir, Meera'], rsvpContacts: [{ name: 'Ramesh Sharma', phone: '98290 12345' }], note: 'Your blessings are our gift', hashtag: '#RahulWedsPriya' }
    : sample.content;
  const faith = faithOf(sample.eventType, t.communities[0]);
  const invocation = resolveInvocation(content.invocation, { eventType: sample.eventType, faith, language, community: t.communities[0] });
  const data: DesignData = { content: { ...content, invocation }, functions: sample.functions, mainFunction: sample.mainFunction, salutation: null, photos: [], rsvpBy: allPages ? 'Kindly RSVP by 1 December' : null };
  const design = buildDesign({ template: t, data, language, eventType: sample.eventType, community: t.communities[0] });
  const dir = outArg ? `${outArg.replace(/[/\\]$/, '')}/` : outDir;
  const pages = allPages ? design.pages.map((p, n) => ({ n, file: `${dir}${t.id}-${n + 1}-${p.id}.jpg` })) : [{ n: coverPageIndex(design), file: `${dir}${t.id}.jpg` }];
  for (const pg of pages) {
    // Thumbnails show the main invitation page, not the blessing page in front of it.
    const props = { design, data, language, page: pg.n, watermark: false, watermarkText: BRAND.watermarkText, musicUrl: null, aiClipUrl: null };
    const composition = await selectComposition({ serveUrl, id: COMPOSITION_IDS.designCard, inputProps: props, puppeteerInstance: browser });
    await renderStill({
      composition,
      serveUrl,
      inputProps: props,
      puppeteerInstance: browser,
      output: pg.file,
      imageFormat: 'jpeg',
      jpegQuality: 84,
      scale: 0.4, // 432×768: crisp at 2× DPR for phone-sized tiles
    });
  }
  log.info(`${++i}/${list.length} ${t.id}`);
}
await runtime.close();
process.exit(0);
