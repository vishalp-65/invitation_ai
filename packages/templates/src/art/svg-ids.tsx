import { useId } from 'react';

/** SVG ids must be unique per page (several cards can share a DOM in the editor). */
export function useSvgId(prefix: string): string {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
}

/** Hand-painted look: slightly wobbly edges + soft bleed, like watercolour on paper. */
export function PaintFilter({ id, strength = 2.4 }: { id: string; strength?: number }) {
  return (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={2} seed={7} result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale={strength} xChannelSelector="R" yChannelSelector="G" result="wobble" />
      <feGaussianBlur in="wobble" stdDeviation={0.35} />
    </filter>
  );
}
