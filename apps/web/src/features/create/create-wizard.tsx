'use client';

import { BUILTIN_TEMPLATES, EVENT_TYPE_IDS, getEventType, getSiteDesign, LANGUAGES, templateSupportsEvent, type EventDto, type EventTypeId, type LanguageCode } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Check, Pencil, Plus, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Logo } from '@/components/layout/logo';
import { loadGoogleScript } from '@/features/auth/google-button';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { useMe } from '@/lib/hooks';
import { api, ApiError } from '@/lib/api';
import { track } from '@/lib/track';
import { findTemplate } from '@/lib/template-hooks';
import { defaultWording } from './default-wording';
import { detailsKey, toIso, useDraft, useDraftHydrated } from './draft-store';
import { WizardSkeleton } from '@/components/ui/skeletons';
import { DraftPreview, DraftThumb } from './draft-preview';
import { StepDesign } from './step-design';
import { StepOccasion } from './step-occasion';
import { detailsProblem, StepQuick } from './step-quick';

type StepId = 'occasion' | 'details' | 'design';
/** sessionStorage flag: Create was tapped and is waiting for sign-in. */
const PENDING_CREATE = 'cardai-create-pending';
/**
 * Occasion → details → design → the ready page. Details come before the design so every design is
 * shown with the user's own names, and the design step ends in "Create". A card scan follows the
 * same order (its details step is a review of what was read).
 */
const STEPS: StepId[] = ['occasion', 'details', 'design'];

/** Waits for the saved draft, so a returning user never sees step 1 (or the default language) flash first. */
export function CreateWizard() {
  return useDraftHydrated() ? <Wizard /> : <WizardSkeleton />;
}

