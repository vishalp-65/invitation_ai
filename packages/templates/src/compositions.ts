import { CANVAS, COMPOSITION_IDS, VIDEO } from '@cardai/shared';

/** Composition ids shared by Remotion Root (registration) and the worker (rendering). */
export const COMPOSITIONS = {
  card: { id: COMPOSITION_IDS.card, ...CANVAS.story },
  cardPrint: { id: COMPOSITION_IDS.cardPrint, width: CANVAS.print.width, height: CANVAS.print.height },
  video: { id: COMPOSITION_IDS.video, ...CANVAS.story, fps: VIDEO.fps },
} as const;
