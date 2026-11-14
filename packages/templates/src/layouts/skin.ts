import { decorSchema, getLanguage, type Decor, type InviteProps, type LayoutId } from '@cardai/shared';
import { inkOn } from '../utils/color';

export interface Skin {
  layout: LayoutId;
  /** Colour behind the text (panel surface or page background). */
  textBg: string;
  ink: string;
  accent: string;
  muted: string;
  display: string;
  body: string;
  /** Font for the couple's / honouree's names (script for Latin on premium designs). */
  names: string;
  headingTransform: 'none' | 'uppercase';
  headingSpacing: string;
  /** Whether content sits on a raised CSS surface panel. */
  panel: boolean;
  /** Content box insets as % of width/height. */
  inset: { top: number; x: number; bottom: number };
  decor: Decor;
}

interface Rule {
  panel: boolean;
  /** Frame paints its own surface (e.g. jharokha window); text sits on `surface`. */
  surfaceFrame?: boolean;
  inset: { top: number; x: number; bottom: number };
  headingTransform: 'none' | 'uppercase';
  headingSpacing: string;
}

const LAYOUT_RULES: Record<LayoutId, Rule> = {
  'royal-arch': { panel: false, inset: { top: 17, x: 13, bottom: 8 }, headingTransform: 'none', headingSpacing: '0.02em' },
  'floral-frame': { panel: true, inset: { top: 13, x: 12, bottom: 11 }, headingTransform: 'none', headingSpacing: '0.01em' },
  'minimal-modern': { panel: false, inset: { top: 10, x: 12, bottom: 9 }, headingTransform: 'uppercase', headingSpacing: '0.28em' },
  'temple-heritage': { panel: false, inset: { top: 13, x: 11, bottom: 11 }, headingTransform: 'none', headingSpacing: '0.04em' },
  'festive-pop': { panel: true, inset: { top: 12, x: 8, bottom: 9 }, headingTransform: 'none', headingSpacing: '0.02em' },
  'photo-frame': { panel: false, inset: { top: 7, x: 10, bottom: 8 }, headingTransform: 'uppercase', headingSpacing: '0.24em' },
  botanical: { panel: false, inset: { top: 15, x: 13, bottom: 13 }, headingTransform: 'none', headingSpacing: '0.02em' },
  'art-deco': { panel: false, inset: { top: 17, x: 14, bottom: 12 }, headingTransform: 'uppercase', headingSpacing: '0.3em' },
  monogram: { panel: false, inset: { top: 10, x: 14, bottom: 10 }, headingTransform: 'uppercase', headingSpacing: '0.32em' },
  jharokha: { panel: false, surfaceFrame: true, inset: { top: 15, x: 17, bottom: 9 }, headingTransform: 'none', headingSpacing: '0.03em' },
};

const fontStack = (family: string, generic: 'serif' | 'sans-serif' | 'cursive') => `"${family}", "Noto Sans", ${generic}`;

export function skinFor(props: InviteProps): Skin {
  const { layout, theme } = props.template;
  const p = theme.palette;
  const rules = LAYOUT_RULES[layout];
  const decor = decorSchema.parse(theme.decor ?? {});
  const textBg = rules.panel || rules.surfaceFrame ? p.surface : p.background;
  const onSurface = rules.panel || rules.surfaceFrame;
  const ink = inkOn(textBg, onSurface ? [p.text, p.primary, p.background] : [p.text]);
  const accent = inkOn(textBg, onSurface ? [p.primary, p.background, p.accent, ink] : [p.primary, p.accent, ink]);
  const muted = inkOn(textBg, [p.muted, ink]);
  const latin = getLanguage(props.language).script === 'Latn';

  // Make room for ornaments so they never sit under text.
  const inset = { ...rules.inset };
  if (decor.toran) inset.top += layout === 'jharokha' ? 3 : 6;
  if (decor.florals !== 'none' && decor.floralPlacement !== 'diagonal') inset.bottom += 5;
  if (decor.florals !== 'none' && decor.floralPlacement === 'diagonal') {
    inset.bottom += 3;
    inset.top += decor.toran ? 0 : 3;
  }

  const display = fontStack(props.fonts.display, 'serif');
  return {
    layout,
    textBg,
    ink,
    accent,
    muted,
    display,
    body: fontStack(props.fonts.body, 'sans-serif'),
    names: latin && decor.nameFont ? fontStack(decor.nameFont, 'cursive') : display,
    // Uppercase / wide tracking only makes sense for Latin script.
    headingTransform: latin ? rules.headingTransform : 'none',
    headingSpacing: latin ? rules.headingSpacing : '0',
    panel: rules.panel,
    inset,
    decor,
  };
}
