'use client';

import type { LanguageCode, ScanCardResult } from '@cardai/shared';
import { api, ApiError } from '@/lib/api';
import { recognizeLocally } from './local-ocr';
import { parseCardText } from './local-parse';

export type ScanMethod = ScanCardResult['method'] | 'local';
export type ScanOutcome = Omit<ScanCardResult, 'method'> & { method: ScanMethod };
export type ScanStage = 'preparing' | 'reading' | 'ocr' | 'structuring';

/** Errors the user has to act on (not worth a fallback): bad photo, daily limit, signed out. */
function isFinal(err: unknown) {
  return err instanceof ApiError && [400, 401, 403, 413, 422, 429].includes(err.status);
}

/**
 * Reads a card in up to three tries, best first:
 *  1. vision model on the photos (server),
 *  2. OCR in the browser, then a text model structures it (server),
 *  3. OCR in the browser + local rules, so it works with no AI at all.
 */
export async function scanCard(
  images: string[],
  language: LanguageCode,
  onStage: (stage: ScanStage, progress?: number) => void,
): Promise<ScanOutcome> {
  onStage('reading');
  try {
    return await api<ScanCardResult>('/ai/scan-card', { method: 'POST', json: { images } });
  } catch (err) {
    if (isFinal(err)) throw err;
  }

  onStage('ocr', 0);
  const text = await recognizeLocally(images, language, (p) => onStage('ocr', p));
  if (text.replace(/\s/g, '').length < 15) throw new Error('We could not find any text on this photo. Try a sharper, well-lit photo.');

  onStage('structuring');
  try {
    return await api<ScanCardResult>('/ai/scan-card', { method: 'POST', json: { ocrText: text.slice(0, 8000) } });
  } catch (err) {
    if (err instanceof ApiError && [401, 422].includes(err.status)) throw err;
  }
  return { ...parseCardText(text), method: 'local' };
}
