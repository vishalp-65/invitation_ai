import { clsx } from 'clsx';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

type Variant = 'primary' | 'brand' | 'quiet' | 'outline' | 'danger' | 'solid' | 'line' | 'glass';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon';

/** Pill buttons (studio theme): solid ink or hairline outline, no shadows, a slight squeeze on press. */
const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';
const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  /** Alias of primary, kept for existing call sites. */
  solid: 'bg-primary text-on-primary hover:bg-primary-hover',
  brand: 'bg-sindoor text-white hover:bg-sindoor-deep',
  line: 'border border-ink/20 bg-transparent text-ink hover:border-ink/60 hover:bg-ink/5',
  outline: 'border border-ink text-ink hover:bg-primary hover:text-on-primary',
  quiet: 'bg-transparent text-ink hover:bg-mist',
  danger: 'bg-transparent text-sindoor hover:bg-sindoor/10',
  /** On photos / dark media only. */
  glass: 'glass text-white hover:bg-white/15',
};
const sizes: Record<Size, string> = {
  xs: 'h-8 px-3 text-[0.8125rem]',
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-10 px-4 text-[0.95rem]',
  lg: 'h-12 px-6 text-base',
  icon: 'size-9 p-0',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  // Defaults to type="button" so an action button inside a <form> never submits it by accident;
  // submit buttons say `type="submit"`. `disabled` is pulled out so a caller's `disabled={false}`
  // can't re-enable a loading button (double submits).
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props} disabled={loading || disabled} aria-busy={loading || undefined}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
