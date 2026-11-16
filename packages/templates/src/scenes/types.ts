import type { ScenePalette } from '@cardai/shared';
import type { ReactNode } from 'react';

/** Draws one depth layer of a scene (viewBox 400×800). `t` = seconds for video, undefined on the web. */
export type Draw = (c: ScenePalette, t: number | undefined) => ReactNode;

export interface SceneDef {
  far: Draw;
  mid: Draw;
  near: Draw;
}
