import { planVideoScenes, type InviteProps, type VideoScene } from '@cardai/shared';
import type { CSSProperties } from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  OffthreadVideo,
  random,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { DateStrip, FamilyBlock, FunctionsBlock, HeroArt, NamesBlock, VenueBlock, type LineAnim } from './components/Content';
import { BrandOutro } from './components/BrandOutro';
import { Motif } from './components/Motif';
import { Stage } from './components/Stage';
import { skinFor } from './layouts/skin';

const SAVE_THE_DATE: Partial<Record<string, string>> = { hi: 'शुभ तिथि', mr: 'शुभ तिथी', gu: 'શુભ તારીખ', bn: 'শুভ দিন', pa: 'ਸ਼ੁਭ ਤਾਰੀਖ', ta: 'சுப தினம்', te: 'శుభ ముహూర్తం', kn: 'ಶುಭ ದಿನ', ml: 'ശുഭ ദിനം', ur: 'تاریخ یاد رکھیں' };

/** Animated video invite: same layouts as the card, split into timed scenes. */
export function InviteVideo(props: InviteProps) {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  const { scenes } = planVideoScenes(props, fps);
  const zoom = interpolate(frame, [0, durationInFrames], [1, 1.12]);
  const clip = scenes.find((s) => s.kind === 'clip');

  return (
    <AbsoluteFill>
      <Stage
        props={props}
        width={width}
        height={height}
        zoom={zoom}
        sway={Math.sin(frame / 22) * 2.2}
        overlay={<Petals props={props} />}
      >
        {({ skin, u }) => (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {scenes
              .filter((s) => s.kind !== 'clip')
              .map((scene, i) => (
                <Sequence key={i} from={scene.from} durationInFrames={scene.duration} layout="none">
                  <SceneBody scene={scene} props={props} skin={skin} u={u} />
                </Sequence>
              ))}
          </div>
        )}
      </Stage>

      {clip && props.aiClipUrl && (
        <Sequence from={clip.from} durationInFrames={clip.duration}>
          <ClipScene src={props.aiClipUrl} duration={clip.duration} props={props} />
        </Sequence>
      )}

      {props.watermark && <BrandOutro />}

      {props.musicUrl && (
        <Audio
          src={props.musicUrl}
          volume={(f) =>
            interpolate(f, [0, fps, durationInFrames - fps * 1.5, durationInFrames], [0, 0.8, 0.8, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      )}
    </AbsoluteFill>
  );
}

function SceneBody({
  scene,
  props,
  skin,
  u,
}: {
  scene: VideoScene;
  props: InviteProps;
  skin: ReturnType<typeof skinFor>;
  u: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [scene.duration - 10, scene.duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const anim: LineAnim = (i) => {
    const s = spring({ frame: frame - i * 5, fps, config: { damping: 200, mass: 0.8 } });
    return {
      opacity: s * exit,
      transform: `translateY(${(1 - s) * 4 * u}px) scale(${0.96 + s * 0.04})`,
    } satisfies CSSProperties;
  };

  const wrap: CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.6 * u,
  };

  switch (scene.kind) {
    case 'intro':
      return (
        <div style={wrap}>
          <div style={anim(0)}>
            {skin.decor.art === 'couple' ? (
              <Motif motif={props.template.theme.motif} color={skin.accent} accent={props.template.theme.palette.accent} size={20 * u} />
            ) : (
              <HeroArt props={props} skin={skin} u={u} scale={1.45} />
            )}
          </div>
          {props.salutation && (
            <div style={{ ...anim(1), fontFamily: skin.body, fontStyle: 'italic', fontSize: 3.6 * u, color: skin.muted }}>
              {props.salutation}
            </div>
          )}
          <div style={{ ...anim(2), fontFamily: skin.body, fontSize: 3.6 * u, color: skin.accent }}>
            {props.content.invocation}
          </div>
          <div
            style={{
              ...anim(3),
              fontFamily: skin.display,
              fontSize: 10 * u,
              color: skin.accent,
              textTransform: skin.headingTransform,
              letterSpacing: skin.headingSpacing,
            }}
          >
            {props.content.headline}
          </div>
        </div>
      );
    case 'names':
      return (
        <div style={wrap}>
          {skin.decor.art === 'couple' && (
            <div style={anim(0)}>
              <HeroArt props={props} skin={skin} u={u} scale={1.25} />
            </div>
          )}
          {props.content.hostLine && (
            <div style={{ ...anim(1), fontFamily: skin.body, fontSize: 3.4 * u, color: skin.ink, maxWidth: '90%', lineHeight: 1.45 }}>
              {props.content.hostLine}
            </div>
          )}
          <NamesBlock props={props} skin={skin} u={u} anim={anim} start={2} />
        </div>
      );
    case 'savedate': {
      const fn = props.functions[props.mainFunction] ?? props.functions[0];
      if (!fn) return null;
      return (
        <div style={wrap}>
          <div style={{ ...anim(0), fontFamily: skin.body, fontSize: 3.2 * u, color: skin.muted, letterSpacing: '0.3em', textTransform: 'uppercase' }}>
            {SAVE_THE_DATE[props.language] ?? 'Save the date'}
          </div>
          <div style={anim(1)}>
            <DateStrip fn={fn} skin={skin} u={u} k={1.3} />
          </div>
          <div style={anim(2)}>
            <VenueBlock fn={fn} skin={skin} u={u} k={1.2} />
          </div>
        </div>
      );
    }
    case 'function':
      return (
        <div style={wrap}>
          <FunctionsBlock props={props} skin={skin} u={u} anim={anim} items={[scene.index]} />
        </div>
      );
    case 'family':
      return (
        <div style={wrap}>
          <FamilyBlock props={props} skin={skin} u={u} anim={anim} showLink={false} />
        </div>
      );
    case 'outro':
      return (
        <div style={wrap}>
          <div style={{ ...anim(0), fontFamily: skin.display, fontSize: 6 * u, color: skin.accent, maxWidth: '90%' }}>
            {props.content.closing || props.content.headline}
          </div>
          {props.siteUrl && (
            <div style={{ ...anim(1), fontFamily: skin.body, fontSize: 3 * u, color: skin.ink }}>
              {props.siteUrl.replace(/^https?:\/\//, '')}
            </div>
          )}
        </div>
      );
    default:
      return null;
  }
}

function ClipScene({ src, duration, props }: { src: string; duration: number; props: InviteProps }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [duration - 15, duration], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const skin = skinFor(props);
  const { width } = useVideoConfig();
  const u = width / 100;
  const titleIn = interpolate(frame, [15, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ opacity, backgroundColor: '#000' }}>
      <OffthreadVideo src={src} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '18%', background: 'linear-gradient(transparent 55%, rgba(0,0,0,0.55))' }}>
        <div style={{ opacity: titleIn, fontFamily: skin.display, fontSize: 8 * u, color: '#fff', textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
          {props.content.primaryNames.filter(Boolean).join(` ${props.content.connector || '&'} `) || props.content.headline}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** Slowly falling petals for a festive feel (deterministic for reproducible renders). */
function Petals({ props }: { props: InviteProps }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { primary, accent } = props.template.theme.palette;
  const count = 18;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <svg width={width} height={height}>
        {Array.from({ length: count }, (_, i) => {
          const speed = 1.2 + random(`ps-${i}`) * 2.2;
          const x0 = random(`px-${i}`) * width;
          const y = ((random(`py-${i}`) * height + frame * speed * 2) % (height + 60)) - 30;
          const x = x0 + Math.sin((frame + i * 20) / 30) * 30;
          const r = (frame * (1 + (i % 3))) % 360;
          const s = width * (0.008 + random(`pz-${i}`) * 0.012);
          return (
            <ellipse key={i} cx={x} cy={y} rx={s} ry={s * 0.55} fill={i % 2 ? primary : accent} fillOpacity={0.55} transform={`rotate(${r} ${x} ${y})`} />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
}
