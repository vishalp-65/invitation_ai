'use client';

import { BUILTIN_TEMPLATES, EVENT_TYPE_IDS, getEventType, LANGUAGES, type EventDto, type EventTypeId, type LanguageCode } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { api, ApiError } from '@/lib/api';
import { track } from '@/lib/track';
import { findTemplate } from '@/lib/template-hooks';
import { defaultWording } from './default-wording';
import { toIso, useDraft, useDraftHydrated } from './draft-store';
import { WizardSkeleton } from '@/components/ui/skeletons';
import { DraftPreview, DraftThumb } from './draft-preview';
import { StepDesign } from './step-design';
import { StepOccasion } from './step-occasion';
import { detailsProblem, StepQuick } from './step-quick';

type StepId = 'occasion' | 'details' | 'design';
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

  // Deep links: /create?type=griha-pravesh, or a design picked on the gallery (&template=…).
  useEffect(() => {
    const type = search.get('type');
    const template = search.get('template');
    if (!type && !template) return;
    const s = useDraft.getState();
    if (type && (EVENT_TYPE_IDS as readonly string[]).includes(type)) s.setType(type as EventTypeId);
    const picked = template && (BUILTIN_TEMPLATES.some((x) => x.id === template) || /^adm-[a-f0-9]{8}$/.test(template));
    if (picked) s.pickTemplate(template);
    // Either way the occasion is known: straight to the details (a picked design stays selected).
    s.set({ source: 'form', scan: undefined, step: 1 });
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
    s.set({ content: defaultWording(s.type, s.language, s.names, s.hosts, s.community), contentIsDefault: true });
  }, [missingWording]);

  const scan = d.source === 'scan';
  const step = Math.min(Math.max(d.step, 0), STEPS.length - 1);
  const id = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const ev = getEventType(d.type);
  const template = findTemplate(d.templateId);

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
    const problem = detailsProblem(d);
    if (problem) {
      setShowErrors(true);
      toast.error(t(problem));
      if (step !== 1) go(1);
      return;
    }
    if (!(await ensureLogin())) return;
    setCreating(true);
    try {
      const title = d.names.filter(Boolean).join(' & ') || ev.label;
      const event = await api<EventDto>('/events', {
        method: 'POST',
        json: {
          type: d.type,
          language: d.language,
          community: d.community,
          templateId: d.templateId,
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
      // Start the card image and the video now, so both are ready (or nearly) on the next page.
      // `auto`: neither uses a free-plan image/video until the user actually shares or downloads it.
      await Promise.allSettled(
        (['image', 'video'] as const).map((format) => api('/renders', { method: 'POST', json: { eventId: event.id, format, auto: true } })),
      );
      d.reset();
      router.push(`/dashboard/events/${event.id}?created=1`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('createFailed'));
      setCreating(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const title = id === 'occasion' ? t('s1Title') : id === 'details' ? (scan ? t('s2TitleScan') : t('s2Title')) : t('s3Title');
  const sub = id === 'occasion' ? t('s1Sub') : id === 'details' ? (scan ? t('s2SubScan') : t('s2Sub')) : t('s3Sub');
  const stepLabel = (s: StepId) => (s === 'occasion' ? (scan ? t('stepCard') : t('stepStart')) : s === 'details' ? (scan ? t('stepReview') : t('stepDetails')) : t('stepDesign'));
  const dockLabel = d.names.filter(Boolean).join(' & ') || t(`occ.${ev.id}`);

  return (
    <div className="min-h-dvh bg-ivory pb-32 sm:pb-36">
      {dialog}

      {/* Step header: numbered stepper, then the question for this step in display type. */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-[1400px] px-5 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-12">
          <Stepper labels={STEPS.map(stepLabel)} step={step} onJump={go} />
          <div key={step} className={clsx('mt-8 sm:mt-10', back ? 'animate-step-back' : 'animate-step-in')}>
            <span className="kicker page-title-kicker mb-5">{t('stepOf', { n: String(step + 1).padStart(2, '0'), total: String(STEPS.length).padStart(2, '0') })}</span>
            <h1 className="page-title">{title}</h1>
            <p className="mt-2 max-w-xl text-ink-soft">{sub}</p>
          </div>
        </div>
      </section>

      <div key={step} className={clsx('mx-auto max-w-[1400px] px-5 pt-8 sm:px-6 sm:pt-12 lg:px-12', back ? 'animate-step-back' : 'animate-step-in')}>
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
        {id === 'details' && <StepQuick showErrors={showErrors} onRescan={() => go(0)} />}
        {id === 'design' && <StepDesign onUse={() => void create()} creating={creating} />}
      </div>

      {/* Action dock: progress line on top, a live thumbnail of the card on the left, navigation on the right. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <span aria-hidden className="absolute inset-x-0 -top-px block h-px bg-ink/10">
          <span className="block h-full bg-ink transition-[width] duration-700 ease-[var(--ease-out-quint)]" style={{ width: `${progress}%` }} />
        </span>
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-12">
          <div className="flex min-w-0 flex-1 items-center gap-2 max-sm:min-w-fit sm:gap-3">
            {step > 0 && (
              <button
                type="button"
                className="press grid size-11 shrink-0 place-items-center rounded-full border border-ink/15 transition-colors hover:border-ink/40 sm:hidden"
                aria-label={t('back')}
                onClick={() => go(step - 1)}
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            {step > 0 && (
              // Tap to see the card full size (phones and tablets; desktop has the side preview).
              <button type="button" onClick={() => setPreviewOpen(true)} className="press shrink-0 border border-ink/15 p-0.5 lg:pointer-events-none" aria-label={t('preview')}>
                <DraftThumb className="w-[30px]" />
              </button>
            )}
            <div className="min-w-0 leading-tight max-[420px]:hidden">
              <p className="truncate font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft" lang={d.language}>
                {dockLabel}
              </p>
              <p className="mt-1 truncate text-sm sm:text-base">
                {step === 0 ? t('dockStart') : (template?.family?.name ?? template?.name)}
                {step > 0 && <span className="text-ink-soft lg:hidden"> · {t('tapPreview')}</span>}
              </p>
            </div>
          </div>

          {step > 0 && (
            <Button variant="line" className="h-12 px-6 max-sm:!hidden" onClick={() => go(step - 1)}>
              <ArrowLeft className="size-4" />
              {t('back')}
            </Button>
          )}
          {last ? (
            <Button variant="solid" className="press group h-12 min-w-0 px-5 sm:px-8" onClick={create} loading={creating}>
              <span className="truncate">{t('create')}</span>
              <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
            </Button>
          ) : step > 0 ? (
            <Button
              variant="solid"
              className="press group h-12 min-w-0 px-5 sm:px-8"
              onClick={() => {
                const problem = detailsProblem(d);
                if (problem) {
                  setShowErrors(true);
                  toast.error(t(problem));
                  return;
                }
                go(step + 1);
              }}
            >
              <span className="truncate">{t('chooseDesign')}</span>
              <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title={t('yourCard')}>
        <div className="mx-auto max-w-[300px]">
          <DraftPreview />
        </div>
      </Dialog>
    </div>
  );
}

/** Numbered steps with a line under each that fills as you go (studio "process" style). */
function Stepper({ labels, step, onJump }: { labels: string[]; step: number; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Progress">
      <ol className="grid grid-cols-3 gap-3 sm:gap-6">
        {labels.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => done && onJump(i)}
                disabled={!done}
                aria-current={current ? 'step' : undefined}
                className="group flex w-full flex-col items-start gap-2.5 text-left disabled:cursor-default"
              >
                <span className="flex items-baseline gap-2.5">
                  <span className={clsx('font-mono text-xs tabular-nums transition-colors', current ? 'text-gold' : done ? 'text-ink' : 'text-ink-soft/60')}>
                    {done ? <Check className="inline size-3.5 animate-pop" strokeWidth={2.5} aria-hidden /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={clsx('text-sm transition-colors', current ? 'text-ink' : done ? 'text-ink-soft group-hover:text-ink' : 'text-ink-soft/60')}>{label}</span>
                </span>
                <span className="block h-px w-full overflow-hidden bg-ink/10" aria-hidden>
                  <span className={clsx('block h-full origin-left transition-transform duration-700 ease-[var(--ease-out-quint)]', current ? 'bg-gold' : 'bg-ink')} style={{ transform: `scaleX(${done || current ? 1 : 0})` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
