'use client';

import { useSyncExternalStore } from 'react';

/**
 * Device tier. "lite" = a low-end phone / slow connection / data saver: the landing page swaps its
 * scroll-driven 3D, canvases, video and blur effects for static layouts. Decided before first paint
 * by LITE_BOOT_SCRIPT (perf-boot.ts), which sets `data-perf="lite"` on <html>.
 */
/** Non-React read (effects, canvas loops). False on the server. */
export const isLite = () => typeof document !== 'undefined' && document.documentElement.dataset.perf === 'lite';

const subscribe = () => () => {};

/** True on a low-end device. Server and hydration render `false`, then it corrects without a mismatch. */
export function useLite(): boolean {
  return useSyncExternalStore(subscribe, isLite, () => false);
}
