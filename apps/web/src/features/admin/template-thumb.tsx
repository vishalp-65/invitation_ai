'use client';

import { TemplateCover } from '@/components/invite/template-cover';

export function TemplateThumb({ id, name, coverPage }: { id: string; name: string; coverPage?: unknown }) {
  return <TemplateCover id={id} name={name} coverPage={coverPage} className="" />;
}
