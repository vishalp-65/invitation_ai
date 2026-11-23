import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Env } from '../../config/env.js';

/**
 * Uploads go browser → API → storage. The bucket has no CORS rules (Spaces won't take them), so the
 * browser can't PUT to it directly. Presign still decides who may upload what: it signs the exact
 * key, type and size, and the upload endpoint refuses anything that doesn't match.
 */
export const UPLOAD_PATH = '/api/storage/upload';
/** Largest accepted upload (songs and photos are capped at 15 MB by presign). */
export const MAX_UPLOAD_BYTES = 16 * 1024 * 1024;
const TTL_SEC = 600;

const mac = (secret: string, key: string, type: string, bytes: number, exp: number) =>
  createHmac('sha256', secret).update(`upload\n${key}\n${type}\n${bytes}\n${exp}`).digest('base64url');

/** What a presign call returns in place of an S3 URL. `apiOrigin` empty = same-origin (via the web rewrite). */
export function signUpload(secret: string, apiOrigin: string, key: string, contentType: string, bytes: number) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SEC;
  const q = new URLSearchParams({ k: key, t: contentType, b: String(bytes), e: String(exp), s: mac(secret, key, contentType, bytes, exp) });
  return { uploadUrl: `${apiOrigin.replace(/\/$/, '')}${UPLOAD_PATH}?${q}`, headers: { 'Content-Type': contentType } };
}

export function verifyUpload(secret: string, q: { k?: string; t?: string; b?: string; e?: string; s?: string }): { key: string; contentType: string; bytes: number } | null {
  const bytes = Number(q.b);
  const exp = Number(q.e);
  if (!q.k || !q.t || !q.s || !Number.isInteger(bytes) || !Number.isInteger(exp) || exp < Date.now() / 1000) return null;
  const want = Buffer.from(mac(secret, q.k, q.t, bytes, exp));
  const got = Buffer.from(q.s);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return { key: q.k, contentType: q.t, bytes };
}

/** Used by every presign call site, so they all hand the browser the same kind of URL. */
export const presignUpload = (env: Pick<Env, 'JWT_ACCESS_SECRET' | 'API_PUBLIC_URL'>, key: string, contentType: string, bytes: number) =>
  signUpload(env.JWT_ACCESS_SECRET, env.API_PUBLIC_URL ?? '', key, contentType, bytes);
