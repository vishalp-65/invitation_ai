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
 * The raw Response for an API call (for blobs / downloads): same cookies and one transparent
 * session refresh on 401 as `api()`, without parsing the body.
 */
export async function apiFetch(path: string, init: RequestInit & { json?: unknown } = {}, retried = false): Promise<Response> {
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
    // Retry even when our refresh lost: another tab may have just rotated the shared cookies.
    await refreshSession();
    return apiFetch(path, init, true);
  }
  return res;
}

/**
 * Browser-side API client. Same-origin (/api is rewritten to the API server), cookie auth,
 * transparently refreshes the short-lived access token once on 401.
 */
export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const res = await apiFetch(path, init);
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;
  if (!res.ok) {
    const err = body as Partial<ApiErrorBody> | undefined;
    throw new ApiError(res.status, err?.message ?? 'Something went wrong', err?.details);
  }
  return body as T;
}
