'use client';

import {
  lockedInDoc,
  newSection,
  SECTION_INFO,
  SECTION_TIER,
  SITE_SECTION_TYPES,
  tierAtLeast,
  type GuestDto,
  type PublicSiteDto,
  type SiteDoc,
  type SiteSection,
  type SiteSectionType,
  type SiteSettingsDto,
} from '@cardai/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  CloudUpload,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutList,
  Lock,
  Monitor,
  Palette,
  Plus,
  Radio,
  RotateCcw,
  Share2,
  Smartphone,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, ButtonLink } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { api, ApiError } from '@/lib/api';
import { qk, useEvent } from '@/lib/hooks';
import { useTemplate } from '@/lib/template-hooks';
import { AiPanel, LivePanel, LookPanel, SharePanel } from './panels';
import { PublishCard } from './publish-card';
import { EventPhotos } from '@/features/event/event-photos';
import { PhotoBgForEvent } from '@/features/event/photo-bg-settings';
import { QrSettingsCard } from '@/features/event/qr-settings';
import type { PreviewMessage } from './protocol';
import { SectionEditor, type EditorCtx } from './section-editor';
import { track } from '@/lib/track';

/** The builder is a short path: pick a design, fill the page, fine-tune, publish; Live is for the day. */
type Tab = 'design' | 'content' | 'style' | 'publish' | 'live';
const TABS: Array<{ id: Tab; label: string; icon: typeof Sparkles }> = [
  { id: 'design', label: '1 Design', icon: Wand2 },
  { id: 'content', label: '2 Content', icon: LayoutList },
  { id: 'style', label: '3 Style', icon: Palette },
  { id: 'publish', label: '4 Publish', icon: Share2 },
  { id: 'live', label: 'Live', icon: Radio },
];

const TIER_NAME = { free: 'Free', premium: 'Site Premium', royale: 'Site Royale' } as const;

function PreviewFrame({ data, doc, replay, scrollTo, device }: { data: PublicSiteDto; doc: SiteDoc; replay: number; scrollTo: string | null; device: 'phone' | 'desktop' }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const post = useCallback((m: PreviewMessage) => frame.current?.contentWindow?.postMessage(m, window.location.origin), []);

  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewMessage>) => {
      if (e.origin === window.location.origin && e.data?.type === 'site-preview-ready') setReady(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);
  useEffect(() => {
    if (ready) post({ type: 'site-preview', data, doc, replay });
  }, [ready, data, doc, replay, post]);
  useEffect(() => {
    if (ready && scrollTo) post({ type: 'site-scroll', sectionId: scrollTo });
  }, [ready, scrollTo, post]);

  return (
    <div className={`mx-auto h-full ${device === 'phone' ? 'w-[390px] max-w-full' : 'w-full'} transition-[width] duration-300`}>
      <div className={`h-full overflow-hidden bg-black ${device === 'phone' ? 'rounded-[44px] border-[10px] border-[#14141c]' : 'rounded-xl border border-ink/10'}`}>
        <iframe ref={frame} src="/preview/site" title="Website preview" className="size-full border-0 bg-white" />
      </div>
    </div>
  );
}

