'use client';

import { useParams } from 'next/navigation';
import { SiteBuilder } from '@/features/site-builder/builder';

/** Full-screen invitation website builder (own layout, like the card editor). */
export default function BuilderPage() {
  const { id } = useParams<{ id: string }>();
  return <SiteBuilder eventId={id} />;
}
