'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from './api';

/**
 * Feature switches for the current person (roll-outs are stable per account / visitor).
 * Missing keys fall back to `fallback` so a slow or failed request never hides working features.
 *
 *   const newEditor = useFlag('new-editor', false);
 */
export function useFlags() {
  return useQuery({ queryKey: ['flags'], queryFn: () => api<Record<string, boolean>>('/flags'), staleTime: 60_000 });
}

export function useFlag(key: string, fallback = true): boolean {
  return useFlags().data?.[key] ?? fallback;
}
