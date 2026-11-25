'use client';

import type { SiteDoc } from '@cardai/shared';
import { ChevronDown, Grid3x3, Heart, MapPin, Send, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Avatar, daysUntil, KitImg, mapHref, useKit, useLayoutData, type KitPhotoValue } from './common';

/**
 * Story Mode: full-screen tap-through stories (tap right = next, left = back, hold = pause),
 * then a profile page: avatar ring, stats, bio, highlights per function and a photo grid.
 * Progress is a CSS animation; its end moves to the next story (no JS timers per frame).
 */

const STORY_MS = 5500;
/** Backgrounds for stories without a photo (bold gradients, like a "type" story). */
const GRADIENTS = [
  'linear-gradient(160deg, #F58529 0%, #DD2A7B 55%, #8134AF 100%)',
  'linear-gradient(160deg, #1D2B64 0%, #8134AF 100%)',
  'linear-gradient(160deg, #DD2A7B 0%, #F58529 100%)',
  'linear-gradient(160deg, #0F2027 0%, #2C5364 100%)',
  'linear-gradient(160deg, #8E2DE2 0%, #DD2A7B 100%)',
  'linear-gradient(160deg, #134E5E 0%, #71B280 100%)',
];
const RING = 'conic-gradient(from 210deg, #F58529, #DD2A7B, #8134AF, #F58529)';

interface Story {
  id: string;
  bg: string;
  photo?: KitPhotoValue;
  body: ReactNode;
}

