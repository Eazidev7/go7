/**
 * React Query initialization shim for Go7 delivery app
 * Helps handle dependency loading issues and initialization
 */

import { QueryClient } from '@tanstack/react-query';

// Flag to track if the module has been initialized
let isInitialized = false;

// Create a client with default options
const createQueryClient = () => {
  try {
    return new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          cacheTime: 1000 * 60 * 30, // 30 minutes
          refetchOnWindowFocus: false,
          retry: 1,
        },
      },
    });
  } catch (error) {
    console.error('Error creating QueryClient:', error);
    
    // Fallback client with minimal configuration
    return new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });
  }
};

// Create the query client instance
const queryClient = createQueryClient();

/**
 * Initialize React Query
 * Can be called to ensure the module is loaded correctly
 */
export const initReactQuery = () => {
  if (isInitialized) return;
  
  try {
    // Pre-import modules to ensure they're available
    import('@tanstack/react-query').catch(err => {
      console.error('Error importing React Query:', err);
    });
    
    isInitialized = true;
    console.log('React Query initialized successfully');
  } catch (error) {
    console.error('Error initializing React Query:', error);
  }
};

// Initialize on import
initReactQuery();

// Export the query client
export { queryClient };

// Export a method to reset the query client if needed
export const resetQueryClient = () => {
  queryClient.clear();
  console.log('Query client cache cleared');
};
