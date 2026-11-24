'use client';

import { heroInk, type SiteDesign } from '@cardai/shared';
import { Ambient, SceneLayer } from '@cardai/templates/scenes';
import '@/features/site/scenes.css';

const LAYERS = ['sky', 'far', 'mid', 'near'] as const;

/**
 * A 9:16 cover of a cinematic (video / website) design: its painted scene with sample names on
 * top, the way the video opens. `still` freezes the scene loops (small carousel cards); the
 * full preview animates them and adds the design's ambient particles.
 */
export function DesignPoster({ design, still = false, names = ['Abhishek', 'Kanika'] }: { design: SiteDesign; still?: boolean; names?: [string, string] }) {
  const night = design.scene.night;
  const ink = heroInk(design); // the design's own cover colour (e.g. cream on a maroon arch)
  const c = design.scene.colors;
  return (
    <div
      className="design-poster absolute inset-0 overflow-hidden"
      data-still={still || undefined}
      style={{ background: c.skyBottom, containerType: 'inline-size' }}
    >
      {LAYERS.map((layer) => (
        <SceneLayer key={layer} design={design} layer={layer} lite />
      ))}
      {!still && <Ambient kind={design.ambient} colors={c.bloom} glow={c.glow} density={0.5} />}
      {/* Cover text sits in the band the scene keeps free (≈14–50% of the height). */}
      <div
        className="absolute inset-x-0 top-[15%] flex flex-col items-center px-[8%] text-center"
        style={{ color: ink, textShadow: night ? '0 2px 18px rgb(0 0 0 / 0.45)' : undefined }}
      >
        <p className="text-[4.2cqi] uppercase tracking-[0.3em] opacity-80" style={{ fontFamily: `"${design.fonts.body}", var(--font-sans)` }}>
          Wedding celebration
        </p>
        <p className="mt-[3cqi] text-[13cqi] leading-[1.05]" style={{ fontFamily: `"${design.fonts.script}", "${design.fonts.serif}", var(--font-display)` }}>
          {names[0]}
          <span className="block text-[6cqi] leading-tight">&amp;</span>
          {names[1]}
        </p>
      </div>
    </div>
  );
}
