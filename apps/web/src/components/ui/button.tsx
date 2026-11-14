import { clsx } from 'clsx';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

type Variant = 'primary' | 'brand' | 'quiet' | 'outline' | 'danger' | 'gloss' | 'glass' | 'solid' | 'line';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-pill)] font-semibold transition-[color,background-color,transform,filter] duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';
const variants: Record<Variant, string> = {
  // Flat indigo ink: the primary action everywhere.
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  brand: 'bg-sindoor text-white hover:bg-sindoor-deep',
  quiet: 'bg-transparent text-ink hover:bg-mist',
  outline: 'border-2 border-ink text-ink hover:bg-primary hover:text-on-primary',
  danger: 'bg-transparent text-sindoor hover:bg-sindoor/10',
  // Kept for compatibility: same flat ink look as `solid`.
  gloss: 'bg-primary text-on-primary hover:bg-primary-hover',
  glass: 'glass text-white hover:bg-surface/15 active:scale-[0.98] transition-transform',
  // Editorial surfaces: flat ink and hairline buttons.
  solid: 'bg-primary text-on-primary shadow-[0_1px_2px_rgb(15_18_51/0.2),0_8px_20px_-10px_rgb(30_34_80/0.6)] hover:bg-primary-hover',
  line: 'border border-hairline bg-surface text-ink hover:border-ink/30 hover:bg-ivory',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-base',
  lg: 'h-14 px-7 text-lg',
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
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={loading || props.disabled} {...props}>
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
