import type { ApiErrorBody } from '@cardai/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Feature the user must buy to continue, if the API said so. */
  get requiredFeature(): string | undefined {
    return (this.details as { feature?: string } | undefined)?.feature;
  }
}

let refreshing: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshing ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((r) => r.ok)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/**
 * Browser-side API client. Same-origin (/api is rewritten to the API server), cookie auth,
 * transparently refreshes the short-lived access token once on 401.
 */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}, retried = false): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    credentials: 'include',
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...rest.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401 && !retried && !path.startsWith('/auth/')) {
    if (await refreshSession()) return api<T>(path, init, true);
  }
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const err = body as Partial<ApiErrorBody> | undefined;
    throw new ApiError(res.status, err?.message ?? 'Something went wrong', err?.details);
  }
  return body as T;
}

/**
 * Server-side fetch (RSC / route handlers) straight to the API service. Times out so a slow or
 * hung API can't stall server rendering of public pages; callers fall back to built-in data.
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
