import { clsx } from 'clsx';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/** Shared look for every text control (studio theme): square, hairline border that carries hover/focus/error. */
/** Colours/border/states only, no size or padding, so call sites can size it without class conflicts. */
export const controlClass =
  'rounded-[var(--radius-field)] border border-ink/15 bg-ink/[0.02] text-ink transition-colors duration-150 placeholder:text-ink-soft/60 hover:border-ink/30 focus:border-ink focus:bg-transparent focus:outline-none focus-visible:outline-none disabled:opacity-60 aria-[invalid=true]:border-sindoor';
const control = `${controlClass} w-full px-3 text-[0.95rem]`;

/** Small form label. */
export const labelClass = 'text-sm font-medium text-ink';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  action?: ReactNode;
  children: (id: string, describedBy?: string) => ReactNode;
}

/** Label + control + hint/error, wired for screen readers. */
export function Field({ label, hint, error, action, children }: FieldProps) {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end justify-between gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        {action}
      </div>
      {children(id, hintId)}
      {(error || hint) && (
        <p id={hintId} className={clsx('text-[0.8125rem]', error ? 'text-sindoor' : 'text-ink-soft')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(control, 'min-h-24 resize-y py-2 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(control, 'select h-10 pr-9', className)} {...props}>
      {children}
    </select>
  );
}

export function Chip({
  selected,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={clsx(
        'inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border px-4 text-sm transition-colors duration-150 disabled:opacity-50',
        selected ? 'border-ink bg-ink text-ivory' : 'border-ink/10 text-ink-soft hover:border-ink/30 hover:text-ink',
        className,
      )}
      {...props}
    />
  );
}

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';
const tones: Record<Tone, string> = {
  neutral: '',
  good: 'bg-leaf/12 text-leaf',
  warn: 'bg-marigold/18 text-marigold-deep',
  bad: 'bg-sindoor/10 text-sindoor',
  info: 'bg-gold/12 text-gold',
};

/** Small status / count label (`.badge`). */
export function Badge({ tone = 'neutral', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={clsx('badge', tones[tone], className)} {...props} />;
}
