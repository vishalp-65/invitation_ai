import { bundle } from '@remotion/bundler';
import { ensureBrowser, openBrowser } from '@remotion/renderer';
import { fileURLToPath } from 'node:url';
import type pino from 'pino';

type Browser = Awaited<ReturnType<typeof openBrowser>>;

/**
 * Bundles the templates once per process and keeps one Chrome instance alive.
 * Re-bundling or relaunching Chrome per job would add 10–30 s to every render.
 */
export class RemotionRuntime {
  private serveUrl: Promise<string> | null = null;
  private browser: Promise<Browser> | null = null;

  constructor(private readonly log: pino.Logger) {}

  getServeUrl(): Promise<string> {
    this.serveUrl ??= (async () => {
      const entryPoint = fileURLToPath(import.meta.resolve('@cardai/templates/remotion-entry'));
      const started = Date.now();
      const url = await bundle({ entryPoint, enableCaching: true });
      this.log.info({ ms: Date.now() - started }, 'remotion bundle ready');
      return url;
    })();
    return this.serveUrl;
  }

  getBrowser(): Promise<Browser> {
    this.browser ??= (async () => {
      await ensureBrowser();
      return openBrowser('chrome', { chromiumOptions: { gl: 'swangle' } });
    })();
    return this.browser;
  }

  async warmUp() {
    await Promise.all([this.getServeUrl(), this.getBrowser()]);
  }

  async close() {
    if (this.browser) await (await this.browser).close({ silent: true }).catch(() => undefined);
  }
}
