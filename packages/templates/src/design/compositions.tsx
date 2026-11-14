import { DESIGN_W, type DesignData, type DesignDoc } from '@cardai/shared';
import { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, Audio, continueRender, delayRender, interpolate, OffthreadVideo, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFamily } from '../fonts';
import { DesignPage, fontsForPages, type RenderGate } from './DesignPage';

/** Serialisable props for designed cards (Remotion inputProps). */
export interface DesignRenderProps {
  [key: string]: unknown;
  design: DesignDoc;
  data: DesignData;
  language: string;
  page: number;
  watermark: boolean;
  watermarkText: string;
  musicUrl: string | null;
  aiClipUrl: string | null;
}

const gate: RenderGate = {
  hold: (label) => delayRender(label, { timeoutInMilliseconds: 60_000 }),
  release: (h) => continueRender(h),
};

/** Loads every font the document uses; holds the render until done. */
export function useDesignFonts(design: DesignDoc, data: DesignData | null, holdRender: boolean): boolean {
  const fonts = useMemo(() => fontsForPages(design.pages, data), [design, data]);
  const signature = fonts.map((f) => `${f.family}|${f.script}`).join(',');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const handle = holdRender ? delayRender(`design-fonts:${signature}`, { timeoutInMilliseconds: 60_000 }) : null;
    Promise.allSettled(fonts.map((f) => loadFamily(f.family, f.script === 'Latn' ? undefined : f.script))).finally(() => {
      if (alive) setReady(true);
      if (handle !== null) continueRender(handle);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- signature encodes the font list
  }, [signature, holdRender]);
  return ready;
}

function Watermark({ text }: { text: string }) {
  return (
    <>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: 'rotate(-30deg)', fontSize: 97, fontFamily: 'sans-serif', fontWeight: 700, color: 'rgba(255,255,255,0.08)', textShadow: '0 0 2px rgba(0,0,0,0.08)', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
        {text}
      </AbsoluteFill>
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', padding: '9px 26px', borderRadius: 999, background: 'rgba(0,0,0,0.45)', color: '#fff', fontFamily: 'sans-serif', fontSize: 24, letterSpacing: '0.04em' }}>{text}</div>
    </>
  );
}

/** One page of a designed card as a still (image / PDF / print). */
export function DesignCard(props: DesignRenderProps) {
  const { width } = useVideoConfig();
  const ready = useDesignFonts(props.design, props.data, true);
  const page = props.design.pages[Math.min(Math.max(props.page, 0), props.design.pages.length - 1)]!;
  const k = width / DESIGN_W;
  return (
    <AbsoluteFill>
      {ready && <DesignPage page={page} data={props.data} width={width} gate={gate} fontsReady={ready} language={props.language} />}
      {props.watermark && (
        <AbsoluteFill style={{ transform: `scale(${k})`, transformOrigin: '0 0', width: DESIGN_W, height: (DESIGN_W * 16) / 9 }}>
          <Watermark text={props.watermarkText} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
}

export const DESIGN_VIDEO = {
  coverSeconds: 7,
  pageSeconds: 5.5,
  crossfade: 0.7,
  clipSeconds: 6,
};

export function planDesignVideo(design: DesignDoc, fps: number, hasClip: boolean) {
  const f = (s: number) => Math.round(s * fps);
  const scenes: Array<{ page: number; from: number; duration: number }> = [];
  let at = hasClip ? f(DESIGN_VIDEO.clipSeconds) - f(DESIGN_VIDEO.crossfade) : 0;
  design.pages.forEach((_, i) => {
    const duration = f(i === 0 ? DESIGN_VIDEO.coverSeconds : DESIGN_VIDEO.pageSeconds);
    scenes.push({ page: i, from: at, duration });
    at += duration - f(DESIGN_VIDEO.crossfade);
  });
  return { scenes, durationInFrames: at + f(DESIGN_VIDEO.crossfade) };
}

/** Video invite: every page of the designed card, layers animating in, crossfading page to page. */
export function DesignVideo(props: DesignRenderProps) {
  const frame = useCurrentFrame();
  const { width, fps, durationInFrames } = useVideoConfig();
  const ready = useDesignFonts(props.design, props.data, true);
  const { scenes } = planDesignVideo(props.design, fps, Boolean(props.aiClipUrl));
  const fade = Math.round(DESIGN_VIDEO.crossfade * fps);
  const k = width / DESIGN_W;

  return (
    <AbsoluteFill style={{ background: props.design.pages[0]?.bg.color ?? '#000' }}>
      {props.aiClipUrl && (
        <Sequence from={0} durationInFrames={Math.round(DESIGN_VIDEO.clipSeconds * fps)}>
          <AbsoluteFill>
            <OffthreadVideo src={props.aiClipUrl} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </AbsoluteFill>
        </Sequence>
      )}
      {ready &&
        scenes.map((s) => {
          const local = frame - s.from;
          if (local < 0 || local >= s.duration) return null;
          const opacity = interpolate(local, [0, fade, s.duration - fade, s.duration], [0, 1, 1, s.page === scenes.length - 1 ? 1 : 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <AbsoluteFill key={s.page} style={{ opacity: s.page === 0 && !props.aiClipUrl ? 1 : opacity }}>
              <DesignPage page={props.design.pages[s.page]!} data={props.data} width={width} t={local / fps} fontsReady={ready} language={props.language} />
            </AbsoluteFill>
          );
        })}
      {props.watermark && (
        <AbsoluteFill style={{ transform: `scale(${k})`, transformOrigin: '0 0', width: DESIGN_W, height: (DESIGN_W * 16) / 9 }}>
          <Watermark text={props.watermarkText} />
        </AbsoluteFill>
      )}
      {props.musicUrl && (
        <Audio
          src={props.musicUrl}
          volume={(f) => interpolate(f, [0, fps, durationInFrames - fps * 1.5, durationInFrames], [0, 0.8, 0.8, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      )}
    </AbsoluteFill>
  );
}
