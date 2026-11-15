'use client';

import { PRODUCTS, priceProducts, type ActiveOffersDto, type PricedProduct, type ProductCode } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

const FALLBACK: ActiveOffersDto = { products: priceProducts({}, null), sale: null, announcements: [] };

/** Live prices (admin edits + running sale) and banners. Falls back to the prices in code. */
export function useOffers() {
  return useQuery({
    queryKey: ['offers'],
    queryFn: () => api<ActiveOffersDto>('/offers/active'),
    staleTime: 60_000,
    placeholderData: FALLBACK,
  });
}

export function usePrice(code: ProductCode): PricedProduct {
  const { data } = useOffers();
  return data?.products[code] ?? { ...PRODUCTS[code], basePricePaise: PRODUCTS[code].pricePaise };
}

export function useProducts(): Record<ProductCode, PricedProduct> {
  return (useOffers().data ?? FALLBACK).products;
}
