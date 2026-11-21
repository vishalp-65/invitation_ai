import 'server-only';
import { ApiError } from './api';

/**
 * Server-side fetch (RSC / route handlers) straight to the API service. Times out so a slow or
 * hung API can't stall server rendering of public pages; callers fall back to built-in data.
 * `server-only` makes the build fail if a client component ever imports this module.
 */
export async function serverApi<T>(path: string, revalidateSec = 30, timeoutMs = 8000): Promise<T> {
  const base = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';
  // A race rather than an AbortSignal: passing `signal` opts the fetch out of Next's request
  // memoization, and generateMetadata + the page share one fetch per request through it.
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ApiError(504, `API timeout after ${timeoutMs} ms`)), timeoutMs);
  });
  const res = await Promise.race([fetch(`${base}/api${path}`, { next: { revalidate: revalidateSec } }), timeout]).finally(() => clearTimeout(timer));
  if (!res.ok) throw new ApiError(res.status, `API ${res.status}`);
  return (await res.json()) as T;
}
