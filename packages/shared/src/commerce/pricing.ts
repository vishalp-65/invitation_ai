import { PRODUCT_CODES, PRODUCTS, type ProductCode } from '../constants/products.js';
import type { DesignVisibilityDto, PricedProduct, SaleDto } from '../schemas/admin.js';

/*
 * Live prices, sales, coupons and design visibility: plain functions with no zod, kept apart from
 * schemas/admin.ts so browser bundles that only need them (price tags, the site-wide offers bar)
 * do not download zod and every admin schema.
 */

export const EMPTY_DESIGN_VISIBILITY: DesignVisibilityDto = {
  hiddenTemplates: [],
  hiddenDesigns: [],
  hiddenShowcase: [],
  featuredDesigns: [],
};

/** Applies admin visibility to a list of design packs: hidden removed, featured first, order otherwise kept. */

export function visibleDesigns<T extends { id: string }>(
  list: readonly T[],
  v: DesignVisibilityDto | undefined,
  surface: 'picker' | 'showcase',
): T[] {
  if (!v) return [...list];

  const hidden = new Set(
    surface === 'showcase' ? [...v.hiddenDesigns, ...v.hiddenShowcase] : v.hiddenDesigns,
  );

  const featured = new Set(v.featuredDesigns);

  const kept = list.filter((d) => !hidden.has(d.id));

  return [...kept.filter((d) => featured.has(d.id)), ...kept.filter((d) => !featured.has(d.id))];
}

export function saleApplies(sale: Pick<SaleDto, 'productCodes'>, code: ProductCode): boolean {
  return sale.productCodes.length === 0 || sale.productCodes.includes(code);
}

/** Single source of truth for what a product costs right now (API checkout + web display). */

export interface PlanOverride {
  pricePaise: number | null;

  mrpPaise: number | null;

  name?: string | null;

  description?: string | null;

  highlight?: boolean | null;

  disabled?: boolean;
}

export function priceProducts(
  overrides: Partial<Record<ProductCode, PlanOverride>>,

  sale: Pick<SaleDto, 'id' | 'name' | 'percentOff' | 'productCodes'> | null,
): Record<ProductCode, PricedProduct> {
  const out = {} as Record<ProductCode, PricedProduct>;

  for (const code of PRODUCT_CODES) {
    const p = PRODUCTS[code];

    const o = overrides[code];

    const base = o?.pricePaise ?? p.pricePaise;

    const mrp = o?.mrpPaise ?? p.mrpPaise;

    const onSale = sale && saleApplies(sale, code);

    const price = onSale
      ? Math.max(100, Math.round((base * (100 - sale.percentOff)) / 100 / 100) * 100)
      : base;

    out[code] = {
      ...p,

      ...(o?.name ? { name: o.name } : {}),

      ...(o?.description ? { description: o.description } : {}),

      ...(o?.highlight != null ? { highlight: o.highlight } : {}),

      ...(o?.disabled ? { disabled: true } : {}),

      basePricePaise: base,

      pricePaise: price,

      // On sale, the pre-sale price is the honest strike-through when there is no MRP.

      mrpPaise: mrp ?? (onSale ? base : undefined),

      ...(onSale ? { sale: { id: sale.id, name: sale.name, percentOff: sale.percentOff } } : {}),
    };
  }

  return out;
}

/** Discount (paise) a coupon gives on a price; never brings the price below ₹1. */

export function couponDiscount(
  c: { kind: 'percent' | 'flat'; value: number },
  pricePaise: number,
): number {
  // Whole rupees only: customers should never see ₹1,079.10.

  const raw =
    Math.round((c.kind === 'percent' ? (pricePaise * c.value) / 100 : c.value) / 100) * 100;

  return Math.max(0, Math.min(raw, pricePaise - 100));
}
