import { BRAND } from '@cardai/shared';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

/** Seconds at the end of a free (watermarked) video given to the Noyta card. */
export const BRAND_OUTRO_SECONDS = 1.8;

/**
 * Free videos end on a short brand card over the last scene: everyone the video is forwarded to
 * on WhatsApp learns where it was made. The invitation stays readable underneath (dimmed, not
 * covered), and paid videos never show it.
 */
export function BrandOutro() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width } = useVideoConfig();
  const start = durationInFrames - Math.round(BRAND_OUTRO_SECONDS * fps);
  if (frame < start) return null;
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const a = interpolate(frame, [start, start + fps * 0.45], [0, 1], clamp);
  const u = width / 1080;
  return (
    <AbsoluteFill style={{ background: `rgba(0,0,0,${0.55 * a})`, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none' }}>
      <div
        style={{
          opacity: a,
          transform: `translateY(${(1 - a) * 30 * u}px)`,
          padding: `${34 * u}px ${56 * u}px`,
          borderRadius: 36 * u,
          background: 'rgba(255,255,255,0.96)',
          color: '#1f1726',
          textAlign: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 30 * u, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.6 }}>Made with</div>
        <div style={{ fontSize: 96 * u, fontWeight: 800, lineHeight: 1.05, marginTop: 6 * u }}>{BRAND.name}</div>
        <div style={{ fontSize: 34 * u, marginTop: 14 * u }}>Card, video &amp; website invitations</div>
        <div style={{ display: 'inline-block', marginTop: 22 * u, padding: `${12 * u}px ${30 * u}px`, borderRadius: 999, background: '#5b2a5e', color: '#fff', fontSize: 34 * u, fontWeight: 700 }}>
          Make yours free · {BRAND.domain}
        </div>
      </div>
    </AbsoluteFill>
  );
}
