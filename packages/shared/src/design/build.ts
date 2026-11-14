import { getEventType } from '../constants/event-types.js';
import type { LanguageCode } from '../constants/languages.js';
import { decorSchema, type TemplateDefinition } from '../templates/types.js';
import type { DesignData } from './bindings.js';
import { artEl, fullPage, makeCtx, resetIds, shapeEl, solidBg, stack, tonesFor, TYPE_SETS, type Band, type RecipeCtx, type Tones, type TypeSetKey, type Zone } from './builder.js';
import { isDarkColor } from './color.js';
import { DESIGN_FAMILIES, goldOn, type Chrome, type DesignFamily } from './families.js';
import { DESIGN_H, DESIGN_W, type DesignDoc, type DesignElement, type DesignPage } from './schema.js';

export interface BuildDesignInput {
  template: Pick<TemplateDefinition, 'id' | 'layout' | 'theme'> & { design?: string };
  data: DesignData;
  language: LanguageCode;
  eventType: string;
}

const SCHEDULE_TITLE: Partial<Record<LanguageCode, string>> = { en: 'Celebrations', hi: 'मांगलिक कार्यक्रम', mr: 'कार्यक्रम' };
const FUNCTIONS_PER_PAGE = 3;

/** A recipe-like description of any template (new design families, or the classic catalogue). */
interface Spec {
  type: TypeSetKey;
  date: DesignFamily['date'];
  divider: string;
  zone: Zone;
  textBg: (ctx: RecipeCtx) => string;
  chrome: (ctx: RecipeCtx, t: Tones) => Chrome;
  hero: (ctx: RecipeCtx, t: Tones) => Band[];
  bands?: (ctx: RecipeCtx, t: Tones) => Band[];
}

function defaultCoverBands(spec: Spec, ctx: RecipeCtx, t: Tones): Band[] {
  const hero = spec.hero(ctx, t);
  const divider: Band = { t: 'divider', style: spec.divider, gap: 30 };
  const dateAndVenue: Band[] = [
    { t: 'date', style: spec.date, gap: 34 },
    { t: 'text', role: 'venue', bind: 'fnM.venue', gap: 26 },
    { t: 'text', role: 'small', bind: 'fnM.address', gap: 6 },
  ];
  const fam = ctx.data.functions.length <= 1 && ctx.data.content.familyLines.length <= 3;
  const family: Band[] = fam
    ? [
        { t: 'text', role: 'eyebrow', bind: 'familyTitle', gap: 34, size: TYPE_SETS[spec.type].eyebrow.size * 0.85 },
        { t: 'text', role: 'small', bind: 'familyLines', gap: 8 },
      ]
    : [];

  if (ctx.people === 2) {
    return [
      ...hero,
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 14 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 24 },
      { t: 'text', role: 'names', bind: 'name1', gap: 28 },
      { t: 'text', role: 'detail', bind: 'detail1', gap: 2 },
      { t: 'text', role: 'connector', bind: 'connector', gap: 8 },
      { t: 'text', role: 'names', bind: 'name2', gap: 8 },
      { t: 'text', role: 'detail', bind: 'detail2', gap: 2 },
      divider,
      ...dateAndVenue,
      ...family,
    ];
  }
  if (ctx.people === 1) {
    return [
      ...hero,
      { t: 'text', role: 'invocation', bind: 'invocation', gap: 14 },
      { t: 'text', role: 'eyebrow', bind: 'headline', gap: 22 },
      { t: 'text', role: 'host', bind: 'hostLine', gap: 20 },
      { t: 'text', role: 'name', bind: 'name1', gap: 22 },
      { t: 'text', role: 'detail', bind: 'detail1', gap: 4 },
      divider,
      ...dateAndVenue,
      ...family,
    ];
  }
  return [
    ...hero,
    { t: 'text', role: 'invocation', bind: 'invocation', gap: 14 },
    { t: 'text', role: 'headline', bind: 'headline', gap: 20, size: TYPE_SETS[spec.type].headline.size * 1.5 },
    { t: 'text', role: 'host', bind: 'hostLine', gap: 24 },
    { t: 'text', role: 'body', bind: 'message', gap: 20 },
    divider,
    ...dateAndVenue,
    ...family,
  ];
}

function page(id: string, chrome: Chrome, content: DesignElement[]): DesignPage {
  // Confetti/sparkle overlays sit behind the text so they never hurt readability.
  return { id, bg: chrome.bg, elements: [...chrome.under, ...(chrome.over ?? []), ...content] };
}

