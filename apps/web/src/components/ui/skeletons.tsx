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
