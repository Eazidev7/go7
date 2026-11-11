import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Fixed Mobile Redirect Hook
 * - Prevents "more hooks than previous render" error
 * - Uses stable hook order
 * - Separates mobile detection from navigation logic
 */
export const useMobileRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  console.log('🔧 useMobileRedirect called - Current path:', location.pathname);

  // Mobile detection function
  const detectMobile = useCallback(() => {
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const urlParams = new URLSearchParams(window.location.search);
    const forceMobile = urlParams.get('forceMobile');
    
    let mobile = false;
    
    if (forceMobile === 'true') {
      mobile = true;
    } else if (forceMobile === 'false') {
      mobile = false;
    } else {
      mobile = width <= 768 || mobileUA;
    }
    
    return mobile;
  }, []);

  // Initialize mobile detection (runs once)
  useEffect(() => {
    const mobile = detectMobile();
    setIsMobile(mobile);
    setHasInitialized(true);
    
    // Handle window resize
    const handleResize = () => {
      const newMobile = detectMobile();
      setIsMobile(newMobile);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [detectMobile]);

  // Handle navigation (separate effect to maintain hook stability) - DISABLED FOR DEBUG
  useEffect(() => {
    // Don't navigate until we've initialized
    if (!hasInitialized) return;

    const currentPath = location.pathname;
    console.log('🔄 Mobile redirect check:', { isMobile, currentPath, hasInitialized });
    
    // TEMPORARILY DISABLE AUTO-REDIRECT TO DEBUG RED SCREEN
    // Use microtask to avoid navigation during render
    const performRedirect = () => {
      console.log('🚨 REDIRECT DISABLED FOR DEBUGGING - Red screen issue');
      return; // Exit early to prevent redirects
      
      if (isMobile) {
        // Redirect homepage to mobile version
        if (currentPath === '/') {
          console.log('📱 Redirecting to /mobile');
          navigate('/mobile', { replace: true });
          return;
        }
        // Redirect desktop tracking to mobile tracking
        if (currentPath === '/live-tracking') {
          navigate('/mobile-tracking', { replace: true });
          return;
        }
        if (currentPath.startsWith('/live-tracking/')) {
          const orderId = currentPath.split('/live-tracking/')[1];
          navigate(`/mobile-tracking/${orderId}`, { replace: true });
          return;
        }
      } else {
        // Redirect mobile homepage to desktop
        if (currentPath === '/mobile') {
          navigate('/', { replace: true });
          return;
        }
        // Redirect mobile tracking to desktop tracking  
        if (currentPath === '/mobile-tracking') {
          navigate('/live-tracking', { replace: true });
          return;
        }
        if (currentPath.startsWith('/mobile-tracking/')) {
          const orderId = currentPath.split('/mobile-tracking/')[1];
          navigate(`/live-tracking/${orderId}`, { replace: true });
          return;
        }
      }
    };

    // Use Promise.resolve() to schedule for next tick
    Promise.resolve().then(performRedirect);
  }, [hasInitialized, isMobile, location.pathname, navigate]);

  return { isMobile };
};

/**
 * Simple mobile detection hook without auto-redirect
 * Use this if you only need mobile detection without navigation
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      return width <= 768 || mobileUA;
    };

    setIsMobile(checkMobile());

    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

// Keep the old broken version for reference (disabled)
export const useMobileRedirect_BROKEN = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const userAgent = navigator.userAgent.toLowerCase();
      const mobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const urlParams = new URLSearchParams(window.location.search);
      const forceMobile = urlParams.get('forceMobile');
      
      let mobile = false;
      
      if (forceMobile === 'true') {
        mobile = true;
      } else if (forceMobile === 'false') {
        mobile = false;
      } else {
        mobile = width <= 768 || mobileUA;
      }
      
      console.log('🔍 Mobile Detection:', { width, mobileUA, forceMobile, result: mobile });
      setIsMobile(mobile);
      
      return mobile;
    };

    const mobile = checkMobile();
    const currentPath = location.pathname;
    
    console.log('🧭 Navigation Check:', { mobile, currentPath });

    // THIS WAS THE PROBLEM - navigation during render causes hook order changes
    if (mobile) {
      if (currentPath === '/live-tracking') {
        console.log('🔄 Redirecting mobile user to mobile-tracking');
        navigate('/mobile-tracking', { replace: true });
      } else if (currentPath.startsWith('/live-tracking/')) {
        const orderId = currentPath.split('/live-tracking/')[1];
        console.log('🔄 Redirecting mobile user to mobile-tracking with orderId:', orderId);
        navigate(`/mobile-tracking/${orderId}`, { replace: true });
      }
    } else {
      if (currentPath === '/mobile-tracking') {
        console.log('🔄 Redirecting desktop user to live-tracking');
        navigate('/live-tracking', { replace: true });
      } else if (currentPath.startsWith('/mobile-tracking/')) {
        const orderId = currentPath.split('/mobile-tracking/')[1];
        console.log('🔄 Redirecting desktop user to live-tracking with orderId:', orderId);
        navigate(`/live-tracking/${orderId}`, { replace: true });
      }
    }

    const handleResize = () => {
      checkMobile();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [location.pathname, navigate]); // THIS dependency array caused re-renders

  return { isMobile };
};