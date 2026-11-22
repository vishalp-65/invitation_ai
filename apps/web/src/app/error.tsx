'use client';

import { RouteError } from '@/components/ui/route-error';

/** Catches a page that crashed while rendering; the root layout, header and fonts keep working. */
export default function PageError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} />;
}
