'use client';

import { CheckCircle2, Copy, MessageCircle, Rocket } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Publish step: one clear button, then the link exactly as WhatsApp will show it (picture,
 * title, short link), with one-tap WhatsApp share and copy.
 */
export function PublishCard({
  published,
  liveUrl,
  slug,
  title,
  onPublish,
  publishing,
}: {
  published: boolean;
  liveUrl: string;
  slug: string;
  title: string;
  onPublish: () => void;
  publishing: boolean;
}) {
  // A fresh picture each time the step opens (the preview image is cached for a while).
  const [v] = useState(() => Date.now());
  const host = liveUrl.replace(/^https?:\/\//, '');
  const waText = encodeURIComponent(`You are invited! ${liveUrl}`);

  return (
    <section className="flex flex-col gap-3">
      {published ? (
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-4" aria-hidden /> Your website is live
        </p>
      ) : (
        <div className="rounded-[12px] border border-ink/10 p-4">
          <p className="font-semibold">Ready when you are</p>
          <p className="mt-1 text-sm text-ink-soft">Publishing makes your link work for guests. You can keep editing afterwards; changes show up within seconds.</p>
          <Button className="mt-3 w-full" onClick={onPublish} loading={publishing}>
            <Rocket className="size-4" /> Publish website
          </Button>
        </div>
      )}

      {/* How the link looks in a chat */}
      <div className="rounded-[12px] border border-ink/10 bg-[#E7DED4] p-3 dark:bg-[#0B141A]">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft">Preview in WhatsApp</p>
        <div className="ml-auto max-w-[300px] overflow-hidden rounded-[10px] bg-[#D9FDD3] text-[#111B21] dark:bg-[#005C4B] dark:text-[#E9EDEF]">
          <div className="m-1 overflow-hidden rounded-[8px] bg-black/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/og/invite/${encodeURIComponent(slug)}?v=${v}`} alt="" width={1200} height={630} loading="lazy" className="block aspect-[1200/630] w-full object-cover" />
            <div className="px-2.5 py-2">
              <p className="line-clamp-2 text-[13px] font-semibold leading-snug">{title}</p>
              <p className="mt-0.5 line-clamp-1 text-[12px] opacity-70">You are invited. Tap to open the invitation.</p>
              <p className="mt-0.5 text-[11px] opacity-60">{host.split('/')[0]}</p>
            </div>
          </div>
          <p className="px-2.5 pb-1.5 text-[13px] text-[#027EB5] dark:text-[#53BDEB]">{host}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <a
          href={`https://wa.me/?text=${waText}`}
          target="_blank"
          rel="noopener"
          aria-disabled={!published}
          onClick={(e) => {
            if (!published) {
              e.preventDefault();
              toast.message('Publish first, then share');
            }
          }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-[8px] bg-[#1F8F4E] px-3 text-sm font-semibold text-white"
        >
          <MessageCircle className="size-4" aria-hidden /> WhatsApp
        </a>
        <Button variant="line" onClick={() => navigator.clipboard.writeText(liveUrl).then(() => toast.success('Link copied'))}>
          <Copy className="size-4" /> Copy link
        </Button>
      </div>
    </section>
  );
}
