'use client';

import { BUILTIN_TEMPLATES, EVENT_TYPE_IDS, getEventType, planCardPages, type EventDto, type EventTypeId } from '@cardai/shared';
import { Check, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { InvitePlayer } from '@/components/invite/lazy-player';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/field';
import { Dialog } from '@/components/ui/dialog';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { api, ApiError } from '@/lib/api';
import { defaultWording } from './default-wording';
import { toIso, useDraft } from './draft-store';
import { StepDesign } from './step-design';
import { StepDetails } from './step-details';
import { StepFunctions } from './step-functions';
import { StepOccasion } from './step-occasion';
import { useDraftProps } from './use-draft-props';

const STEPS = ['stepEvent', 'stepDetails', 'stepFunctions', 'stepDesign'] as const;

export function CreateWizard() {
  const t = useTranslations('wizard');
  const d = useDraft();
  const router = useRouter();
  const search = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { ensureLogin, dialog } = useRequireLogin('Verify your mobile number to save your invitation');

  // Deep link from the landing page: /create?type=griha-pravesh
  useEffect(() => {
    const type = search.get('type');
    const template = search.get('template');
    if (!type && !template) return;
    if (type && (EVENT_TYPE_IDS as readonly string[]).includes(type)) useDraft.getState().setType(type as EventTypeId);
    // Picked a design on the landing/gallery page: preselect it.
    if (template && BUILTIN_TEMPLATES.some((t) => t.id === template)) useDraft.getState().set({ templateId: template });
    // Consume the param so it can't override the user's own choice later.
    router.replace('/create', { scroll: false });
  }, [search, router]);

  // Make sure there is always some wording so the preview is never blank.
  const missingWording = !d.content.headline;
  useEffect(() => {
    if (!missingWording) return;
    const s = useDraft.getState();
    s.set({ content: defaultWording(s.type, s.language, s.names, s.hosts), contentIsDefault: true });
  }, [missingWording]);

  const step = Math.min(d.step, STEPS.length - 1);
  const last = step === STEPS.length - 1;

  function canContinue(): string | null {
    if (step === 2 && d.functions.some((f) => !f.name || !f.venueName || !f.date)) return 'Fill the name, date and venue for every function.';
    return null;
  }

  function next() {
    const problem = canContinue();
    if (problem) return toast.error(problem);
    d.set({ step: step + 1 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function create() {
    if (!(await ensureLogin())) return;
    setCreating(true);
    try {
      const title = d.names.filter(Boolean).join(' & ') || getEventType(d.type).label;
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
      // Publish right away so the website link works when shared; the user can unpublish.
      await api(`/events/${event.id}/publish`, { method: 'POST' });
      await api('/renders', { method: 'POST', json: { eventId: event.id, format: 'image' } });
      d.reset();
      router.push(`/dashboard/events/${event.id}?created=1`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create the invitation. Try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-32 pt-6 sm:px-6 lg:grid-cols-[1fr_360px]">
      {dialog}
      <div>
        <header className="mb-8">
          <p className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="mt-3 text-4xl sm:text-5xl">{t(STEPS[step]!)}</h1>
        </header>

        {/* Stepper: done steps are clickable, future ones are not. */}
        <nav aria-label="Progress" className="mb-10">
          <ol className="grid grid-cols-4 gap-2">
            {STEPS.map((s, i) => {
              const done = i < step;
              const current = i === step;
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => done && d.set({ step: i })}
                    disabled={!done}
                    aria-current={current ? 'step' : undefined}
                    className="group flex w-full flex-col gap-2.5 text-left disabled:cursor-default"
                  >
                    <span className="h-1 w-full overflow-hidden rounded-full bg-hairline">
                      <span
                        className="block h-full origin-left rounded-full bg-ink transition-transform duration-500 ease-[var(--ease-out-quint)]"
                        style={{ transform: `scaleX(${done || current ? 1 : 0})` }}
                      />
                    </span>
                    <span className={`flex items-center gap-1.5 text-sm font-semibold ${current ? 'text-ink' : done ? 'text-ink-soft group-hover:text-ink' : 'text-ink-soft/60'}`}>
                      {done ? (
                        <Check className="size-3.5 shrink-0 text-leaf" strokeWidth={3} aria-hidden />
                      ) : (
                        <span className="tabular-nums">{i + 1}.</span>
                      )}
                      <span className="truncate max-sm:sr-only">{t(s)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div key={step} className="animate-fade-up">
          {step === 0 && <StepOccasion />}
          {step === 1 && <StepDetails />}
          {step === 2 && <StepFunctions />}
          {step === 3 && <StepDesign />}
        </div>

        {/* Action bar: a floating dock on phones (thumb-reachable), inline on desktop. Solid, no blur. */}
        <div className="fixed inset-x-3 bottom-[max(12px,env(safe-area-inset-bottom))] z-20 lg:static lg:mt-12">
          <div className="panel mx-auto flex max-w-6xl items-center gap-2 rounded-full p-1.5 pl-2 shadow-lift lg:rounded-none lg:border-x-0 lg:border-b-0 lg:bg-transparent lg:p-0 lg:pt-6 lg:shadow-none">
            {step > 0 && (
              <Button variant="quiet" className="px-3 sm:px-5" aria-label={t('back')} onClick={() => d.set({ step: step - 1 })}>
                <ChevronLeft className="size-4" />
                <span className="hidden sm:inline">{t('back')}</span>
              </Button>
            )}
            <Button variant="quiet" className="px-3 sm:px-5 lg:hidden" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              <span className="max-[380px]:sr-only">{t('preview')}</span>
            </Button>
            <div className="ml-auto">
              {last ? (
                <Button variant="solid" size="md" className="h-12 lg:h-14 lg:px-8 lg:text-lg" onClick={create} loading={creating}>
                  {t('create')}
                </Button>
              ) : (
                <Button variant="solid" size="md" className="h-12 lg:h-14 lg:px-8 lg:text-lg" onClick={next}>
                  {t('next')}
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="panel sticky top-24 rounded-[var(--radius-card)] p-5">
          <p className="mb-4 flex items-center justify-between text-sm font-semibold text-ink-soft">
            Live preview
            <span className="inline-flex items-center gap-1.5 text-xs font-medium">
              <span className="size-1.5 rounded-full bg-leaf" aria-hidden />
              Updates as you type
            </span>
          </p>
          <LivePreview />
        </div>
      </aside>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title={t('preview')}>
        <div className="mx-auto max-w-[300px]">
          <LivePreview />
        </div>
      </Dialog>
    </div>
  );
}

function LivePreview() {
  const d = useDraft();
  const props = useDraftProps(d);
  const [mode, setMode] = useState<'card' | 'video'>('card');
  const [page, setPage] = useState(0);
  const pages = planCardPages(props).length;
  const current = Math.min(page, pages - 1);

  return (
    <div>
      <div className="mb-3 flex gap-2" role="tablist">
        <Chip selected={mode === 'card'} onClick={() => setMode('card')} role="tab" aria-selected={mode === 'card'}>
          Card
        </Chip>
        <Chip selected={mode === 'video'} onClick={() => setMode('video')} role="tab" aria-selected={mode === 'video'}>
          Video
        </Chip>
      </div>
      <InvitePlayer props={{ ...props, page: current }} mode={mode} className="shadow-[var(--shadow-soft)]" />
      {mode === 'card' && pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPage(i)}
              aria-label={`Page ${i + 1}`}
              aria-current={i === current}
              className="h-2 w-2 rounded-full bg-line transition-[width,background-color] duration-300 aria-[current=true]:w-5 aria-[current=true]:bg-ink"
            />
          ))}
        </div>
      )}
    </div>
  );
}
