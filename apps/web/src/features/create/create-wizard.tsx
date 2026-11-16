'use client';

import { BUILTIN_TEMPLATES, EVENT_TYPE_IDS, getEventType, type EventDto, type EventTypeId } from '@cardai/shared';
import { clsx } from 'clsx';
import { ArrowLeft, ArrowRight, Check, Eye, Sparkles } from 'lucide-react';
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

/**
 * Occasion → design → details → editor. The design comes before the form so people fill in
 * their names while watching them land on the card they picked.
 */
const STEPS = [
  { id: 'occasion', en: 'Occasion', hi: 'अवसर', titleEn: 'What are you celebrating?', titleHi: 'आप क्या मना रहे हैं?', subEn: 'Pick the occasion and the language your guests read.', subHi: 'अवसर और कार्ड की भाषा चुनिए।' },
  { id: 'design', en: 'Design', hi: 'डिज़ाइन', titleEn: 'Choose your design', titleHi: 'अपना डिज़ाइन चुनिए', subEn: 'Every word, colour and picture stays editable afterwards.', subHi: 'बाद में हर शब्द, रंग और चित्र बदल सकते हैं।' },
  { id: 'details', en: 'Details', hi: 'जानकारी', titleEn: 'Add your details', titleHi: 'अपनी जानकारी भरिए', subEn: 'Watch your card fill in as you type.', subHi: 'लिखते ही कार्ड पर दिखेगा।' },
] as const;

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
    s.set({ step: picked ? 2 : 1 });
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

  const step = Math.min(Math.max(d.step, 0), STEPS.length - 1);
  const meta = STEPS[step]!;
  const last = step === STEPS.length - 1;
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
      track('event_created', { templateId: d.templateId, props: { type: d.type, language: d.language } });
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

  return (
    <div className="min-h-dvh bg-ivory pb-36">
      {dialog}

      {/* Progress + the question for this step, on a plain surface. */}
      <section className="border-b border-hairline bg-surface">
        <div className="mx-auto max-w-6xl px-5 pb-7 pt-6 sm:px-6 sm:pb-9 sm:pt-7">
          <Stepper step={step} hi={hi} onJump={go} />
          <div key={step} className={clsx('mt-7 sm:mt-9', back ? 'animate-step-back' : 'animate-step-in')}>
            <h1 className="text-[2rem] sm:text-[2.75rem]">{hi ? meta.titleHi : meta.titleEn}</h1>
            <p className="mt-2 max-w-xl text-ink-soft">{hi ? meta.subHi : meta.subEn}</p>
          </div>
        </div>
      </section>

      <div key={step} className={clsx('mx-auto max-w-6xl px-5 pt-8 sm:px-6 sm:pt-10', back ? 'animate-step-back' : 'animate-step-in')}>
        {step === 0 && <StepOccasion onPicked={() => go(1)} />}
        {step === 1 && <StepDesign onUse={() => go(2)} />}
        {step === 2 && <StepQuick showErrors={showErrors} onChangeDesign={() => go(1)} />}
      </div>

      {/* Action dock: what you've chosen so far on the left, navigation on the right. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {step > 0 && template ? (
              <Image
                src={`/showcase/${template.id}.jpg`}
                alt=""
                width={36}
                height={64}
                className="hidden h-12 w-[27px] shrink-0 rounded-md object-cover sm:block"
              />
            ) : (
              <span className="hidden size-11 shrink-0 place-items-center rounded-lg bg-tint text-xl sm:grid" aria-hidden>
                {ev.emoji}
              </span>
            )}
            <div className="hidden min-w-0 leading-tight sm:block">
              <p className="truncate text-sm text-ink-soft">{hi ? ev.labelHi : ev.label}</p>
              <p className="truncate font-semibold">{step > 0 && template ? (template.family?.name ?? template.name) : hi ? 'डिज़ाइन अगले चरण में' : 'Design comes next'}</p>
            </div>
            {step > 0 && (
              <Button variant="quiet" className="px-3 sm:hidden" aria-label={hi ? 'पीछे' : 'Back'} onClick={() => go(step - 1)}>
                <ArrowLeft className="size-4" />
              </Button>
            )}
          </div>

          {step > 0 && (
            <Button variant="line" className="hidden sm:inline-flex" onClick={() => go(step - 1)}>
              <ArrowLeft className="size-4" />
              {hi ? 'पीछे' : 'Back'}
            </Button>
          )}
          {last && (
            <Button variant="line" className="lg:hidden" onClick={() => setPreviewOpen(true)}>
              <Eye className="size-4" />
              <span className="max-[400px]:sr-only">{hi ? 'झलक' : 'Preview'}</span>
            </Button>
          )}
          {last ? (
            <Button variant="solid" className="h-12 px-6 sm:px-8" onClick={create} loading={creating}>
              <Sparkles className="size-4" />
              {hi ? 'कार्ड बनाइए' : 'Create invitation'}
            </Button>
          ) : (
            <Button variant="solid" className="group h-12 px-6 sm:px-8" onClick={() => go(step + 1)}>
              {step === 1 ? (hi ? 'यह डिज़ाइन चुनें' : 'Use this design') : hi ? 'आगे' : 'Continue'}
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

function Stepper({ step, hi, onJump }: { step: number; hi: boolean; onJump: (i: number) => void }) {
  return (
    <nav aria-label="Progress">
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s.id} className="flex flex-1 items-center gap-2 last:flex-none sm:gap-3">
              <button
                type="button"
                onClick={() => done && onJump(i)}
                disabled={!done}
                aria-current={current ? 'step' : undefined}
                className="group flex items-center gap-2.5 rounded-lg disabled:cursor-default"
              >
                <span
                  className={clsx(
                    'grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold tabular-nums transition-colors duration-300',
                    current && 'bg-primary text-on-primary',
                    done && 'tint-primary group-hover:bg-tint-strong',
                    !done && !current && 'border border-hairline text-ink-soft',
                  )}
                >
                  {done ? <Check className="size-4 animate-pop" strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                <span className={clsx('text-sm font-semibold transition-colors max-sm:hidden', current ? 'text-ink' : done ? 'text-ink-soft group-hover:text-ink' : 'text-ink-soft/70')}>
                  {hi ? s.hi : s.en}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-hairline" aria-hidden>
                  <span className="block h-full origin-left bg-primary transition-transform duration-500 ease-[var(--ease-out-quint)]" style={{ transform: `scaleX(${done ? 1 : 0})` }} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
