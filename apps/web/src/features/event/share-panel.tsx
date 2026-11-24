'use client';

import { FREE_PLAN, type EventDto, type RenderDto, type SiteSettingsDto } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Crown, Download, ExternalLink, FileText, Film, Globe, Image as ImageIcon, Printer, RefreshCw, Share2, Sparkles, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EventPhotos } from './event-photos';
import { QrSettingsCard } from './qr-settings';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, ButtonLink } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { qk, useCreateRender, useRenders } from '@/lib/hooks';
import { track } from '@/lib/track';
import { IconTile, Panel, StatusPill } from './panel-ui';

/** Labels: `share.f_<format>` and `share.f_<format>Help`. */
const FORMATS: Array<{ format: RenderDto['format']; icon: typeof ImageIcon; feature?: string }> = [
  { format: 'image', icon: ImageIcon },
  { format: 'video', icon: Film },
  { format: 'site_video', icon: Sparkles },
  { format: 'status_video', icon: Timer },
  { format: 'pdf', icon: FileText },
  { format: 'print_pdf', icon: Printer, feature: 'print_pdf' },
];

/** Shares the actual file (not a link) — on Android this opens WhatsApp with the image attached. */
async function shareFile(url: string, name: string, contentType: string, eventId?: string) {
  track('share', { props: { kind: 'file', eventId: eventId ?? null } });
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
  const qc = useQueryClient();
  const t = useTranslations('share');
  const { data: renders } = useRenders(event.id);
  const create = useCreateRender(event.id);
  const site = useQuery({ queryKey: ['site', event.id], queryFn: () => api<SiteSettingsDto>(`/events/${event.id}/site`) });
  const siteUrl = site.data?.vanityUrl ?? site.data?.shortUrl ?? (typeof window !== 'undefined' ? `${window.location.origin}/i/${event.slug}` : '');
  const live = event.status === 'published';
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Free plan: how many of the account's watermarked images / videos are used (paid invitations skip it).
  const paid = event.features.includes('image_hd') && event.features.includes('video_hd');
  const usage = useQuery({
    queryKey: ['free-usage'],
    queryFn: () => api<{ images: { used: number; max: number }; videos: { used: number; max: number; redos: number } }>('/renders/free-usage'),
    enabled: !paid,
    staleTime: 30_000,
  });

  async function make(format: RenderDto['format']): Promise<RenderDto | null> {
    try {
      const r = await create.mutateAsync(format);
      void qc.invalidateQueries({ queryKey: ['free-usage'] });
      return r;
    } catch (err) {
      // The API says why (e.g. the free plan's images are used up); show it next to the upgrade.
      if (err instanceof ApiError && err.requiredFeature) {
        toast.error(err.message);
        onUpgrade();
      } else toast.error(err instanceof ApiError ? err.message : t('startFailed'));
      return null;
    }
  }

  const copy = () =>
    navigator.clipboard.writeText(siteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });

  async function publish() {
    setPublishing(true);
    try {
      const e = await api<EventDto>(`/events/${event.id}/publish`, { method: 'POST' });
      qc.setQueryData(qk.event(event.id), e);
      toast.success(t('published'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('publishFailed'));
    } finally {
      setPublishing(false);
    }
  }

  const img = renders?.find((x) => x.format === 'image');
  const vid = renders?.filter((x) => x.format === 'video' || x.format === 'site_video').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  // An out-of-date file counts as "being made": it is remade automatically (below), never shared as is.
  const stateOf = (r?: RenderDto) => (!r ? 'none' : r.stale && r.status !== 'failed' ? 'busy' : r.status === 'completed' ? 'ready' : r.status === 'failed' ? 'none' : 'busy');

  // After edits (editor, details, design), remake the card image and video that were already made.
  // `auto`: like the first cover, it uses no free image/video until it is actually shared.
  const refreshed = useRef(new Set<string>());
  useEffect(() => {
    for (const r of [img, vid]) {
      if (!r?.stale || r.status === 'queued' || r.status === 'processing' || refreshed.current.has(r.id)) continue;
      refreshed.current.add(r.id);
      void api<RenderDto>('/renders', { method: 'POST', json: { eventId: event.id, format: r.format, auto: true } })
        .then(() => qc.invalidateQueries({ queryKey: qk.renders(event.id) }))
        .catch(() => undefined);
    }
  }, [img, vid, event.id, qc]);
  const shareOut = async (r0: RenderDto) => {
    // The automatic link-preview cover uses a free image only once it is actually shared.
    const r = (r0.watermark && !r0.freeCounted) || r0.stale ? await make(r0.format) : r0;
    if (r && r.status !== 'completed') {
      toast(t('updating'));
      return;
    }
    const o = r?.outputs[0];
    if (!r) return;
    if (!o) return;
    const ext = o.contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
    void shareFile(o.url, `${event.slug}-${r.format}.${ext}`, o.contentType, event.id);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------- The three outputs: one place for image, video and website ---------------- */}
      <section aria-labelledby="hub-h">
        <h2 id="hub-h" className="text-xl">{t('hubTitle')}</h2>
        <p className="mt-1 text-sm text-ink-soft">{t('hubBody')}</p>
        {usage.data && (
          <p className="mt-2 text-xs text-ink-soft">
            {t('freeUsage', { images: usage.data.images.used, maxImages: usage.data.images.max, videos: usage.data.videos.used, maxVideos: usage.data.videos.max })}{' '}
            <button type="button" onClick={onUpgrade} className="font-semibold text-ink underline underline-offset-4">
              {t('freeUsageUpgrade')}
            </button>
          </p>
        )}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <OutputTile
            icon={ImageIcon}
            title={t('hubImage')}
            help={t('hubImageHelp')}
            status={stateOf(img) === 'ready' ? t('hubReady') : stateOf(img) === 'busy' ? t('hubMaking') : t('hubNotYet')}
            tone={stateOf(img) === 'ready' ? 'leaf' : 'muted'}
            thumb={img?.status === 'completed' ? img.outputs[0]?.url : undefined}
          >
            {img?.status === 'completed' ? (
              <Button size="sm" className="w-full" onClick={() => void shareOut(img)}>
                <Share2 className="size-4" /> {t('hubShareFile')}
              </Button>
            ) : (
              <Button size="sm" className="w-full" variant="line" loading={stateOf(img) === 'busy' || (create.isPending && create.variables === 'image')} onClick={() => make('image')}>
                {t('hubMakeImage')}
              </Button>
            )}
          </OutputTile>
          <OutputTile
            icon={Film}
            title={t('hubVideo')}
            help={t('hubVideoHelp')}
            status={stateOf(vid) === 'ready' ? t('hubReady') : stateOf(vid) === 'busy' ? t('hubMaking') : t('hubNotYet')}
            tone={stateOf(vid) === 'ready' ? 'leaf' : 'muted'}
          >
            {vid?.status === 'completed' ? (
              <Button size="sm" className="w-full" onClick={() => void shareOut(vid)}>
                <Share2 className="size-4" /> {t('hubShareFile')}
              </Button>
            ) : (
              <Button size="sm" className="w-full" variant="line" loading={stateOf(vid) === 'busy' || (create.isPending && create.variables === 'video')} onClick={() => make('video')}>
                {t('hubMakeVideo')}
              </Button>
            )}
          </OutputTile>
          <OutputTile icon={Globe} title={t('hubSite')} help={t('hubSiteHelp')} status={live ? t('hubLive') : t('hubDraft')} tone={live ? 'leaf' : 'muted'}>
            <div className="flex gap-2">
              <ButtonLink size="sm" href={`/builder/${event.id}`} className="flex-1" variant={live ? 'line' : 'primary'}>
                {site.data && !site.data.isDefault ? t('hubEditSite') : t('hubDesignSite')}
              </ButtonLink>
              {live && (
                <ButtonLink size="sm" href={siteUrl} target="_blank" rel="noopener" variant="line" aria-label={t('hubOpenSite')}>
                  <ExternalLink className="size-4" />
                </ButtonLink>
              )}
            </div>
            {/* Free websites open in full for the first FREE_PLAN.siteVisitors people. */}
            {live && site.data?.tier === 'free' && (
              <p className={`mt-2 text-xs ${site.data.visitors >= FREE_PLAN.siteVisitors ? 'font-semibold text-sindoor' : 'text-ink-soft'}`}>
                {site.data.visitors >= FREE_PLAN.siteVisitors
                  ? t('siteVisitorsFull', { max: FREE_PLAN.siteVisitors })
                  : t('siteVisitors', { n: site.data.visitors, max: FREE_PLAN.siteVisitors })}{' '}
                <button type="button" onClick={onUpgrade} className="font-semibold text-ink underline underline-offset-4">
                  {t('freeUsageUpgrade')}
                </button>
              </p>
            )}
          </OutputTile>
        </div>
      </section>

      {/* Photos and the corner QR feed all three outputs. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <EventPhotos event={event} onUpgrade={onUpgrade} />
        <QrSettingsCard event={event} />
      </div>

      {/* ---------------- The link ---------------- */}
      <Panel
        title={t('siteTitle')}
        description={live ? t('siteLive') : t('siteDraft')}
      >
        {live ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 rounded-xl border border-ink/10 bg-ink/[0.03] p-1.5 pl-3.5">
              <Globe className="size-4 shrink-0 text-ink-soft" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium" title={siteUrl}>
                {siteUrl.replace(/^https?:\/\//, '')}
              </span>
              <Button size="sm" variant="line" onClick={copy} aria-label={t('copyLink')}>
                {copied ? <Check className="size-4 text-leaf" /> : <Copy className="size-4" />}
                <span className="max-sm:hidden">{copied ? t('copied') : t('copy')}</span>
              </Button>
            </div>
            {/* Sharing on WhatsApp sits in the page header; here: open the page as guests see it. */}
            <ButtonLink href={siteUrl} target="_blank" variant="line" className="self-start">
              <ExternalLink className="size-4" aria-hidden />
              {t('open')}
            </ButtonLink>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-ink/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <StatusPill tone="muted">{t('notPublished')}</StatusPill>
            <Button onClick={() => void publish()} loading={publishing}>
              {t('publish')}
            </Button>
          </div>
        )}
      </Panel>

      {/* ---------------- Files ---------------- */}
      <Panel title={t('hubMore')} description={t('filesBody')} bodyClassName="!px-0 !pb-0">
        <ul className="divide-y divide-ink/10 border-t border-ink/10">
          {FORMATS.map(({ format, icon, feature }) => {
            const label = t(`f_${format}`);
            const help = t(`f_${format}Help`);
            const r = renders?.find((x) => x.format === format);
            const locked = feature && !event.features.includes(feature);
            const busy = r && (r.status === 'queued' || r.status === 'processing');
            const done = r?.status === 'completed';
            return (
              <li key={format} className="flex flex-col gap-3 px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3.5">
                  <IconTile icon={icon} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[1.0625rem]">{label}</h3>
                      {done && <StatusPill tone="leaf">{t('ready')}</StatusPill>}
                      {r?.watermark && done && <StatusPill tone="muted">{t('watermark')}</StatusPill>}
                      {r?.stale && done && <StatusPill tone="gold">{t('outdated')}</StatusPill>}
                      {locked && <StatusPill tone="gold">{t('paid')}</StatusPill>}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-soft">{help}</p>
                  </div>
                  <div className="hidden shrink-0 sm:block">
                    <Action locked={Boolean(locked)} done={done} busy={Boolean(busy)} pending={create.isPending && create.variables === format} label={label} onUpgrade={onUpgrade} onMake={() => make(format)} />
                  </div>
                </div>

                {busy && (
                  <div aria-live="polite" className="sm:pl-[3.375rem]">
                    <div className="h-px overflow-hidden bg-ink/10">
                      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${Math.max(r.progress, 5)}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{r.status === 'queued' ? t('waiting') : t('making', { progress: r.progress })}</p>
                  </div>
                )}
                {r?.status === 'failed' && <p className="text-sm text-sindoor sm:pl-[3.375rem]">{r.error ?? t('failed')}</p>}

                {done && (
                  <div className="flex flex-wrap items-center gap-2 sm:pl-[3.375rem]">
                    {r.outputs.map((o, i) => {
                      const ext = o.contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
                      const name = `${event.slug}-${format}${r.outputs.length > 1 ? `-${i + 1}` : ''}.${ext}`;
                      return (
                        <span key={o.url} className="inline-flex overflow-hidden rounded-lg border border-ink/10">
                          <button type="button" onClick={() => void shareFile(o.url, name, o.contentType, event.id)} className="inline-flex h-8 items-center gap-1.5 px-3 text-[0.8125rem] font-medium hover:bg-ink/[0.04]">
                            <Share2 className="size-3.5" aria-hidden />
                            {r.outputs.length > 1 ? t('page', { n: i + 1 }) : t('share')}
                          </button>
                          <a href={o.url} download={name} className="grid w-8 place-items-center border-l border-ink/10 hover:bg-ink/[0.04]" aria-label={t('download', { name })}>
                            <Download className="size-3.5" />
                          </a>
                        </span>
                      );
                    })}
                    {r.watermark && (
                      <button type="button" onClick={onUpgrade} className="text-[0.8125rem] font-medium text-primary underline-offset-4 hover:underline">
                        {t('removeWatermark')}
                      </button>
                    )}
                  </div>
                )}

                <div className="sm:hidden">
                  <Action locked={Boolean(locked)} done={done} busy={Boolean(busy)} pending={create.isPending && create.variables === format} label={label} onUpgrade={onUpgrade} onMake={() => make(format)} full />
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

function Action({
  locked,
  done,
  busy,
  pending,
  label,
  onUpgrade,
  onMake,
  full,
}: {
  locked: boolean;
  done: boolean;
  busy: boolean;
  pending: boolean;
  label: string;
  onUpgrade: () => void;
  onMake: () => void;
  full?: boolean;
}) {
  const t = useTranslations('share');
  if (locked)
    return (
      <Button size="sm" variant="line" onClick={onUpgrade} className={full ? 'w-full' : undefined}>
        <Crown className="size-4 text-gold" aria-hidden />
        {t('unlock')}
      </Button>
    );
  return (
    <Button size="sm" variant="line" onClick={onMake} loading={pending} disabled={busy} className={full ? 'w-full' : undefined} aria-label={`${done ? t('makeAgain') : t('make')}: ${label}`}>
      {done ? <RefreshCw className="size-4" aria-hidden /> : null}
      {done ? t('makeAgain') : t('make')}
    </Button>
  );
}

/** One of the three outputs: what it is, whether it is ready, and the one thing to do next. */
function OutputTile({
  icon: Icon,
  title,
  help,
  status,
  tone,
  thumb,
  children,
}: {
  icon: typeof ImageIcon;
  title: string;
  help: string;
  status: string;
  tone: 'leaf' | 'muted';
  thumb?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-ink/10 p-4">
      <div className="flex items-start gap-3">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="size-10 shrink-0 rounded-[8px] border border-ink/10 object-cover" loading="lazy" />
        ) : (
          <IconTile icon={Icon} />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-[1rem] leading-tight">{title}</h3>
          <StatusPill tone={tone}>{status}</StatusPill>
        </div>
      </div>
      <p className="flex-1 text-sm text-ink-soft">{help}</p>
      {children}
    </div>
  );
}
