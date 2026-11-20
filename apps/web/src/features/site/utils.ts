'use client';

import { useEffect, useState } from 'react';

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
