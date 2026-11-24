import type { MediaAssetDto } from '@cardai/shared';
import { api, ApiError } from './api';
import { shrinkImage } from './shrink-image';

/** What the user is told while a file goes up. `pct` is 0–100 during the transfer. */
export type UploadStatus = { step: 'preparing' | 'uploading' | 'saving'; pct?: number };
export type OnUploadStatus = (s: UploadStatus) => void;

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_MB = 15;

/** Plain-language reason for a failed transfer. */
function putError(status: number): Error {
  if (status === 0) return new Error('Upload interrupted. Check your connection and try again.');
  if (status === 403) return new Error('The upload link expired. Please try again.');
  if (status === 413) return new Error(`That file is too large. Keep it under ${MAX_PHOTO_MB} MB.`);
  if (status === 429) return new Error('Too many uploads at once. Wait a minute and try again.');
  return new Error('Upload failed. Please try again.');
}

/** PUT with progress (fetch cannot report upload progress). */
function put(url: string, headers: Record<string, string>, body: Blob, onStatus?: OnUploadStatus): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onStatus?.({ step: 'uploading', pct: Math.min(99, Math.round((e.loaded / e.total) * 100)) });
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(putError(xhr.status)));
    xhr.onerror = () => reject(putError(0));
    xhr.ontimeout = () => reject(putError(0));
    xhr.timeout = 120_000;
    xhr.send(body);
  });
}

async function send(eventId: string, file: Blob, contentType: string, onStatus?: OnUploadStatus): Promise<MediaAssetDto> {
  onStatus?.({ step: 'uploading', pct: 0 });
  let presigned: { assetId: string; uploadUrl: string; headers: Record<string, string> };
  try {
    presigned = await api('/media/presign', { method: 'POST', json: { eventId, contentType, bytes: file.size } });
  } catch (e) {
    // Quota and plan messages come from the API in plain language.
    throw e instanceof ApiError ? e : new Error('Could not start the upload. Check your connection.');
  }
  await put(presigned.uploadUrl, presigned.headers, file, onStatus);
  onStatus?.({ step: 'saving' });
  return api<MediaAssetDto>(`/media/${presigned.assetId}/complete`, { method: 'POST' });
}

/** Resize in the browser, send straight to storage, then confirm with the API. */
export async function uploadPhoto(eventId: string, original: File, onStatus?: OnUploadStatus): Promise<MediaAssetDto> {
  if (!PHOTO_TYPES.includes(original.type)) throw new Error('Use a JPG, PNG or WebP photo.');
  onStatus?.({ step: 'preparing' });
  // Phone photos are resized to 2400 px (sharp on cards and print, light for guests).
  const file = await shrinkImage(original);
  if (file.size > MAX_PHOTO_MB * 1024 * 1024) throw new Error(`That photo is too large. Keep it under ${MAX_PHOTO_MB} MB.`);
  return send(eventId, file, file.type || original.type, onStatus);
}

export interface BatchResult {
  done: MediaAssetDto[];
  failed: { name: string; message: string }[];
}

/**
 * Uploads several photos a few at a time (phones on slow data choke when ten go up together) and
 * keeps the ones that worked when another fails. `onEach` fires as each file finishes.
 */
export async function uploadPhotos(eventId: string, files: File[], opts: { concurrency?: number; onEach?: (finished: number, total: number) => void } = {}): Promise<BatchResult> {
  const out: BatchResult = { done: [], failed: [] };
  let next = 0;
  let finished = 0;
  const worker = async () => {
    while (next < files.length) {
      const file = files[next++]!;
      try {
        out.done.push(await uploadPhoto(eventId, file));
      } catch (e) {
        out.failed.push({ name: file.name, message: (e as Error).message });
      }
      opts.onEach?.(++finished, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 3, files.length) }, worker));
  return out;
}

/** One sentence for the user about files that did not go up. */
export const failureSummary = (failed: BatchResult['failed']) =>
  failed.length === 1 ? `${failed[0]!.name}: ${failed[0]!.message}` : `${failed.length} photos did not upload. ${failed[0]!.message}`;

/** The host's own song for the website (MP3, up to 15 MB). They confirm they may use it. */
export async function uploadAudio(eventId: string, file: File, onStatus?: OnUploadStatus): Promise<MediaAssetDto> {
  if (file.type !== 'audio/mpeg') throw new Error('Use an MP3 file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Keep the song under 15 MB.');
  return send(eventId, file, 'audio/mpeg', onStatus);
}
