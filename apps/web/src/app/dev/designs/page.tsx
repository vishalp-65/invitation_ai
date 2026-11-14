import { notFound } from 'next/navigation';
import { DesignGrid } from './design-grid';

/** Internal QA page: every template rendered as a layered design. Not available in production. */
export default function DevDesigns() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <DesignGrid />;
}
