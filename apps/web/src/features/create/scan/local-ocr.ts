'use client';

import type { LanguageCode } from '@cardai/shared';

/** Tesseract traineddata names for each card language. */
const TESS_LANG: Record<LanguageCode, string> = {
  en: 'eng',
  hi: 'hin',
  mr: 'mar',
  gu: 'guj',
  ta: 'tam',
  te: 'tel',
  kn: 'kan',
  ml: 'mal',
  bn: 'ben',
  pa: 'pan',
  or: 'ori',
  ur: 'urd',
};

/**
 * Fallback reader that runs entirely in the browser (tesseract.js, loaded only when needed).
 * Reads English + Hindi + the card language the user picked; returns the raw text of all photos.
 */
export async function recognizeLocally(images: string[], language: LanguageCode, onProgress?: (p: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const langs = Array.from(new Set(['eng', 'hin', TESS_LANG[language]]));
  let done = 0;
  const worker = await createWorker(langs, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.((done + m.progress) / images.length);
    },
  });
  try {
    const pages: string[] = [];
    for (const img of images) {
      const { data } = await worker.recognize(img);
      pages.push(data.text);
      done++;
    }
    return pages.join('\n\n').replace(/[ \t]+/g, ' ').trim();
  } finally {
    await worker.terminate();
  }
}
