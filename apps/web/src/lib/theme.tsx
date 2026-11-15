'use client';

import { clsx } from 'clsx';
import { Monitor, Moon, Sun } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';
export type Theme = 'light' | 'dark';

const KEY = 'cardai-theme';
/** Marketing and guest-facing pages keep the editorial light look. */
const LIGHT_ONLY = /^\/(pricing\/?)?$|^\/i\/|^\/preview\//;

export function isLightOnly(pathname: string) {
  return LIGHT_ONLY.test(pathname);
}

/**
 * Runs in <head> before first paint so there's no light flash on dark devices.
 * Kept tiny and dependency-free; mirrors `resolve()` below.
 */
export const THEME_BOOT_SCRIPT = `(()=>{try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(${LIGHT_ONLY}.test(location.pathname))d=false;document.documentElement.dataset.theme=d?'dark':'light'}catch(e){}})()`;

// ---- tiny external store (no context, no re-render cascade)
const listeners = new Set<() => void>();
let pref: ThemePref = 'system';
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
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0E1122' : '#FBF8F3');
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
  return useSyncExternalStore(subscribe, readPref, () => 'system');
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
export function ThemeToggle({ className }: { className?: string }) {
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
      className={clsx('grid size-10 place-items-center rounded-full text-ink transition-colors hover:bg-mist', className)}
    >
      <Icon className="size-[1.15rem]" />
    </button>
  );
}

/** Segmented Light / Dark / System picker (settings menus). */
export function ThemeSegmented() {
  const p = useThemePref();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-full border border-hairline bg-surface p-0.5">
      {ORDER.map((o) => {
        const Icon = META[o].icon;
        return (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={p === o}
            onClick={() => setThemePref(o)}
            className="flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-soft transition-colors aria-checked:bg-primary aria-checked:text-on-primary"
          >
            <Icon className="size-4" />
            {META[o].label}
          </button>
        );
      })}
    </div>
  );
}
