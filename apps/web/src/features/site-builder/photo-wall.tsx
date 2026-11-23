'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Download, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { useQrDataUrl } from '@/lib/qr';

interface AlbumItem {
  id: string;
  url: string;
  uploader: string;
  approved: boolean;
}

/**
 * Photo wall moderation (Live tab): guests' photos wait here until the family approves them,
 * plus a "scan to share your photos" QR poster to print for the venue.
 */
export function PhotoWall({ eventId, liveUrl, title }: { eventId: string; liveUrl: string; title: string }) {
  const qc = useQueryClient();
  const key = ['site', eventId, 'album'] as const;
  const album = useQuery({
    queryKey: key,
    queryFn: () => api<{ items: AlbumItem[] }>(`/events/${eventId}/site/album`),
    select: (d) => d.items,
    // On the day, new photos keep coming in.
    refetchInterval: 30_000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const fail = (err: unknown) => toast.error((err as Error).message);
  const approve = (body: { ids?: string[]; all?: boolean }) => api(`/events/${eventId}/site/album/approve`, { method: 'POST', json: body }).then(refresh, fail);
  const remove = (id: string) => api(`/events/${eventId}/site/album/${id}`, { method: 'DELETE' }).then(refresh, fail);
  const items = album.data ?? [];
  const pending = items.filter((a) => !a.approved);
  const shown = items.filter((a) => a.approved);
  const uploadUrl = `${liveUrl.replace(/#.*$/, '')}#album`;

  return (
    <div className="flex flex-col gap-5">
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-semibold">Waiting for approval {pending.length > 0 && <span className="ml-1 rounded-full bg-marigold/25 px-2 py-0.5 text-xs">{pending.length}</span>}</p>
          {pending.length > 1 && (
            <Button size="sm" variant="line" onClick={() => void approve({ all: true })}>
              <Check className="size-4" /> Approve all
            </Button>
          )}
        </div>
        {pending.length ? (
          <ul className="grid grid-cols-3 gap-1.5">
            {pending.map((a) => (
              <li key={a.id} className="relative aspect-square overflow-hidden rounded-lg">
                <a href={a.url} target="_blank" rel="noopener" title={a.uploader} className="block size-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={`From ${a.uploader}`} loading="lazy" className="size-full object-cover" />
                </a>
                <span className="absolute inset-x-0 top-0 truncate bg-black/55 px-1.5 py-0.5 text-[11px] text-white">{a.uploader}</span>
                <div className="absolute inset-x-1 bottom-1 flex gap-1">
                  <button type="button" onClick={() => void approve({ ids: [a.id] })} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-md bg-white/95 text-xs font-semibold text-neutral-900" aria-label={`Approve photo from ${a.uploader}`}>
                    <Check className="size-3.5" /> Show
                  </button>
                  <button type="button" onClick={() => void remove(a.id)} className="grid size-8 place-items-center rounded-md bg-black/60 text-white" aria-label={`Delete photo from ${a.uploader}`}>
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Nothing waiting. New guest photos appear here first.</p>
        )}
      </section>

      <section>
        <p className="mb-2 font-semibold">On the photo wall ({shown.length})</p>
        {shown.length ? (
          <ul className="grid grid-cols-4 gap-1.5">
            {shown.map((a) => (
              <li key={a.id} className="relative aspect-square overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={`From ${a.uploader}`} loading="lazy" className="size-full object-cover" />
                <button type="button" onClick={() => void remove(a.id)} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white" aria-label={`Remove photo from ${a.uploader}`}>
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">No approved photos yet.</p>
        )}
      </section>

      <VenuePoster url={uploadUrl} title={title} />
    </div>
  );
}

/** A printable A5 poster for the venue: "Scan to share your photos". */
function VenuePoster({ url, title }: { url: string; title: string }) {
  const qr = useQrDataUrl(url, 720);

  async function download() {
    if (!qr) return;
    const W = 1240;
    const H = 1748; // A5 at 150 dpi
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#FFFDF8';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#B98A54';
    g.lineWidth = 6;
    g.strokeRect(50, 50, W - 100, H - 100);
    g.lineWidth = 2;
    g.strokeRect(70, 70, W - 140, H - 140);
    g.fillStyle = '#3A2A20';
    g.textAlign = 'center';
    g.font = '600 64px Georgia, serif';
    g.fillText('Share your photos', W / 2, 260);
    g.font = '40px Georgia, serif';
    g.fillStyle = '#6B5A4E';
    g.fillText('तस्वीरें साझा करें', W / 2, 330);
    const img = new Image();
    img.src = qr;
    await img.decode();
    g.drawImage(img, (W - 720) / 2, 420, 720, 720);
    g.fillStyle = '#3A2A20';
    g.font = '36px Arial, sans-serif';
    g.fillText('Scan with your phone camera', W / 2, 1230);
    g.font = 'italic 48px Georgia, serif';
    g.fillText(title.slice(0, 40), W / 2, 1380);
    g.font = '30px Arial, sans-serif';
    g.fillStyle = '#6B5A4E';
    g.fillText(url.replace(/^https?:\/\//, '').replace(/#album$/, ''), W / 2, 1460);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'photo-wall-qr.png';
    a.click();
  }

  return (
    <section className="rounded-[12px] border border-ink/10 p-4">
      <p className="font-semibold">Photo-wall QR for the venue</p>
      <p className="mt-0.5 text-sm text-ink-soft">Print it and keep it at the entrance, the stage or each table. Guests scan, add photos, and you approve them here.</p>
      <div className="mt-3 flex items-center gap-4">
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qr} alt="" width={112} height={112} className="size-28 rounded-lg border border-ink/10 bg-white p-1 [image-rendering:pixelated]" />
        ) : (
          <div className="skeleton size-28 rounded-lg" />
        )}
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={() => void download()} disabled={!qr}>
            <Download className="size-4" /> Download poster
          </Button>
          <Button size="sm" variant="line" onClick={() => void download().then(() => toast.message('Open the downloaded poster and print it on A5 or A4.'))} disabled={!qr}>
            <Printer className="size-4" /> Print
          </Button>
        </div>
      </div>
    </section>
  );
}
