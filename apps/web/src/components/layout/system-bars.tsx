'use client';

import { Eye, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOffers } from '@/lib/offers';

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!m) return null;
  try {
    return decodeURIComponent(decodeURIComponent(m[1]!));
  } catch {
    return m[1]!;
  }
}

/**
 * Bars that sit above everything: maintenance notice (admin switch) and, for an admin viewing the
 * product as a customer, a reminder that it is read-only with a way back.
 */
export function SystemBars() {
  const { data } = useOffers();
  const [viewingAs, setViewingAs] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const check = () => setViewingAs(readCookie('cai_imp'));
    check();
    const t = setInterval(check, 15_000);
    return () => clearInterval(t);
  }, []);

  async function exit() {
    setLeaving(true);
    // The refresh cookie is the admin's own: refreshing restores their session and clears the bar.
    await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).catch(() => undefined);
    document.cookie = 'cai_imp=; path=/; max-age=0';
    location.href = '/admin/users';
  }

  const maintenance = data?.flags?.maintenance.on;
  if (!maintenance && !viewingAs) return null;

  return (
    <div className="sticky top-0 z-[60]">
      {viewingAs && (
        <div role="status" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-[#1e2250] px-4 py-2 text-center text-sm text-white">
          <Eye className="size-4 shrink-0" aria-hidden />
          <span>
            Viewing as <strong>{viewingAs}</strong> · read-only, ends in 15 minutes
          </span>
          <button type="button" onClick={() => void exit()} disabled={leaving} className="rounded-[var(--radius-control)] border border-white/40 px-3 py-0.5 text-xs font-medium hover:bg-white/10">
            {leaving ? 'Returning…' : 'Exit to admin'}
          </button>
        </div>
      )}
      {maintenance && (
        <div role="status" className="flex items-center justify-center gap-2 bg-marigold px-4 py-2 text-center text-sm font-medium text-[#1a1300]">
          <Wrench className="size-4 shrink-0" aria-hidden />
          <span>{data?.flags?.maintenance.message || 'We are doing a quick upgrade. You can look around, but saving is paused for a few minutes. / थोड़ी देर के लिए रखरखाव चल रहा है।'}</span>
        </div>
      )}
    </div>
  );
}