function Sticker({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-[#111] shadow-lg ${className}`} style={style}>
      {children}
    </span>
  );
}

export function StoriesLayout({ doc, started }: { doc: SiteDoc; started: boolean }) {
  const L = useLayoutData(doc);
  const { content: c, t, fmt, fns, photos, people, names, first } = L;
  const k = useKit(doc, 'stories');
  const days = daysUntil(first?.startsAt);
  const date = (iso: string) => fmt.date.format(new Date(iso));

  const stories: Story[] = [
    {
      id: 'cover',
      bg: GRADIENTS[0]!,
      photo: k.photo('cover'),
      body: (
        <div className="flex h-full flex-col items-center justify-end pb-[16svh] text-center">
          <Sticker className="mb-4 -rotate-3 font-bold uppercase tracking-wider">✨ {k.text('st.sticker')}</Sticker>
          <h2 className="inv-script text-[clamp(3rem,15vw,5.5rem)] leading-[1.02] text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.45)]">{L.title}</h2>
          {first && <Sticker className="mt-5 rotate-2 text-lg font-semibold">📅 {date(first.startsAt)}</Sticker>}
          {c.hashtag && <p className="mt-4 text-lg font-semibold text-white [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">{c.hashtag}</p>}
        </div>
      ),
    },
    {
      id: 'invite',
      bg: GRADIENTS[1]!,
      body: (
        <div className="flex h-full flex-col items-center justify-center px-2 text-center text-white">
          {c.invocation && <p className="mb-6 text-base opacity-90">{c.invocation}</p>}
          <p className="inv-display text-[clamp(1.6rem,7vw,2.4rem)] leading-snug">{c.hostLine || c.headline}</p>
          <p className="inv-script mt-8 text-5xl">{L.title}</p>
        </div>
      ),
    },
    ...fns.slice(0, 5).map<Story>((f, i) => ({
      id: `fn-${f.id}`,
      bg: GRADIENTS[(i + 2) % GRADIENTS.length]!,
      photo: i < 3 ? k.photo(`fn-${i + 1}`) : photos[i + 1] ? { src: photos[i + 1], style: {} } : undefined,
      body: (
        <div className="flex h-full flex-col items-center justify-center text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] opacity-90">
            {t('Function', 'कार्यक्रम')} {i + 1}/{fns.length}
          </p>
          <h2 className="inv-display mt-3 text-[clamp(2.8rem,14vw,4.8rem)] leading-none [text-shadow:0_4px_30px_rgba(0,0,0,0.4)]">{f.name}</h2>
          <Sticker className="mt-6 -rotate-2 text-lg font-semibold">
            🗓 {date(f.startsAt)} · {fmt.time.format(new Date(f.startsAt))}
          </Sticker>
          {/* Location sticker: opens directions (stops the story first). */}
          <a href={mapHref(f)} target="_blank" rel="noopener" data-tap-through="no" className="mt-4 rotate-1">
            <Sticker className="font-bold uppercase text-[#C1356F]">
              <MapPin className="size-4" aria-hidden /> {f.venueName}
            </Sticker>
          </a>
          {f.dressCode && <p className="mt-4 text-base opacity-95">👗 {f.dressCode}</p>}
        </div>
      ),
    })),
    ...(people.length
      ? [
          {
            id: 'people',
            bg: GRADIENTS[4]!,
            body: (
              <div className="flex h-full flex-col items-center justify-center text-center text-white">
                <p className="text-sm font-semibold uppercase tracking-[0.3em]">{k.text('st.meet')}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-6">
                  {people.slice(0, 4).map((p) => (
                    <div key={p.name} className="flex flex-col items-center">
                      <span className="rounded-full p-[3px]" style={{ background: RING }}>
                        <Avatar src={p.photo} name={p.name} size={120} className="border-4 border-white" />
                      </span>
                      <p className="inv-script mt-3 text-3xl">{p.name}</p>
                      {p.role && <p className="text-sm opacity-90">{p.role}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ),
          } satisfies Story,
        ]
      : []),
    {
      id: 'countdown',
      bg: GRADIENTS[5]!,
      photo: k.photo('countdown'),
      body: (
        <div className="flex h-full flex-col items-center justify-center text-center">
          {/* Countdown sticker */}
          <div className="w-[min(80vw,320px)] rounded-2xl bg-white/95 p-5 text-[#111] shadow-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8134AF]">{k.text('st.countdown')}</p>
            <p className="mt-1 text-lg font-semibold">{L.occasion}</p>
            <p className="mt-3 bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] bg-clip-text text-6xl font-black text-transparent">{days}</p>
            <p className="text-sm text-[#555]">{t('days to go', 'दिन बाकी')}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'rsvp',
      bg: GRADIENTS[0]!,
      body: (
        <div className="flex h-full flex-col items-center justify-center text-center">
          {/* Poll sticker: both answers open the RSVP form. */}
          <div className="w-[min(82vw,330px)] rounded-2xl bg-white p-5 text-[#111] shadow-xl">
            <p className="text-xl font-bold">{k.text('st.poll')}</p>
            <a href="#rsvp" data-tap-through="no" className="mt-4 block rounded-xl bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] py-3 text-lg font-bold text-white">
              {k.text('st.yes')}
            </a>
            <a href="#rsvp" data-tap-through="no" className="mt-2 block rounded-xl bg-[#EFEFEF] py-3 text-lg font-semibold">
              {k.text('st.no')}
            </a>
          </div>
        </div>
      ),
    },
  ];

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);
  const viewer = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = viewer.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(Boolean(e?.isIntersecting && e.intersectionRatio > 0.6)), { threshold: [0, 0.6, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const finish = useCallback(() => {
    setDone(true);
    document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  const next = useCallback(() => (index < stories.length - 1 ? setIndex(index + 1) : finish()), [index, stories.length, finish]);
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const openAt = (i: number) => {
    setDone(false);
    setIndex(i);
    viewer.current?.scrollIntoView({ behavior: 'smooth' });
  };
  const running = started && visible && !paused && !done;
  const story = stories[index]!;

  return (
    <>
      <section
        ref={viewer}
        className="inv-stories relative h-[100svh] w-full select-none overflow-hidden bg-black"
        aria-roledescription="stories"
        aria-label={L.title}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('[data-tap-through="no"]')) return;
          const r = e.currentTarget.getBoundingClientRect();
          if (e.clientX - r.left < r.width * 0.33) prev();
          else next();
        }}
      >
        <div className="absolute inset-0 mx-auto max-w-[520px] overflow-hidden" style={{ background: story.bg }}>
          {story.photo?.src && <KitImg key={story.id} photo={story.photo} className="inv-story-photo absolute inset-0 size-full" eager />}
          {story.photo?.src && <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/55" />}

          {/* Progress bars */}
          <div className="absolute inset-x-2 top-2 z-10 flex gap-1">
            {stories.map((s, i) => (
              <span key={s.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <span
                  key={i === index ? `${s.id}-run` : s.id}
                  className="block h-full bg-white"
                  style={
                    i < index || (done && i === index)
                      ? { width: '100%' }
                      : i === index
                        ? { animation: `inv-story-bar ${STORY_MS}ms linear forwards`, animationPlayState: running ? 'running' : 'paused' }
                        : { width: 0 }
                  }
                  onAnimationEnd={i === index ? next : undefined}
                />
              </span>
            ))}
          </div>
          {/* Header: avatar, handle, occasion */}
          <div className="absolute inset-x-3 top-5 z-10 flex items-center gap-2 text-white">
            <span className="rounded-full p-[2px]" style={{ background: RING }}>
              <Avatar src={photos[0]} name={names[0] ?? L.title} size={34} className="border-2 border-black" />
            </span>
            <span className="text-sm font-semibold [text-shadow:0_1px_6px_rgba(0,0,0,0.5)]">{L.handle}</span>
            <span className="text-sm opacity-80">· {L.occasion}</span>
            <button type="button" data-tap-through="no" onClick={finish} className="ml-auto grid size-9 place-items-center" aria-label={t('Skip stories', 'स्टोरी छोड़ें')}>
              <X className="size-6" />
            </button>
          </div>

          <div key={story.id} className="inv-story-in relative z-[5] h-full px-6 pt-16">
            {story.body}
          </div>

          {/* Reply bar, like a story: goes to the wishes / RSVP. */}
          <div className="absolute inset-x-3 bottom-[calc(var(--inv-dock)+84px)] z-10 flex items-center gap-3 text-white">
            <a href="#rsvp" data-tap-through="no" className="flex h-11 flex-1 items-center rounded-full border border-white/70 px-4 text-sm">
              {k.text('st.reply')}
            </a>
            <Heart className="size-7" aria-hidden />
            <Send className="size-7" aria-hidden />
          </div>
        </div>
      </section>

      {/* ---------------- Profile ---------------- */}
      <section id="profile" className="mx-auto w-full max-w-[560px] bg-[var(--inv-bg)] px-4 pb-6 pt-8 text-[var(--inv-text)]">
        <div className="flex items-center gap-6">
          <button type="button" onClick={() => openAt(0)} className="shrink-0 rounded-full p-[3px]" style={{ background: RING }} aria-label={t('Watch the stories again', 'स्टोरी फिर देखें')}>
            <Avatar src={photos[0]} name={names[0] ?? L.title} size={92} className="border-4 border-[var(--inv-bg)]" />
          </button>
          <div className="grid flex-1 grid-cols-3 text-center">
            {[
              [fns.length, t('functions', 'कार्यक्रम')],
              [days, t('days to go', 'दिन बाकी')],
              [Math.max(L.gallery.length, photos.length), t('photos', 'फ़ोटो')],
            ].map(([n, label]) => (
              <div key={String(label)}>
                <p className="text-xl font-bold">{n}</p>
                <p className="text-sm opacity-75">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <h1 className="mt-4 text-lg font-bold">{L.title}</h1>
        <p className="text-sm opacity-70">{L.occasion}</p>
        {(c.message || c.hostLine) && <p className="mt-1 whitespace-pre-line text-[0.95rem] leading-snug">{c.message || c.hostLine}</p>}
        {c.hashtag && <p className="mt-1 text-[0.95rem] font-medium text-[#00376B]">{c.hashtag}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <a href="#rsvp" className="grid h-10 place-items-center rounded-lg bg-[var(--inv-primary)] text-sm font-semibold text-[var(--inv-on-primary)]">
            {t('RSVP', 'RSVP करें')}
          </a>
          {first && (
            <a href={mapHref(first)} target="_blank" rel="noopener" className="grid h-10 place-items-center rounded-lg bg-black/[0.06] text-sm font-semibold">
              {t('Directions', 'रास्ता')}
            </a>
          )}
        </div>

        {/* Highlights: one circle per function, opens that story. */}
        <div className="-mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {fns.slice(0, 5).map((f, i) => (
            <button key={f.id} type="button" onClick={() => openAt(2 + i)} className="flex w-[72px] shrink-0 flex-col items-center gap-1.5">
              <span className="rounded-full border border-black/15 p-[3px]">
                <span className="grid size-16 place-items-center overflow-hidden rounded-full text-2xl text-white" style={{ background: GRADIENTS[(i + 2) % GRADIENTS.length] }}>
                  {photos[i + 1] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- host photo
                    <img src={photos[i + 1]} alt="" className="size-full object-cover" />
                  ) : (
                    [...f.name][0]
                  )}
                </span>
              </span>
              <span className="w-full truncate text-center text-xs">{f.name}</span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-4 flex justify-center border-t border-black/10 py-2.5" aria-hidden>
          <Grid3x3 className="size-6" />
        </div>
        {L.gallery.length ? (
          <ul className="-mx-4 grid grid-cols-3 gap-0.5">
            {L.gallery.slice(0, 12).map((src) => (
              <li key={src} className="aspect-square overflow-hidden bg-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element -- host photo */}
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </li>
            ))}
          </ul>
        ) : (
          <ul className="-mx-4 grid grid-cols-3 gap-0.5">
            {fns.slice(0, 6).map((f, i) => (
              <li key={f.id} className="grid aspect-square place-items-center p-2 text-center text-white" style={{ background: GRADIENTS[i % GRADIENTS.length] }}>
                <span>
                  <span className="block text-base font-bold leading-tight">{f.name}</span>
                  <span className="block text-xs opacity-90">{fmt.short.format(new Date(f.startsAt))}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <a href="#main" className="mt-6 flex flex-col items-center text-sm opacity-70">
          {t('More below', 'नीचे और भी')}
          <ChevronDown className="size-5" aria-hidden />
        </a>
      </section>
    </>
  );
}
