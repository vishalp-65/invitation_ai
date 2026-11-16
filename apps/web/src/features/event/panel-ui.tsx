import { clsx } from 'clsx';
import { Check, Crown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/**
 * Shared building blocks for the invitation workspace tabs, so every tab reads the same way:
 * titled cards with an optional footer bar, one upsell pattern, one status pill, one toggle row.
 */

export function Panel({
  title,
  description,
  actions,
  footer,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={clsx('overflow-hidden rounded-[16px] border border-hairline bg-surface', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            {title && <h2 className="text-xl">{title}</h2>}
            {description && <p className="mt-1 max-w-2xl text-[0.9375rem] text-ink-soft">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children && <div className={clsx('px-5 pb-5 sm:px-6 sm:pb-6', title || actions ? 'pt-5' : 'pt-5 sm:pt-6', bodyClassName)}>{children}</div>}
      {footer && <footer className="flex flex-wrap items-center gap-3 border-t border-hairline bg-surface-2 px-5 py-4 sm:px-6">{footer}</footer>}
    </section>
  );
}

/** The one upsell layout: what you get, then a single button. */
export function LockedPanel({
  icon: Icon = Crown,
  title,
  body,
  points,
  cta,
  onClick,
}: {
  icon?: LucideIcon;
  title: string;
  body: string;
  points: string[];
  cta: string;
  onClick: () => void;
}) {
  return (
    <section className="relative overflow-hidden rounded-[16px] border border-hairline bg-surface">
      <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <span className="grid size-11 place-items-center rounded-xl bg-tint text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <h2 className="mt-4 text-2xl sm:text-[1.75rem]">{title}</h2>
          <p className="mt-2 max-w-xl text-ink-soft">{body}</p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex gap-2 text-[0.9375rem]">
                <Check className="mt-0.5 size-4 shrink-0 text-leaf" strokeWidth={2.5} aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <Button size="lg" onClick={onClick} className="md:self-end">
          <Crown className="size-4" aria-hidden />
          {cta}
        </Button>
      </div>
    </section>
  );
}

export type Tone = 'leaf' | 'gold' | 'sindoor' | 'muted' | 'primary';
const TONES: Record<Tone, string> = {
  leaf: 'bg-leaf/10 text-leaf',
  gold: 'bg-gold/15 text-ink dark:text-gold',
  sindoor: 'bg-sindoor/10 text-sindoor',
  muted: 'bg-mist text-ink-soft',
  primary: 'tint-primary',
};

export function StatusPill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-xs font-semibold', TONES[tone], className)}>
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {children}
    </span>
  );
}

/** A labelled iOS-style switch row. */
export function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span>
        <span className="block text-[0.9375rem] font-medium">{label}</span>
        {hint && <span className="block text-[0.8125rem] text-ink-soft">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

/** Icon tile used at the start of list rows. */
export function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span className={clsx('grid size-10 shrink-0 place-items-center rounded-xl bg-tint text-primary', className)}>
      <Icon className="size-[1.15rem]" aria-hidden />
    </span>
  );
}

/** Table shell shared by Guests and Replies. */
export const tableHead = 'border-b border-hairline bg-surface-2 text-left text-[0.8125rem] font-medium text-ink-soft';
