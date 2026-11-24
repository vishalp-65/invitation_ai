import { getLanguage, type InviteProps } from '@cardai/shared';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AbsoluteFill, continueRender, delayRender } from 'remotion';
import { MandalaWatermark } from '../art/Diya';
import { FloralCorners } from '../art/Florals';
import { Toran } from '../art/Toran';
import { useInviteFonts } from '../fonts-remotion';
import { skinFor, type Skin } from '../layouts/skin';
import { withAlpha } from '../utils/color';
import { Background } from './Background';
import { Frame } from './Frames';

interface StageProps {
  props: InviteProps;
  width: number;
  height: number;
  zoom?: number;
  overlay?: ReactNode;
  /** Toran sway in degrees (video only). */
  sway?: number;
  /** Shrink content to fit the card (stills). Video scenes manage their own layout. */
  fit?: boolean;
  children: (ctx: { skin: Skin; u: number }) => ReactNode;
}

/** Background + frame + ornaments + content box + watermark. Shared by every card page and video scene. */
export function Stage({ props, width, height, zoom, overlay, sway = 0, fit = false, children }: StageProps) {
  const skin = skinFor(props);
  const u = width / 100;
  const script = getLanguage(props.language).script;
  const families = [props.fonts.display, props.fonts.body];
  if (skin.decor.nameFont && script === 'Latn') families.push(skin.decor.nameFont);
  const fontsReady = useInviteFonts(families, script);
  const p = props.template.theme.palette;
  const d = skin.decor;

  const box = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 2 * u,
        width: '100%',
      }}
    >
      {children({ skin, u })}
    </div>
  );

  return (
    <AbsoluteFill dir={props.dir} style={{ fontFamily: skin.body }}>
      <Background theme={props.template.theme} width={width} height={height} imageUrl={props.backgroundUrl} zoom={zoom} />
      <Frame layout={props.template.layout} theme={props.template.theme} width={width} height={height} />
      {d.mandala && (
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', top: '8%' }}>
          <MandalaWatermark size={86 * u} color={skin.accent} opacity={0.09} />
        </AbsoluteFill>
      )}
      <FloralCorners kind={d.florals} placement={d.floralPlacement} width={width} height={height} />
      {d.toran && <Toran width={width} height={height} sway={sway} glow={p.accent} />}
      {overlay}
      <AbsoluteFill
        style={{
          paddingTop: `${skin.inset.top}%`,
          paddingBottom: `${skin.inset.bottom}%`,
          paddingLeft: `${skin.inset.x}%`,
          paddingRight: `${skin.inset.x}%`,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            position: 'relative',
            ...(skin.panel
              ? {
                  background: withAlpha(p.surface, 0.93),
                  borderRadius: 4 * u,
                  padding: `${5 * u}px ${5 * u}px`,
                  boxShadow: `0 ${u}px ${4 * u}px ${withAlpha('#000000', 0.18)}`,
                }
              : {}),
          }}
        >
          {fit ? <FitBox ready={fontsReady}>{box}</FitBox> : <div style={{ flex: 1, display: 'flex' }}>{box}</div>}
        </div>
      </AbsoluteFill>
      {props.watermark && <Watermark text={props.watermarkText} u={u} />}
    </AbsoluteFill>
  );
}

/**
 * Scales its content down (never up) so long names, many family lines or a big illustration
 * always fit the card. Rendering waits for the measurement, so stills are never clipped.
 */
function FitBox({ ready, children }: { ready: boolean; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [handle] = useState(() => delayRender('fit-content'));
  const released = useRef(false);

  // Re-measures after every render on purpose (content changes live in the editor); the
  // threshold check makes it settle after one extra pass instead of looping.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    if (!ready || !outer.current || !inner.current) return;
    const o = outer.current;
    const i = inner.current;
    const s = Math.min(1, o.clientHeight / Math.max(i.scrollHeight, 1), o.clientWidth / Math.max(i.scrollWidth, 1));
    const next = Number.isFinite(s) && s > 0 ? s : 1;
    if (Math.abs(next - scale) > 0.005) setScale(next);
    if (!released.current) {
      released.current = true;
      // Next frame: the scale has been applied.
      requestAnimationFrame(() => continueRender(handle));
    }
  });

  return (
    <div ref={outer} style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
      <div
        ref={inner}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: '100%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Watermark({ text, u }: { text: string; u: number }) {
  return (
    <>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: 'rotate(-30deg)',
          fontSize: 9 * u,
          fontFamily: 'sans-serif',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.08)',
          textShadow: '0 0 2px rgba(0,0,0,0.08)',
          whiteSpace: 'nowrap',
        }}
      >
        {text.split(' · ')[0]}
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 2.2 * u,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: `${0.8 * u}px ${2.4 * u}px`,
          borderRadius: 99 * u,
          background: 'rgba(0,0,0,0.45)',
          color: '#fff',
          fontFamily: 'sans-serif',
          fontSize: 2.2 * u,
          letterSpacing: '0.04em',
        }}
      >
        {text}
      </div>
    </>
  );
}
