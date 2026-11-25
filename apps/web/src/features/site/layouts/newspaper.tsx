'use client';

import type { SiteDoc } from '@cardai/shared';
import { daysUntil, KitImg, mapHref, useKit, useLayoutData, useSeen } from './common';

/**
 * Front Page: the news on a classic broadsheet front page. Masthead, edition rule, a huge
 * headline, the front-page photo with a caption, two columns of copy with a drop cap, an
 * events calendar, a weather box and a classified ad. Columns collapse to one on phones.
 */
export function NewspaperLayout({ doc }: { doc: SiteDoc }) {
  const L = useLayoutData(doc);
  const k = useKit(doc, 'newspaper');
  const { content: c, t, fmt, fns, first } = L;
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const head = k.text('np.head', `${L.title}: ${t(`${L.occasion} announced!`, `${L.occasion} की घोषणा!`)}`);
  const days = daysUntil(first?.startsAt);
  const [ref, seen] = useSeen<HTMLDivElement>('0px');

  return (
    <section className="inv-np bg-[var(--inv-bg)] px-4 pb-10 pt-6 text-[var(--inv-text)] sm:px-8" aria-label={L.title}>
      <div ref={ref} className={`mx-auto max-w-3xl ${seen ? 'inv-np-in' : ''}`}>
        {/* Masthead */}
        <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-[0.2em] opacity-70">
          <span>{t('Vol. I · No. 1', 'खंड 1 · अंक 1')}</span>
          <span>{t('Price: your presence', 'मूल्य: आपकी उपस्थिति')}</span>
        </div>
        <h1 className="inv-display mt-2 text-center text-[clamp(2.4rem,11vw,5rem)] font-black leading-none tracking-tight">{k.text('np.mast')}</h1>
        <div className="mt-3 flex items-center justify-between border-y-2 border-current py-1.5 text-[0.7rem] uppercase tracking-[0.18em]">
          <span>{today}</span>
          <span className="hidden sm:inline">{k.text('np.edition')}</span>
          <span>☀ {k.text('np.weather')}</span>
        </div>

        {/* Headline */}
        <h2 className="inv-display mt-6 text-center text-[clamp(2rem,8.5vw,4rem)] font-bold uppercase leading-[0.98]">{head}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-lg italic opacity-85">{k.text('np.deck')}</p>

        {/* Photo */}
        <figure className="mt-6">
          <div className="inv-np-photo aspect-[16/10] overflow-hidden border border-current/20">
            <KitImg photo={k.photo('front')} eager className="size-full" fallback={<span className="block size-full bg-[var(--inv-bg-alt)]" />} />
          </div>
          <figcaption className="mt-1.5 border-b border-current/30 pb-2 text-sm italic opacity-75">
            {L.title}
            {first ? ` · ${fmt.date.format(new Date(first.startsAt))}` : ''}
          </figcaption>
        </figure>

        {/* Columns */}
        <div className="mt-5 gap-8 text-[1.05rem] leading-relaxed sm:columns-2">
          {c.invocation && <p className="mb-3 text-center text-sm uppercase tracking-widest opacity-70">{c.invocation}</p>}
          <p className="inv-np-dropcap">{c.hostLine || c.headline}</p>
          {c.message && <p className="mt-3">{c.message}</p>}
          {days > 0 && (
            <p className="mt-3 font-semibold">
              {t(`The celebrations begin in ${days} days.`, `उत्सव ${days} दिनों में शुरू होंगे।`)}
            </p>
          )}
          {c.familyLines.length > 0 && (
            <p className="mt-3 italic">
              {c.familyTitle ? `${c.familyTitle} ` : ''}
              {c.familyLines.join(', ')}
            </p>
          )}
        </div>

        {/* Events + classifieds */}
        <div className="mt-8 grid gap-6 border-t-2 border-current pt-5 sm:grid-cols-[1.6fr_1fr]">
          <div>
            <h3 className="inv-display text-2xl font-bold uppercase">{k.text('np.events')}</h3>
            <table className="mt-3 w-full text-left text-[0.98rem]">
              <tbody>
                {fns.map((f) => (
                  <tr key={f.id} className="border-b border-current/20 align-top">
                    <td className="py-2 pr-3 font-bold">{f.name}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {fmt.short.format(new Date(f.startsAt))}
                      <br />
                      <span className="text-sm opacity-70">{fmt.time.format(new Date(f.startsAt))}</span>
                    </td>
                    <td className="py-2">
                      <a href={mapHref(f)} target="_blank" rel="noopener" className="underline decoration-dotted underline-offset-4">
                        {f.venueName}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <aside className="inv-np-classified border-2 border-current p-4">
            <p className="text-center text-xs font-bold uppercase tracking-[0.3em]">{t('Classifieds', 'वर्गीकृत')}</p>
            <p className="mt-2 text-[0.98rem] leading-snug">{k.text('np.classified')}</p>
            <a href="#rsvp" className="mt-3 block border-t border-current/40 pt-2 text-center text-sm font-bold uppercase tracking-wider text-[var(--inv-accent)]">
              {t('Reply via RSVP →', 'RSVP से जवाब दें →')}
            </a>
            <div className="mt-4 aspect-[4/3] overflow-hidden grayscale">
              <KitImg photo={k.photo('inside')} className="size-full" />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
