import { describe, expect, it } from 'vitest';
import { couponDiscount, priceProducts, visibleDesigns } from './admin.js';
import { PRODUCTS } from '../constants/products.js';

describe('offer pricing', () => {
  it('rounds coupon discounts to whole rupees', () => {
    expect(couponDiscount({ kind: 'percent', value: 10 }, 119900)).toBe(12000);
    expect(couponDiscount({ kind: 'flat', value: 5000 }, 7900)).toBe(5000);
  });

  it('never takes the price below ₹1', () => {
    expect(couponDiscount({ kind: 'flat', value: 100000 }, 7900)).toBe(7800);
  });

  it('applies admin overrides, then the sale, only to chosen products', () => {
    const p = priceProducts({ card: { pricePaise: 10000, mrpPaise: null } }, { id: 's', name: 'Sale', percentOff: 25, productCodes: ['card'] });
    expect(p.card.basePricePaise).toBe(10000);
    expect(p.card.pricePaise).toBe(7500);
    expect(p.card.sale?.percentOff).toBe(25);
    expect(p.video.pricePaise).toBe(PRODUCTS.video.pricePaise);
    expect(p.video.sale).toBeUndefined();
  });

  it('uses the pre-sale price as strike-through when there is no MRP', () => {
    const p = priceProducts({}, { id: 's', name: 'Sale', percentOff: 10, productCodes: [] });
    expect(p.ai_clip.mrpPaise).toBe(PRODUCTS.ai_clip.pricePaise);
  });

  it('applies plan wording, highlight and off-sale edits', () => {
    const p = priceProducts({ video: { pricePaise: null, mrpPaise: null, name: 'Reel', description: null, highlight: true, disabled: true } }, null);
    expect(p.video.name).toBe('Reel');
    expect(p.video.description).toBe(PRODUCTS.video.description);
    expect(p.video.highlight).toBe(true);
    expect(p.video.disabled).toBe(true);
    expect(p.card.disabled).toBeUndefined();
  });
});

describe('design visibility', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const v = { hiddenTemplates: [], hiddenDesigns: ['a'], hiddenShowcase: ['b'], featuredDesigns: ['c'] };
  it('hides packs from the picker but keeps showcase-only ones', () => {
    expect(visibleDesigns(list, v, 'picker').map((d) => d.id)).toEqual(['c', 'b']);
  });
  it('removes both hidden and showcase-hidden packs from demos, featured first', () => {
    expect(visibleDesigns(list, v, 'showcase').map((d) => d.id)).toEqual(['c']);
  });
});
