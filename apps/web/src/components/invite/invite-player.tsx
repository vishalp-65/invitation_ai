'use client';

import { CANVAS, planVideoScenes, VIDEO, type InviteProps } from '@cardai/shared';
import { InviteCard, InviteVideo } from '@cardai/templates';
import { Player, Thumbnail } from '@remotion/player';
import { clsx } from 'clsx';
import { useEffect, useRef, useState, type ComponentType } from 'react';

const Card = InviteCard as unknown as ComponentType<Record<string, unknown>>;
const Video = InviteVideo as unknown as ComponentType<Record<string, unknown>>;

interface Props {
  props: InviteProps;
  mode: 'card' | 'video';
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
}

/**
 * Live in-browser preview using the exact same Remotion layouts the worker renders,
 * so what users see is what they download — with zero server cost while editing.
 */
export function InvitePlayer({ props, mode, className, autoPlay = false, controls = true, loop = true }: Props) {
  const duration = mode === 'video' ? planVideoScenes(props, VIDEO.fps).durationInFrames : 1;
  return (
    <div className={clsx('aspect-[9/16] w-full overflow-hidden rounded-[18px] bg-mist', className)}>
      <Player
        key={`${mode}-${duration}`}
        component={mode === 'video' ? Video : Card}
        inputProps={props}
        durationInFrames={duration}
        fps={VIDEO.fps}
        compositionWidth={CANVAS.story.width}
        compositionHeight={CANVAS.story.height}
        style={{ width: '100%', height: '100%' }}
        controls={mode === 'video' && controls}
        autoPlay={mode === 'video' && autoPlay}
        loop={loop}
        clickToPlay={mode === 'video'}
        acknowledgeRemotionLicense
      />
    </div>
  );
}

/** Lightweight still for galleries; only mounts when scrolled into view. */
export function InviteThumb({ props, className }: { props: InviteProps; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e?.isIntersecting && setVisible(true), { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={clsx('aspect-[9/16] w-full overflow-hidden rounded-[14px] bg-mist', className)}>
      {visible && (
        <Thumbnail
          component={Card}
          inputProps={props}
          compositionWidth={CANVAS.story.width}
          compositionHeight={CANVAS.story.height}
          frameToDisplay={0}
          durationInFrames={1}
          fps={VIDEO.fps}
          style={{ width: '100%', height: '100%' }}
        />
      )}
    </div>
  );
}