function Wizard() {
  const d = useDraft();
  const t = useTranslations('create');
  const locale = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  /** Direction of the last move, so the new step slides in from the side it came from. */
  const [back, setBack] = useState(false);
  const { ensureLogin, dialog } = useRequireLogin(t('loginSave'));
  /** The occasion a deep link asked for: the account's latest invitation is only offered if it matches. */
  const linkedType = useRef<string | null>(null);

  // Deep links: /create?type=griha-pravesh, or a design picked on the gallery (&template=… for a
  // card, &site=… for a video / website design).
  useEffect(() => {
    const type = search.get('type');
    const template = search.get('template');
    const site = search.get('site');
    if (!type && !template && !site) return;
    linkedType.current = type;
    const s = useDraft.getState();
    // Details already filled in and this design suits that event: keep its occasion (a gallery link
    // names the design's own first occasion, e.g. wedding for a design made for every occasion).
    const tpl = template ? findTemplate(template) : undefined;
    const keepType = !detailsProblem(s) && (tpl ? templateSupportsEvent(tpl, s.type) : !type || type === s.type || Boolean(site && !template));
    if (!keepType && type && (EVENT_TYPE_IDS as readonly string[]).includes(type)) s.setType(type as EventTypeId);
    // A video design brings its matching card (unless a card was linked too); a card alone lets its video follow it.
    if (site && getSiteDesign(site)) s.pickSiteDesign(site, !template);
    else if (template) s.pickSiteDesign(undefined);
    const picked = template && (BUILTIN_TEMPLATES.some((x) => x.id === template) || /^adm-[a-f0-9]{8}$/.test(template));
    if (picked) s.pickTemplate(template);
    // The occasion is known: straight to the design when the details are in (asked once, not per
    // design), else to the details with the picked design shown beside them.
    const reuse = !detailsProblem(useDraft.getState());
    s.set({ source: 'form', scan: undefined, step: reuse ? 2 : 1 });
    if (reuse) track('details_reused', { templateId: template ?? undefined, props: { from: 'draft' } });
    // Consume the params so they can't override the user's own choice later.
    router.replace('/create', { scroll: false });
  }, [search, router]);

  // Until a language is chosen, the card starts in the site's language.
  const languageSet = Boolean(d.languageSet);
  useEffect(() => {
    if (languageSet) return;
    useDraft.getState().setLanguage(LANGUAGES.some((l) => l.code === locale) ? (locale as LanguageCode) : 'en', false);
  }, [languageSet, locale]);

  // Always some wording, so the preview is never blank.
  const missingWording = !d.content.headline;
  useEffect(() => {
    if (!missingWording) return;
    const s = useDraft.getState();
    s.set({ content: defaultWording(s.type, s.language, s.names, s.hosts, s.community, s.greeting), contentIsDefault: true });
  }, [missingWording]);

  const scan = d.source === 'scan';
  const step = Math.min(Math.max(d.step, 0), STEPS.length - 1);
  const id = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const template = findTemplate(d.templateId);

  // Back from a sign-in that left the page (Google redirect): carry on creating, no second tap.
  const { data: me } = useMe();
  const resumed = useRef(false);
  useEffect(() => {
    const at = Number(sessionStorage.getItem(PENDING_CREATE));
    // Only a fresh tap (10 min), and only from the design step: never a surprise invitation later.
    if (!me || resumed.current || !at || Date.now() - at > 10 * 60_000 || id !== 'design') return;
    resumed.current = true;
    sessionStorage.removeItem(PENDING_CREATE);
    void create();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the user appears
  }, [me]);

  // Signed in with a blank draft: start from the latest upcoming invitation's details (asked once,
  // ever). Its design step then offers to change that invitation's design rather than duplicate it.
  useEffect(() => {
    const s = useDraft.getState();
    if (!me || s.prefilled || s.source === 'scan' || s.names.some((n) => n.trim()) || s.functions.some((f) => f.venueName.trim())) return;
    let cancelled = false;
    void (async () => {
      const done = () => useDraft.getState().set({ prefilled: true });
      try {
        const { items } = await api<{ items: { id: string; type: string; shared: boolean; firstStartsAt: string | null }[] }>('/events');
        // Newest first; only the user's own, still to happen, and of the occasion a link asked for.
        const latest = items.find((e) => !e.shared && e.firstStartsAt && new Date(e.firstStartsAt).getTime() > Date.now());
        if (!latest || (linkedType.current && latest.type !== linkedType.current)) return done();
        const ev = await api<EventDto>(`/events/${latest.id}`);
        const now = useDraft.getState();
        // The user started typing meanwhile: their words win.
        if (cancelled || now.names.some((n) => n.trim()) || now.source === 'scan') return done();
        now.fromEvent(ev);
        if (!detailsProblem(useDraft.getState()) && now.step <= 1) useDraft.getState().set({ step: 2 });
        track('details_reused', { props: { from: 'event' } });
      } catch {
        done();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [me]);

  // These details already make an invitation: the design step changes its design by default.
  const changeTarget = d.lastEvent && d.lastEvent.key === detailsKey(d) ? d.lastEvent : undefined;
  const changing = Boolean(changeTarget) && !d.newInvite;

  // On the last step, warm up sign-in (providers + Google's script) so the dialog opens instantly.
  const qc = useQueryClient();
  useEffect(() => {
    if (id !== 'design' || me) return;
    void qc.prefetchQuery({ queryKey: ['auth-providers'], queryFn: () => api('/auth/providers'), staleTime: 60 * 60_000 });
    void loadGoogleScript().catch(() => undefined);
  }, [id, me, qc]);

  // Funnel: which step people reach (admin dashboard → conversion funnel).
  useEffect(() => {
    track('create_step', { props: { step: id, source: scan ? 'scan' : 'form' } });
  }, [id, scan]);

  function go(to: number) {
    setBack(to < step);
    d.set({ step: to });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function create() {
    // Fresh state, not this render's: "Use this design" picks and creates in the same tap.
    const d = useDraft.getState();
    const problem = detailsProblem(d);
    if (problem) {
      setShowErrors(true);
      toast.error(t(problem));
      if (step !== 1) go(1);
      return;
    }
    // Google may sign in by leaving the page: remember the tap so Create resumes on return.
    sessionStorage.setItem(PENDING_CREATE, String(Date.now()));
    const ok = await ensureLogin();
    if (!ok) {
      sessionStorage.removeItem(PENDING_CREATE);
      return;
    }
    sessionStorage.removeItem(PENDING_CREATE);
    setCreating(true);
    const target = d.lastEvent && d.lastEvent.key === detailsKey(d) && !d.newInvite ? d.lastEvent : undefined;
    if (target) return changeDesign(target);
    try {
      const title = d.names.filter(Boolean).join(' & ') || getEventType(d.type).label;
      const event = await api<EventDto>('/events', {
        method: 'POST',
        json: {
          type: d.type,
          language: d.language,
          community: d.community,
          templateId: d.templateId,
          siteDesign: d.siteDesign,
          title,
          content: { ...d.content, primaryNames: d.names.filter(Boolean).slice(0, 2), primaryDetails: d.parentage.filter(Boolean) },
          functions: d.functions.map((f) => ({
            name: f.name,
            startsAt: toIso(f.date, f.time),
            venueName: f.venueName,
            venueAddress: f.venueAddress || undefined,
            mapUrl: f.mapUrl || undefined,
          })),
        },
      });
      track('event_created', { templateId: d.templateId, props: { type: d.type, language: d.language, source: d.source } });
      // Publish right away so the website link works when shared; the user can unpublish.
      await api(`/events/${event.id}/publish`, { method: 'POST' });
      // Start the card image now so it is ready on the next page (the video starts there, once opened).
      // `auto`: it uses no free-plan image until the user actually shares or downloads it.
      await api('/renders', { method: 'POST', json: { eventId: event.id, format: 'image', auto: true } }).catch(() => undefined);
      // Keep the event details: the next design for this event opens straight on the design step.
      d.keepDetails({ id: event.id, title: event.title });
      router.push(`/dashboard/events/${event.id}?created=1`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('createFailed'));
      setCreating(false);
    }
  }

  /** The same invitation in the newly picked design (card, and the video + website if one was picked). */
  async function changeDesign(target: { id: string; title: string }) {
    const d = useDraft.getState();
    try {
      await api<EventDto>(`/events/${target.id}`, { method: 'PATCH', json: { templateId: d.templateId, ...(d.siteDesign ? { siteDesign: d.siteDesign } : {}) } });
      track('design_changed', { templateId: d.templateId, props: { type: d.type } });
      await api('/renders', { method: 'POST', json: { eventId: target.id, format: 'image', auto: true } }).catch(() => undefined);
      d.keepDetails(target);
      router.push(`/dashboard/events/${target.id}`);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        // That invitation is gone (or no longer theirs): make a new one next time.
        d.set({ lastEvent: undefined });
        toast.error(t('changeGone'));
      } else toast.error(err instanceof ApiError ? err.message : t('createFailed'));
      setCreating(false);
    }
  }

  const title = id === 'occasion' ? t('s1Title') : id === 'details' ? (scan ? t('s2TitleScan') : t('s2Title')) : t('s3Title');
  const sub = id === 'occasion' ? t('s1Sub') : id === 'details' ? (scan ? t('s2SubScan') : t('s2Sub')) : t('s3Sub');
  const stepLabel = (s: StepId) => (s === 'occasion' ? (scan ? t('stepCard') : t('stepStart')) : s === 'details' ? (scan ? t('stepReview') : t('stepDetails')) : t('stepDesign'));

  /** Details → design, after checking the required fields. */
  function next() {
    const problem = detailsProblem(d);
    if (problem) {
      setShowErrors(true);
      toast.error(t(problem));
      return;
    }
    go(step + 1);
  }

  const primary = last ? (
    <Button variant="solid" className="press group h-11 min-w-0 px-5 sm:px-6" onClick={create} loading={creating}>
      <span className="truncate">{changing ? t('changeDesign') : t('create')}</span>
      <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
    </Button>
  ) : step > 0 ? (
    <Button variant="solid" className="press group h-11 min-w-0 px-5 sm:px-6" onClick={next}>
      <span className="truncate">{t('chooseDesign')}</span>
      <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
    </Button>
  ) : null;

  // In the form column on the details and design steps, so the preview beside it starts at the top.
  const heading = (
    <div className="mb-2 flex flex-col gap-4 sm:mb-3">
      <div>
        <h1 className="page-title">{title}</h1>
        <p className="mt-1.5 max-w-xl text-[0.95rem] text-ink-soft">{sub}</p>
      </div>
      {id === 'design' && (
        <DetailsSummary
          onEdit={() => go(1)}
          onNew={() => {
            d.reset();
            go(0);
          }}
        />
      )}
      {id === 'design' && changeTarget && <TargetChoice title={changeTarget.title} changing={changing} onChange={(c) => d.set({ newInvite: !c })} />}
    </div>
  );

  return (
    <div className="min-h-dvh bg-ivory">
      {dialog}

      {/*
        One focused bar instead of the site menu: logo, the three steps, and the actions (desktop).
        Nothing floats over the card preview, and there is no second dock on large screens.
      */}
      <header className="sticky top-0 z-40 border-b border-ink/10 bg-ivory/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-12">
          <Logo compact className="sm:hidden" />
          <Logo className="max-sm:!hidden" />
          <Stepper labels={STEPS.map(stepLabel)} step={step} onJump={go} />
          <div className="ml-auto flex items-center gap-2">
            {step > 0 && (
              <Button variant="line" className="h-11 px-5 max-lg:!hidden" onClick={() => go(step - 1)}>
                <ArrowLeft className="size-4" />
                {t('back')}
              </Button>
            )}
            {primary && <div className="max-lg:hidden">{primary}</div>}
            <Link
              href={me ? '/dashboard' : '/'}
              aria-label={t('exit')}
              title={t('exit')}
              className="press grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink"
            >
              <X className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <div key={step} className={clsx('mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-12 lg:pb-16', back ? 'animate-step-back' : 'animate-step-in')}>
        {id === 'occasion' && <div className="mb-6 sm:mb-8">{heading}</div>}
        {id === 'occasion' && (
          <StepOccasion
            onPicked={() => {
              d.set({ source: 'form', scan: undefined });
              go(1);
            }}
            onScanned={() => {
              setShowErrors(false);
              go(1);
            }}
          />
        )}
        {id === 'details' && (
          <StepQuick
            heading={heading}
            showErrors={showErrors}
            onRescan={() => go(0)}
            footer={
              <Button variant="solid" className="press group h-12 self-end px-8 max-lg:!hidden" onClick={next}>
                {t('chooseDesign')}
                <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
              </Button>
            }
          />
        )}
        {id === 'design' && <StepDesign heading={heading} onUse={() => void create()} creating={creating} useLabel={changing ? t('changeDesign') : t('create')} />}
      </div>

      {/* Phones and tablets only: a slim action bar (back, a tap-to-enlarge thumbnail, the next step). */}
      {step > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-2.5 sm:px-6">
            <button
              type="button"
              className="press grid size-11 shrink-0 place-items-center rounded-full border border-ink/15 transition-colors hover:border-ink/40"
              aria-label={t('back')}
              onClick={() => go(step - 1)}
            >
              <ArrowLeft className="size-4" />
            </button>
            <button type="button" onClick={() => setPreviewOpen(true)} className="press flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={t('preview')}>
              <span className="shrink-0 border border-ink/15 p-0.5">
                <DraftThumb className="w-[26px]" />
              </span>
              <span className="min-w-0 truncate text-sm text-ink-soft max-[420px]:sr-only">{template?.family?.name ?? template?.name}</span>
            </button>
            {primary}
          </div>
        </div>
      )}

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title={t('yourCard')}>
        {/* Only while open: a closed dialog still mounts its children (and would fetch card fonts). */}
        {previewOpen && (
          <div className="mx-auto max-w-[300px]">
            <DraftPreview />
          </div>
        )}
      </Dialog>
    </div>
  );
}

/** When the details already make an invitation: change its design (default) or make another. */
function TargetChoice({ title, changing, onChange }: { title: string; changing: boolean; onChange: (changing: boolean) => void }) {
  const t = useTranslations('create');
  const opt = (on: boolean) =>
    clsx('press inline-flex h-9 min-w-0 items-center gap-1.5 rounded-[var(--radius-control)] px-3 text-sm transition-colors', on ? 'bg-ink text-ivory' : 'text-ink-soft hover:bg-ink/[0.05] hover:text-ink');
  return (
    <div role="radiogroup" aria-label={t('targetLabel')} className="flex w-fit max-w-full flex-wrap gap-1 rounded-[var(--radius-control)] border border-ink/10 p-1">
      <button type="button" role="radio" aria-checked={changing} onClick={() => onChange(true)} className={opt(changing)}>
        <RefreshCw className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{t('targetChange', { title })}</span>
      </button>
      <button type="button" role="radio" aria-checked={!changing} onClick={() => onChange(false)} className={opt(!changing)}>
        <Plus className="size-3.5 shrink-0" aria-hidden />
        {t('targetNew')}
      </button>
    </div>
  );
}

/** The saved event details on the design step: one line, with edit and start-over. */
function DetailsSummary({ onEdit, onNew }: { onEdit: () => void; onNew: () => void }) {
  const d = useDraft();
  const t = useTranslations('create');
  const locale = useLocale();
  const fn = d.functions[0];
  const date = fn?.date ? new Date(`${fn.date}T00:00:00`).toLocaleDateString(locale === 'en' ? 'en-IN' : locale, { weekday: 'short', day: 'numeric', month: 'short' }) : '';
  const bits = [d.names.filter(Boolean).join(' & ') || t(`occ.${d.type}`), date, fn?.venueName].filter(Boolean);
  const btn = 'press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-ink-soft transition-colors hover:bg-ink/[0.05] hover:text-ink';
  return (
    <div className="flex w-fit min-w-0 max-w-full items-center gap-1 rounded-[var(--radius-control)] border border-ink/10 bg-ink/[0.02] py-1 pl-3.5 pr-1 text-sm">
      <span className="min-w-0 truncate" lang={d.language}>
        {bits.join(' · ')}
      </span>
      <button type="button" onClick={onEdit} className={clsx(btn, 'ml-2')}>
        <Pencil className="size-3.5" aria-hidden />
        <span className="max-sm:sr-only">{t('editDetails')}</span>
      </button>
      <button type="button" onClick={onNew} className={btn}>
        <Plus className="size-3.5" aria-hidden />
        <span className="max-sm:sr-only">{t('newEvent')}</span>
      </button>
    </div>
  );
}

/** The three steps in one row: numbered dots joined by short lines; finished steps can be revisited. */
function Stepper({ labels, step, onJump }: { labels: string[]; step: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Progress" className="min-w-0 sm:mx-auto">
      <ol className="flex items-center gap-2 sm:gap-3">
        {labels.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex min-w-0 items-center gap-2 sm:gap-3">
              {i > 0 && <span aria-hidden className={clsx('h-px w-4 shrink-0 sm:w-10', i <= step ? 'bg-ink/50' : 'bg-ink/15')} />}
              <button
                type="button"
                onClick={() => done && onJump(i)}
                disabled={!done}
                aria-current={current ? 'step' : undefined}
                className="group flex min-w-0 items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={clsx(
                    'grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[0.6875rem] tabular-nums transition-colors',
                    done ? 'border-ink bg-ink text-ivory' : current ? 'border-gold text-gold' : 'border-ink/15 text-ink-soft/70',
                  )}
                >
                  {done ? <Check className="size-3.5 animate-pop" strokeWidth={2.5} aria-hidden /> : i + 1}
                </span>
                <span className={clsx('truncate text-sm transition-colors', current ? 'text-ink' : done ? 'text-ink-soft group-hover:text-ink max-sm:sr-only' : 'text-ink-soft/60 max-sm:sr-only')}>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
