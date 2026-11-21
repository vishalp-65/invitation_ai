/** Shared look for every text control (studio theme): square, hairline border that carries hover/focus/error. */
/** Colours/border/states only, no size or padding, so call sites can size it without class conflicts. */
export const controlClass =
  'rounded-[var(--radius-field)] border border-ink/15 bg-ink/[0.02] text-ink transition-colors duration-150 placeholder:text-ink-soft/60 hover:border-ink/30 focus:border-ink focus:bg-transparent focus:outline-none focus-visible:outline-none disabled:opacity-60 aria-[invalid=true]:border-sindoor';
