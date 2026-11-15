import { getEventType } from '../constants/event-types.js';
import type { LanguageCode } from '../constants/languages.js';
import { decorSchema, type TemplateDefinition } from '../templates/types.js';
import type { DesignData } from './bindings.js';
import { artEl, fullPage, makeCtx, resetIds, shapeEl, solidBg, stack, tonesFor, TYPE_SETS, type Band, type RecipeCtx, type Tones, type TypeSetKey, type Zone } from './builder.js';
import { isDarkColor } from './color.js';
import { goldOn, trueGold, type Chrome, type DesignFamily } from './families.js';
import { ALL_DESIGN_FAMILIES } from './families-heritage.js';
import { blessingBands, blessingKind, ceremonyBands, familyBands, FUNCTIONS_PER_PAGE, hasFamilyExtras, photoBands } from './pages.js';
import { DESIGN_H, DESIGN_W, type DesignDoc, type DesignElement, type DesignPage } from './schema.js';

export interface BuildDesignInput {
  template: Pick<TemplateDefinition, 'id' | 'layout' | 'theme'> & { design?: string; communities?: readonly string[] };
  data: DesignData;
  language: LanguageCode;
  eventType: string;
}

/** Hard cap from designDocSchema. */
const MAX_PAGES = 8;

/** Index of the main invitation page (page 1 may be the blessing page). */
export function coverPageIndex(doc: Pick<DesignDoc, 'pages'>): number {
  const i = doc.pages.findIndex((p) => p.id === 'cover');
  return i >= 0 ? i : 0;
}

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
  /** Chrome for the inner pages (defaults to the cover's). */
  inner?: (ctx: RecipeCtx, t: Tones) => Chrome;
  innerZone?: Zone;
  /** Chrome for the blessing page (defaults to the inner pages'). */
  blessing?: (ctx: RecipeCtx, t: Tones) => Chrome;
}

function defaultCoverBands(spec: Spec, ctx: RecipeCtx, t: Tones, familyOnCover: boolean): Band[] {
  const hero = spec.hero(ctx, t);
  const divider: Band = { t: 'divider', style: spec.divider, gap: 30 };
  const dateAndVenue: Band[] = [
    { t: 'date', style: spec.date, gap: 34 },
    { t: 'text', role: 'venue', bind: 'fnM.venue', gap: 26 },
    { t: 'text', role: 'small', bind: 'fnM.address', gap: 6 },
  ];
  const family: Band[] = familyOnCover
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

/**
 * Builds the full card for a template and event data:
 *   blessing (sacred symbol) → cover → ceremonies… → family & RSVP → photo / save the date.
 * Inner pages only appear when the event has content for them.
 */
export function buildDesign(input: BuildDesignInput): DesignDoc {
  resetIds();
  const ev = getEventType(input.eventType);
  const p = input.template.theme.palette;
  const ctx = makeCtx({ p, data: input.data, language: input.language, eventType: input.eventType, category: ev.category, people: ev.primaryPeople });
  const family = input.template.design ? ALL_DESIGN_FAMILIES.find((f) => f.id === input.template.design) : undefined;
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
        inner: family.inner,
        innerZone: family.innerZone,
        blessing: family.blessing,
      }
    : legacySpec(input.template);

  const tones = tonesFor(spec.textBg(ctx), p);
  const ts = TYPE_SETS[spec.type];
  const chrome = spec.chrome(ctx, tones);
  const inner: Chrome = spec.inner ? spec.inner(ctx, tones) : chrome;
  const innerZone = spec.innerZone ?? spec.zone;
  const gold = goldOn(ctx);
  const fns = input.data.functions;
  const lines = input.data.content.familyLines.length;

  // Family names stay on the cover for small, single-function invites with nothing else to say.
  const extras = hasFamilyExtras(ctx);
  const familyPage = (lines > 0 && (fns.length > 1 || lines > 3)) || extras;
  const familyOnCover = !familyPage && lines > 0;
  const photoPage = ctx.people === 2 || input.data.photos.length > 0;
  const kind = blessingKind(input.eventType, input.template.communities ?? [], input.template.theme.motif);

  const pages: DesignPage[] = [];
  const blessing = blessingBands(ctx, kind, trueGold(ctx));
  if (blessing.length) {
    const bc = spec.blessing ? spec.blessing(ctx, tones) : inner;
    pages.push(page('blessing', bc, stack(blessing, { ...innerZone, align: 'center' }, ctx, ts, tones)));
  }

  const coverBands = spec.bands ? spec.bands(ctx, tones) : defaultCoverBands(spec, ctx, tones, familyOnCover);
  pages.push(page('cover', chrome, stack(coverBands, spec.zone, ctx, ts, tones)));

  // Budget: ceremonies get whatever the other pages leave (max 8 pages in all).
  const reserved = pages.length + (familyPage ? 1 : 0) + (photoPage ? 1 : 0);
  if (fns.length > 1) {
    const maxCeremonyPages = Math.max(1, MAX_PAGES - reserved);
    const per = Math.max(FUNCTIONS_PER_PAGE, Math.ceil(fns.length / maxCeremonyPages));
    for (let i = 0; i < fns.length; i += per) {
      const bands = ceremonyBands(ctx, i, Math.min(fns.length, i + per), spec.divider, spec.type, gold);
      pages.push(page(`schedule-${i / per + 1}`, inner, stack(bands, innerZone, ctx, ts, tones)));
    }
  }
  if (familyPage && pages.length < MAX_PAGES) {
    pages.push(page('family', inner, stack(familyBands(ctx, spec.divider, lines > 0, spec.type), innerZone, ctx, ts, tones)));
  }
  if (photoPage && pages.length < MAX_PAGES) {
    pages.push(page('photo', inner, stack(photoBands(ctx, spec.date), innerZone, ctx, ts, tones)));
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
