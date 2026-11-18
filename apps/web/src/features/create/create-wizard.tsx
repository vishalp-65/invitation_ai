'use client';

import { BUILTIN_TEMPLATES, EVENT_TYPE_IDS, getEventType, type EventDto, type EventTypeId } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Check, Eye } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { api, ApiError } from '@/lib/api';
import { defaultWording } from './default-wording';
import { toIso, useDraft } from './draft-store';
import { DraftPreview } from './draft-preview';
import { StepDesign } from './step-design';
import { StepOccasion } from './step-occasion';
import { detailsProblem, StepQuick } from './step-quick';
import { track } from '@/lib/track';
import { findTemplate } from '@/lib/hooks';

type StepId = 'occasion' | 'design' | 'details';
interface StepMeta {
  id: StepId;
  en: string;
  hi: string;
  titleEn: string;
  titleHi: string;
  subEn: string;
  subHi: string;
}

/**
 * Form: occasion → design → details → editor. The design comes before the form so people fill in
 * their names while watching them land on the card they picked.
 * Card scan: upload → check what was read → design → editor (the details already exist).
 */
const FORM_STEPS: StepMeta[] = [
  { id: 'occasion', en: 'Start', hi: 'शुरुआत', titleEn: 'What are you celebrating?', titleHi: 'आप क्या मना रहे हैं?', subEn: 'Upload a photo of your printed card, or pick the occasion and fill in the details.', subHi: 'अपने छपे कार्ड की फ़ोटो डालिए, या अवसर चुनकर जानकारी भरिए।' },
  { id: 'design', en: 'Design', hi: 'डिज़ाइन', titleEn: 'Choose your design', titleHi: 'अपना डिज़ाइन चुनिए', subEn: 'Every word, colour and picture stays editable afterwards.', subHi: 'बाद में हर शब्द, रंग और चित्र बदल सकते हैं।' },
  { id: 'details', en: 'Details', hi: 'जानकारी', titleEn: 'Add your details', titleHi: 'अपनी जानकारी भरिए', subEn: 'Watch your card fill in as you type.', subHi: 'लिखते ही कार्ड पर दिखेगा।' },
];
const SCAN_STEPS: StepMeta[] = [
  { ...FORM_STEPS[0]!, en: 'Your card', hi: 'आपका कार्ड' },
  { id: 'details', en: 'Review', hi: 'जाँचें', titleEn: 'Check what we read', titleHi: 'पढ़ी गई जानकारी जाँचिए', subEn: 'Everything from your card is filled in. Fix anything marked “Check”.', subHi: 'आपके कार्ड की जानकारी भर दी गई है। “जाँचें” वाली जगहें देख लीजिए।' },
  { ...FORM_STEPS[1]!, subEn: 'Your details from the card are already on every design.', subHi: 'कार्ड की जानकारी हर डिज़ाइन पर पहले से लगी है।' },
];