/** Builds the full card (cover + schedule + family pages) for a template and event data. */
export function buildDesign(input: BuildDesignInput): DesignDoc {
  resetIds();
  const ev = getEventType(input.eventType);
  const p = input.template.theme.palette;
  const ctx = makeCtx({ p, data: input.data, language: input.language, eventType: input.eventType, category: ev.category, people: ev.primaryPeople });
  const family = input.template.design ? DESIGN_FAMILIES.find((f) => f.id === input.template.design) : undefined;
  const spec: Spec = family
    ? {
        type: family.type,
        date: family.date,
        divider: family.divider ?? 'ornate',
        zone: family.zone,
        textBg: family.textBg ?? ((c) => c.p.background),
        chrome: family.chrome,
        hero: family.hero ?? (() => []),
        bands: family.bands,
      }
    : legacySpec(input.template);

  const tones = tonesFor(spec.textBg(ctx), p);
  const ts = TYPE_SETS[spec.type];
  const chrome = spec.chrome(ctx, tones);
  const pages: DesignPage[] = [];

  const coverBands = spec.bands ? spec.bands(ctx, tones) : defaultCoverBands(spec, ctx, tones);
  pages.push(page('cover', chrome, stack(coverBands, spec.zone, ctx, ts, tones)));

  // Inner pages reuse the frame and background (the hero illustration lives in the cover bands).
  const inner: Chrome = chrome;
  const fns = input.data.functions;
  if (fns.length > 1) {
    for (let i = 0; i < fns.length; i += FUNCTIONS_PER_PAGE) {
      const bands: Band[] = [{ t: 'text', role: 'headline', text: SCHEDULE_TITLE[input.language] ?? SCHEDULE_TITLE.en!, gap: 0 }, { t: 'divider', style: spec.divider, gap: 24 }];
      for (let k = i; k < Math.min(fns.length, i + FUNCTIONS_PER_PAGE); k++) {
        bands.push(
          { t: 'text', role: 'connector', bind: `fn${k}.name`, gap: 64, size: ts.connector.size * 1.2 },
          { t: 'text', role: 'date', bind: `fn${k}.datetime`, gap: 14, size: ts.date.size * 0.95 },
          { t: 'text', role: 'venue', bind: `fn${k}.venue`, gap: 14 },
          { t: 'text', role: 'small', bind: `fn${k}.address`, gap: 4 },
          { t: 'text', role: 'small', bind: `fn${k}.dress`, gap: 6 },
        );
      }
      pages.push(page(`schedule-${i / FUNCTIONS_PER_PAGE + 1}`, inner, stack(bands, spec.zone, ctx, ts, tones)));
    }
  }
  const lines = input.data.content.familyLines.length;
  if (lines > 0 && (fns.length > 1 || lines > 3)) {
    const bands: Band[] = [
      { t: 'text', role: 'headline', bind: 'familyTitle', gap: 0 },
      { t: 'divider', style: spec.divider, gap: 24 },
      { t: 'text', role: 'body', bind: 'familyLines', gap: 40 },
      { t: 'text', role: 'connector', bind: 'closing', gap: 60 },
    ];
    pages.push(page('family', inner, stack(bands, spec.zone, ctx, ts, tones)));
  }
  return { v: 1, templateId: input.template.id, pages };
}

// ------------------------------------------------------------ classic catalogue → layers

const LEGACY_INSET: Record<string, { top: number; x: number; bottom: number; panel?: boolean; surfaceFrame?: boolean; type: TypeSetKey; date: DesignFamily['date'] }> = {
  'royal-arch': { top: 17, x: 13, bottom: 8, type: 'royal', date: 'strip' },
  'floral-frame': { top: 13, x: 12, bottom: 11, panel: true, type: 'classic', date: 'strip' },
  'minimal-modern': { top: 10, x: 12, bottom: 9, type: 'modern', date: 'stack' },
  'temple-heritage': { top: 13, x: 11, bottom: 11, type: 'classic', date: 'strip' },
  'festive-pop': { top: 12, x: 8, bottom: 9, panel: true, type: 'playful', date: 'boxed' },
  'photo-frame': { top: 7, x: 10, bottom: 8, type: 'modern', date: 'line' },
  botanical: { top: 15, x: 13, bottom: 13, type: 'script', date: 'strip' },
  'art-deco': { top: 17, x: 14, bottom: 12, type: 'deco', date: 'stack' },
  monogram: { top: 10, x: 14, bottom: 10, type: 'deco', date: 'strip' },
  jharokha: { top: 15, x: 17, bottom: 9, surfaceFrame: true, type: 'royal', date: 'strip' },
};

