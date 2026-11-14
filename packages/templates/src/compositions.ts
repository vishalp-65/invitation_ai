import { CANVAS, COMPOSITION_IDS, DESIGN_PRINT, VIDEO } from '@cardai/shared';

/** Composition ids shared by Remotion Root (registration) and the worker (rendering). */
export const COMPOSITIONS = {
  card: { id: COMPOSITION_IDS.card, ...CANVAS.story },
  cardPrint: { id: COMPOSITION_IDS.cardPrint, width: CANVAS.print.width, height: CANVAS.print.height },
  video: { id: COMPOSITION_IDS.video, ...CANVAS.story, fps: VIDEO.fps },
  designCard: { id: COMPOSITION_IDS.designCard, ...CANVAS.story },
  designCardPrint: { id: COMPOSITION_IDS.designCardPrint, width: DESIGN_PRINT.width, height: DESIGN_PRINT.height },
  designVideo: { id: COMPOSITION_IDS.designVideo, ...CANVAS.story, fps: VIDEO.fps },
} as const;
