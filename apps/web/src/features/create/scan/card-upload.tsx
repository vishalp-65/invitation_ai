'use client';

import { SCAN_MAX_IMAGES } from '@cardai/shared';
import { clsx } from 'clsx';
import { AlertCircle, Camera, Check, ImagePlus, Lock, ScanText, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { useRequireLogin } from '@/features/auth/use-require-login';
import { ApiError } from '@/lib/api';
import { track } from '@/lib/track';
import { useDraft } from '../draft-store';
import { applyScan } from './apply-scan';
import { prepareImage, SCAN_ACCEPT, UnreadablePhotoError } from './prepare-image';
import { scanCard, type ScanStage } from './scan-card';
import { useScanPhotos } from './scan-photos';

type Phase = { kind: 'idle' } | { kind: 'working'; stage: ScanStage; progress?: number } | { kind: 'error'; message: string };

const STAGES: Array<{ id: ScanStage; en: string; hi: string }> = [
  { id: 'preparing', en: 'Preparing photos', hi: 'फ़ोटो तैयार हो रही हैं' },
  { id: 'reading', en: 'Reading your card', hi: 'कार्ड पढ़ा जा रहा है' },
  { id: 'ocr', en: 'Reading text on your device', hi: 'आपके डिवाइस पर टेक्स्ट पढ़ा जा रहा है' },
  { id: 'structuring', en: 'Sorting names, dates and venues', hi: 'नाम, तारीख़ और स्थान छाँटे जा रहे हैं' },
];

/**
 * "Start from your printed card": up to four photos of a wedding card / invitation are read
 * (vision AI, with on-device OCR as fallback) and the wizard continues with everything filled in.
 */
export function CardUpload({ onDone }: { onDone: () => void }) {
  const hi = useLocale() === 'hi';
  const language = useDraft((s) => s.language);
  const { photos, add, remove, clear } = useScanPhotos();
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [over, setOver] = useState(false);
  const browse = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const t = useTranslations('create');
  const { ensureLogin, dialog } = useRequireLogin(t('loginScan'));
  const working = phase.kind === 'working';
  const full = photos.length >= SCAN_MAX_IMAGES;

  function pick(files: FileList | File[] | null) {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (!images.length) {
      setPhase({ kind: 'error', message: hi ? 'कृपया फ़ोटो (JPG/PNG) चुनें।' : 'Please choose photos (JPG or PNG).' });
      return;
    }
    const room = SCAN_MAX_IMAGES - photos.length;
    add(images.slice(0, room));
    setPhase(
      images.length > room
        ? { kind: 'error', message: hi ? `अधिकतम ${SCAN_MAX_IMAGES} फ़ोटो।` : `Up to ${SCAN_MAX_IMAGES} photos. Extra photos were left out.` }
        : { kind: 'idle' },
    );
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    if (!working) pick(e.dataTransfer.files);
  }

  async function read() {
    if (!photos.length || working) return;
    if (!(await ensureLogin())) return;
    setPhase({ kind: 'working', stage: 'preparing' });
    try {
      const images = await Promise.all(photos.map((p) => prepareImage(p.file)));
      const result = await scanCard(images, language, (stage, progress) => setPhase({ kind: 'working', stage, progress }));
      applyScan(result);
      track('card_scanned', { props: { method: result.method, photos: images.length, type: result.eventType ?? 'unknown' } });
      setPhase({ kind: 'idle' });
      onDone();
    } catch (err) {
      const message =
        err instanceof UnreadablePhotoError
          ? hi ? `${err.fileName} नहीं खुल सकी। JPG या PNG फ़ोटो लगाएँ।` : err.message
          : err instanceof ApiError || err instanceof Error
            ? err.message
            : hi ? 'कार्ड नहीं पढ़ा जा सका।' : 'We could not read the card.';
      setPhase({ kind: 'error', message });
    }
  }

  return (
    <section
      aria-labelledby="scan-title"
      className="grid overflow-clip border border-ink/15 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      {dialog}
      {/* Pitch */}
      <div className="flex flex-col gap-5 border-b border-ink/10 bg-ink/[0.03] p-5 sm:p-8 lg:border-b-0 lg:border-r">
        <span className="kicker">{hi ? 'सबसे तेज़ तरीका' : 'Fastest way'}</span>
        <div>
          <h2 id="scan-title" className="text-2xl leading-tight sm:text-[1.75rem]">
            {hi ? 'छपा हुआ कार्ड है? फ़ोटो डालिए।' : 'Have a printed card? Upload a photo.'}
          </h2>
          <p className="mt-3 max-w-md text-ink-soft">
            {hi
              ? 'हम नाम, तारीख़, समय, स्थान और परिवार की पंक्तियाँ पढ़कर आपका डिजिटल निमंत्रण तैयार कर देंगे। आप जाँचें, डिज़ाइन चुनें, बस।'
              : 'We read the names, dates, times, venues and family lines, and set up your digital invitation. You check it, pick a design, done.'}
          </p>
        </div>
        <ol className="mt-auto grid gap-2.5 text-sm">
          {(hi
            ? ['कार्ड के सभी पन्नों की फ़ोटो लें', 'हम जानकारी भरेंगे, आप जाँचें', 'डिज़ाइन चुनें और भेजें']
            : ['Photograph every page of the card', 'We fill in the details, you check them', 'Pick a design and share']
          ).map((t, i) => (
            <li key={t} className="flex items-center gap-3">
              <span className="grid size-6 shrink-0 place-items-center border border-ink/15 font-mono text-[0.6875rem] text-ink-soft">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <p className="flex items-center gap-2 text-xs text-ink-soft">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          {hi ? 'फ़ोटो सिर्फ़ पढ़ने के लिए उपयोग होती हैं, सहेजी नहीं जातीं।' : 'Photos are only used to read the card. We don’t keep them.'}
        </p>
      </div>

      {/* Drop zone / progress */}
      <div className="flex flex-col gap-4 p-5 sm:p-8">
        <input ref={browse} type="file" accept={SCAN_ACCEPT} multiple hidden onChange={(e) => (pick(e.target.files), (e.target.value = ''))} />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (pick(e.target.files), (e.target.value = ''))} />

        {photos.length === 0 ? (
          <button
            type="button"
            onClick={() => browse.current?.click()}
            onDragOver={(e) => (e.preventDefault(), setOver(true))}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={clsx(
              'group flex min-h-[240px] flex-1 flex-col items-center justify-center gap-4 border border-dashed px-6 py-10 text-center transition-colors duration-200',
              over ? 'border-ink bg-ink/[0.06]' : 'border-ink/25 hover:border-ink/50 hover:bg-ink/[0.03]',
            )}
          >
            <span className="grid size-14 place-items-center rounded-full border border-ink/15 transition-transform duration-300 group-hover:-translate-y-0.5">
              <ImagePlus className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-lg">{over ? (hi ? 'यहाँ छोड़ें' : 'Drop to add') : hi ? 'कार्ड की फ़ोटो यहाँ खींचें' : 'Drag photos of your card here'}</span>
              <span className="mt-1 block text-sm text-ink-soft">
                {hi ? 'या क्लिक करके चुनें' : 'or click to browse'} · JPG, PNG, WebP · {hi ? `अधिकतम ${SCAN_MAX_IMAGES}` : `up to ${SCAN_MAX_IMAGES} photos`}
              </span>
            </span>
          </button>
        ) : (
          <div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} className="flex flex-1 flex-col gap-4">
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p, i) => (
                <li key={p.id} className="relative aspect-[3/4] overflow-clip border border-ink/15 bg-ink/[0.04]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
                  <img src={p.url} alt={hi ? `कार्ड फ़ोटो ${i + 1}` : `Card photo ${i + 1}`} className={clsx('h-full w-full object-cover transition-[filter] duration-500', working && 'brightness-90')} />
                  {working && (
                    <span aria-hidden className="pointer-events-none absolute inset-0 overflow-clip">
                      <span className="block h-[12%] w-full animate-scan bg-gradient-to-b from-transparent via-gold/50 to-transparent" style={{ animationDelay: `${i * 0.25}s` }} />
                    </span>
                  )}
                  <span className="absolute left-2 top-2 bg-black/60 px-1.5 py-0.5 font-mono text-[0.625rem] text-white">{String(i + 1).padStart(2, '0')}</span>
                  {!working && (
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="press absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      aria-label={hi ? 'फ़ोटो हटाएँ' : `Remove photo ${i + 1}`}
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              ))}
              {!full && !working && (
                <li>
                  <button
                    type="button"
                    onClick={() => browse.current?.click()}
                    className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 border border-dashed border-ink/25 text-sm text-ink-soft transition-colors hover:border-ink/50 hover:text-ink"
                  >
                    <ImagePlus className="size-5" aria-hidden />
                    {hi ? 'और पन्ने' : 'Add page'}
                  </button>
                </li>
              )}
            </ul>

            {working ? (
              <Progress stage={phase.stage} progress={phase.progress} hi={hi} />
            ) : (
              <p className="text-sm text-ink-soft">
                {hi ? 'साफ़, सीधी फ़ोटो सबसे अच्छी पढ़ी जाती है। अंदर के पन्ने भी जोड़ें।' : 'Flat, well-lit, straight-on photos read best. Add inside pages and function inserts too.'}
              </p>
            )}
          </div>
        )}

        {phase.kind === 'error' && (
          <p role="alert" className="flex items-start gap-2.5 border border-sindoor/30 bg-sindoor/[0.06] p-3 text-sm">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-sindoor" aria-hidden />
            <span className="flex-1">{phase.message}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2.5">
          {photos.length > 0 ? (
            <>
              <Button variant="solid" size="lg" onClick={read} loading={working} className="press min-w-[180px] flex-1 sm:flex-none">
                <ScanText className="size-4" />
                {working ? (hi ? 'पढ़ रहे हैं…' : 'Reading…') : phase.kind === 'error' ? (hi ? 'फिर से कोशिश करें' : 'Try again') : hi ? 'कार्ड पढ़ें' : 'Read my card'}
              </Button>
              {!working && (
                <Button variant="quiet" size="lg" onClick={() => (clear(), setPhase({ kind: 'idle' }))}>
                  {hi ? 'हटाएँ' : 'Clear'}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="solid" size="lg" onClick={() => browse.current?.click()} className="press flex-1 sm:flex-none">
                <ImagePlus className="size-4" />
                {hi ? 'फ़ोटो चुनें' : 'Choose photos'}
              </Button>
              <Button variant="line" size="lg" onClick={() => camera.current?.click()} className="flex-1 sm:hidden">
                <Camera className="size-4" />
                {hi ? 'फ़ोटो लें' : 'Take photo'}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function Progress({ stage, progress, hi }: { stage: ScanStage; progress?: number; hi: boolean }) {
  // The on-device steps only appear once the AI reader has been skipped.
  const fallback = stage === 'ocr' || stage === 'structuring';
  const shown = STAGES.filter((s) => (fallback ? s.id !== 'reading' : s.id === 'preparing' || s.id === 'reading'));
  const at = shown.findIndex((s) => s.id === stage);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 12_000);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="border border-ink/10 p-4" aria-live="polite">
      <ol className="grid gap-2.5">
        {shown.map((s, i) => {
          const done = i < at;
          const current = i === at;
          return (
            <li key={s.id} className={clsx('flex items-center gap-3 text-sm', !done && !current && 'text-ink-soft/60')}>
              <span className={clsx('grid size-5 shrink-0 place-items-center rounded-full border', done ? 'border-ink bg-ink text-ivory' : current ? 'border-gold' : 'border-ink/15')}>
                {done ? <Check className="size-3 animate-pop" strokeWidth={3} /> : current ? <span className="size-1.5 animate-pulse rounded-full bg-gold" /> : null}
              </span>
              <span className="flex-1">{hi ? s.hi : s.en}</span>
              {current && s.id === 'ocr' && progress != null && <span className="font-mono text-xs tabular-nums text-ink-soft">{Math.round(progress * 100)}%</span>}
            </li>
          );
        })}
      </ol>
      {fallback && (
        <p className="mt-3 text-xs text-ink-soft">{hi ? 'AI व्यस्त है, इसलिए कार्ड आपके डिवाइस पर पढ़ा जा रहा है। इसमें थोड़ा समय लगता है।' : 'Our AI reader is busy, so we’re reading the card on your device instead. This takes a little longer.'}</p>
      )}
      {!fallback && slow && <p className="mt-3 text-xs text-ink-soft">{hi ? 'बड़े कार्ड में 20–30 सेकंड लगते हैं…' : 'Detailed cards take 20–30 seconds…'}</p>}
    </div>
  );
}
