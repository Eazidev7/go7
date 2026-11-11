import { useState, useEffect } from 'react';

/**
 * Custom hook for media queries
 * @param query - CSS media query string (e.g., '(max-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    // Set initial value
    setMatches(media.matches);
    
    // Define the event listener function
    const listener = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    
    // Add event listener for changes
    media.addEventListener('change', listener);
    
    // Cleanup function
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};

/**
 * Predefined breakpoint hooks for common use cases
 */
export const useIsMobile = (): boolean => {
  return useMediaQuery('(max-width: 768px)');
};

export const useIsTablet = (): boolean => {
  return useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
};

export const useIsDesktop = (): boolean => {
  return useMediaQuery('(min-width: 1025px)');
};

/**
 * Combined responsive state hook
 */
export interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
}

export const useResponsive = (): ResponsiveState => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const [screenWidth, setScreenWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setScreenWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth
  };
};