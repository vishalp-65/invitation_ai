'use client';

import { useEffect, useState } from 'react';

/**
 * POSTs JSON to a public (no sign-in) endpoint and returns the JSON reply. Throws an Error with
 * the API's own message on a non-2xx reply, and a readable one when the network drops (guests are
 * often on patchy mobile data), so callers can always leave their "sending…" state.
 */
export async function postJson<T>(url: string, body: unknown, fallbackError = 'Something went wrong'): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw Object.assign(new Error('No connection. Check your internet and try again.'), { name: 'NetworkError' });
  }
  const json = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(json.message ?? fallbackError);
  return json;
}

/** Google Maps search link for a venue name / address. */
export const mapsUrl = (q: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;

/**
 * Days / hours / minutes / seconds until `target`, ticking every second; null once it has passed.
 * Starts on the client only, so the server and client never disagree about the clock.
 */
export function useCountdown(target: string | undefined) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!target || now === null) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff / 3600000) % 24),
    minutes: Math.floor((diff / 60000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}
