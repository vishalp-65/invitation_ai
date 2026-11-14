import { planVideoScenes, type InviteProps } from '@cardai/shared';
import type { ComponentType } from 'react';
import { Composition, Still } from 'remotion';
import { COMPOSITIONS } from '../compositions';
import { InviteCard } from '../InviteCard';
import { InviteVideo } from '../InviteVideo';
import { sampleInviteProps } from '../sample';

const defaultProps = sampleInviteProps();
// Remotion's generic props typing is stricter than our serialisable InviteProps.
const Card = InviteCard as ComponentType<Record<string, unknown>>;
const Video = InviteVideo as ComponentType<Record<string, unknown>>;

export function RemotionRoot() {
  return (
    <>
      <Still id={COMPOSITIONS.card.id} component={Card} width={COMPOSITIONS.card.width} height={COMPOSITIONS.card.height} defaultProps={defaultProps} />
      <Still
        id={COMPOSITIONS.cardPrint.id}
        component={Card}
        width={COMPOSITIONS.cardPrint.width}
        height={COMPOSITIONS.cardPrint.height}
        defaultProps={defaultProps}
      />
      <Composition
        id={COMPOSITIONS.video.id}
        component={Video}
        width={COMPOSITIONS.video.width}
        height={COMPOSITIONS.video.height}
        fps={COMPOSITIONS.video.fps}
        durationInFrames={300}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: planVideoScenes(props as InviteProps, COMPOSITIONS.video.fps).durationInFrames,
        })}
      />
    </>
  );
}
