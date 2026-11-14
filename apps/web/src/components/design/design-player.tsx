'use client';

import { BRAND, CANVAS, VIDEO, type DesignData, type DesignDoc } from '@cardai/shared';
import { DesignVideo, planDesignVideo, type DesignRenderProps } from '@cardai/templates';
import { Player } from '@remotion/player';
import type { ComponentType } from 'react';

const Video = DesignVideo as unknown as ComponentType<Record<string, unknown>>;

/** In-browser video preview of a designed card: the same composition the worker renders. */
export function DesignPlayer({ design, data, language, musicUrl = null }: { design: DesignDoc; data: DesignData; language: string; musicUrl?: string | null }) {
  const props: DesignRenderProps = { design, data, language, page: 0, watermark: false, watermarkText: BRAND.watermarkText, musicUrl, aiClipUrl: null };
  const { durationInFrames } = planDesignVideo(design, VIDEO.fps, false);
  return (
    <div className="aspect-[9/16] w-full overflow-hidden rounded-[18px] bg-mist">
      <Player
        component={Video}
        inputProps={props}
        durationInFrames={durationInFrames}
        fps={VIDEO.fps}
        compositionWidth={CANVAS.story.width}
        compositionHeight={CANVAS.story.height}
        style={{ width: '100%', height: '100%' }}
        controls
        autoPlay
        loop
        acknowledgeRemotionLicense
      />
    </div>
  );
}
