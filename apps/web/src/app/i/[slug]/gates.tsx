'use client';

import type { LockedSiteDto } from '@cardai/shared';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

/** Password / guests-only gate for private websites (Site Royale). */
export function LockedSite({ slug, site }: { slug: string; site: LockedSiteDto }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hi = site.language === 'hi';

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(`/api/public/events/${slug}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(hi ? 'पासवर्ड सही नहीं है' : 'That password is not right');
      return;
    }
    const { key } = (await res.json()) as { key: string };
    document.cookie = `inv_k_${slug}=${key}; path=/i/${slug}; max-age=${60 * 60 * 24 * 365}; samesite=lax${location.protocol === 'https:' ? '; secure' : ''}`;
    router.refresh();
  }

  return (
    <main className="grid min-h-svh place-items-center bg-[#1E2250] px-6 py-16 text-center text-white">
      <div className="w-full max-w-sm">
        {site.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.coverUrl} alt="" className="mx-auto mb-8 h-56 rounded-2xl object-cover opacity-90" />
        )}
        <Lock className="mx-auto size-8 text-[#F2A900]" aria-hidden />
        <h1 className="mt-4 text-3xl">{site.title}</h1>
        {site.locked === 'guests' ? (
          <p className="mt-3 text-white/80">
            {hi ? 'यह निमंत्रण केवल आमंत्रित मेहमानों के लिए है। कृपया परिवार द्वारा भेजा गया अपना निजी लिंक खोलें।' : 'This invitation is for invited guests only. Please open the personal link the family sent you.'}
          </p>
        ) : (
          <form onSubmit={unlock} className="mt-6 flex flex-col gap-3">
            <label htmlFor="pw" className="text-white/80">
              {hi ? 'परिवार द्वारा दिया गया पासवर्ड लिखें' : 'Enter the password the family shared with you'}
            </label>
            <input
              id="pw"
              type="password"
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-2 border-white/30 bg-white/10 px-4 text-lg text-white focus:border-white focus:outline-none"
            />
            {error && (
              <p role="alert" className="text-[#FFB4A8]">
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="h-12 rounded-full bg-[#F2A900] font-semibold text-[#1E2250] disabled:opacity-60">
              {hi ? 'निमंत्रण खोलें' : 'Open invitation'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export function ExpiredSite() {
  return (
    <main className="grid min-h-svh place-items-center bg-[#FBF6EC] px-6 text-center text-[#1E2250]">
      <div className="max-w-sm">
        <h1 className="text-3xl">This invitation website is no longer online</h1>
        <p className="mt-3 text-[#1E2250]/75">The celebration has passed. Thank you for being part of it.</p>
        <a href="/" className="mt-6 inline-block font-semibold underline underline-offset-4">
          Make your own invitation
        </a>
      </div>
    </main>
  );
}
