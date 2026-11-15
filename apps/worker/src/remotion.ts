import { bundle } from '@remotion/bundler';
import { ensureBrowser, openBrowser } from '@remotion/renderer';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type pino from 'pino';

type Browser = Awaited<ReturnType<typeof openBrowser>>;

/** Pre-built bundle written by `npm run bundle` (Docker does this at build time). */
export const PREBUILT_BUNDLE_DIR = fileURLToPath(new URL('../remotion-bundle/', import.meta.url));

export interface RemotionRuntimeOptions {
  /** Relaunch Chrome after this many jobs to hand back memory it leaks over time (0 = never). */
  recycleAfterJobs?: number;
  /** Use the prebuilt bundle when present (production). Dev always re-bundles so edits show up. */
  usePrebuilt?: boolean;
}

/**
 * Keeps one bundle and one Chrome instance per process — re-bundling or relaunching Chrome per
 * job would add 10–30 s to every render. Chrome is recycled every N jobs (only when idle) so its
 * renderer memory does not creep up over days, and relaunched if it crashes.
 */
export class RemotionRuntime {
  private serveUrl: Promise<string> | null = null;
  private browser: Promise<Browser> | null = null;
  private active = 0;
  private jobsSinceLaunch = 0;
  private dirty = false;

  constructor(
    private readonly log: pino.Logger,
    private readonly opts: RemotionRuntimeOptions = {},
  ) {}

  getServeUrl(): Promise<string> {
    this.serveUrl ??= (async () => {
      // A prebuilt bundle skips webpack entirely: faster boot and ~300–500 MB less peak memory.
      if (this.opts.usePrebuilt && existsSync(`${PREBUILT_BUNDLE_DIR}index.html`)) {
        this.log.info({ dir: PREBUILT_BUNDLE_DIR }, 'using prebuilt remotion bundle');
        return PREBUILT_BUNDLE_DIR;
      }
      const started = Date.now();
      const url = await bundle({ entryPoint: entryPoint(), enableCaching: true });
      this.log.info({ ms: Date.now() - started }, 'remotion bundle ready');
      return url;
    })();
    return this.serveUrl;
  }

  getBrowser(): Promise<Browser> {
    this.browser ??= (async () => {
      await ensureBrowser();
      const b = await openBrowser('chrome', {
        chromiumOptions: { gl: 'swangle' },
        logLevel: 'warn',
      });
      this.jobsSinceLaunch = 0;
      this.dirty = false;
      return b;
    })().catch((err: unknown) => {
      this.browser = null; // allow the next job to retry the launch
      throw err;
    });
    return this.browser;
  }

  /** Runs one job against the shared browser and recycles Chrome when it is due and idle. */
  async withBrowser<T>(fn: (browser: Browser, serveUrl: string) => Promise<T>): Promise<T> {
    const [serveUrl, browser] = await Promise.all([this.getServeUrl(), this.getBrowser()]);
    this.active++;
    try {
      return await fn(browser, serveUrl);
    } catch (err) {
      // A failed render may have left Chrome wedged or crashed; start fresh once it is idle.
      this.dirty = true;
      throw err;
    } finally {
      this.active--;
      this.jobsSinceLaunch++;
      const limit = this.opts.recycleAfterJobs ?? 0;
      if (this.active === 0 && (this.dirty || (limit > 0 && this.jobsSinceLaunch >= limit))) {
        await this.recycle();
      }
    }
  }

  private async recycle() {
    const current = this.browser;
    if (!current) return;
    this.browser = null;
    this.log.info({ jobs: this.jobsSinceLaunch, dirty: this.dirty }, 'recycling chrome');
    await (await current.catch(() => null))?.close({ silent: true }).catch(() => undefined);
  }

  async warmUp() {
    await Promise.all([this.getServeUrl(), this.getBrowser()]);
  }

  async close() {
    if (this.browser) await (await this.browser.catch(() => null))?.close({ silent: true }).catch(() => undefined);
    this.browser = null;
  }
}

export function entryPoint() {
  return fileURLToPath(import.meta.resolve('@cardai/templates/remotion-entry'));
}
