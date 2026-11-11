/**
 * Enhanced React Query hooks for Go7 delivery app
 * Provides improved cached data fetching for service areas and pricing configuration
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ABEOKUTA_AREAS } from '../data/abeokutaAreasSimple';
import { fetchPricingConfig } from '../services/pricingService';
import { captureMapError } from '../utils/sentryEnhanced';

// Query keys for caching
const QUERY_KEYS = {
  AREAS: 'serviceAreas',
  PRICING: 'pricingConfig',
  GEOCODING: 'geocoding',
  ROUTING: 'routing',
};

/**
 * Hook to fetch and cache service areas with enhanced caching options
 * Uses stale-while-revalidate pattern for optimal performance
 */
export const useServiceAreas = (options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.AREAS],
    queryFn: async () => {
      try {
        // In a real application, this would be an API call
        // For now, we're using the static data with a simulated delay
        await new Promise(resolve => setTimeout(resolve, options.simulateDelay || 100));
        return ABEOKUTA_AREAS;
      } catch (error) {
        captureMapError(error, { component: 'useServiceAreas' });
        throw error;
      }
    },
    // Aggressive caching for service areas since they rarely change
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    cacheTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    refetchOnWindowFocus: false,
    retry: 2,
    ...options,
  });
};

/**
 * Hook to fetch and cache pricing configuration with tiered caching strategy
 */
export const usePricingConfig = (options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.PRICING],
    queryFn: async () => {
      try {
        return await fetchPricingConfig();
      } catch (error) {
        captureMapError(error, { component: 'usePricingConfig' });
        throw error;
      }
    },
    // Moderate caching for pricing as it may change semi-frequently
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    refetchOnWindowFocus: true, // Refresh when window regains focus
    retry: 3,
    ...options,
  });
};

/**
 * Hook to fetch and cache geocoding results for addresses
 */
export const useGeocodingResults = (address, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.GEOCODING, address],
    queryFn: async () => {
      if (!address) return null;
      
      try {
        // Simulate geocoding API call
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Mock response for example address
        if (address.includes('Main Street')) {
          return { lat: 7.1475, lng: 3.3519 };
        }
        
        if (address.includes('Market Road')) {
          return { lat: 7.1575, lng: 3.3719 };
        }
        
        // Default response
        return { lat: 7.1505, lng: 3.3619 };
      } catch (error) {
        captureMapError(error, { 
          component: 'useGeocodingResults',
          address 
        });
        throw error;
      }
    },
    // Enable only when address is provided
    enabled: !!address,
    // Cache geocoding results aggressively
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    cacheTime: 1000 * 60 * 60 * 24 * 7, // 7 days
    ...options,
  });
};

/**
 * Hook to fetch and cache routing information between two points
 */
export const useRouteInfo = (pickup, dropoff, options = {}) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ROUTING, pickup, dropoff],
    queryFn: async () => {
      if (!pickup || !dropoff) return null;
      
      try {
        // Simulate routing API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Mock route between points
        return {
          distance: '2.3 km',
          duration: '15 mins',
          route: [
            { lat: pickup.lat, lng: pickup.lng },
            { lat: pickup.lat + 0.002, lng: pickup.lng + 0.002 },
            { lat: pickup.lat + 0.003, lng: pickup.lng + 0.01 },
            { lat: pickup.lat + 0.006, lng: pickup.lng + 0.014 },
            { lat: dropoff.lat, lng: dropoff.lng }
          ]
        };
      } catch (error) {
        captureMapError(error, { 
          component: 'useRouteInfo',
          pickup,
          dropoff
        });
        throw error;
      }
    },
    // Enable only when both points are provided
    enabled: !!(pickup && dropoff),
    // Moderate caching for routes
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
    ...options,
  });
};

/**
 * Prefetch service areas data
 * Can be called when user might need the data soon (e.g., on hover)
 * @param queryClient ReactQuery client instance
 */
export const prefetchServiceAreas = async (queryClient) => {
  if (!queryClient) {
    console.error('Query client not provided for prefetching');
    return;
  }
  
  return queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.AREAS],
    queryFn: async () => ABEOKUTA_AREAS,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
  });
};

/**
 * Prefetch pricing configuration
 * Can be called when user might need the data soon (e.g., on hover)
 * @param queryClient ReactQuery client instance
 */
export const prefetchPricingConfig = async (queryClient) => {
  if (!queryClient) {
    console.error('Query client not provided for prefetching');
    return;
  }
  
  return queryClient.prefetchQuery({
    queryKey: [QUERY_KEYS.PRICING],
    queryFn: fetchPricingConfig,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
};

/**
 * Helper hook to get the query client instance
 * Useful for prefetching in components
 */
export const usePrefetch = () => {
  const queryClient = useQueryClient();
  
  return {
    prefetchServiceAreas: () => prefetchServiceAreas(queryClient),
    prefetchPricingConfig: () => prefetchPricingConfig(queryClient),
    prefetchGeocodingResult: (address) => {
      if (!address) return Promise.resolve();
      
      return queryClient.prefetchQuery({
        queryKey: [QUERY_KEYS.GEOCODING, address],
        queryFn: async () => {
          // Simulate geocoding API call
          await new Promise(resolve => setTimeout(resolve, 200));
          return { lat: 7.1505, lng: 3.3619 }; // Mock result
        },
      });
    }
  };
};

// Export query keys for external use
export { QUERY_KEYS };
