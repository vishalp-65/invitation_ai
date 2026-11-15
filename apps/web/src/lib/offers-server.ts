import { priceProducts, type ActiveOffersDto } from '@cardai/shared';
import { serverApi } from './api';

/** Live prices for server components (admin edits + running sale); prices in code if the API is down. */
export async function loadOffers(): Promise<Pick<ActiveOffersDto, 'products' | 'sale'>> {
  try {
    return await serverApi<ActiveOffersDto>('/offers/active', 60);
  } catch {
    return { products: priceProducts({}, null), sale: null };
  }
}
