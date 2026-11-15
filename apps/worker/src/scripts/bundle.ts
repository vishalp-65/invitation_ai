/**
 * Bundles the Remotion templates ahead of time into apps/worker/remotion-bundle so the worker
 * boots without running webpack (faster start, much lower peak memory). Run after `build`:
 *
 *   npm run bundle -w @cardai/worker
 */
import { bundle } from '@remotion/bundler';
import { rm } from 'node:fs/promises';
import { entryPoint, PREBUILT_BUNDLE_DIR } from '../remotion.js';

const started = Date.now();
await rm(PREBUILT_BUNDLE_DIR, { recursive: true, force: true });
await bundle({ entryPoint: entryPoint(), outDir: PREBUILT_BUNDLE_DIR, enableCaching: false });
console.warn(`remotion bundle written to ${PREBUILT_BUNDLE_DIR} in ${Date.now() - started} ms`);
