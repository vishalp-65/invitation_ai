'use client';

import type { GuestDto } from '@cardai/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, CameraOff, ChevronLeft, Minus, Plus, Search, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { qk, useEvent } from '@/lib/hooks';

interface CheckInResult {
  guestId: string;
  name: string;
  groupLabel: string | null;
  maxPax: number;
  confirmedPax: number;
  alreadyCheckedIn: boolean;
  checkedInAt: string | null;
  checkedInPax: number | null;
}

interface Detector {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
}

/**
 * Event-day gate. Scan a guest's entry pass (the QR on their personal invitation page) or search
 * by name; adjust how many people came. Works on any phone; scanning needs Chrome on Android
 * (BarcodeDetector). Co-hosts with the "Guests" role can run it.
 */
export default function CheckInPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const t = useTranslations('day');
  const { data: event } = useEvent(id);
  const { data: guests } = useQuery({
    queryKey: qk.guests(id),
    queryFn: () => api<{ items: GuestDto[] }>(`/events/${id}/guests`),
    select: (d) => d.items,
    refetchInterval: 20_000,
  });
  const [q, setQ] = useState('');
  const [last, setLast] = useState<CheckInResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const busy = useRef(false);
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  async function checkIn(body: { token?: string; guestId?: string; pax?: number; undo?: boolean }) {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await api<CheckInResult>(`/events/${id}/checkin`, { method: 'POST', json: body });
      setLast(r);
      if (!body.undo && body.pax === undefined) {
        if (r.alreadyCheckedIn) toast.message(t('already', { name: r.name }));
        else toast.success(t('welcome', { name: r.name }));
        navigator.vibrate?.(80);
      }
      void qc.invalidateQueries({ queryKey: qk.guests(id) });
    } catch (err) {
      toast.error((err as Error).message);
      navigator.vibrate?.([60, 60, 60]);
    } finally {
      setTimeout(() => (busy.current = false), 1200);
    }
  }

  // Camera scanning loop.
  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = new Ctor({ formats: ['qr_code'] });
    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current).catch(() => []);
          const raw = codes[0]?.rawValue;
          if (raw && !busy.current) await checkIn({ token: raw });
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        toast.error(t('noCamera'));
        setScanning(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const arrived = (guests ?? []).filter((g) => g.checkedInAt);
  const people = arrived.reduce((s, g) => s + (g.checkedInPax ?? 0), 0);
  const needle = q.trim().toLowerCase();
  const matches = needle ? (guests ?? []).filter((g) => g.name.toLowerCase().includes(needle) || g.phone?.includes(needle)).slice(0, 20) : [];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <Link href={`/dashboard/events/${id}?tab=guests`} className="inline-flex items-center gap-1.5 font-mono text-xs text-ink-soft hover:text-ink">
        <ChevronLeft className="size-3.5" aria-hidden /> {t('back')}
      </Link>
      <div>
        <h1 className="page-title">{t('title')}</h1>
        <p className="mt-1 text-ink-soft" lang={event?.language}>
          {event?.title}
        </p>
      </div>

      <dl className="grid grid-cols-3 border-l border-t border-ink/10">
        {(
          [
            [t('families'), `${arrived.length} / ${guests?.length ?? 0}`],
            [t('people'), people],
            [t('expected'), (guests ?? []).reduce((s, g) => s + Math.max(0, ...Object.values(g.rsvp).filter((r) => r.status !== 'no').map((r) => r.headcount)), 0)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="border-b border-r border-ink/10 px-4 py-3">
            <dd className="font-display text-2xl tabular-nums">{value}</dd>
            <dt className="font-mono text-[0.6875rem] text-ink-soft">{label}</dt>
          </div>
        ))}
      </dl>

      {canScan && (
        <div className="flex flex-col gap-3">
          <Button size="lg" variant={scanning ? 'line' : 'primary'} onClick={() => setScanning((s) => !s)}>
            {scanning ? <CameraOff className="size-5" /> : <Camera className="size-5" />}
            {scanning ? t('stopScan') : t('scan')}
          </Button>
          {scanning && <video ref={video} muted playsInline className="aspect-square w-full bg-black object-cover" />}
        </div>
      )}

      {last && (
        <section className={`border p-4 ${last.alreadyCheckedIn ? 'border-gold/60 bg-gold/5' : 'border-leaf/50 bg-leaf/5'}`} aria-live="polite">
          <p className="text-xl">{last.name}</p>
          <p className="text-sm text-ink-soft">
            {last.groupLabel ? `${last.groupLabel} · ` : ''}
            {last.confirmedPax ? t('said', { n: last.confirmedPax }) : t('noRsvp')} · {t('upTo', { n: last.maxPax })}
          </p>
          {last.checkedInAt ? (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm">{t('with')}</span>
              <Button size="icon" variant="line" aria-label={t('fewer')} onClick={() => void checkIn({ guestId: last.guestId, pax: Math.max(0, (last.checkedInPax ?? 1) - 1) })}>
                <Minus className="size-4" />
              </Button>
              <span className="w-8 text-center font-display text-2xl tabular-nums">{last.checkedInPax}</span>
              <Button size="icon" variant="line" aria-label={t('more')} onClick={() => void checkIn({ guestId: last.guestId, pax: (last.checkedInPax ?? 0) + 1 })}>
                <Plus className="size-4" />
              </Button>
              <Button size="sm" variant="quiet" className="ml-auto" onClick={() => void checkIn({ guestId: last.guestId, undo: true })}>
                <Undo2 className="size-4" /> {t('undo')}
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">{t('undone')}</p>
          )}
        </section>
      )}

      <label className="flex items-center gap-2 border border-ink/15 px-3">
        <Search className="size-4 text-ink-soft" aria-hidden />
        <input
          className="h-12 flex-1 bg-transparent outline-none"
          placeholder={t('search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t('searchAria')}
        />
      </label>
      {matches.length > 0 && (
        <ul className="divide-y divide-ink/10 border border-ink/10">
          {matches.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate">{g.name}</p>
                <p className="truncate text-sm text-ink-soft">{g.groupLabel ?? g.phone ?? ''}</p>
              </div>
              {g.checkedInAt ? (
                <span className="font-mono text-xs text-leaf">{t('arrivedN', { n: g.checkedInPax ?? 0 })}</span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setQ('');
                    void checkIn({ guestId: g.id });
                  }}
                >
                  {t('checkIn')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!canScan && <p className="text-sm text-ink-soft">{t('noScan')}</p>}
    </div>
  );
}
