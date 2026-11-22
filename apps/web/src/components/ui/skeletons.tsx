/** Single shimmer block; size it with classes. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** Shimmer placeholders shown instantly while a route streams in (no layout jump). */
export function PageSkeleton({ variant = 'list' }: { variant?: 'list' | 'grid' | 'workspace' | 'form' }) {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-6" aria-busy aria-label="Loading">
      <div className="skeleton h-10 w-2/3 max-w-sm" />
      <div className="skeleton mt-3 h-4 w-1/2 max-w-xs" />
      {variant === 'grid' && (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton aspect-[4/5]" />
          ))}
        </div>
      )}
      {variant === 'list' && (
        <div className="mt-10 flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      )}
      {variant === 'workspace' && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="skeleton h-9 w-28" />
              ))}
            </div>
            <div className="skeleton h-40" />
            <div className="skeleton h-40" />
          </div>
          <div className="skeleton hidden aspect-[9/16] lg:block" />
        </div>
      )}
      {variant === 'form' && (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="skeleton h-10" />
            ))}
          </div>
          <div className="skeleton hidden aspect-[9/16] lg:block" />
        </div>
      )}
    </div>
  );
}

/** Fallback for a gallery of 9:16 cards (template pickers, design libraries). */
export function GallerySkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6 xl:grid-cols-4" aria-busy aria-label="Loading designs">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="skeleton aspect-[9/16] w-full" />
          <div className="skeleton mt-3 h-4 w-2/3" />
        </li>
      ))}
    </ul>
  );
}

/** Fallback for the create wizard: step header, option tiles and a primary action. */
export function WizardSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-6" aria-busy aria-label="Loading">
      <div className="skeleton h-2 w-full max-w-xs" />
      <div className="skeleton mt-8 h-10 w-3/4 max-w-md" />
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton mt-10 h-12 w-40" />
    </div>
  );
}
