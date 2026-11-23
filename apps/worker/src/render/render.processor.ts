import { eq, renders, type RenderOutput } from '@cardai/db';
import { COMPOSITION_IDS, DESIGN_PRINT, RENDER_QUALITY, VIDEO, type RenderJobData } from '@cardai/shared';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import type { Job } from 'bullmq';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WorkerContext } from '../context.js';
import type { Browser, RemotionRuntime } from '../remotion.js';
import { loadDesignProps, type DesignRenderProps } from './load-design.js';
import { loadSiteVideoProps } from './load-site-video.js';
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

    const finish = async (outputs: RenderOutput[]) => {
      await ctx.db.update(renders).set({ status: 'completed', progress: 100, outputs, completedAt: new Date() }).where(eq(renders.id, render.id));
      await ctx.notifications.add('render.completed', { kind: 'render.completed', renderId: render.id });
      log.info({ outputs: outputs.length }, 'render completed');
    };

    const prefix = `renders/${render.eventId}/${render.id}`;

    /** One H.264 MP4 (card video or cinematic site video), uploaded; 1080p for everyone. */
    const renderMp4 = async (browser: Browser, serveUrl: string, id: string, inputProps: Record<string, unknown>): Promise<RenderOutput> => {
      const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser });
      const file = join(dir, 'invite.mp4');
      await renderMedia({
        composition,
        serveUrl,
        codec: 'h264',
        outputLocation: file,
        inputProps,
        puppeteerInstance: browser,
        scale: 1, // free renders differ only by the watermark
        // Bitrate budget keeps the MP4 under WhatsApp's forwarding limit regardless of length.
        videoBitrate: `${videoKbps(composition.durationInFrames / composition.fps)}k`,
        audioBitrate: '128k',
        x264Preset: render.watermark ? 'medium' : 'slow',
        jpegQuality: RENDER_QUALITY.videoFrameQuality,
        concurrency: ctx.env.REMOTION_CONCURRENCY,
        // Remotion's default frame cache is half of system RAM, far too much inside a container.
        offthreadVideoCacheSizeInBytes: ctx.env.OFFTHREAD_VIDEO_CACHE_MB * 1024 * 1024,
        onProgress: ({ progress }) => void setProgress(progress),
      });
      return upload(ctx, file, `${prefix}/invite.mp4`, 'video/mp4');
    };

    try {
      if (render.format === 'site_video') {
        // Cinematic video from the website's design pack (painted scene, bands, music).
        const props = await loadSiteVideoProps(ctx, render.eventId, { watermark: render.watermark });
        const outputs = await remotion.withBrowser(async (browser, serveUrl) => [await renderMp4(browser, serveUrl, COMPOSITION_IDS.siteVideo, props)]);
        await finish(outputs);
        return;
      }

      // Every card is a layered design now (saved from the editor, or the template's own layout).
      const props = await loadDesignProps(ctx, render.eventId, {
        watermark: render.watermark,
        withQr: render.format === 'print_pdf' || render.format === 'pdf',
        output: render.format === 'video' ? 'video' : 'image',
      });
      const outputs = await remotion.withBrowser(async (browser, serveUrl): Promise<RenderOutput[]> => {
        const outputs: RenderOutput[] = [];
        if (render.format === 'video') return [await renderMp4(browser, serveUrl, COMPOSITION_IDS.designVideo, props)];

        const print = render.format === 'print_pdf';
        const needsPdf = print || render.format === 'pdf';
        const compId = print ? COMPOSITION_IDS.designCardPrint : COMPOSITION_IDS.designCard;
        const pages = props.design.pages;
        // Paid stills render at 2x; print is already 300+ DPI and stays lossless at 1x.
        const stillScale = print || render.watermark ? 1 : RENDER_QUALITY.stillScale;
        // Stills have fixed metadata (no calculateMetadata), so one lookup serves every page.
        const composition = await selectComposition({ serveUrl, id: compId, inputProps: props, puppeteerInstance: browser });
        const files: string[] = [];

        for (let i = 0; i < pages.length; i++) {
          const pageProps: DesignRenderProps = { ...props, page: i };
          const file = join(dir, `page-${i + 1}.${print ? 'png' : 'jpg'}`);
          await renderStill({
            composition: { ...composition, props: pageProps },
            serveUrl,
            output: file,
            inputProps: pageProps,
            puppeteerInstance: browser,
            ...(print ? { imageFormat: 'png' as const } : { imageFormat: 'jpeg' as const, jpegQuality: RENDER_QUALITY.stillJpegQuality }),
            scale: stillScale,
          });
          files.push(file);
          if (render.format === 'image') outputs.push(await upload(ctx, file, `${prefix}/page-${i + 1}.jpg`, 'image/jpeg'));
          await setProgress((i + 1) / (pages.length + 1));
        }

        if (needsPdf) {
          // Pages stay on disk until now, so only the PDF build holds image bytes in memory.
          const images = await Promise.all(files.map((f) => readFile(f)));
          const pdf = print ? await buildPrintPdf(images, DESIGN_PRINT.bleedPx) : await buildScreenPdf(images, stillScale);
          images.length = 0;
          const key = `${prefix}/${print ? 'invite-print.pdf' : 'invite.pdf'}`;
          const put = await ctx.storage.put(key, pdf, 'application/pdf');
          outputs.push({ key: put.key, contentType: 'application/pdf', bytes: put.bytes });
        }
        return outputs;
      });

      await finish(outputs);
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

/** Bitrate budget that keeps the MP4 under WhatsApp's forwarding limit regardless of length. */
function videoKbps(seconds: number): number {
  return Math.max(RENDER_QUALITY.videoMinKbps, Math.min(RENDER_QUALITY.videoMaxKbps, Math.floor((VIDEO.targetMaxBytes * 8 * 0.92) / seconds / 1000) - 128));
}

async function upload(ctx: WorkerContext, file: string, key: string, contentType: string): Promise<RenderOutput> {
  const put = await ctx.storage.put(key, await readFile(file), contentType);
  return { key, contentType, bytes: put.bytes };
}
