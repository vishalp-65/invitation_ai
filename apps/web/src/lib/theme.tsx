'use client';

import { clsx } from 'clsx';
import { Monitor, Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = 'cardai-theme';
/** Guest-facing invitation sites keep their own designed look; everything else follows the theme. */
const LIGHT_ONLY = /^\/i\/|^\/preview\//;

export function isLightOnly(pathname: string) {
  return LIGHT_ONLY.test(pathname);
}

/**
 * Runs in <head> before first paint so there's no light flash on dark devices.
 * Kept tiny and dependency-free; mirrors `resolve()` below.
 */
export const THEME_BOOT_SCRIPT = `(()=>{try{var p=localStorage.getItem('${KEY}')||'dark';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(${LIGHT_ONLY}.test(location.pathname))d=false;document.documentElement.dataset.theme=d?'dark':'light';if(localStorage.getItem('cardai-sidebar')==='collapsed')document.documentElement.dataset.sidebar='collapsed'}catch(e){}})()`;

// ---- tiny external store (no context, no re-render cascade)
const listeners = new Set<() => void>();
/** First visit defaults to dark, the studio theme's native look. */
let pref: ThemePref = 'dark';
let loaded = false;

function readPref(): ThemePref {
  if (!loaded && typeof window !== 'undefined') {
    loaded = true;
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark' || v === 'system') pref = v;
    } catch {
      /* storage blocked */
    }
  }
  return pref;
}

function systemDark() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(p: ThemePref, pathname: string): Theme {
  if (isLightOnly(pathname)) return 'light';
  return p === 'dark' || (p === 'system' && systemDark()) ? 'dark' : 'light';
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (root.dataset.theme === theme) return;
  // Swap without every element animating its colours (keeps the switch instant).
  root.setAttribute('data-theme-switching', '');
  root.dataset.theme = theme;
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute('data-theme-switching')));
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', theme === 'dark' ? '#050608' : '#F7F6F2'));
}

export function setThemePref(next: ThemePref) {
  pref = next;
  loaded = true;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage blocked: still applies for this visit */
  }
  apply(resolve(next, location.pathname));
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => 'dark');
}

/** Keeps <html data-theme> in sync with route changes and the OS setting. Mount once. */
export function ThemeSync() {
  const pathname = usePathname();
  const p = useThemePref();
  useEffect(() => {
    apply(resolve(p, pathname));
    if (p !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const on = () => apply(resolve('system', location.pathname));
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [p, pathname]);
  return null;
}

const ORDER: ThemePref[] = ['light', 'dark', 'system'];
const META: Record<ThemePref, { label: string; icon: typeof Sun }> = {
  light: { label: 'Light', icon: Sun },
  dark: { label: 'Dark', icon: Moon },
  system: { label: 'System', icon: Monitor },
};

/** Icon button that cycles Light → Dark → System. Hidden on light-only pages. */
export function ThemeToggle({ className, compact }: { className?: string; compact?: boolean }) {
  const p = useThemePref();
  const pathname = usePathname();
  if (isLightOnly(pathname)) return null;
  const next = ORDER[(ORDER.indexOf(p) + 1) % ORDER.length]!;
  const Icon = META[p].icon;
  return (
    <button
      type="button"
      onClick={() => setThemePref(next)}
      aria-label={`Theme: ${META[p].label}. Switch to ${META[next].label}`}
      data-tip={`Theme: ${META[p].label}`}
      data-tip-kbd={`→ ${META[next].label}`}
      className={clsx('grid place-items-center text-ink-soft transition-colors hover:bg-mist hover:text-ink', compact ? 'size-9 rounded-lg' : 'size-10 rounded-full', className)}
    >
      <Icon className="size-[1.15rem]" />
    </button>
  );
}

/** Segmented Light / Dark / System picker (settings menus). */
export function ThemeSegmented() {
  const p = useThemePref();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex border border-ink/15 p-0.5">
      {ORDER.map((o) => {
        const Icon = META[o].icon;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={p === o}
            onClick={() => setThemePref(o)}
            className="flex h-8 items-center gap-1.5 px-3 text-[0.8125rem] text-ink-soft transition-colors duration-200 hover:text-ink aria-checked:bg-ink/[0.08] aria-checked:text-ink"
          >
            <Icon className="size-3.5" strokeWidth={1.75} />
            {META[o].label}
          </button>
        );
      })}
    </div>
  );
}
