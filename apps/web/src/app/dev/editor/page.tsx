import { notFound } from 'next/navigation';
import { EditorHarness } from './harness';

/** Internal QA page: the card editor against a stubbed API (no backend needed). Not available in production. */
export default function DevEditor() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <EditorHarness />;
}