export function SiteBuilder({ eventId }: { eventId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: event } = useEvent(eventId);
  // The card's design family: its matching website/video pack leads the design picker.
  const { data: cardTemplate } = useTemplate(event?.templateId);
  const settings = useQuery({ queryKey: ['site', eventId], queryFn: () => api<SiteSettingsDto>(`/events/${eventId}/site`) });
  const preview = useQuery({ queryKey: ['site', eventId, 'preview'], queryFn: () => api<PublicSiteDto>(`/events/${eventId}/site/preview`) });
  const guests = useQuery({ queryKey: qk.guests(eventId), queryFn: () => api<{ items: GuestDto[] }>(`/events/${eventId}/guests`), select: (d) => d.items });

  const [doc, setDocState] = useState<SiteDoc | null>(null);
  const [tab, setTab] = useState<Tab>('content');
  const [aiOpen, setAiOpen] = useState(false);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [replay, setReplay] = useState(0);
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');
  const [assets, setAssets] = useState<Record<string, string>>({});
  const [save, setSave] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const dirty = useRef(false);
  const docRef = useRef<SiteDoc | null>(null);
  docRef.current = doc;

  /** Saves pending edits now (the AI draft builds on the saved page). */
  const flush = useCallback(async () => {
    if (!dirty.current || !docRef.current) return;
    setSave('saving');
    await api(`/events/${eventId}/site`, { method: 'PUT', json: { site: docRef.current } });
    dirty.current = false;
    setSave('saved');
  }, [eventId]);

  // First load: start from the saved (or default) document. A brand-new page starts on "Design".
  useEffect(() => {
    if (settings.data && !doc) {
      setDocState(settings.data.site);
      if (settings.data.isDefault) setTab('design');
    }
  }, [settings.data, doc]);

  // Picking another opening plays it in the preview straight away.
  const openingKind = doc?.opening.kind;
  const lastOpening = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (lastOpening.current && openingKind && openingKind !== lastOpening.current) setReplay((r) => r + 1);
    lastOpening.current = openingKind;
  }, [openingKind]);
  useEffect(() => {
    if (preview.data) setAssets((a) => ({ ...preview.data.media.assets, ...a }));
  }, [preview.data]);

  const setDoc = useCallback((fn: (d: SiteDoc) => void) => {
    setDocState((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      fn(next);
      dirty.current = true;
      setSave('dirty');
      return next;
    });
  }, []);

  // Debounced autosave.
  useEffect(() => {
    if (!doc || !dirty.current) return;
    const t = setTimeout(async () => {
      setSave('saving');
      try {
        await api(`/events/${eventId}/site`, { method: 'PUT', json: { site: doc } });
        dirty.current = false;
        setSave('saved');
      } catch (err) {
        setSave('error');
        toast.error(err instanceof ApiError ? err.message : 'Could not save. Check your connection.');
      }
    }, 800);
    return () => clearTimeout(t);
  }, [doc, eventId]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current) e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const publish = useMutation({
    mutationFn: () => api(`/events/${eventId}/publish`, { method: 'POST' }),
    onSuccess: () => {
      track('site_published');
      toast.success('Your website is live');
      void qc.invalidateQueries({ queryKey: qk.event(eventId) });
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const tier = settings.data?.tier ?? 'free';
  const onUpgrade = useCallback(() => router.push(`/dashboard/events/${eventId}?upgrade=site`), [router, eventId]);
  const groups = useMemo(() => [...new Set((guests.data ?? []).map((g) => g.groupLabel?.trim()).filter((g): g is string => Boolean(g)))], [guests.data]);
  const ctx: EditorCtx = useMemo(
    () => ({
      eventId,
      functions: event?.functions ?? [],
      assets,
      addAsset: (id, url) => setAssets((a) => ({ ...a, [id]: url })),
      tier,
      groups,
      onUpgrade,
      names: event?.content.primaryNames.filter(Boolean) ?? [],
      photoCount: event?.settings.photoAssetIds.length ?? 0,
    }),
    [eventId, event?.functions, assets, tier, groups, onUpgrade, event?.content.primaryNames, event?.settings.photoAssetIds.length],
  );
  const previewData = useMemo(() => (preview.data ? { ...preview.data, media: { ...preview.data.media, assets } } : null), [preview.data, assets]);

  if (settings.error || preview.error) {
    return (
      <div className="grid min-h-svh place-items-center bg-workspace px-6 text-center text-ink">
        <div>
          <p className="text-xl">This invitation could not be opened.</p>
          <p className="mt-1 text-ink-soft">{(settings.error ?? preview.error)?.message}</p>
          <ButtonLink href="/dashboard" className="mt-5">
            My invitations
          </ButtonLink>
        </div>
      </div>
    );
  }
  if (!doc || !event || !settings.data || !previewData) {
    return <div className="grid min-h-svh place-items-center bg-workspace text-ink-soft">Loading the website builder…</div>;
  }

  const locked = lockedInDoc(doc, tier);
  const current = doc.sections.find((s) => s.id === selected) ?? null;
  const palette = event ? previewData.template.theme.palette : { primary: '#000000', accent: '#000000', background: '#ffffff' };
  const liveUrl = settings.data.vanityUrl ?? settings.data.shortUrl;

  const move = (id: string, d: number) =>
    setDoc((x) => {
      const i = x.sections.findIndex((s) => s.id === id);
      const j = i + d;
      if (i < 0 || j < 0 || j >= x.sections.length) return;
      const [s] = x.sections.splice(i, 1);
      x.sections.splice(j, 0, s!);
    });
  const select = (id: string) => setSelected(id);
  const add = (type: SiteSectionType) => {
    const s = newSection(type, doc.sections.map((x) => x.id));
    setDoc((x) => {
      // Before the closing section, if there is one.
      const closing = x.sections.findIndex((y) => y.type === 'closing');
      x.sections.splice(closing >= 0 ? closing : x.sections.length, 0, s);
    });
    setAdding(false);
    setSelected(s.id);
  };

  const saveLabel =
    save === 'saving' ? 'Saving…' : save === 'dirty' ? 'Unsaved' : save === 'error' ? 'Not saved' : 'Saved';

  const sectionsList = (
    <div className="flex flex-col gap-2">
      {doc.sections.map((s, i) => {
        const needs = SECTION_TIER[s.type];
        const lockedHere = !tierAtLeast(tier, needs);
        return (
          <div
            key={s.id}
            className={`flex items-center gap-1 rounded-xl border p-1.5 pl-3 transition-colors ${selected === s.id ? 'border-primary bg-surface' : 'border-ink/10 bg-surface-2'} ${s.hidden ? 'opacity-60' : ''}`}
          >
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left" onClick={() => select(s.id)}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.title || SECTION_INFO[s.type].label}</span>
                {s.audience.length > 0 && <span className="block truncate text-xs text-ink-soft">Only: {s.audience.join(', ')}</span>}
              </span>
              {lockedHere && <Lock className="size-3.5 shrink-0 text-ink-soft" aria-label={`Needs ${TIER_NAME[needs]}`} />}
            </button>
            <Button size="sm" variant="quiet" aria-label="Move up" disabled={i === 0} onClick={() => move(s.id, -1)}>
              <ArrowUp className="size-4" />
            </Button>
            <Button size="sm" variant="quiet" aria-label="Move down" disabled={i === doc.sections.length - 1} onClick={() => move(s.id, 1)}>
              <ArrowDown className="size-4" />
            </Button>
            <Button
              size="sm"
              variant="quiet"
              aria-label={s.hidden ? 'Show section' : 'Hide section'}
              onClick={() => setDoc((x) => void (x.sections.find((y) => y.id === s.id)!.hidden = !s.hidden))}
            >
              {s.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            {s.type !== 'hero' && (
              <Button
                size="sm"
                variant="danger"
                aria-label="Delete section"
                onClick={() => {
                  setDoc((x) => void (x.sections = x.sections.filter((y) => y.id !== s.id)));
                  if (selected === s.id) setSelected(null);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        );
      })}
      <Button variant="line" onClick={() => setAdding(true)}>
        <Plus className="size-4" /> Add section
      </Button>
    </div>
  );

  const panel = (
    <div className="flex flex-col gap-6 p-5">
      {tab === 'design' && (
        <>
          {settings.data.isDefault && (
            <div className="rounded-[12px] border border-ink/10 bg-ink/[0.03] p-4 text-sm">
              <p className="font-semibold">This is your invitation website</p>
              <p className="mt-1 text-ink-soft">
                One link with your names, events, venue map, RSVP and wishes. Pick a design below, then fill in the content. Your card image and video are made in the invitation’s Share tab.
              </p>
            </div>
          )}
          <EventPhotos event={event} compact onChange={() => void preview.refetch()} onUpgrade={onUpgrade} />
          <PhotoBgForEvent event={event} onChange={() => void preview.refetch()} />
          <LookPanel part="design" doc={doc} tier={tier} setDoc={setDoc} palette={{ primary: palette.primary, accent: palette.accent, background: palette.background }} eventType={event.type} community={event.community} cardDesign={cardTemplate?.design} ctx={ctx} />
          <Button onClick={() => setTab('content')} className="self-end">
            Next: content
          </Button>
        </>
      )}
      {tab === 'content' &&
        (current ? (
          <div className="flex flex-col gap-4">
            <Button variant="quiet" size="sm" className="self-start" onClick={() => setSelected(null)}>
              <ChevronLeft className="size-4" /> All sections
            </Button>
            <SectionEditor
              section={current}
              ctx={ctx}
              locked={tierAtLeast(tier, SECTION_TIER[current.type]) ? null : SECTION_TIER[current.type]}
              onChange={(next: SiteSection) => setDoc((x) => void (x.sections = x.sections.map((y) => (y.id === next.id ? next : y))))}
            />
          </div>
        ) : (
          <>
            <EventPhotos event={event} onChange={() => void preview.refetch()} onUpgrade={onUpgrade} />
            <div className="rounded-[12px] border border-ink/10">
              <button type="button" onClick={() => setAiOpen((o) => !o)} aria-expanded={aiOpen} className="flex w-full items-center gap-3 p-4 text-left">
                <Sparkles className="size-5 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">Write my page with AI</span>
                  <span className="block text-sm text-ink-soft">Welcome note, your story, FAQs and dress code in your language.</span>
                </span>
                <ChevronLeft className={`size-4 shrink-0 transition-transform ${aiOpen ? 'rotate-90' : '-rotate-90'}`} aria-hidden />
              </button>
              {aiOpen && (
                <div className="border-t border-ink/10 p-4">
                  <AiPanel eventId={eventId} beforeDraft={flush} onDraft={(d) => setDoc((x) => Object.assign(x, d))} />
                </div>
              )}
            </div>
            <p className="text-sm text-ink-soft">Tap a section to edit it. Use the arrows to reorder and the eye to hide.</p>
            {sectionsList}
          </>
        ))}
      {tab === 'style' && <LookPanel part="style" doc={doc} tier={tier} setDoc={setDoc} palette={{ primary: palette.primary, accent: palette.accent, background: palette.background }} eventType={event.type} community={event.community} cardDesign={cardTemplate?.design} ctx={ctx} />}
      {tab === 'publish' && (
        <>
          <PublishCard
            published={event.status === 'published'}
            liveUrl={liveUrl}
            slug={event.slug}
            title={event.title}
            onPublish={() => publish.mutate()}
            publishing={publish.isPending}
          />
          <SharePanel event={event} settings={settings.data} doc={doc} setDoc={setDoc} onUpgrade={onUpgrade} />
          <QrSettingsCard event={event} onChange={() => void preview.refetch()} />
        </>
      )}
      {tab === 'live' && (
        <LivePanel
          eventId={eventId}
          liveUrl={liveUrl}
          title={event.title}
          live={doc.live?.enabled ?? true}
          setLive={(on) => setDoc((x) => void (x.live = { enabled: on }))}
          tier={tier}
          onUpgrade={onUpgrade}
          sections={doc.sections}
          showSection={(type) =>
            setDoc((x) => {
              const s = x.sections.find((y) => y.type === type);
              if (s) s.hidden = false;
              else {
                const closing = x.sections.findIndex((y) => y.type === 'closing');
                x.sections.splice(closing >= 0 ? closing : x.sections.length, 0, newSection(type, x.sections.map((y) => y.id)));
              }
            })
          }
        />
      )}
    </div>
  );

  return (
    <div className="flex h-svh flex-col bg-workspace text-ink">
      {/* Top bar */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-ink/10 bg-surface px-3 sm:px-5">
        <Link href={`/dashboard/events/${eventId}`} className="grid size-10 place-items-center rounded-lg hover:bg-ink/[0.04]" aria-label="Back to invitation">
          <ChevronLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{event.title}</p>
          <p className="flex items-center gap-1.5 text-xs text-ink-soft" aria-live="polite">
            {save === 'saved' ? <Check className="size-3.5" aria-hidden /> : <CloudUpload className="size-3.5" aria-hidden />}
            {saveLabel} · {TIER_NAME[tier]}
          </p>
        </div>
        <div className="hidden items-center gap-1 rounded-lg border border-ink/10 p-1 lg:flex">
          <Button size="sm" variant={device === 'phone' ? 'primary' : 'quiet'} onClick={() => setDevice('phone')} aria-label="Phone preview">
            <Smartphone className="size-4" />
          </Button>
          <Button size="sm" variant={device === 'desktop' ? 'primary' : 'quiet'} onClick={() => setDevice('desktop')} aria-label="Desktop preview">
            <Monitor className="size-4" />
          </Button>
        </div>
        <Button size="sm" variant="line" onClick={() => setReplay((r) => r + 1)} aria-label="Replay opening">
          <RotateCcw className="size-4" />
          <span className="hidden sm:inline">Replay</span>
        </Button>
        {event.status === 'published' ? (
          <>
            <Button size="sm" variant="line" className="max-sm:!hidden" onClick={() => navigator.clipboard.writeText(liveUrl).then(() => toast.success('Link copied'))}>
              <Copy className="size-4" /> Copy link
            </Button>
            <ButtonLink size="sm" href={liveUrl} target="_blank" variant="primary">
              <ExternalLink className="size-4" /> <span className="hidden sm:inline">Open</span>
            </ButtonLink>
          </>
        ) : (
          <Button size="sm" onClick={() => setTab('publish')}>
            Publish
          </Button>
        )}
      </header>

      {locked.length > 0 && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-marigold/15 px-4 py-2 text-sm">
          <p>
            <Lock className="mr-1 inline size-3.5" aria-hidden />
            Guests won’t see:{' '}
            {(['premium', 'royale'] as const)
              .map((t) => {
                const names = [...new Set(locked.filter((l) => l.tier === t).map((l) => (l.label in SECTION_INFO ? SECTION_INFO[l.label as SiteSectionType].label : l.label)))];
                return names.length ? `${names.join(', ')} (${TIER_NAME[t]})` : '';
              })
              .filter(Boolean)
              .join(' · ')}
          </p>
          <Button size="sm" variant="primary" onClick={onUpgrade}>
            Upgrade
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        {/* Editing column */}
        <aside className={`${mobileView === 'edit' ? 'flex' : 'hidden'} w-full min-w-0 flex-col border-r border-ink/10 bg-surface lg:flex lg:w-[420px] lg:shrink-0`}>
          <nav className="flex shrink-0 border-b border-ink/10" role="tablist" aria-label="Builder tools">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 border-b-2 border-transparent text-xs font-medium text-ink-soft aria-selected:border-ink aria-selected:text-ink"
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto pb-24 lg:pb-6">{panel}</div>
        </aside>

        {/* Preview */}
        <main className={`${mobileView === 'preview' ? 'block' : 'hidden'} min-w-0 flex-1 p-3 pb-24 sm:p-6 lg:block lg:pb-6`}>
          <PreviewFrame data={previewData} doc={doc} replay={replay} scrollTo={selected} device={device} />
        </main>
      </div>

      {/* Phones: edit / preview switch */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center p-3 lg:hidden">
        <div className="flex rounded-lg border border-ink/10 bg-ink/[0.02] p-1">
          <Button size="sm" variant={mobileView === 'edit' ? 'primary' : 'quiet'} onClick={() => setMobileView('edit')}>
            Edit
          </Button>
          <Button size="sm" variant={mobileView === 'preview' ? 'primary' : 'quiet'} onClick={() => setMobileView('preview')}>
            <Eye className="size-4" /> Preview
          </Button>
        </div>
      </div>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Add a section">
        <ul className="grid gap-2 p-1 sm:grid-cols-2">
          {SITE_SECTION_TYPES.filter((t) => t !== 'hero').map((t) => {
            const needs = SECTION_TIER[t];
            const used = doc.sections.some((s) => s.type === t);
            return (
              <li key={t}>
                <button type="button" onClick={() => add(t)} className="flex h-full w-full flex-col rounded-xl border border-ink/10 bg-ink/[0.03] p-3 text-left hover:border-ink/30">
                  <span className="flex items-center gap-1.5 font-medium">
                    {SECTION_INFO[t].label}
                    {!tierAtLeast(tier, needs) && (
                      <span className="rounded-lg bg-marigold/20 px-1.5 text-[10px] font-medium uppercase tracking-wide">{needs === 'royale' ? 'Royale' : 'Premium'}</span>
                    )}
                    {used && <span className="text-xs font-normal text-ink-soft">· added</span>}
                  </span>
                  <span className="text-sm text-ink-soft">{SECTION_INFO[t].help}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </div>
  );
}
