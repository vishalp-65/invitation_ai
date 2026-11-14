'use client';

import { whatsappShareUrl, type EventDto, type RenderDto } from '@cardai/shared';
import { Copy, Download, FileText, Film, Image as ImageIcon, MessageCircle, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, ButtonLink } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { useCreateRender, useRenders } from '@/lib/hooks';

const FORMATS: Array<{ format: RenderDto['format']; label: string; icon: typeof ImageIcon; help: string; feature?: string }> = [
  { format: 'image', label: 'Image card', icon: ImageIcon, help: 'JPG pages for WhatsApp status and chats.' },
  { format: 'video', label: 'Video invite', icon: Film, help: 'MP4 with music, sized for WhatsApp. Takes 1–3 minutes.' },
  { format: 'pdf', label: 'PDF', icon: FileText, help: 'All pages in one file, with a QR code to your website.' },
  { format: 'print_pdf', label: 'Print-ready PDF', icon: Printer, help: '5×7 inch, 300 DPI, bleed and crop marks.', feature: 'print_pdf' },
];

/** Shares the actual file (not a link) — on Android this opens WhatsApp with the image attached. */
async function shareFile(url: string, name: string, contentType: string) {
  const blob = await (await fetch(url)).blob();
  const file = new File([blob], name, { type: contentType });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function SharePanel({ event, onUpgrade }: { event: EventDto; onUpgrade: () => void }) {
  const { data: renders } = useRenders(event.id);
  const create = useCreateRender(event.id);
  const siteUrl = typeof window !== 'undefined' ? `${window.location.origin}/i/${event.slug}` : '';
  const live = event.status === 'published';

  async function make(format: RenderDto['format']) {
    try {
      await create.mutateAsync(format);
    } catch (err) {
      if (err instanceof ApiError && err.requiredFeature) onUpgrade();
      else toast.error(err instanceof ApiError ? err.message : 'Could not start. Try again.');
    }
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="rounded-[var(--radius-card)] bg-primary p-6 text-on-primary">
        <h2 className="text-2xl">Your invitation website</h2>
        {live ? (
          <>
            <p className="mt-2 break-all text-lg">{siteUrl}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <ButtonLink
                href={whatsappShareUrl(`${event.title} — you are invited! ${siteUrl}`)}
                target="_blank"
                rel="noopener"
                className="bg-leaf text-white hover:bg-leaf/90"
              >
                <MessageCircle className="size-4" />
                Share on WhatsApp
              </ButtonLink>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-surface hover:text-ink"
                onClick={() => navigator.clipboard.writeText(siteUrl).then(() => toast.success('Link copied'))}
              >
                <Copy className="size-4" />
                Copy link
              </Button>
              <ButtonLink href={`/i/${event.slug}`} target="_blank" variant="quiet" className="text-white hover:bg-surface/10">
                Open website
              </ButtonLink>
            </div>
          </>
        ) : (
          <p className="mt-2 text-white/80">The website is unpublished. Publish it from the Edit tab to share the link.</p>
        )}
      </section>

      <section>
        <h2 className="text-2xl">Download and share files</h2>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {FORMATS.map(({ format, label, icon: Icon, help, feature }) => {
            const r = renders?.find((x) => x.format === format);
            const locked = feature && !event.features.includes(feature);
            const busy = r && (r.status === 'queued' || r.status === 'processing');
            return (
              <li key={format} className="flex flex-col gap-3 glass-light rounded-[var(--radius-card)] p-5">
                <div className="flex items-start gap-3">
                  <Icon className="mt-1 size-6 text-sindoor" aria-hidden />
                  <div className="flex-1">
                    <h3 className="text-xl">{label}</h3>
                    <p className="text-[0.95rem] text-ink-soft">{help}</p>
                  </div>
                </div>

                {busy && (
                  <div aria-live="polite">
                    <div className="h-2 overflow-hidden rounded-full bg-mist">
                      <div className="h-full rounded-full bg-marigold transition-[width]" style={{ width: `${Math.max(r.progress, 5)}%` }} />
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">{r.status === 'queued' ? 'Waiting to start…' : `Making it… ${r.progress}%`}</p>
                  </div>
                )}
                {r?.status === 'failed' && <p className="text-sm text-sindoor">{r.error ?? 'It failed. Make it again.'}</p>}

                {r?.status === 'completed' && (
                  <div className="flex flex-wrap gap-2">
                    {r.outputs.map((o, i) => {
                      const ext = o.contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
                      const name = `${event.slug}-${format}${r.outputs.length > 1 ? `-${i + 1}` : ''}.${ext}`;
                      return (
                        <span key={o.url} className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => shareFile(o.url, name, o.contentType)}>
                            <Share2 className="size-4" />
                            {r.outputs.length > 1 ? `Page ${i + 1}` : 'Share'}
                          </Button>
                          <a href={o.url} download={name} className="grid size-9 place-items-center rounded-full hover:bg-mist" aria-label={`Download ${name}`}>
                            <Download className="size-4" />
                          </a>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="mt-auto flex items-center gap-3">
                  {locked ? (
                    <Button size="sm" variant="brand" onClick={onUpgrade}>
                      Unlock
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => make(format)} loading={create.isPending && create.variables === format} disabled={Boolean(busy)}>
                      {r?.status === 'completed' ? 'Make again with latest changes' : `Make ${label.toLowerCase()}`}
                    </Button>
                  )}
                  {r?.watermark && r.status === 'completed' && (
                    <button type="button" onClick={onUpgrade} className="text-sm font-semibold text-sindoor underline underline-offset-4">
                      Remove watermark
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
