'use client';

import { useParams } from 'next/navigation';
import { Editor } from '@/features/editor/editor';

/** Full-screen card editor (own layout: no site header, fits the phone screen exactly). */
export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  return <Editor eventId={id} />;
}
