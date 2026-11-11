import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useMobileRedirect = () => {
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
      
      console.log('� Mobile Detection:', { width, mobileUA, forceMobile, result: mobile });
      setIsMobile(mobile);
      
      return mobile;
    };

    const mobile = checkMobile();
    const currentPath = location.pathname;
    
    console.log('🧭 Navigation Check:', { mobile, currentPath });

    // Auto-redirect logic for tracking routes
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

    // Handle window resize
    const handleResize = () => {
      checkMobile();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [location.pathname, navigate]);

  return { isMobile };
};

export const useMobileRedirect_DISABLED = () => {
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

    // TEMPORARILY DISABLED for debugging mobile nav issues
    console.log('🚨 [DEBUG] Mobile redirect temporarily disabled to test navigation');
    
    // Only redirect from homepage, don't interfere with other routes
    // if (mobile && currentPath === '/') {
    //   console.log('📱 Redirecting to mobile route');
    //   navigate('/mobile', { replace: true });
    // } else if (!mobile && currentPath === '/mobile') {
    //   console.log('🖥️ Redirecting to desktop route');
    //   navigate('/', { replace: true });
    // }
    // Don't redirect other routes like /orders, /chat, /profile - let them work normally

    // Handle window resize - TEMPORARILY DISABLED for debugging
    const handleResize = () => {
      console.log('🚨 [DEBUG] Resize handler temporarily disabled');
      // const newMobile = checkMobile();
      // if (newMobile !== mobile) {
      //   console.log('📐 Screen size changed, checking redirect...');
      //   // Only redirect between home pages, not other routes
      //   if (newMobile && location.pathname === '/') {
      //     navigate('/mobile', { replace: true });
      //   } else if (!newMobile && location.pathname === '/mobile') {
      //     navigate('/', { replace: true });
      //   }
      // }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [navigate, location.pathname]);

  return { isMobile };
};