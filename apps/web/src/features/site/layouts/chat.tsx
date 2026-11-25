'use client';

import type { SiteDoc } from '@cardai/shared';
import { ArrowLeft, CheckCheck, MapPin, MoreVertical, Phone, Video } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Avatar, initialsOf, KitImg, mapHref, useKit, useLayoutData, useSeen, type KitPhotoValue } from './common';

/**
 * Chat Story: the invitation as a messaging thread. Messages from the hosts type themselves in
 * as the guest scrolls (typing dots, then the bubble), the guest's side asks the questions
 * guests always ask, and the RSVP is a quick reply. Pure CSS/DOM, no timers while off screen.
 */

type Msg =
  | { side: 'in' | 'out'; kind: 'text'; text: ReactNode }
  | { side: 'in'; kind: 'photo'; photo: KitPhotoValue; caption?: string }
  | { side: 'in'; kind: 'event'; index: number }
  | { side: 'in'; kind: 'rsvp' }
  | { kind: 'chip'; text: string };

const time = (i: number) => `${10 + Math.floor(i / 6)}:${String((i * 7) % 60).padStart(2, '0')}`;

function Bubble({ msg, i, children }: { msg: Exclude<Msg, { kind: 'chip' }>; i: number; children: ReactNode }) {
  const [ref, seen] = useSeen<HTMLDivElement>();
  // Incoming messages show "typing…" for a moment before the bubble lands.
  const [typed, setTyped] = useState(msg.side === 'out');
  useEffect(() => {
    if (!seen || typed) return;
    const id = setTimeout(() => setTyped(true), 650);
    return () => clearTimeout(id);
  }, [seen, typed]);
  const out = msg.side === 'out';
  return (
    <div ref={ref} className={`flex ${out ? 'justify-end' : 'justify-start'}`}>
      {seen && !typed ? (
        <div className="inv-chat-in rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm" aria-label="typing">
          <span className="inv-typing" aria-hidden>
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : (
        <div
          className={`relative max-w-[82%] rounded-2xl px-3 pb-1.5 pt-2 text-[0.98rem] leading-snug shadow-sm ${seen ? 'inv-chat-in' : 'opacity-0'} ${
            out ? 'rounded-tr-sm bg-[#D9FDD3] text-[#111B21]' : 'rounded-tl-sm bg-white text-[#111B21]'
          }`}
        >
          {children}
          <span className="mt-0.5 flex items-center justify-end gap-1 text-[0.68rem] text-[#667781]">
            {time(i)}
            {out && <CheckCheck className="size-3.5 text-[#53BDEB]" aria-hidden />}
          </span>
        </div>
      )}
    </div>
  );
}

export function ChatLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const { content: c, t, fmt, fns, names, greeting } = L;
  const k = useKit(doc, 'chat');
  const first = k.photo('first');
  const second = k.photo('second');
  const [status, setStatus] = useState<'online' | 'typing'>('typing');
  useEffect(() => {
    const id = setTimeout(() => setStatus('online'), 2600);
    return () => clearTimeout(id);
  }, []);
  const hasDress = fns.some((f) => f.dressCode);

  const msgs: Msg[] = [
    { kind: 'chip', text: t('Today', 'आज') },
    { side: 'in', kind: 'text', text: greeting ? `${t('Hi', 'नमस्ते')} ${greeting}! 👋` : k.text('chat.greet') },
    ...(c.invocation ? [{ side: 'in', kind: 'text', text: c.invocation } as Msg] : []),
    { side: 'in', kind: 'text', text: c.hostLine || c.headline || L.title },
    ...(first.src ? [{ side: 'in', kind: 'photo', photo: first, caption: L.title } as Msg] : []),
    { side: 'out', kind: 'text', text: k.text('chat.ask') },
    ...fns.slice(0, 6).map((_, index) => ({ side: 'in', kind: 'event', index }) as Msg),
    ...(hasDress
      ? [
          { side: 'out', kind: 'text', text: k.text('chat.dress') } as Msg,
          {
            side: 'in',
            kind: 'text',
            text: (
              <span className="flex flex-col gap-0.5">
                {fns
                  .filter((f) => f.dressCode)
                  .map((f) => (
                    <span key={f.id}>
                      <b>{f.name}</b>: {f.dressCode}
                    </span>
                  ))}
              </span>
            ),
          } as Msg,
        ]
      : []),
    ...(second.src && second.src !== first.src ? [{ side: 'in', kind: 'photo', photo: second } as Msg] : []),
    ...(c.message ? [{ side: 'in', kind: 'text', text: c.message } as Msg] : []),
    { side: 'in', kind: 'rsvp' },
    ...(c.familyLines.length ? [{ side: 'in', kind: 'text', text: <span className="whitespace-pre-line">{`${c.familyTitle ? `${c.familyTitle}\n` : ''}${c.familyLines.join('\n')}`}</span> } as Msg] : []),
    ...(c.closing ? [{ side: 'in', kind: 'text', text: c.closing } as Msg] : []),
  ];

  return (
    <section className="inv-chat relative mx-auto min-h-[100svh] w-full max-w-[560px] bg-[#EFEAE2] text-[#111B21]" aria-label={L.title}>
      {/* Header bar */}
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-[var(--inv-primary)] px-3 py-2.5 text-white">
        <ArrowLeft className="size-5 opacity-90" aria-hidden />
        <Avatar src={k.photo('avatar').src} name={names[0] ?? L.title} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.05rem] font-semibold leading-tight">{L.title}</h1>
          <p className="truncate text-xs opacity-85">{status === 'typing' ? t('typing…', 'टाइप कर रहे हैं…') : `${L.occasion} · ${k.text('chat.status')}`}</p>
        </div>
        <Video className="size-5 opacity-90" aria-hidden />
        <Phone className="size-5 opacity-90" aria-hidden />
        <MoreVertical className="size-5 opacity-90" aria-hidden />
      </header>

      <div className="inv-chat-wall flex flex-col gap-2 px-3 pb-10 pt-4">
        <p className="mx-auto mb-2 max-w-[90%] rounded-lg bg-[#FFEECD] px-3 py-1.5 text-center text-xs text-[#54656F]">
          🔒 {t('An invitation just for you. Scroll to read it.', 'सिर्फ़ आपके लिए निमंत्रण। पढ़ने के लिए नीचे स्क्रॉल करें।')}
        </p>
        {msgs.map((m, i) => {
          if (m.kind === 'chip')
            return (
              <p key={i} className="mx-auto my-1 rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-[#54656F] shadow-sm">
                {m.text}
              </p>
            );
          if (m.kind === 'photo')
            return (
              <Bubble key={i} msg={m} i={i}>
                <KitImg photo={m.photo} className="-mx-1.5 -mt-0.5 mb-1 aspect-[4/5] w-[min(68vw,300px)] rounded-xl" />
                {m.caption && <span className="block px-0.5 font-medium">{m.caption} ❤️</span>}
              </Bubble>
            );
          if (m.kind === 'event') {
            const f = fns[m.index]!;
            return (
              <Bubble key={i} msg={m} i={i}>
                <a href={mapHref(f)} target="_blank" rel="noopener" className="-mx-1.5 -mt-0.5 mb-1.5 block overflow-hidden rounded-xl">
                  {/* A drawn map tile: streets and a pin (no map provider needed). */}
                  <span className="inv-chat-map relative block h-28 w-[min(68vw,300px)]">
                    <MapPin className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-full fill-[#E53935] text-white" aria-hidden />
                  </span>
                </a>
                <span className="block text-[0.72rem] font-semibold uppercase tracking-wide text-[var(--inv-primary)]">
                  📅 {f.name}
                </span>
                <span className="block font-semibold">{fmt.date.format(new Date(f.startsAt))}</span>
                <span className="block text-sm">🕖 {fmt.time.format(new Date(f.startsAt))}</span>
                <span className="block text-sm">📍 {[f.venueName, f.venueAddress].filter(Boolean).join(', ')}</span>
                <a href={mapHref(f)} target="_blank" rel="noopener" className="mt-1 block text-sm font-medium text-[#027EB5]">
                  {t('Open directions', 'रास्ता देखें')}
                </a>
              </Bubble>
            );
          }
          if (m.kind === 'rsvp')
            return (
              <div key={i} className="flex flex-col gap-1.5">
                <Bubble msg={m} i={i}>
                  {k.text('chat.rsvp')}
                </Bubble>
                {/* Quick replies: both go to the RSVP form below. */}
                <div className="flex flex-wrap justify-end gap-1.5">
                  <a href="#rsvp" className="rounded-full border border-[var(--inv-primary)] bg-white px-4 py-2 text-sm font-semibold text-[var(--inv-primary)]">
                    {k.text('chat.yes')}
                  </a>
                  <a href="#rsvp" className="rounded-full border border-[#8696A0] bg-white px-4 py-2 text-sm text-[#54656F]">
                    {k.text('chat.no')}
                  </a>
                </div>
              </div>
            );
          return (
            <Bubble key={i} msg={m} i={i}>
              <span className="whitespace-pre-line">{m.text}</span>
            </Bubble>
          );
        })}
        <p className="mt-3 text-center text-xs text-[#667781]">
          {initialsOf(names)} · {L.handle}
        </p>
      </div>
    </section>
  );
}
