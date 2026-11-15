import { eq, renders, type RenderOutput } from '@cardai/db';
import { COMPOSITION_IDS, DESIGN_PRINT, RENDER_QUALITY, VIDEO, type RenderJobData } from '@cardai/shared';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import type { Job } from 'bullmq';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WorkerContext } from '../context.js';
import type { RemotionRuntime } from '../remotion.js';
import { loadDesignProps, type DesignRenderProps } from './load-design.js';
import { buildPrintPdf, buildScreenPdf } from './pdf.js';

export function createRenderProcessor(ctx: WorkerContext, remotion: RemotionRuntime) {
  return async function process(job: Job<RenderJobData>): Promise<void> {
    const [render] = await ctx.db.select().from(renders).where(eq(renders.id, job.data.renderId));
    if (!render) return;
    if (render.status === 'completed') return; // idempotent on retries

    const log = ctx.log.child({ renderId: render.id, format: render.format });
    await ctx.db.update(renders).set({ status: 'processing', progress: 1, error: null }).where(eq(renders.id, render.id));
    const dir = await mkdtemp(join(tmpdir(), 'cardai-'));
    let lastProgress = 0;
    const setProgress = async (p: number) => {
      const pct = Math.min(99, Math.round(p * 100));
      if (pct - lastProgress < 8) return; // throttle DB writes
      lastProgress = pct;
      await ctx.db.update(renders).set({ progress: pct }).where(eq(renders.id, render.id));
      await job.updateProgress(pct);
    };

    try {
      // Every card is a layered design now (saved from the editor, or the template's own layout).
      const props = await loadDesignProps(ctx, render.eventId, {
        watermark: render.watermark,
        withQr: render.format === 'print_pdf' || render.format === 'pdf',
      });
      const serveUrl = await remotion.getServeUrl();
      const browser = await remotion.getBrowser();
      const prefix = `renders/${render.eventId}/${render.id}`;
      const outputs: RenderOutput[] = [];

      if (render.format === 'video') {
        const composition = await selectComposition({ serveUrl, id: COMPOSITION_IDS.designVideo, inputProps: props, puppeteerInstance: browser });
        const seconds = composition.durationInFrames / composition.fps;
        // Bitrate budget keeps the MP4 under WhatsApp's forwarding limit regardless of length.
        const kbps = Math.max(RENDER_QUALITY.videoMinKbps, Math.min(RENDER_QUALITY.videoMaxKbps, Math.floor((VIDEO.targetMaxBytes * 8 * 0.92) / seconds / 1000) - 128));
        const file = join(dir, 'invite.mp4');
        await renderMedia({
          composition,
          serveUrl,
          codec: 'h264',
          outputLocation: file,
          inputProps: props,
          puppeteerInstance: browser,
          scale: 1, // 1080p for everyone; free renders differ only by the watermark
          videoBitrate: `${kbps}k`,
          audioBitrate: '128k',
          x264Preset: render.watermark ? 'medium' : 'slow',
          jpegQuality: RENDER_QUALITY.videoFrameQuality,
          concurrency: ctx.env.REMOTION_CONCURRENCY ?? null,
          onProgress: ({ progress }) => void setProgress(progress),
        });
        outputs.push(await upload(ctx, file, `${prefix}/invite.mp4`, 'video/mp4'));
      } else {
        const print = render.format === 'print_pdf';
        const compId = print ? COMPOSITION_IDS.designCardPrint : COMPOSITION_IDS.designCard;
        const pages = props.design.pages;
        const images: Buffer[] = [];
        // Paid stills render at 2x; print is already 300+ DPI and stays lossless at 1x.
        const stillScale = print || render.watermark ? 1 : RENDER_QUALITY.stillScale;

        for (let i = 0; i < pages.length; i++) {
          const pageProps: DesignRenderProps = { ...props, page: i };
          const composition = await selectComposition({ serveUrl, id: compId, inputProps: pageProps, puppeteerInstance: browser });
          const file = join(dir, `page-${i + 1}.${print ? 'png' : 'jpg'}`);
          await renderStill({
            composition,
            serveUrl,
            output: file,
            inputProps: pageProps,
            puppeteerInstance: browser,
            ...(print ? { imageFormat: 'png' as const } : { imageFormat: 'jpeg' as const, jpegQuality: RENDER_QUALITY.stillJpegQuality }),
            scale: stillScale,
          });
          images.push(await readFile(file));
          await setProgress((i + 1) / (pages.length + 1));
          if (render.format === 'image') {
            outputs.push(await upload(ctx, file, `${prefix}/page-${i + 1}.jpg`, 'image/jpeg'));
          }
        }

        if (render.format === 'pdf') {
          const pdf = await buildScreenPdf(images, stillScale);
          const put = await ctx.storage.put(`${prefix}/invite.pdf`, pdf, 'application/pdf');
          outputs.push({ key: put.key, contentType: 'application/pdf', bytes: put.bytes });
        }
        if (print) {
          const pdf = await buildPrintPdf(images, DESIGN_PRINT.bleedPx);
          const put = await ctx.storage.put(`${prefix}/invite-print.pdf`, pdf, 'application/pdf');
          outputs.push({ key: put.key, contentType: 'application/pdf', bytes: put.bytes });
        }
      }

      await ctx.db
        .update(renders)
        .set({ status: 'completed', progress: 100, outputs, completedAt: new Date() })
        .where(eq(renders.id, render.id));
      await ctx.notifications.add('render.completed', { kind: 'render.completed', renderId: render.id });
      log.info({ outputs: outputs.length }, 'render completed');
    } catch (err) {
      const final = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
      log.error({ err, final }, 'render failed');
      await ctx.db
        .update(renders)
        .set({ status: final ? 'failed' : 'queued', error: final ? 'Rendering failed. Please try again.' : null })
        .where(eq(renders.id, render.id));
      if (final) await ctx.notifications.add('render.failed', { kind: 'render.failed', renderId: render.id });
      throw err;
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

async function upload(ctx: WorkerContext, file: string, key: string, contentType: string): Promise<RenderOutput> {
  const [bytes, info] = await Promise.all([readFile(file), stat(file)]);
  await ctx.storage.put(key, bytes, contentType);
  return { key, contentType, bytes: info.size };
}
