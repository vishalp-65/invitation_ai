'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/report-error';

/** Reports uncaught errors and unhandled promise rejections (render errors go through error.tsx). */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // Cross-origin script errors carry no detail; browser extensions are not our bugs.
      if (!e.error || /extension:\/\//.test(e.filename ?? '')) return;
      reportError(e.error);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { name?: string; status?: number } | undefined;
      // Expected API failures (4xx) and aborted fetches are handled by the UI.
      if (r?.name === 'AbortError' || r?.name === 'ApiError' || (r?.status && r.status < 500)) return;
      reportError(e.reason);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
