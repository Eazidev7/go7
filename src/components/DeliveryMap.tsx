'use client';

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { db } from '../lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';

// TypeScript interface for component props
interface DeliveryMapProps {
  pickup: [number, number];
  dropoff: [number, number];
  fee: string;
  riderId: string;
}

// Order status step configuration
const ORDER_STEPS = [
  { id: 'step-accepted', text: 'Order Accepted', riderPopup: 'Order Accepted - Rider Assigned' },
  { id: 'step-picked', text: 'Order Picked Up', riderPopup: 'Order Picked Up - Heading to You' },
  { id: 'step-enroute', text: 'Rider En Route', riderPopup: 'Rider En Route - ETA 15 mins' },
  { id: 'step-delivered', text: 'Order Delivered', riderPopup: 'Order Delivered - Thank You!' }
];

// MapTiler configuration
const MAP_CONFIG = {
  STYLE_URL: 'https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/style.json?key=nRGZ9lGblbV9lFK2KclL',
  CENTER: [3.3619, 7.1475] as [number, number], // Abeokuta center
  ZOOM: 13
};

const DeliveryMap: React.FC<DeliveryMapProps> = ({ pickup, dropoff, fee, riderId }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const riderMarker = useRef<maplibregl.Marker | null>(null);
  const [currentOrderStep, setCurrentOrderStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real-time GPS state
  const [riderPosition, setRiderPosition] = useState<[number, number]>(pickup);
  const [riderStatus, setRiderStatus] = useState<string>('accepted');
  const [isConnected, setIsConnected] = useState(false);
  
  // Animation state for smooth movement
  const previousPosition = useRef<[number, number]>(pickup);
  const animationProgress = useRef(0);
  const animationId = useRef<number | null>(null);
  const firestoreUnsubscribe = useRef<() => void | null>(null);

  // Map order status strings to step indices
  const getStatusStepIndex = (status: string): number => {
    switch (status.toLowerCase()) {
      case 'accepted': return 0;
      case 'picked_up': case 'picked up': return 1;
      case 'en_route': case 'en route': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  };

  // Create custom marker element
  const createMarkerElement = (iconPath: string, size: number = 40, isRider: boolean = false): HTMLElement => {
    const el = document.createElement('div');
    el.className = isRider ? 'rider-marker' : 'marker';
    el.style.background = 'none';
    el.style.border = 'none';
    el.style.cursor = 'pointer';
    el.style.padding = '0';

    const img = document.createElement('img');
    img.src = iconPath;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;
    img.style.borderRadius = '50%';
    img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    img.style.transition = 'transform 0.2s ease';

    if (isRider) {
      img.style.border = '3px solid #E30613';
      img.style.animation = 'pulse 2s infinite';
      
      // Add CSS animation for pulse effect
      const style = document.createElement('style');
      style.textContent = `
        @keyframes pulse {
          0% { box-shadow: 0 2px 8px rgba(227, 6, 19, 0.3); }
          50% { box-shadow: 0 2px 20px rgba(227, 6, 19, 0.8); }
          100% { box-shadow: 0 2px 8px rgba(227, 6, 19, 0.3); }
        }
      `;
      document.head.appendChild(style);
    }

    el.appendChild(img);

    // Hover effect
    el.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.1)';
    });

    el.addEventListener('mouseleave', () => {
      img.style.transform = 'scale(1)';
    });

    return el;
  };

  // Add markers to the map
  const addMarkers = () => {
    if (!map.current) return;

    console.log('📍 Adding markers to map...');
    
    // Pickup marker (bag.png)
    const pickupEl = createMarkerElement('/icons/bag.png');
    new maplibregl.Marker({ element: pickupEl })
      .setLngLat(pickup)
      .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<strong>Pickup Location</strong>'))
      .addTo(map.current);

    // Dropoff marker (shop.png)
    const dropoffEl = createMarkerElement('/icons/shop.png');
    new maplibregl.Marker({ element: dropoffEl })
      .setLngLat(dropoff)
      .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<strong>Drop-off Location</strong>'))
      .addTo(map.current);

    // Rider marker (scooter.png)
    const riderEl = createMarkerElement('/icons/scooter.png', 45, true);
    riderMarker.current = new maplibregl.Marker({ element: riderEl })
      .setLngLat(pickup)
      .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<strong>Rider En Route</strong>'))
      .addTo(map.current);

    // Olumo Rock landmark (olumo.png)
    const olumoEl = createMarkerElement('/icons/olumo.png');
    new maplibregl.Marker({ element: olumoEl })
      .setLngLat([3.3480, 7.1600])
      .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<strong>Olumo Rock</strong>'))
      .addTo(map.current);

    console.log('✅ All markers added successfully');
  };

  // Setup delivery route
  const setupDeliveryRoute = () => {
    if (!map.current) return;

    console.log('🛣️ Adding delivery route...');
    
    map.current.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [pickup, dropoff]
        }
      }
    });

    map.current.addLayer({
      id: 'route',
      type: 'line',
      source: 'route',
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#E30613',
        'line-width': 4,
        'line-dasharray': [2, 2]
      }
    });

    console.log('✅ Route added successfully');
  };

  // Add delivery fee box
  const addDeliveryFeeBox = () => {
    if (!map.current) return;

    console.log('💰 Adding delivery fee box...');
    
    // Calculate midpoint between pickup and dropoff
    const midpoint: [number, number] = [
      (pickup[0] + dropoff[0]) / 2,
      (pickup[1] + dropoff[1]) / 2
    ];
    
    // Create custom HTML marker element for fee
    const feeEl = document.createElement('div');
    feeEl.style.background = '#E30613';
    feeEl.style.color = 'white';
    feeEl.style.fontWeight = 'bold';
    feeEl.style.padding = '6px 12px';
    feeEl.style.borderRadius = '12px';
    feeEl.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    feeEl.style.fontSize = '14px';
    feeEl.style.fontFamily = '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
    feeEl.style.textAlign = 'center';
    feeEl.style.whiteSpace = 'nowrap';
    feeEl.style.cursor = 'pointer';
    feeEl.innerHTML = fee;
    
    // Add hover effect
    feeEl.addEventListener('mouseenter', function() {
      this.style.transform = 'scale(1.05)';
      this.style.transition = 'transform 0.2s ease';
    });
    
    feeEl.addEventListener('mouseleave', function() {
      this.style.transform = 'scale(1)';
    });
    
    // Place at midpoint
    new maplibregl.Marker({ element: feeEl })
      .setLngLat(midpoint)
      .addTo(map.current);

    console.log('✅ Fee box added successfully');
  };

  // Interpolate between two GPS coordinates for smooth movement
  const interpolateCoordinates = (start: [number, number], end: [number, number], progress: number): [number, number] => {
    progress = Math.max(0, Math.min(1, progress));
    
    const lng = start[0] + (end[0] - start[0]) * progress;
    const lat = start[1] + (end[1] - start[1]) * progress;
    
    return [lng, lat];
  };

  // Smooth animation between old and new GPS coordinates
  const animateRiderToPosition = (newPosition: [number, number]) => {
    if (!riderMarker.current) return;
    
    const startPosition = previousPosition.current;
    const endPosition = newPosition;
    
    // Reset animation progress
    animationProgress.current = 0;
    
    const smoothMove = () => {
      animationProgress.current += 0.05; // Animation speed (0.05 = ~1 second duration)
      
      if (animationProgress.current >= 1) {
        // Animation complete
        animationProgress.current = 1;
        const finalPosition = interpolateCoordinates(startPosition, endPosition, 1);
        riderMarker.current?.setLngLat(finalPosition);
        previousPosition.current = endPosition;
        return;
      }
      
      // Continue animation
      const currentPosition = interpolateCoordinates(startPosition, endPosition, animationProgress.current);
      riderMarker.current?.setLngLat(currentPosition);
      
      animationId.current = requestAnimationFrame(smoothMove);
    };
    
    // Cancel any existing animation
    if (animationId.current) {
      cancelAnimationFrame(animationId.current);
    }
    
    // Start smooth animation
    smoothMove();
  };

  // Update order status step
  const updateOrderStep = (stepIndex: number) => {
    setCurrentOrderStep(stepIndex);
    
    // Update rider popup if it exists
    if (riderMarker.current && riderMarker.current.getPopup()) {
      const currentStep = ORDER_STEPS[stepIndex];
      riderMarker.current.getPopup()?.setHTML(`<strong>${currentStep.riderPopup}</strong>`);
    }
    
    console.log(`📋 Order status updated: ${ORDER_STEPS[stepIndex].text}`);
  };

  // Subscribe to real-time GPS updates from Firestore
  const subscribeToRiderUpdates = () => {
    console.log(`� Subscribing to real-time updates for rider: ${riderId}`);
    
    const riderDocRef = doc(db, 'riders', riderId);
    
    const unsubscribe = onSnapshot(riderDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const newLat = data.lat;
        const newLng = data.lng;
        const newStatus = data.status || 'accepted';
        
        console.log(`📍 GPS Update: Rider at [${newLng.toFixed(4)}, ${newLat.toFixed(4)}], Status: ${newStatus}`);
        
        // Update rider position with smooth animation
        const newPosition: [number, number] = [newLng, newLat];
        console.log('📍 Position change from:', riderPosition, 'to:', newPosition);
        setRiderPosition(newPosition);
        animateRiderToPosition(newPosition);
        
        // Update order status
        const newStatusIndex = getStatusStepIndex(newStatus);
        if (newStatusIndex !== currentOrderStep) {
          updateOrderStep(newStatusIndex);
        }
        
        setRiderStatus(newStatus);
        setIsConnected(true);
      } else {
        console.warn(`⚠️ Rider document not found for ID: ${riderId}`);
        setIsConnected(false);
      }
    }, (error) => {
      console.error('❌ Error subscribing to rider updates:', error);
      setIsConnected(false);
    });
    
    firestoreUnsubscribe.current = unsubscribe;
    
    // Initialize with rider's current position
    getDoc(riderDocRef).then((docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const initialPosition: [number, number] = [data.lng || pickup[0], data.lat || pickup[1]];
        const initialStatus = data.status || 'accepted';
        
        setRiderPosition(initialPosition);
        setRiderStatus(initialStatus);
        previousPosition.current = initialPosition;
        
        // Set initial marker position
        if (riderMarker.current) {
          riderMarker.current.setLngLat(initialPosition);
        }
        
        updateOrderStep(getStatusStepIndex(initialStatus));
      }
    }).catch((error) => {
      console.error('❌ Error fetching initial rider data:', error);
    });
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    console.log('🗺️ Initializing MapLibre GL map...');
    console.log('📍 Pickup:', pickup, 'Dropoff:', dropoff, 'Rider ID:', riderId);
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_CONFIG.STYLE_URL,
      center: MAP_CONFIG.CENTER,
      zoom: MAP_CONFIG.ZOOM
    });

    // Add navigation controls
    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Map load event
    map.current.on('load', () => {
      console.log('✅ Map loaded successfully');
      setIsLoading(false);
      setupDeliveryRoute();
      addMarkers();
      addDeliveryFeeBox();
      subscribeToRiderUpdates(); // Start real-time GPS tracking
    });

    // Map error handling
    map.current.on('error', (e) => {
      console.error('❌ Map error:', e);
      setIsLoading(false);
    });

    // Cleanup function
    return () => {
      if (firestoreUnsubscribe.current) {
        firestoreUnsubscribe.current();
      }
      if (animationId.current) {
        cancelAnimationFrame(animationId.current);
      }
      if (map.current) {
        map.current.remove();
      }
    };
  }, [pickup, dropoff, fee, riderId]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Connection Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: isConnected ? '#4CAF50' : '#f44336',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: 'currentColor',
          animation: isConnected ? 'pulse-dot 2s infinite' : 'none'
        }} />
        {isConnected ? 'Live GPS' : 'Disconnected'}
        <style>{`
          @keyframes pulse-dot {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>

      {/* Order Status Tracker */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'white',
        padding: '15px 25px',
        borderRadius: '15px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        {ORDER_STEPS.map((step, index) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              position: 'relative'
            }}
          >
            {/* Status Step Icon */}
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                color: 'white',
                background: index < currentOrderStep ? '#4CAF50' : index === currentOrderStep ? '#E30613' : '#ddd',
                transform: index === currentOrderStep ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}
            >
              {index + 1}
            </div>
            
            {/* Status Text */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: index === currentOrderStep ? '#E30613' : '#666',
                transition: 'color 0.3s ease'
              }}
            >
              {step.text}
            </span>
            
            {/* Connection Line */}
            {index < ORDER_STEPS.length - 1 && (
              <div
                style={{
                  position: 'absolute',
                  right: '-14px',
                  top: '50%',
                  width: '8px',
                  height: '2px',
                  background: index < currentOrderStep ? '#E30613' : '#ddd',
                  transform: 'translateY(-50%)'
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Rider Info Panel */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'white',
        padding: '12px 16px',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
      }}>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Rider ID</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>{riderId}</div>
        <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
          Status: {riderStatus.replace('_', ' ').toUpperCase()}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #E30613',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }} />
          <div>Loading Go7 Delivery Map...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default DeliveryMap;