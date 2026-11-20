import { EMPTY_DESIGN_VISIBILITY, priceProducts, type ActiveOffersDto, type DesignVisibilityDto } from '@cardai/shared';
import { serverApi } from './api';

/** Live prices for server components (admin edits + running sale); prices in code if the API is down. */
export async function loadOffers(): Promise<Pick<ActiveOffersDto, 'products' | 'sale'> & { designs: DesignVisibilityDto }> {
  try {
    const o = await serverApi<ActiveOffersDto>('/offers/active', 60);
    return { ...o, designs: o.designs ?? EMPTY_DESIGN_VISIBILITY };
  } catch {
    return { products: priceProducts({}, null), sale: null, designs: EMPTY_DESIGN_VISIBILITY };
  }
}
