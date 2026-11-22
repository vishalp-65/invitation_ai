'use client';

import { RouteError } from '@/components/ui/route-error';

export default function SegmentError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <RouteError {...props} as="div" backHref="/admin" backLabel="Back to admin" />;
}
