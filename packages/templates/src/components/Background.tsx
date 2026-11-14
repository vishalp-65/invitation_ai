import type { Theme } from '@cardai/shared';
import { AbsoluteFill, Img } from 'remotion';
import { withAlpha } from '../utils/color';
import { Pattern } from './Pattern';

interface BackgroundProps {
  theme: Theme;
  width: number;
  height: number;
  imageUrl: string | null;
  /** Ken-Burns zoom for video (1 = none). */
  zoom?: number;
}

export function Background({ theme, width, height, imageUrl, zoom = 1 }: BackgroundProps) {
  const p = theme.palette;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: p.background }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 30%, ${p.background} 0%, ${p.backgroundAlt} 100%)`,
          transform: `scale(${zoom})`,
        }}
      />
      {imageUrl ? (
        <>
          <Img
            src={imageUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom})` }}
          />
          {/* Scrim keeps text readable over busy AI artwork. */}
          <AbsoluteFill
            style={{
              background: `linear-gradient(180deg, ${withAlpha(p.background, 0.35)} 0%, ${withAlpha(p.background, 0.55)} 50%, ${withAlpha(p.backgroundAlt, 0.7)} 100%)`,
            }}
          />
        </>
      ) : (
        <Pattern
          pattern={theme.pattern}
          color={p.primary}
          accent={p.accent}
          opacity={theme.ornamentOpacity}
          width={width}
          height={height}
        />
      )}
    </AbsoluteFill>
  );
}
