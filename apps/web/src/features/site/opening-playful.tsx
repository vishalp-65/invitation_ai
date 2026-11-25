'use client';

import type { SiteOpening } from '@cardai/shared';
import { useEffect, useState, type ReactNode } from 'react';
import './opening-playful.css';

/**
 * Playful tap-to-open scenes (made for the layout designs, open to any page): a phone message,
 * a story ring, a boarding pass, a spinning newspaper, a vinyl record, an arcade start screen,
 * a menu card and a flipping calendar. HTML/CSS only, transform + opacity animations; colours
 * from the --op-* variables Opening sets.
 */
export function PlayfulOpening({
  kind,
  open,
  label,
  names,
  connector,
  title,
  date,
  greeting,
  monogram,
}: {
  kind: SiteOpening;
  open: () => void;
  label: string;
  names: string[];
  connector?: string;
  title: string;
  date: string | null;
  greeting: string | null;
  monogram: string;
}) {
  // Lock-screen clock: the guest's own time, set after hydration (server time would differ).
  const [clock, setClock] = useState('');
  useEffect(() => {
    if (kind === 'notification') setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  }, [kind]);
  const both = names.length > 1 ? `${names[0]} ${connector || '&'} ${names[1]}` : (names[0] ?? title);
  const hint = <span className="opp-hint">{label}</span>;
  let body: ReactNode = null;

  switch (kind) {
    // A lock screen with one new message; the bubble lifts as the phone unlocks.
    case 'notification':
      body = (
        <>
          <div className="inv-backdrop opp-lock" />
          <div className="opp-exit opp-lock-time" aria-hidden>
            <span>{clock}</span>
          </div>
          <div className="opp-exit opp-note">
            <span className="opp-note-icon" aria-hidden>
              {monogram}
            </span>
            <span className="opp-note-body">
              <b>{both}</b>
              <span>{greeting ? `${greeting}, ${title}` : title} 💌</span>
            </span>
            <span className="opp-note-now">now</span>
          </div>
          <div className="opp-exit opp-swipe">{hint}</div>
        </>
      );
      break;
    // A profile ring that spins, then the story opens.
    case 'story':
      body = (
        <>
          <div className="inv-backdrop opp-story-bg" />
          <div className="opp-exit opp-ring">
            <span className="opp-ring-spin" aria-hidden />
            <span className="opp-ring-face">{monogram}</span>
          </div>
          <p className="opp-exit opp-story-name">{both}</p>
          <div className="opp-exit">{hint}</div>
        </>
      );
      break;
    // A boarding pass; the stub tears off along the perforation.
    case 'boarding':
      body = (
        <>
          <div className="inv-backdrop opp-sky" />
          <div className="opp-pass">
            <div className="opp-pass-main">
              <p className="opp-pass-k">Boarding pass</p>
              <p className="opp-pass-names">{both}</p>
              <div className="opp-pass-row">
                <span>
                  <i>Passenger</i>
                  <b>{greeting ?? 'You'}</b>
                </span>
                <span aria-hidden>✈</span>
                <span>
                  <i>Destination</i>
                  <b>{title}</b>
                </span>
              </div>
              {date && <p className="opp-pass-date">{date}</p>}
            </div>
            <div className="opp-pass-stub">
              <span className="opp-barcode" aria-hidden />
              <b>{monogram}</b>
            </div>
          </div>
          <div className="opp-exit">{hint}</div>
        </>
      );
      break;
    // An old-film newspaper spin that stops on the front page.
    case 'newspaper':
      body = (
        <>
          <div className="inv-backdrop opp-desk" />
          <div className="opp-paper">
            <p className="opp-paper-mast">The Celebration Times</p>
            <p className="opp-paper-rule">{date ?? ''} · Special edition</p>
            <p className="opp-paper-head">{both}</p>
            <p className="opp-paper-sub">{title}</p>
            <div className="opp-paper-cols" aria-hidden>
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="opp-exit opp-paper-hint">{hint}</div>
        </>
      );
      break;
    // A record spins up and the needle drops.
    case 'vinyl':
      body = (
        <>
          <div className="inv-backdrop opp-vinyl-bg" />
          <div className="opp-exit opp-record">
            <span className="opp-record-disc" aria-hidden>
              <span className="opp-record-label">{monogram}</span>
            </span>
            <span className="opp-needle" aria-hidden />
          </div>
          <p className="opp-exit opp-track">
            <b>{both}</b>
            <span>{title}</span>
          </p>
          <div className="opp-exit">{hint}</div>
        </>
      );
      break;
    // An 8-bit title screen: blinking PRESS START, then a pixel wipe.
    case 'arcade':
      body = (
        <>
          <div className="inv-backdrop opp-arcade-bg" />
          <div className="opp-exit opp-arcade">
            <p className="opp-arcade-k">Player 1 &amp; Player 2</p>
            <p className="opp-arcade-title">{both}</p>
            <p className="opp-arcade-start">▶ {label}</p>
            <p className="opp-arcade-coin">Insert coin · {date ?? ''}</p>
          </div>
          <div className="opp-pixels" aria-hidden />
        </>
      );
      break;
    // A menu card whose cover swings open like a book.
    case 'menu':
      body = (
        <>
          <div className="inv-backdrop opp-cloth" />
          <div className="opp-menu">
            <div className="opp-menu-inside" aria-hidden />
            <div className="opp-menu-cover">
              <p className="opp-menu-k">Menu</p>
              <p className="opp-menu-names">{both}</p>
              {date && <p className="opp-menu-date">{date}</p>}
            </div>
          </div>
          <div className="opp-exit">{hint}</div>
        </>
      );
      break;
    // Calendar pages flip up until the big day.
    case 'calendar':
      body = (
        <>
          <div className="inv-backdrop opp-wall" />
          <div className="opp-cal">
            <span className="opp-cal-rings" aria-hidden />
            {[3, 2, 1].map((n) => (
              <span key={n} className="opp-cal-page opp-cal-flip" style={{ animationDelay: `${(3 - n) * 0.22}s`, zIndex: n + 2 }} aria-hidden>
                {n}
              </span>
            ))}
            <span className="opp-cal-page opp-cal-day">
              <b>{date ?? ''}</b>
              <span>{both}</span>
            </span>
          </div>
          <div className="opp-exit">{hint}</div>
        </>
      );
      break;
  }

  return (
    <button type="button" onClick={open} autoFocus aria-label={label} className={`op-hit opp opp-k-${kind}`}>
      <span className="opp-stage">{body}</span>
    </button>
  );
}
