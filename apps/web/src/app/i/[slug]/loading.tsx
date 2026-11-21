import { BRAND } from '@cardai/shared';

/**
 * What a guest sees while their invitation loads (often on a slow phone connection from a
 * WhatsApp link): a quiet envelope mark instead of a blank screen. CSS only, no JS.
 */
export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#f7f1e8] px-6 text-center text-[#3b2a20]" aria-busy aria-label="Opening your invitation">
      <div>
        <svg viewBox="0 0 64 48" className="mx-auto w-20 animate-pulse" aria-hidden>
          <rect x="2" y="6" width="60" height="40" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M2 9 L32 30 L62 9" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="32" cy="30" r="5" fill="#b5121b" />
        </svg>
        <p className="mt-5 text-lg">Opening your invitation…</p>
        <p className="mt-1 text-sm opacity-60">आपका निमंत्रण खुल रहा है…</p>
        <p className="mt-8 font-mono text-[0.6875rem] uppercase tracking-[0.2em] opacity-40">{BRAND.name}</p>
      </div>
    </main>
  );
}
