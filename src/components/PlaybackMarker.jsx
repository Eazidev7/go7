// GO7 Delivery Replay - Animated Playback Marker
// Smooth rider marker with rotation, speed indicators, and animations

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlaybackMarker({ position, speed, bearing }) {
  const markerRef = useRef(null);
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false);

  // Show speed indicator when moving fast
  useEffect(() => {
    setShowSpeedIndicator(speed > 5); // Show when speed > 5 m/s (~18 km/h)
  }, [speed]);

  // Create custom marker icon with rotation and speed indicator
  const createMarkerIcon = () => {
    const size = 40;
    const rotation = bearing || 0;
    
    // Color based on speed
    const getSpeedColor = (speed) => {
      if (speed < 1) return '#FFA500'; // Orange for stopped/slow
      if (speed < 5) return '#4CAF50'; // Green for normal
      if (speed < 10) return '#2196F3'; // Blue for fast
      return '#F44336'; // Red for very fast
    };

    const speedColor = getSpeedColor(speed);
    
    return {
      url: 'data:image/svg+xml,' + encodeURIComponent(`
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
          <!-- Shadow -->
          <ellipse cx="${size/2 + 1}" cy="${size/2 + 1}" rx="12" ry="8" fill="rgba(0,0,0,0.3)" />
          
          <!-- Speed Ring -->
          ${speed > 2 ? `
            <circle cx="${size/2}" cy="${size/2}" r="18" fill="none" stroke="${speedColor}" 
                    stroke-width="2" opacity="0.6" stroke-dasharray="4,2">
              <animate attributeName="r" values="18;22;18" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite"/>
            </circle>
          ` : ''}
          
          <!-- Main marker circle -->
          <circle cx="${size/2}" cy="${size/2}" r="14" fill="${speedColor}" stroke="white" stroke-width="2"/>
          
          <!-- Bike icon with rotation -->
          <g transform="translate(${size/2}, ${size/2}) rotate(${rotation}) translate(-8, -8)">
            <!-- Bike body -->
            <path d="M3 8 L6 8 L8 4 L12 4 L13 8 L13 12 L3 12 Z" fill="white" opacity="0.9"/>
            <!-- Wheels -->
            <circle cx="5" cy="10" r="1.5" fill="white"/>
            <circle cx="11" cy="10" r="1.5" fill="white"/>
            <!-- Direction indicator -->
            <path d="M12 8 L15 8 L13 6 M15 8 L13 10" stroke="white" stroke-width="1.5" 
                  fill="none" stroke-linecap="round"/>
          </g>
          
          <!-- Speed indicator dot -->
          ${speed > 1 ? `
            <circle cx="${size/2}" cy="${size/2}" r="3" fill="white" opacity="0.8">
              <animate attributeName="r" values="3;5;3" dur="1s" repeatCount="indefinite"/>
            </circle>
          ` : ''}
        </svg>
      `),
      scaledSize: new window.google.maps.Size(size, size),
      anchor: new window.google.maps.Point(size/2, size/2)
    };
  };

  // Speed indicator popup component
  const SpeedIndicator = ({ speed, position }) => (
    <AnimatePresence>
      {showSpeedIndicator && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          className="absolute bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-medium pointer-events-none"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          {(speed * 3.6).toFixed(1)} km/h
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-black border-opacity-75" />
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Return null if no position
  if (!position) return null;

  return (
    <>
      {/* Main Google Maps Marker */}
      {window.google && (
        <div style={{ display: 'none' }}>
          {/* This will be handled by the parent GoogleMap component */}
        </div>
      )}
      
      {/* Additional UI elements (if needed for overlay) */}
      <div 
        ref={markerRef}
        className="relative"
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 1000
        }}
      >
        <SpeedIndicator speed={speed} position={position} />
      </div>
    </>
  );
}

