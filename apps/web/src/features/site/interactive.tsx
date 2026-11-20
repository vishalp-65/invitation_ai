'use client';

import type { SiteSectionOf, SiteUpdateDto, SiteWishDto } from '@cardai/shared';
import { Camera, Copy, Gift, Heart, Radio, Send, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { safeHref, useSite } from './context';
import { Reveal } from './motion';
import { PhotoGrid, Shell, youtubeEmbed } from './sections';
import { postJson as post } from './utils';

const card = 'rounded-[22px] bg-[var(--inv-surface)] text-[var(--inv-on-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-28px_rgb(0_0_0/0.45)]';
const field =
  'h-12 w-full rounded-[12px] border-2 inv-line bg-transparent px-3 text-inherit placeholder:opacity-60 focus:border-current focus:outline-none';

// ---------------- Shagun & gifts ----------------

export function GiftsSection({ section }: { section: SiteSectionOf<'gifts'> }) {
  const { data, t, preview, publicUrl } = useSite();
  const [copied, setCopied] = useState(false);
  const registry = safeHref(section.registryUrl);
  if (!section.upiId && !registry && !section.note) return null;
  const payee = section.payeeName || data.event.title;
  const upi = section.upiId ? `upi://pay?pa=${encodeURIComponent(section.upiId)}&pn=${encodeURIComponent(payee)}&cu=INR&tn=${encodeURIComponent('Shagun')}` : null;
  return (
    <Shell section={section}>
      <Reveal motion={section.motion} className={`${card} mx-auto max-w-md p-7 text-center`}>
        <Gift className="mx-auto size-9 text-[var(--inv-primary)]" aria-hidden />
        {section.note && <p className="mt-3 whitespace-pre-line leading-relaxed">{section.note}</p>}
        {upi && (
          <>
            {!preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicUrl('upi-qr.svg')}
                alt={t('UPI QR code', 'यूपीआई क्यूआर कोड')}
                width={200}
                height={200}
                loading="lazy"
                className="mx-auto mt-5 rounded-xl bg-white p-2"
              />
            )}
            <p className="mt-4 font-semibold">{section.upiId}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <a href={upi} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--inv-primary)] px-5 font-semibold text-[var(--inv-on-primary)]">
                <Wallet className="size-4" aria-hidden /> {t('Pay with UPI app', 'यूपीआई ऐप से भेजें')}
              </a>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(section.upiId!).then(() => setCopied(true))}
                className="inline-flex h-11 items-center gap-2 rounded-full border-2 border-current px-5 font-semibold"
              >
                <Copy className="size-4" aria-hidden /> {copied ? t('Copied', 'कॉपी हुआ') : t('Copy UPI id', 'यूपीआई आईडी कॉपी करें')}
              </button>
            </div>
            <p className="mt-3 text-xs opacity-70">{t('Goes straight to the family’s account. We never handle the money.', 'राशि सीधे परिवार के खाते में जाती है।')}</p>
          </>
        )}
        {registry && (
          <a href={registry} target="_blank" rel="noopener" className="mt-5 inline-block font-semibold underline underline-offset-4">
            {t('See the gift list', 'उपहार सूची देखें')}
          </a>
        )}
      </Reveal>
    </Shell>
  );
}

// ---------------- Live stream ----------------

export function LivestreamSection({ section }: { section: SiteSectionOf<'livestream'> }) {
  const { t } = useSite();
  const url = safeHref(section.url);
  if (!url) return null;
  const yt = youtubeEmbed(url);
  return (
    <Shell section={section} tone="alt">
      <Reveal motion={section.motion}>
        {yt ? (
          <iframe src={yt} title="Live stream" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="aspect-video w-full rounded-[20px] border-0" />
        ) : (
          <div className="text-center">
            <a href={url} target="_blank" rel="noopener" className="inline-flex h-14 items-center gap-2 rounded-full bg-[var(--inv-primary)] px-7 text-lg font-semibold text-[var(--inv-on-primary)]">
              <Radio className="size-5" aria-hidden /> {t('Watch live', 'सीधा प्रसारण देखें')}
            </a>
          </div>
        )}
        {section.note && <p className="mt-4 text-center opacity-85">{section.note}</p>}
      </Reveal>
    </Shell>
  );
}

// ---------------- Live updates ----------------

function ago(iso: string, locale: string, now: number) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (s < 60) return rtf.format(-s, 'second');
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute');
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour');
  return rtf.format(-Math.round(s / 86400), 'day');
}

