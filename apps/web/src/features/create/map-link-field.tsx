'use client';

import { Check, Link2, LocateFixed, Map as MapIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';

import { isMapUrl } from './validate';

export { isMapUrl };

/**
 * Optional map pin for a venue: paste a Maps link, or use where you are now (for hosts at the
 * venue or at home). Folded to one line until wanted; the website and QR use it for directions.
 */
export function MapLinkField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const t = useTranslations('create');
  const id = useId();
  const [open, setOpen] = useState(Boolean(value));
  /** Opened by the user just now (not already filled): put the cursor in it. */
  const [justOpened, setJustOpened] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bad = Boolean(value) && !isMapUrl(value);

  const locate = () => {
    if (!('geolocation' in navigator)) return setError(t('locateFailed'));
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        onChange(`https://www.google.com/maps?q=${p.coords.latitude.toFixed(6)},${p.coords.longitude.toFixed(6)}`);
      },
      () => {
        setLocating(false);
        setError(t('locateFailed'));
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setJustOpened(true);
        }}
        className="inline-flex items-center gap-1.5 self-start text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline">
        <MapIcon className="size-4" aria-hidden />
        {t('addMap')}
      </button>
    );

  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {t('mapLink')}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
          <Input id={id} type="url" inputMode="url" autoFocus={justOpened} className="pl-10 pr-9" placeholder={t('mapPh')} value={value} aria-invalid={bad} onChange={(e) => onChange(e.target.value.trim())} />
          {value && !bad && <Check className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-leaf" aria-label={t('mapOk')} />}
        </div>
        <Button variant="line" onClick={locate} loading={locating} className="h-10 shrink-0">
          <LocateFixed className="size-4" />
          {t('useLocation')}
        </Button>
      </div>
      <p className={`text-[0.8125rem] ${bad || error ? 'text-sindoor' : 'text-ink-soft'}`}>{error ?? (bad ? t('mapBad') : t('mapHint'))}</p>
    </div>
  );
}
