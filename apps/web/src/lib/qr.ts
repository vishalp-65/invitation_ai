'use client';

import { useEffect, useState } from 'react';

/**
 * QR code as a PNG data URL. The encoder (~25 KB) loads only when a QR is actually shown, so
 * pages without one never download it.
 */
export function useQrDataUrl(text: string | null | undefined, size = 480): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!text) {
      setUrl(null);
      return;
    }
    let live = true;
    void import('qrcode')
      .then((QR) => QR.toDataURL(text, { margin: 1, width: size, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#FFFFFF' } }))
      .then((u) => live && setUrl(u))
      .catch(() => live && setUrl(null));
    return () => {
      live = false;
    };
  }, [text, size]);
  return url;
}
