import type { TemplateDefinition } from '@cardai/shared';

/** "Use this design": the create wizard, opened on the design's first occasion with it pre-picked. */
export const designHref = (t: Pick<TemplateDefinition, 'id' | 'eventTypes'>) =>
  `/create?type=${t.eventTypes === 'all' ? 'wedding' : t.eventTypes[0]}&template=${t.id}`;
