/**
 * QA stills of the cinematic site video for design packs (cover, middle and closing frames).
 *
 *   npm run site-stills -w @cardai/worker -- raat-mahal,gubbare --out=DIR
 *
 * Writes <id>-1.jpg (cover), <id>-2.jpg (middle) and <id>-3.jpg (closing) into DIR.
 */
import { COMPOSITION_IDS, SITE_DESIGNS, type EventContent } from '@cardai/shared';
import { renderStill, selectComposition } from '@remotion/renderer';
import { mkdir } from 'node:fs/promises';
import pino from 'pino';
import { RemotionRuntime } from '../remotion.js';

const log = pino({ transport: { target: 'pino-pretty', options: { singleLine: true } } });
const only = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2].split(',') : null;
const out = (process.argv.find((a) => a.startsWith('--out='))?.slice(6) ?? 'site-stills').replace(/[/\\]$/, '');
await mkdir(out, { recursive: true });

const content = {
  invocation: '',
  headline: 'Wedding Celebration',
  hostLine: 'Mrs. Sunita & Mr. Ramesh Sharma request the pleasure of your company',
  primaryNames: ['Abhishek', 'Kanika'],
  primaryDetails: [],
  connector: 'weds',
  message: 'Your gracious presence will make our celebration complete.',
  familyTitle: '',
  familyLines: [],
  closing: 'Awaiting your blessings',
  hashtag: '#AbhiWedsKanika',
} as unknown as EventContent;

const runtime = new RemotionRuntime(log);
const serveUrl = await runtime.getServeUrl();
const browser = await runtime.getBrowser();
for (const d of SITE_DESIGNS.filter((x) => !only || only.includes(x.id))) {
  const props = {
    designId: d.id,
    language: 'en',
    timezone: 'Asia/Kolkata',
    content,
    functions: [
      { name: 'Sangeet', startsAt: '2026-12-13T19:00:00+05:30', venueName: 'Rambagh Palace' },
      { name: 'Wedding', startsAt: '2026-12-14T18:00:00+05:30', venueName: 'Rambagh Palace', venueAddress: 'Bhawani Singh Rd, Jaipur' },
    ],
    musicUrl: null,
    watermark: false,
    watermarkText: '',
    link: null,
    style: 'cinematic',
  };
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_IDS.siteVideo, inputProps: props, puppeteerInstance: browser });
  const n = composition.durationInFrames;
  const frames = [Math.round(composition.fps * 6), Math.round(n * 0.5), n - Math.round(composition.fps * 1.5)];
  for (const [i, frame] of frames.entries()) {
    await renderStill({ composition, serveUrl, inputProps: props, puppeteerInstance: browser, frame, output: `${out}/${d.id}-${i + 1}.jpg`, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.35 });
  }
  log.info(`${d.id}: ${n} frames`);
}
await runtime.close();
process.exit(0);