export function CreateWizard() {
  const d = useDraft();
  const hi = useLocale() === 'hi';
  const router = useRouter();
  const search = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  /** Direction of the last move, so the new step slides in from the side it came from. */
  const [back, setBack] = useState(false);
  const { ensureLogin, dialog } = useRequireLogin('Verify your email to save your invitation');

  // Deep links: /create?type=griha-pravesh, or a design picked on the gallery (&template=…).
  useEffect(() => {
    const type = search.get('type');
    const template = search.get('template');
    if (!type && !template) return;
    const s = useDraft.getState();
    if (type && (EVENT_TYPE_IDS as readonly string[]).includes(type)) s.setType(type as EventTypeId);
    const picked = template && (BUILTIN_TEMPLATES.some((t) => t.id === template) || /^adm-[a-f0-9]{8}$/.test(template));
    if (picked) s.set({ templateId: template });
    // A chosen design goes straight to the form; an occasion alone goes to the designs.
    s.set({ source: 'form', scan: undefined, step: picked ? 2 : 1 });
    // Consume the params so they can't override the user's own choice later.
    router.replace('/create', { scroll: false });
  }, [search, router]);

  // Always some wording, so the preview is never blank.
  const missingWording = !d.content.headline;
  useEffect(() => {
    if (!missingWording) return;
    const s = useDraft.getState();
    s.set({ content: defaultWording(s.type, s.language, s.names, s.hosts, s.community), contentIsDefault: true });
  }, [missingWording]);

  const STEPS = d.source === 'scan' ? SCAN_STEPS : FORM_STEPS;
  const step = Math.min(Math.max(d.step, 0), STEPS.length - 1);
  const meta = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const detailsStep = STEPS.findIndex((x) => x.id === 'details');
  const designStep = STEPS.findIndex((x) => x.id === 'design');
  const ev = getEventType(d.type);
  const template = findTemplate(d.templateId);

  function go(to: number) {
    setBack(to < step);
    d.set({ step: to });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function create() {
    const problem = detailsProblem(d, hi);
    if (problem) {
      setShowErrors(true);
      toast.error(problem);
      if (step !== detailsStep) go(detailsStep);
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
      d.reset();
      router.push(`/editor/${event.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create the invitation. Try again.');
    } finally {
      setCreating(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;
  const pickedName = step > 0 && template ? (template.family?.name ?? template.name) : null;
  const dockLabel = d.source === 'scan' && step > 0 ? (d.names.filter(Boolean).join(' & ') || (hi ? ev.labelHi : ev.label.split(' / ')[0])) : hi ? ev.labelHi : ev.label.split(' / ')[0];

  return (
    <div className="min-h-dvh bg-ivory pb-32 sm:pb-36">
      {dialog}

      {/* Step header: numbered stepper, then the question for this step in display type. */}
      <section className="border-b border-ink/10">
        <div className="mx-auto max-w-[1400px] px-5 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8 lg:px-12">
          <Stepper steps={STEPS} step={step} hi={hi} onJump={go} />
          <div key={step} className={clsx('mt-8 sm:mt-10', back ? 'animate-step-back' : 'animate-step-in')}>
            <span className="kicker page-title-kicker mb-5">
              {hi ? 'चरण' : 'Step'} {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
            </span>
            <h1 className="page-title">{hi ? meta.titleHi : meta.titleEn}</h1>
            <p className="mt-2 max-w-xl text-ink-soft">{hi ? meta.subHi : meta.subEn}</p>
          </div>
        </div>
      </section>

      <div key={step} className={clsx('mx-auto max-w-[1400px] px-5 pt-8 sm:px-6 sm:pt-12 lg:px-12', back ? 'animate-step-back' : 'animate-step-in')}>
        {meta.id === 'occasion' && (
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
        {meta.id === 'design' && <StepDesign onUse={() => (last ? void create() : go(step + 1))} />}
        {meta.id === 'details' && <StepQuick showErrors={showErrors} onChangeDesign={() => go(designStep)} onRescan={() => go(0)} />}
      </div>

      {/* Action dock: progress line on top, your choices on the left, navigation on the right. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-ivory/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
        <span aria-hidden className="absolute inset-x-0 -top-px block h-px bg-ink/10">
          <span className="block h-full bg-ink transition-[width] duration-700 ease-[var(--ease-out-quint)]" style={{ width: `${progress}%` }} />
        </span>
        <div className="mx-auto flex max-w-[1400px] items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-12">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {step > 0 && (
              <button
                type="button"
                className="press grid size-11 shrink-0 place-items-center rounded-full border border-ink/15 transition-colors hover:border-ink/40 sm:hidden"
                aria-label={hi ? 'पीछे' : 'Back'}
                onClick={() => go(step - 1)}
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            {pickedName && template ? (
              <Image src={`/showcase/${template.id}.jpg`} alt="" width={36} height={64} className="hidden h-12 w-[27px] shrink-0 border border-ink/10 object-cover sm:block" />
            ) : null}
            <div className="hidden min-w-0 leading-tight sm:block">
              <p className="truncate font-mono text-[0.6875rem] uppercase tracking-wider text-ink-soft">{dockLabel}</p>
              <p className="mt-1 truncate">{pickedName ?? (hi ? 'डिज़ाइन अगले चरण में' : 'Design comes next')}</p>
            </div>
          </div>

          {step > 0 && (
            <Button variant="line" className="h-12 px-6 max-sm:!hidden" onClick={() => go(step - 1)}>
              <ArrowLeft className="size-4" />
              {hi ? 'पीछे' : 'Back'}
            </Button>
          )}
          {meta.id === 'details' && (
            <Button variant="line" className="h-12 lg:hidden" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              <span className="max-[400px]:sr-only">{hi ? 'झलक' : 'Preview'}</span>
            </Button>
          )}
          {last ? (
            <Button variant="solid" className="press group h-12 px-6 sm:px-8" onClick={create} loading={creating}>
              {hi ? 'कार्ड बनाइए' : 'Create invitation'}
              <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
            </Button>
          ) : (
            <Button variant="solid" className="press group h-12 px-6 sm:px-8" onClick={() => go(step + 1)}>
              {meta.id === 'design' ? (hi ? 'यह डिज़ाइन चुनें' : 'Use this design') : meta.id === 'details' ? (hi ? 'डिज़ाइन चुनें' : 'Choose design') : hi ? 'आगे' : 'Continue'}
              <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-quint)] group-hover:translate-x-1" />
            </Button>
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title={hi ? 'आपका कार्ड' : 'Your card'}>
        <div className="mx-auto max-w-[300px]">
          <DraftPreview />
        </div>
      </Dialog>
    </div>
  );
}

/** Three numbered steps with a line under each that fills as you go (studio "process" style). */
function Stepper({ steps, step, hi, onJump }: { steps: StepMeta[]; step: number; hi: boolean; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Progress">
      <ol className="grid grid-cols-3 gap-3 sm:gap-6">
        {steps.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s.id}>
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
                  <span className={clsx('text-sm transition-colors', current ? 'text-ink' : done ? 'text-ink-soft group-hover:text-ink' : 'text-ink-soft/60')}>{hi ? s.hi : s.en}</span>
                </span>
                <span className="block h-px w-full overflow-hidden bg-ink/10" aria-hidden>
                  <span
                    className={clsx('block h-full origin-left transition-transform duration-700 ease-[var(--ease-out-quint)]', current ? 'bg-gold' : 'bg-ink')}
                    style={{ transform: `scaleX(${done || current ? 1 : 0})` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
