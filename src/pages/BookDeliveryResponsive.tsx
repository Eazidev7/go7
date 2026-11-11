import React from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import BookDeliveryEnhanced from './BookDeliveryEnhanced';
import BookDeliveryDesktop from './BookDelivery';

const BookDeliveryResponsive: React.FC = () => {
  const isMobile = useIsMobile();
  
  console.log("📦 BookDelivery rendering - Mobile:", isMobile);

  return (
    <>
      {isMobile ? (
        <BookDeliveryEnhanced />
      ) : (
        <BookDeliveryDesktop />
      )}
    </>
  );
};

export default BookDeliveryResponsive;