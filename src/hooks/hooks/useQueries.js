/**
 * React Query hooks for Go7 delivery app
 * Provides cached data fetching for service areas and pricing configuration
 */

import { useQuery } from '@tanstack/react-query';
import { ABEOKUTA_AREAS } from '../../data/data/abeokutaAreasSimple';
import { fetchPricingConfig } from '../../services/services/pricingService';

// Query keys for caching
const QUERY_KEYS = {
  AREAS: 'serviceAreas',
  PRICING: 'pricingConfig',
};

/**
 * Hook to fetch and cache service areas
 * Returns the list of service areas with 5-minute stale time
 */
export const useServiceAreas = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.AREAS],
    queryFn: async () => {
      // In a real application, this would be an API call
      // For now, we're using the static data with a simulated delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return ABEOKUTA_AREAS;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Hook to fetch and cache pricing configuration
 * Returns the pricing configuration with 5-minute stale time
 */
export const usePricingConfig = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING],
    queryFn: fetchPricingConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  });
};

/**
 * Prefetch service areas data
 * Can be called when user might need the data soon (e.g., on hover)
 * @param queryClient ReactQuery client instance
 */
export const prefetchServiceAreas = async (queryClient) => {
  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.AREAS],
    queryFn: async () => ABEOKUTA_AREAS,
  });
};

/**
 * Prefetch pricing configuration
 * Can be called when user might need the data soon (e.g., on hover)
 * @param queryClient ReactQuery client instance
 */
export const prefetchPricingConfig = async (queryClient) => {
  await queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.PRICING],
    queryFn: fetchPricingConfig,
  });
};
