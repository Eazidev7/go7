import React, { useState, useEffect } from 'react';

const DesktopLayout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (isMobile) {
    return null; // Don't render on mobile
  }

  return <>{children}</>;
};

export default DesktopLayout;