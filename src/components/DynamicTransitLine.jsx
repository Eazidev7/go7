// GO7 Dynamic Transit Line Component
// Real-time progress visualization on delivery route

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const DynamicTransitLine = ({ 
  map, 
  routePath, 
  currentPosition, 
  isActive = false,
  completionPercentage = 0,
  style = {}
}) => {
  const [transitPolyline, setTransitPolyline] = useState(null);
  const [completedPolyline, setCompletedPolyline] = useState(null);
  const [remainingPolyline, setRemainingPolyline] = useState(null);
  const animationRef = useRef(null);

  // Default styling
  const defaultStyle = {
    completed: {
      strokeColor: '#22c55e',    // Green for completed
      strokeWeight: 6,
      strokeOpacity: 1,
      zIndex: 100
    },
    inTransit: {
      strokeColor: '#3b82f6',    // Blue for current segment
      strokeWeight: 8,
      strokeOpacity: 0.8,
      zIndex: 101,
      // Animated dashed line effect
      icons: [{
        icon: {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          scale: 4
        },
        offset: '0',
        repeat: '20px'
      }]
    },
    remaining: {
      strokeColor: '#e5e7eb',    // Gray for remaining
      strokeWeight: 4,
      strokeOpacity: 0.6,
      zIndex: 99
    }
  };

  const finalStyle = { ...defaultStyle, ...style };

  // Initialize polylines when map and route are ready
  useEffect(() => {
    if (!map || !routePath || routePath.length < 2) return;

    // Create three polylines for different states
    const completed = new window.google.maps.Polyline({
      map: map,
      path: [],
      ...finalStyle.completed
    });

    const inTransit = new window.google.maps.Polyline({
      map: map,
      path: [],
      ...finalStyle.inTransit
    });

    const remaining = new window.google.maps.Polyline({
      map: map,
      path: routePath,
      ...finalStyle.remaining
    });

    setCompletedPolyline(completed);
    setTransitPolyline(inTransit);
    setRemainingPolyline(remaining);

    return () => {
      // Cleanup polylines
      completed?.setMap(null);
      inTransit?.setMap(null);
      remaining?.setMap(null);
    };
  }, [map, routePath]);

  // Update progress based on current position and completion percentage
  useEffect(() => {
    if (!routePath || !completedPolyline || !transitPolyline || !remainingPolyline) return;

    updateProgressLines();
  }, [currentPosition, completionPercentage, routePath, isActive]);

  const updateProgressLines = () => {
    if (!routePath || routePath.length < 2) return;

    let progressIndex = 0;
    let exactProgress = 0;

    // Calculate progress based on completion percentage or current position
    if (completionPercentage > 0) {
      exactProgress = completionPercentage;
      progressIndex = Math.floor((routePath.length - 1) * (completionPercentage / 100));
    } else if (currentPosition) {
      // Find closest point on route to current position
      const result = findClosestPointOnRoute(currentPosition, routePath);
      progressIndex = result.index;
      exactProgress = (result.index / (routePath.length - 1)) * 100;
    }

    // Ensure valid bounds
    progressIndex = Math.max(0, Math.min(progressIndex, routePath.length - 1));

    // Update completed section (green)
    const completedPath = routePath.slice(0, progressIndex + 1);
    completedPolyline.setPath(completedPath);

    // Update in-transit section (animated blue)
    if (isActive && progressIndex < routePath.length - 1) {
      const transitStart = routePath[progressIndex];
      const transitEnd = routePath[progressIndex + 1];
      
      // Create smooth interpolation for current segment
      const segmentProgress = (exactProgress % (100 / (routePath.length - 1))) / (100 / (routePath.length - 1));
      const interpolatedPoint = interpolatePosition(transitStart, transitEnd, segmentProgress);
      
      const transitPath = [transitStart, interpolatedPoint];
      transitPolyline.setPath(transitPath);
      
      // Animate the dashed line
      animateTransitLine();
    } else {
      transitPolyline.setPath([]);
    }

    // Update remaining section (gray)
    const remainingPath = routePath.slice(progressIndex + 1);
    remainingPolyline.setPath(remainingPath);
  };

  // Find closest point on route to current position
  const findClosestPointOnRoute = (currentPos, route) => {
    let minDistance = Infinity;
    let closestIndex = 0;

    for (let i = 0; i < route.length; i++) {
      const distance = calculateDistance(
        currentPos.lat, currentPos.lng,
        route[i].lat, route[i].lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return { index: closestIndex, distance: minDistance };
  };

  // Interpolate between two positions
  const interpolatePosition = (start, end, progress) => {
    const lat = start.lat + (end.lat - start.lat) * progress;
    const lng = start.lng + (end.lng - start.lng) * progress;
    return { lat, lng };
  };

  // Animate the dashed line effect
  const animateTransitLine = () => {
    if (!transitPolyline) return;

    let offset = 0;
    
    const animate = () => {
      offset = (offset + 1) % 40; // Reset after 40px
      
      const icons = transitPolyline.get('icons');
      if (icons && icons.length > 0) {
        icons[0].offset = offset + 'px';
        transitPolyline.set('icons', icons);
      }
      
      if (isActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (isActive) {
      animate();
    }
  };

  // Calculate distance between two points
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const toRadians = (degrees) => degrees * (Math.PI / 180);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Manual progress control (for testing or manual updates)
  const setProgress = (percentage) => {
    if (percentage >= 0 && percentage <= 100) {
      updateProgressLines(percentage);
    }
  };

  // Complete the delivery (fill entire route green)
  const completeDelivery = () => {
    if (completedPolyline && transitPolyline && remainingPolyline) {
      completedPolyline.setPath(routePath);
      transitPolyline.setPath([]);
      remainingPolyline.setPath([]);
    }
  };

  // Reset the progress
  const resetProgress = () => {
    if (completedPolyline && transitPolyline && remainingPolyline) {
      completedPolyline.setPath([]);
      transitPolyline.setPath([]);
      remainingPolyline.setPath(routePath);
    }
  };

  // This component doesn't render anything visible itself
  // It manages Google Maps polylines directly
  return null;
};

// Hook for easy integration
export const useTransitLine = (map, routePath, options = {}) => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  
  const transitLineRef = useRef();

  const startProgress = (initialPosition = null) => {
    setIsActive(true);
    if (initialPosition) {
      setCurrentPosition(initialPosition);
    }
  };

  const stopProgress = () => {
    setIsActive(false);
  };

  const updatePosition = (newPosition) => {
    setCurrentPosition(newPosition);
  };

  const updateProgress = (percentage) => {
    setCompletionPercentage(Math.max(0, Math.min(100, percentage)));
  };

  const completeDelivery = () => {
    setCompletionPercentage(100);
    setIsActive(false);
    transitLineRef.current?.completeDelivery();
  };

  const resetProgress = () => {
    setCompletionPercentage(0);
    setCurrentPosition(null);
    setIsActive(false);
    transitLineRef.current?.resetProgress();
  };

  const TransitLineComponent = () => (
    <DynamicTransitLine
      ref={transitLineRef}
      map={map}
      routePath={routePath}
      currentPosition={currentPosition}
      isActive={isActive}
      completionPercentage={completionPercentage}
      style={options.style}
    />
  );

  return {
    TransitLineComponent,
    startProgress,
    stopProgress,
    updatePosition,
    updateProgress,
    completeDelivery,
    resetProgress,
    isActive,
    completionPercentage
  };
};

export default DynamicTransitLine;