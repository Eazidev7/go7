import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DeviceInfo {
  type: DeviceType;
  width: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export const useDeviceType = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() => {
    // Initial state for SSR compatibility
    const initialWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    return getDeviceInfo(initialWidth);
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setDeviceInfo(getDeviceInfo(width));
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return deviceInfo;
};

function getDeviceInfo(width: number): DeviceInfo {
  let type: DeviceType;
  
  if (width < BREAKPOINTS.mobile) {
    type = 'mobile';
  } else if (width < BREAKPOINTS.tablet) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  return {
    type,
    width,
    isMobile: type === 'mobile',
    isTablet: type === 'tablet',
    isDesktop: type === 'desktop',
  };
}

// Utility function for immediate device detection
export const getDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'desktop'; // SSR fallback
  
  const width = window.innerWidth;
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
};

export default useDeviceType;