function legacySpec(template: BuildDesignInput['template']): Spec {
  const rule = LEGACY_INSET[template.layout] ?? LEGACY_INSET['royal-arch']!;
  const theme = template.theme;
  const d = decorSchema.parse(theme.decor ?? {});
  const top = rule.top + (d.toran ? 6 : 0) + (d.florals !== 'none' && d.floralPlacement === 'diagonal' && !d.toran ? 3 : 0);
  const bottom = rule.bottom + (d.florals !== 'none' ? 4 : 0);
  const onSurface = Boolean(rule.panel || rule.surfaceFrame);
  const zone: Zone = {
    top: (top / 100) * DESIGN_H + (rule.panel ? 50 : 0),
    bottom: (bottom / 100) * DESIGN_H + (rule.panel ? 50 : 0),
    left: (rule.x / 100) * DESIGN_W + (rule.panel ? 50 : 0),
    right: (rule.x / 100) * DESIGN_W + (rule.panel ? 50 : 0),
  };
  const type: TypeSetKey = d.nameFont && rule.type === 'classic' ? 'script' : rule.type;

  return {
    type,
    date: rule.date,
    divider: template.layout === 'art-deco' ? 'deco' : template.layout === 'minimal-modern' ? 'simple' : 'ornate',
    zone,
    textBg: (ctx) => (onSurface ? ctx.p.surface : ctx.p.background),
    chrome: (ctx) => {
      const p = ctx.p;
      const under: DesignElement[] = [fullPage('frame', [p.primary, p.accent, p.surface, p.background, p.backgroundAlt, p.text], { layout: template.layout })];
      if (d.mandala) under.push(artEl('mandala', DESIGN_W / 2 - 465, 420, 930, 930, [goldOn(ctx)], { opacity: 0.09, locked: true }));
      if (d.florals !== 'none') under.push(fullPage('florals', [], { kind: d.florals, placement: d.floralPlacement }));
      if (d.toran) under.push(artEl('toran', 0, 0, DESIGN_W, 0.22 * DESIGN_H, [p.accent], { locked: true }));
      if (rule.panel) {
        const x = (rule.x / 100) * DESIGN_W;
        under.push(shapeEl('rect', x, (top / 100) * DESIGN_H, DESIGN_W - 2 * x, DESIGN_H * (1 - (top + bottom) / 100), { fill: p.surface, fillOpacity: 0.93, radius: 40 }));
      }
      return { bg: solidBg(p.background, p.backgroundAlt, 'radial', theme.pattern, p.primary, theme.ornamentOpacity), under };
    },
    hero: (ctx) => {
      const bg = onSurface ? ctx.p.surface : ctx.p.background;
      const light = !isDarkColor(bg);
      const gold = light ? '#A8741A' : ctx.p.primary;
      if (d.art === 'ganesha') return [{ t: 'art', asset: 'ganesha', w: 170, h: 187, colors: [gold, ctx.p.accent], opts: { light }, gap: 16, anim: 'drop' }];
      if (d.art === 'couple') return [{ t: 'art', asset: 'couple', w: 340, h: 425, colors: [gold, ctx.p.backgroundAlt], opts: { style: d.coupleStyle, attire: d.attire }, gap: 14, anim: 'zoom' }];
      if (d.art === 'diya') return [{ t: 'art', asset: 'diya', w: 170, h: 170, colors: [gold], gap: 16, anim: 'drop' }];
      if (template.layout === 'photo-frame') return [{ t: 'photo', w: 520, h: 640, mask: 'arch', gap: 24 }];
      if (theme.motif !== 'none') return [{ t: 'art', asset: 'motif', w: 140, h: 140, colors: [gold, ctx.p.accent], opts: { motif: theme.motif }, gap: 18, anim: 'drop' }];
      return [];
    },
  };
}

/** Text that is still template-generated can be re-flowed when event details change. */
export function isPristine(doc: DesignDoc): boolean {
  return doc.pages.every((p) => p.elements.every((e) => e.auto));
}