// Custom hook for creating animated Google Maps marker
export const useAnimatedMarker = (map, position, speed, bearing) => {
  const markerRef = useRef(null);
  const [marker, setMarker] = useState(null);

  useEffect(() => {
    if (!map || !window.google) return;

    // Create or update marker
    if (!marker) {
      const newMarker = new window.google.maps.Marker({
        map,
        position: { lat: position.lat, lng: position.lng },
        icon: createAdvancedMarkerIcon(speed, bearing),
        zIndex: 1000
      });
      
      setMarker(newMarker);
      markerRef.current = newMarker;
    } else {
      // Smoothly animate to new position
      const startPos = marker.getPosition();
      const endPos = { lat: position.lat, lng: position.lng };
      
      animateMarkerPosition(marker, startPos, endPos, 200); // 200ms animation
      marker.setIcon(createAdvancedMarkerIcon(speed, bearing));
    }
  }, [map, position, speed, bearing, marker]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    };
  }, []);

  return marker;
};

// Helper function to create advanced marker icon
const createAdvancedMarkerIcon = (speed = 0, bearing = 0) => {
  const size = 36;
  const rotation = bearing || 0;
  
  // Color based on speed
  const getSpeedColor = (speed) => {
    if (speed < 1) return '#FFA500'; // Orange for stopped/slow
    if (speed < 5) return '#4CAF50'; // Green for normal
    if (speed < 10) return '#2196F3'; // Blue for fast
    return '#F44336'; // Red for very fast
  };

  const speedColor = getSpeedColor(speed);
  const pulseAnimation = speed > 2 ? 'animate' : 'static';
  
  return {
    url: 'data:image/svg+xml,' + encodeURIComponent(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <!-- Drop shadow -->
        <ellipse cx="${size/2 + 1}" cy="${size/2 + 2}" rx="10" ry="6" fill="rgba(0,0,0,0.2)" />
        
        <!-- Speed pulse ring -->
        ${speed > 2 ? `
          <circle cx="${size/2}" cy="${size/2}" r="16" fill="none" stroke="${speedColor}" 
                  stroke-width="2" opacity="0.4" stroke-dasharray="3,2">
            <animate attributeName="r" values="16;20;16" dur="1.5s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
        
        <!-- Main marker -->
        <circle cx="${size/2}" cy="${size/2}" r="12" fill="${speedColor}" stroke="white" stroke-width="2.5" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.2))"/>
        
        <!-- Vehicle icon -->
        <g transform="translate(${size/2}, ${size/2}) rotate(${rotation}) translate(-6, -6)">
          <!-- Delivery bike -->
          <rect x="2" y="4" width="8" height="4" rx="1" fill="white" opacity="0.9"/>
          <circle cx="4" cy="8" r="1" fill="white"/>
          <circle cx="8" cy="8" r="1" fill="white"/>
          
          <!-- Direction arrow -->
          <path d="M10 6 L12 6 M12 6 L11 5 M12 6 L11 7" 
                stroke="white" stroke-width="1" fill="none" stroke-linecap="round"/>
          
          <!-- Package indicator -->
          <rect x="5" y="3" width="2" height="2" fill="white" opacity="0.8"/>
        </g>
        
        <!-- Center pulse for stationary -->
        ${speed < 0.5 ? `
          <circle cx="${size/2}" cy="${size/2}" r="2" fill="white" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
          </circle>
        ` : ''}
      </svg>
    `),
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size/2, size/2)
  };
};

// Helper function to animate marker position smoothly
const animateMarkerPosition = (marker, startPos, endPos, duration = 200) => {
  if (!startPos || !endPos) return;
  
  const startTime = performance.now();
  const startLat = startPos.lat();
  const startLng = startPos.lng();
  const endLat = endPos.lat;
  const endLng = endPos.lng;
  
  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing function
    const easedProgress = progress < 0.5 
      ? 2 * progress * progress 
      : -1 + (4 - 2 * progress) * progress;
    
    const currentLat = startLat + (endLat - startLat) * easedProgress;
    const currentLng = startLng + (endLng - startLng) * easedProgress;
    
    marker.setPosition({ lat: currentLat, lng: currentLng });
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };
  
  requestAnimationFrame(animate);
};