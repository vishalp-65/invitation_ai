import { clsx } from 'clsx';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

const control =
  'w-full rounded-[var(--radius-field)] border border-hairline bg-surface px-3.5 py-2.5 text-base text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-ink-soft/55 hover:border-ink/25 focus:border-ink/50 focus:shadow-[0_0_0_4px_rgb(30_34_80/0.08)] focus:outline-none aria-[invalid=true]:border-sindoor';

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
        <label htmlFor={id} className="text-[0.95rem] font-semibold">
          {label}
        </label>
        {action}
      </div>
      {children(id, hintId)}
      {(error || hint) && (
        <p id={hintId} className={clsx('text-sm', error ? 'text-sindoor' : 'text-ink-soft')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(control, 'h-12', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(control, 'min-h-24 resize-y leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={clsx(control, 'h-12 appearance-none bg-[length:1rem] pr-9', className)} {...props}>
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
        'press inline-flex h-10 items-center gap-2 rounded-[var(--radius-pill)] border px-4 text-[0.95rem] font-medium transition-[background-color,color,border-color] duration-200 disabled:opacity-50',
        selected ? 'border-ink bg-primary text-on-primary' : 'border-hairline bg-surface text-ink hover:border-ink/30',
        className,
      )}
      {...props}
    />
  );
}
