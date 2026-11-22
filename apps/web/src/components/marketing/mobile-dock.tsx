'use client';

import { MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * Floating action dock for phones: slides up once the hero's
 * buttons have scrolled away, and tucks away again near the bottom of the page.
 */
export function MobileDock({ label, whatsappHref }: { label: string; whatsappHref: string | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - 700;
      setShow(window.scrollY > 640 && !nearEnd);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-40 transition-[transform,opacity] duration-500 ease-[var(--ease-out-quint)] sm:hidden"
      style={{ transform: show ? 'none' : 'translate3d(0, 140%, 0)', opacity: show ? 1 : 0 }}
      aria-hidden={!show}
    >
      <div className="panel flex items-center gap-2 rounded-xl p-1.5">
        <Link href="/create" tabIndex={show ? 0 : -1} className="press flex h-12 flex-1 items-center justify-center rounded-lg bg-primary font-medium text-on-primary">
          {label}
        </Link>
        {whatsappHref && (
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener"
            tabIndex={show ? 0 : -1}
            aria-label="Make it on WhatsApp"
            className="press grid size-12 place-items-center rounded-lg border border-hairline text-ink"
          >
            <MessageCircle className="size-5" />
          </a>
        )}
      </div>
    </div>
  );
}
