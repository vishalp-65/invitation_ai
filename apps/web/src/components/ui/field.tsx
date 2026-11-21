import { clsx } from 'clsx';
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

import { controlClass } from './control-class';

export { controlClass };
export { Select, type SelectProps } from './select';
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
  const file = props.type === 'file';
  return (
    <input
      className={clsx(
        control,
        'h-10',
        file &&
          'cursor-pointer py-1 pl-1 text-sm text-ink-soft file:mr-3 file:h-full file:cursor-pointer file:rounded-[calc(var(--radius-field)-1px)] file:border-0 file:bg-ink/[0.06] file:px-3 file:text-sm file:font-medium file:text-ink hover:file:bg-ink/10',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(control, 'min-h-24 resize-y py-2 leading-relaxed', className)} {...props} />;
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
