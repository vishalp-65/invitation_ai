/**
 * QA stills of the cinematic site video for design packs (cover, middle and closing frames).
 *
 *   npm run site-stills -w @cardai/worker -- raat-mahal,gubbare --out=DIR
 *
 * Writes <id>-1.jpg (cover), <id>-2.jpg (middle) and <id>-3.jpg (closing) into DIR.
 */
import { COMPOSITION_IDS, SITE_DESIGNS, type EventContent } from '@cardai/shared';
import QRCode from 'qrcode';
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

/** Where the painted art is served (a running web app): `--art=http://localhost:3100`. */
const artOrigin = (process.argv.find((a) => a.startsWith('--art='))?.slice(6) ?? 'http://localhost:3100').replace(/[/]+$/, '');
const qr = { src: await QRCode.toDataURL('https://www.google.com/maps/search/?api=1&query=Rambagh+Palace+Jaipur', { margin: 1, width: 480 }), label: 'Scan for directions', corner: 'br' as const };
const runtime = new RemotionRuntime(log);
const serveUrl = await runtime.getServeUrl();
const browser = await runtime.getBrowser();
// `--status`: frames of the WhatsApp Status countdown clip (7 days to go, and the day itself).
if (process.argv.includes('--status')) {
  for (const d of SITE_DESIGNS.filter((x) => !only || only.includes(x.id))) {
    for (const days of [7, 0]) {
      const props = {
        designId: d.id,
        language: process.argv.includes('--hi') ? 'hi' : 'en',
        timezone: 'Asia/Kolkata',
        content,
        target: { name: 'Wedding', startsAt: '2026-12-14T18:00:00+05:30', venueName: 'Rambagh Palace, Jaipur' },
        days,
        photos: [`${artOrigin}/art/sample-couple.webp`],
        musicUrl: null,
        watermark: false,
        watermarkText: '',
        link: 'noyta.in/ak',
        artOrigin,
      };
      const composition = await selectComposition({ serveUrl, id: COMPOSITION_IDS.statusVideo, inputProps: props, puppeteerInstance: browser });
      for (const [i, sec] of [1, 5].entries()) {
        await renderStill({ composition, serveUrl, inputProps: props, puppeteerInstance: browser, frame: Math.round(sec * composition.fps), output: `${out}/${d.id}-status${days}-${i + 1}.jpg`, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.35 });
      }
    }
    log.info(`${d.id}: status clip`);
  }
  await runtime.close();
  process.exit(0);
}

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
    link: 'noyta.in/ak',
    style: 'cinematic',
    photos: [`${artOrigin}/art/sample-couple.webp`, `${artOrigin}/art/sample-couple-2.webp`],
    qr,
    artOrigin,
  };
  const composition = await selectComposition({ serveUrl, id: COMPOSITION_IDS.siteVideo, inputProps: props, puppeteerInstance: browser });
  const n = composition.durationInFrames;
  // Photo storybook designs: one frame near the end of each scene; others: cover, middle, closing.
  const fps = composition.fps;
  // Layout designs: five frames spread across the video.
  const frames = d.layout ? [0.1, 0.3, 0.5, 0.72, 0.94].map((f) => Math.round(n * f)) : d.look ? [3.4, 8.6, 13.2, 16.4, 24].map((s) => Math.min(n - 1, Math.round(s * fps))) : [Math.round(fps * 6), Math.round(n * 0.5), n - Math.round(fps * 1.5)];
  for (const [i, frame] of frames.entries()) {
    await renderStill({ composition, serveUrl, inputProps: props, puppeteerInstance: browser, frame, output: `${out}/${d.id}-${i + 1}.jpg`, imageFormat: 'jpeg', jpegQuality: 80, scale: 0.35 });
  }
  log.info(`${d.id}: ${n} frames`);
}
await runtime.close();
process.exit(0);
