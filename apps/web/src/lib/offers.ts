'use client';

import { EMPTY_DESIGN_VISIBILITY, PRODUCTS, priceProducts, type ActiveOffersDto, type DesignVisibilityDto, type PricedProduct, type ProductCode } from '@cardai/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';

const FALLBACK: ActiveOffersDto = { products: priceProducts({}, null), sale: null, announcements: [], designs: EMPTY_DESIGN_VISIBILITY };

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

/** Which demo templates / design packs an admin has hidden or featured. Same cached request as prices. */
export function useDesignVisibility(): DesignVisibilityDto {
  return useOffers().data?.designs ?? EMPTY_DESIGN_VISIBILITY;
}
