import React, { useEffect } from 'react';
import { useDeviceInfo } from '../utils/useMobileHooks';
import { initMobileOptimizations } from '../utils/mobileUtils';

/**
 * MobileOptimizer component that handles mobile-specific optimizations at the app level
 * Add this component near the root of your application
 */
const MobileOptimizer = ({ children }) => {
  const { isMobile, deviceType, isTouchEnabled } = useDeviceInfo();

  useEffect(() => {
    // Initialize mobile optimizations
    const cleanup = initMobileOptimizations();
    
    // Log device information for debugging
    console.debug('Device Info:', { 
      deviceType, 
      isMobile, 
      isTouchEnabled,
      userAgent: navigator.userAgent
    });
    
    // Additional mobile-specific optimizations
    if (isMobile) {
      // Optimize viewport settings
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        );
      }
      
      // Apply mobile-specific performance optimizations
      document.documentElement.classList.add('mobile-optimized');
      
      // Add passive touch listeners to improve touch response time
      document.addEventListener('touchstart', () => {}, { passive: true });
      document.addEventListener('touchmove', () => {}, { passive: true });
      
      // Add touch feedback for interactive elements
      const addTouchFeedback = () => {
        const touchTargets = document.querySelectorAll(
          '.btn, [role="button"], .leaflet-marker-icon, .pillLabel, .clickable'
        );
        
        touchTargets.forEach(el => {
          if (!el.classList.contains('touch-enhanced')) {
            el.classList.add('touch-enhanced');
            
            // Prevent ghost clicks by temporarily disabling pointer events after touch
            el.addEventListener('touchend', () => {
              const originalPointerEvents = el.style.pointerEvents;
              el.style.pointerEvents = 'none';
              setTimeout(() => {
                el.style.pointerEvents = originalPointerEvents;
              }, 350);
            }, { passive: true });
          }
        });
      };
      
      // Initial application of touch feedback
      addTouchFeedback();
      
      // Re-apply when DOM changes
      const observer = new MutationObserver(() => {
        addTouchFeedback();
      });
      
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
      
      return () => {
        // Clean up
        if (typeof cleanup === 'function') cleanup();
        
        // Restore viewport settings
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 
            'width=device-width, initial-scale=1'
          );
        }
        
        document.documentElement.classList.remove('mobile-optimized');
        observer.disconnect();
      };
    }
    
    return cleanup;
  }, [isMobile, deviceType, isTouchEnabled]);

  // This component doesn't render anything additional
  return <>{children}</>;
};

export default MobileOptimizer;