export function UpdatesSection({ section }: { section: SiteSectionOf<'updates'> }) {
  const { data, t, preview, language, publicUrl } = useSite();
  const [items, setItems] = useState<SiteUpdateDto[]>(data.updates);
  // "2 minutes ago" only after mount: server and phone clocks differ (hydration mismatch).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => setItems(data.updates), [data.updates]);
  useEffect(() => {
    if (preview) return;
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      const r = await fetch(publicUrl('updates')).catch(() => null);
      if (r?.ok && !stop) setItems(((await r.json()) as { items: SiteUpdateDto[] }).items);
    };
    const id = setInterval(tick, 30_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      stop = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [publicUrl, preview]);

  return (
    <Shell section={section}>
      <div aria-live="polite">
        <p className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.18em]">
          <span className="inv-pulse size-2.5 rounded-full bg-[#E5484D]" aria-hidden /> {t('Live', 'लाइव')}
        </p>
        {items.length === 0 ? (
          <p className="text-center opacity-75">{t('Updates from the family will appear here on the day.', 'परिवार की ताज़ा जानकारी यहाँ दिखेगी।')}</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {items.map((u) => (
              <li key={u.id} className={`${card} p-5 ${u.pinned ? 'ring-2 ring-[var(--inv-primary)]' : ''}`}>
                <p className="whitespace-pre-line text-lg">{u.text}</p>
                <p className="mt-1 min-h-5 text-sm opacity-60">{now !== null && ago(u.createdAt, language, now)}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Shell>
  );
}

// ---------------- Wishes (guestbook) ----------------

export function WishesSection({ section }: { section: SiteSectionOf<'wishes'> }) {
  const { data, t, preview, guestToken, accessKey } = useSite();
  const [items, setItems] = useState<SiteWishDto[]>(data.wishes);
  const [name, setName] = useState(data.guest?.name ?? '');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');
  useEffect(() => setItems(data.wishes), [data.wishes]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (preview) return;
    setState('sending');
    setError('');
    try {
      const w = await post<SiteWishDto>(`/api/public/events/${data.event.slug}/wishes`, { guestToken, key: accessKey, name, message });
      setItems((list) => [w, ...list]);
      setMessage('');
      setState('sent');
    } catch (err) {
      setError((err as Error).message);
      setState('idle');
    }
  }

  return (
    <Shell section={section} tone="alt">
      <form onSubmit={submit} className={`${card} flex flex-col gap-3 p-5`}>
        {!data.guest && <input className={field} required maxLength={80} placeholder={t('Your name', 'आपका नाम')} value={name} onChange={(e) => setName(e.target.value)} />}
        <textarea
          className={`${field} h-auto min-h-24 py-3`}
          required
          maxLength={500}
          placeholder={t('Write your blessings…', 'अपनी शुभकामनाएँ लिखें…')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-[#C0392B]">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={state === 'sending' || preview}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--inv-primary)] font-semibold text-[var(--inv-on-primary)] disabled:opacity-60"
        >
          <Send className="size-4" aria-hidden /> {state === 'sent' ? t('Sent — add another', 'भेज दिया — और लिखें') : t('Send wishes', 'शुभकामनाएँ भेजें')}
        </button>
      </form>
      {items.length > 0 && (
        <ul className="mt-6 columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
          {items.map((w, i) => (
            <Reveal as="li" key={w.id} motion="rise" delay={i % 4} className={`${card} break-inside-avoid p-5`}>
              <Heart className="size-4 text-[var(--inv-primary)]" aria-hidden />
              <p className="mt-2 whitespace-pre-line leading-relaxed">{w.message}</p>
              <p className="mt-2 text-sm font-semibold opacity-75">— {w.name}</p>
            </Reveal>
          ))}
        </ul>
      )}
    </Shell>
  );
}

// ---------------- Guest photo album ----------------

/** Downscales big phone photos before upload (saves guests' data and our storage). */
async function shrink(file: File): Promise<Blob> {
  if (file.size < 1.5 * 1024 * 1024 || !('createImageBitmap' in window)) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/jpeg', 0.85));
}

export function AlbumSection({ section }: { section: SiteSectionOf<'album'> }) {
  const { data, t, preview, guestToken, accessKey } = useSite();
  const [photos, setPhotos] = useState<string[]>(data.album);
  const [name, setName] = useState(data.guest?.name ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => setPhotos(data.album), [data.album]);

  async function upload(files: FileList) {
    if (preview) return;
    setError('');
    const list = [...files].slice(0, 10);
    for (const [i, file] of list.entries()) {
      setBusy(t(`Uploading ${i + 1} of ${list.length}…`, `${list.length} में से ${i + 1} अपलोड हो रही है…`));
      try {
        const blob = await shrink(file);
        const contentType = blob.type === 'image/png' || blob.type === 'image/webp' ? blob.type : 'image/jpeg';
        const slot = await post<{ assetId: string; uploadUrl: string; headers: Record<string, string> }>(`/api/public/events/${data.event.slug}/album/uploads`, {
          guestToken,
          key: accessKey,
          name: name || data.guest?.name || 'Guest',
          contentType,
          bytes: blob.size,
        });
        const put = await fetch(slot.uploadUrl, { method: 'PUT', headers: slot.headers, body: blob });
        if (!put.ok) throw new Error(t('Upload failed. Try again.', 'अपलोड नहीं हुआ। फिर कोशिश करें।'));
        const done = await post<{ url: string }>(`/api/public/events/${data.event.slug}/album/uploads/${slot.assetId}/complete`, {});
        setPhotos((p) => [done.url, ...p]);
      } catch (err) {
        setError((err as Error).message);
        break;
      }
    }
    setBusy(null);
  }

  return (
    <Shell section={section} wide>
      <Reveal motion={section.motion} className={`${card} mx-auto flex max-w-xl flex-col items-center gap-3 p-6 text-center`}>
        <Camera className="size-9 text-[var(--inv-primary)]" aria-hidden />
        <p className="leading-relaxed">{section.note || t('Share the photos you clicked — everyone sees them here.', 'अपनी खींची तस्वीरें यहाँ साझा करें।')}</p>
        {!data.guest && <input className={field} maxLength={80} placeholder={t('Your name', 'आपका नाम')} value={name} onChange={(e) => setName(e.target.value)} />}
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && upload(e.target.files)} />
        <button
          type="button"
          disabled={Boolean(busy) || preview}
          onClick={() => input.current?.click()}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-[var(--inv-primary)] px-6 font-semibold text-[var(--inv-on-primary)] disabled:opacity-60"
        >
          <Camera className="size-4" aria-hidden /> {busy ?? t('Add photos', 'तस्वीरें जोड़ें')}
        </button>
        {error && (
          <p role="alert" className="text-[#C0392B]">
            {error}
          </p>
        )}
      </Reveal>
      {photos.length > 0 && (
        <div className="mt-8">
          <PhotoGrid photos={photos} layout="masonry" motion="fade" />
        </div>
      )}
    </Shell>
  );
}
