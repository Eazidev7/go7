// Smart Tracking Router - Automatically routes to best tracking system
// Based on device type and features needed

import React from 'react';
import { useParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMobileRedirectFixed.js';

// Import all tracking components
import MobileLiveTracking from '../pages/MobileLiveTracking.jsx';
import Go7GoogleTracking from '../pages/Go7GoogleTracking.jsx';
import TrackDelivery from '../pages/TrackDelivery.jsx';

const SmartTrackingRouter = ({ preferAdvanced = false }) => {
  const { orderId } = useParams();
  const isMobile = useIsMobile();

  // Log routing decision
  console.log('🎯 Smart Tracking Router:', { 
    orderId, 
    isMobile, 
    preferAdvanced,
    route: preferAdvanced ? 'advanced' : (isMobile ? 'mobile' : 'desktop')
  });

  // Route based on preferences and device
  if (preferAdvanced) {
    // Advanced features: Real-time progress bar, street names, no billing costs
    return <TrackDelivery />;
  }

  if (isMobile) {
    // Mobile-optimized Google Maps tracking
    return <MobileLiveTracking />;
  }

  // Desktop Google Maps tracking
  return <Go7GoogleTracking />;
};

export default SmartTrackingRouter;