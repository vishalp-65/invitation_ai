'use client';

import { useEffect } from 'react';
import { reportError } from '@/lib/report-error';

/** Last resort when the root layout itself crashes: plain HTML, no app styles or fonts. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, { digest: error.digest });
  }, [error]);
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100dvh', margin: 0, background: '#faf8f5', color: '#1a1a1a' }}>
        <main style={{ maxWidth: 420, padding: 24, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 500 }}>Something went wrong</h1>
          <p style={{ color: '#555' }}>Your invitations and replies are safe. Please try again.</p>
          {error.digest && <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#777' }}>Reference: {error.digest}</p>}
          <button type="button" onClick={reset} style={{ marginTop: 16, height: 44, padding: '0 20px', background: '#1a1a1a', color: '#fff', border: 0, cursor: 'pointer' }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
