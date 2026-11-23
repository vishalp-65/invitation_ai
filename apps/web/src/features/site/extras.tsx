'use client';

import { ceremonyText, findCeremony, type EventFunctionDto, type SiteDoc, type SiteSectionOf } from '@cardai/shared';
import { Camera, Check, ExternalLink, Gift, MapPin, Radio, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { safeHref, useSite } from './context';
import { Reveal } from './motion';
import { lookOf, PhotoMask } from './photo-look';
import { Shell } from './sections';

/*
 * Website extras (Nov 2026): family tree, gift wishlist and wedding-day live mode.
 */

const card = 'rounded-[22px] bg-[var(--inv-surface)] text-[var(--inv-on-surface)] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_18px_40px_-28px_rgb(0_0_0/0.45)]';
const field = 'h-12 w-full rounded-xl border border-black/15 bg-white px-4 text-[16px] text-[#222] outline-none focus:border-[var(--inv-primary)]';

// ---------------- Family tree ----------------

/** Both families, elders first, with photos. Late members carry a small remembrance mark. */
export function FamilyTreeSection({ section }: { section: SiteSectionOf<'familytree'> }) {
  const { asset, design, t } = useSite();
  const look = lookOf(design?.look);
  const sides = section.sides.map((s) => ({ ...s, members: s.members.filter((m) => m.name.trim()) })).filter((s) => s.members.length);
  if (!sides.length) return null;
  return (
    <Shell section={section} wide>
      <div className={`grid gap-12 ${sides.length > 1 ? 'md:grid-cols-2' : ''}`}>
        {sides.map((side, si) => (
          <Reveal key={si} motion={si ? 'slide-r' : 'slide'} className="flex flex-col items-center">
            {side.title && <h3 className="inv-display mb-6 text-center text-2xl text-[var(--inv-primary)]">{side.title}</h3>}
            <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3">
              {side.members.map((m, i) => {
                const src = asset(m.photoAssetId);
                const initials = m.name.replace(/^((smt|shri|sh|late|dr|mr|mrs|ms|sri|shrimati|swargiya|स्व|श्री|श्रीमती)\.?\s+)+/i, '').slice(0, 1);
                return (
                  <li key={i} className="flex flex-col items-center text-center">
                    {look ? (
                      <PhotoMask src={src} mask={look.photo.mask === 'rect' ? 'soft-arch' : look.photo.twin ? 'blob' : look.photo.mask} ring={look.photo.ring} initials={initials} look={look} hint={false} className="size-24 sm:size-28" />
                    ) : src ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt="" loading="lazy" className="size-24 rounded-full object-cover ring-2 ring-[var(--inv-primary-a28)] sm:size-28" />
                    ) : (
                      <span className="inv-display grid size-24 place-items-center rounded-full bg-[var(--inv-surface)] text-4xl text-[var(--inv-primary)] ring-2 ring-[var(--inv-primary-a28)] sm:size-28">{initials}</span>
                    )}
                    <p className="mt-3 font-semibold leading-snug">
                      {m.late && (
                        <span className="mr-1 opacity-70" aria-label={t('In loving memory', 'स्मृति में')}>
                          ✿
                        </span>
                      )}
                      {m.name}
                    </p>
                    {m.relation && <p className="mt-0.5 text-sm opacity-75">{m.relation}</p>}
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ))}
      </div>
    </Shell>
  );
}

// ---------------- Gift wishlist ----------------

/** "I'll gift this": reserves an item so two guests don't buy the same thing. */
export function Wishlist({ section }: { section: SiteSectionOf<'gifts'> }) {
  const { data, t, preview, guestToken, accessKey } = useSite();
  const items = section.wishlist.filter((w) => w.title.trim());
  const [claimed, setClaimed] = useState<Set<string>>(() => new Set(data.claimedWishes ?? []));
  const [mine, setMine] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<string | null>(null);
  const [name, setName] = useState(data.guest?.salutation || data.guest?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!items.length) return null;

  async function claim(id: string) {
    if (preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/events/${encodeURIComponent(data.event.slug)}/wishlist/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), guestToken, key: accessKey }),
      });
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.status === 409) {
        setClaimed((c) => new Set(c).add(id));
        throw new Error(body.message ?? t('Someone already picked this gift.', 'यह उपहार कोई और चुन चुका है।'));
      }
      if (!res.ok) throw new Error(body.message ?? t('Could not save. Try again.', 'सेव नहीं हुआ। फिर कोशिश करें।'));
      setClaimed((c) => new Set(c).add(id));
      setMine((c) => new Set(c).add(id));
      setOpen(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 text-left">
      <h3 className="inv-display mb-1 text-center text-2xl text-[var(--inv-primary)]">{t('Gift wishlist', 'उपहार सूची')}</h3>
      <p className="mb-5 text-center text-sm opacity-75">{t('Pick one so nobody brings the same gift.', 'एक उपहार चुनें ताकि दो लोग एक जैसा उपहार न लाएँ।')}</p>
      <ul className="flex flex-col gap-3">
        {items.map((w) => {
          const taken = claimed.has(w.id);
          const yours = mine.has(w.id);
          const link = safeHref(w.url);
          return (
            <li key={w.id} className={`${card} p-4 ${taken && !yours ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <Gift className="mt-0.5 size-5 shrink-0 text-[var(--inv-primary)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{w.title}</p>
                  {(w.price || w.note) && <p className="mt-0.5 text-sm opacity-75">{[w.price, w.note].filter(Boolean).join(' · ')}</p>}
                  {link && (
                    <a href={link} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold underline underline-offset-4">
                      {t('See it', 'देखें')} <ExternalLink className="size-3.5" aria-hidden />
                    </a>
                  )}
                </div>
                {yours ? (
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[var(--inv-primary)]">
                    <Check className="size-4" aria-hidden /> {t('Yours', 'आपका')}
                  </span>
                ) : taken ? (
                  <span className="shrink-0 rounded-full border border-current px-2.5 py-1 text-xs font-semibold opacity-80">{t('Reserved', 'चुना जा चुका')}</span>
                ) : (
                  <button type="button" disabled={preview} onClick={() => setOpen(open === w.id ? null : w.id)} className="shrink-0 rounded-full bg-[var(--inv-primary)] px-3.5 py-2 text-sm font-semibold text-[var(--inv-on-primary)] disabled:opacity-60">
                    {t('I’ll gift this', 'मैं दूँगा/दूँगी')}
                  </button>
                )}
              </div>
              {open === w.id && !taken && (
                <form
                  className="mt-3 flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (name.trim()) void claim(w.id);
                  }}
                >
                  <input className={field} maxLength={100} required placeholder={t('Your name', 'आपका नाम')} value={name} onChange={(e) => setName(e.target.value)} />
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy || !name.trim()} className="h-11 flex-1 rounded-full bg-[var(--inv-primary)] font-semibold text-[var(--inv-on-primary)] disabled:opacity-60">
                      {busy ? t('Saving…', 'सेव हो रहा है…') : t('Reserve it for me', 'मेरे नाम कर दें')}
                    </button>
                    <button type="button" onClick={() => setOpen(null)} className="grid size-11 place-items-center rounded-full border border-current" aria-label={t('Cancel', 'रद्द करें')}>
                      <X className="size-4" />
                    </button>
                  </div>
                  <p className="text-xs opacity-70">{t('Only the family sees your name.', 'आपका नाम सिर्फ़ परिवार देखेगा।')}</p>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-center text-[#C0392B]">
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------- Wedding-day live mode ----------------

const HOUR = 3_600_000;

/** What is happening now and next, from the function times (a function "runs" until its end, or 3 h). */
export function liveState(functions: EventFunctionDto[], now: number) {
  const fns = [...functions].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (!fns.length) return null;
  const start = Date.parse(fns[0]!.startsAt);
  const lastFn = fns[fns.length - 1]!;
  const end = lastFn.endsAt ? Date.parse(lastFn.endsAt) : Date.parse(lastFn.startsAt) + 4 * HOUR;
  // From the morning of the first function to the night of the last one.
  if (now < start - 12 * HOUR || now > end + 2 * HOUR) return null;
  const current = fns.find((f) => {
    const s = Date.parse(f.startsAt);
    const e = f.endsAt ? Date.parse(f.endsAt) : s + 3 * HOUR;
    return now >= s - 15 * 60_000 && now < e;
  });
  const next = fns.find((f) => Date.parse(f.startsAt) > now && f !== current);
  return { current: current ?? null, next: next ?? null };
}

/**
 * Wedding-day bar (Premium): on function days the page leads with what is happening now and
 * what's next, plus Watch live / Share photos / Directions. Re-checks every minute.
 */
export function LiveBar({ doc, nowOverride }: { doc: SiteDoc; nowOverride?: number }) {
  const { data, t, fmt } = useSite();
  const [now, setNow] = useState(() => nowOverride ?? Date.now());
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (nowOverride !== undefined) return setNow(nowOverride);
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [nowOverride]);
  const state = useMemo(() => liveState(data.functions, now), [data.functions, now]);
  if (!doc.live?.enabled || !state || hidden || (!state.current && !state.next)) return null;
  const stream = doc.sections.find((s): s is SiteSectionOf<'livestream'> => s.type === 'livestream' && !s.hidden);
  const streamUrl = safeHref(stream?.url);
  const album = doc.sections.some((s) => s.type === 'album' && !s.hidden);
  const focus = state.current ?? state.next!;
  const mapUrl = safeHref(focus.mapUrl) ?? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([focus.venueName, focus.venueAddress].filter(Boolean).join(', '))}`;
  const when = (f: EventFunctionDto) => {
    const d = new Date(f.startsAt);
    const sameDay = new Date(now).toDateString() === d.toDateString();
    return `${sameDay ? t('Today', 'आज') : fmt.short.format(d)} · ${fmt.time.format(d)}`;
  };

  return (
    // Floats just above the bottom action bar (thumb zone), so the cover stays full-bleed.
    <aside aria-label={t('Happening now', 'अभी चल रहा है')} className="inv-live-bar fixed inset-x-3 bottom-[76px] z-40">
      <div className="mx-auto flex max-w-md flex-col gap-2 rounded-[18px] bg-[var(--inv-primary)] p-3 text-[var(--inv-on-primary)] shadow-[0_14px_30px_-14px_rgb(0_0_0/0.55)]">
        <div className="flex items-start gap-2.5">
          {state.current ? (
            <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">
              <span className="inv-live-dot size-2 rounded-full bg-[#FF5A5A]" aria-hidden /> {t('Live', 'अभी')}
            </span>
          ) : (
            <span className="mt-1 shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider">{t('Next', 'अगला')}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-snug">
              {focus.name} · {focus.venueName}
            </p>
            <p className="text-sm opacity-85">{state.current ? (state.next ? `${t('Up next', 'इसके बाद')}: ${state.next.name}, ${when(state.next)}` : t('Happening now', 'अभी चल रहा है')) : when(focus)}</p>
          </div>
          <button type="button" onClick={() => setHidden(true)} className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white/15" aria-label={t('Hide', 'छिपाएँ')}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex gap-2">
          {streamUrl && (
            <a href={streamUrl} target="_blank" rel="noopener" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 text-sm font-semibold text-[#222]">
              <Radio className="size-4" aria-hidden /> {t('Watch live', 'लाइव देखें')}
            </a>
          )}
          {album && (
            <a href="#album" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-white/95 px-3 text-sm font-semibold text-[#222]">
              <Camera className="size-4" aria-hidden /> {t('Share photos', 'फ़ोटो भेजें')}
            </a>
          )}
          <a href={mapUrl} target="_blank" rel="noopener" className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/60 px-3 text-sm font-semibold">
            <MapPin className="size-4" aria-hidden /> {t('Directions', 'रास्ता')}
          </a>
        </div>
      </div>
    </aside>
  );
}

// ---------------- Ceremony notes ----------------

/**
 * Under each function on the schedule: the family's own description, else what the ceremony
 * is (from the ceremony packs), so guests from other regions know what to expect.
 */
export function CeremonyNote({ f }: { f: EventFunctionDto }) {
  const { language } = useSite();
  const c = f.notes ? null : findCeremony(f.name);
  const text = f.notes || (c ? ceremonyText(c.about, language) : '');
  if (!text) return null;
  return <p className="mt-2 text-sm opacity-75">{text}</p>;
}
