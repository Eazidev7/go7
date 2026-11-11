import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { subscribeToRiderLocation } from '../../services/riderTracking';

// Fix for Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Shared zone data across all maps
export const zones = [
  { name: "Panseke", coords: [7.1516, 3.3467], color: "#F94144", bounds: [
    [7.1526, 3.3477],
    [7.1506, 3.3457]
  ]},
  { name: "Omida", coords: [7.1455, 3.3562], color: "#F9C74F", bounds: [
    [7.1465, 3.3572],
    [7.1445, 3.3552]
  ]},
  { name: "Oke-Ilewo", coords: [7.1461, 3.3524], color: "#90BE6D", bounds: [
    [7.1471, 3.3534],
    [7.1451, 3.3514]
  ]},
  { name: "Adigbe", coords: [7.1490, 3.3411], color: "#577590", bounds: [
    [7.1500, 3.3421],
    [7.1480, 3.3401]
  ]},
  { name: "Kuto", coords: [7.1315, 3.3622], color: "#F3722C", bounds: [
    [7.1325, 3.3632],
    [7.1305, 3.3612]
  ]},
  { name: "Lafenwa", coords: [7.1588, 3.3784], color: "#277DA1", bounds: [
    [7.1598, 3.3794],
    [7.1578, 3.3774]
  ]}
];

// Helper functions for rider movement
export const moveRiderAlongPath = (start, end, steps, currentStep) => {
  const lat = start[0] + (end[0] - start[0]) * (currentStep / steps);
  const lng = start[1] + (end[1] - start[1]) * (currentStep / steps);
  return [lat, lng];
};

export default function MapBase({
  onZoneClick,
  showRider = true,
  showZones = true,
  showBanner = true,
  bannerText = "📍 Click on any zone to explore restaurants & vendors",
  deliveryId = null, // For real tracking - if provided, uses Firebase; otherwise uses simulation
  useRealTracking = false, // Toggle between real and simulated tracking
  className,
  style
}) {
  console.log('🗺️ MapBase component mounted', { deliveryId, useRealTracking });
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  const riderIntervalRef = useRef(null);
  const unsubscribeRef = useRef(null); // Firebase listener cleanup
  const [isRiderVisible, setIsRiderVisible] = useState(showRider);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [stepInPath, setStepInPath] = useState(0);
  const [riderLocation, setRiderLocation] = useState(null); // Real rider location from Firebase
  const [riderStatus, setRiderStatus] = useState('unknown'); // active, paused, completed, unknown
  const mapId = useRef(`map-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  // Delivery route through all zones
  const deliveryRoute = zones.map(zone => zone.coords);

  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const initializeMap = () => {
      console.log('🔄 Attempting to initialize map...', { hasRef: !!mapRef.current, hasInstance: !!mapInstanceRef.current });
      
      if (!mapInstanceRef.current && mapRef.current) {
        try {
          console.log('🚀 Starting map initialization...');
          
          // Clear any existing Leaflet container
          if (mapRef.current._leaflet_id) {
            delete mapRef.current._leaflet_id;
          }
          
          // Remove any existing leaflet classes
          mapRef.current.className = mapRef.current.className.replace(/leaflet-\S+/g, '');
          
          // Initialize map
          mapInstanceRef.current = L.map(mapRef.current, {
            zoomControl: true,
            scrollWheelZoom: true,
            doubleClickZoom: true,
            boxZoom: true,
            keyboard: true,
            dragging: true,
            touchZoom: true
          }).setView([7.1455, 3.3562], 13);

          // Add tile layer with fallback
          const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            errorTileUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgZmlsbD0iI2Y0ZjRmNCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSI+TWFwPC90ZXh0Pjwvc3ZnPg=='
          });
          
          tileLayer.on('tileerror', () => {
            console.warn('🔴 Primary tiles failing, but zones still visible');
          });
          
          tileLayer.addTo(mapInstanceRef.current);

          if (showZones) {
            // Add zones with styled labels and boundaries
            zones.forEach((zone) => {
              // Add zone boundary
              L.rectangle(zone.bounds, {
                color: zone.color,
                weight: 2,
                fillOpacity: 0.2
              }).addTo(mapInstanceRef.current);

              // Create styled label
              const labelHTML = `
                <div style="
                  background-color: ${zone.color};
                  color: white;
                  font-weight: bold;
                  padding: 6px 12px;
                  border-radius: 8px;
                  box-shadow: 1px 1px 6px rgba(0,0,0,0.4);
                  font-size: 13px;
                  cursor: pointer;
                  transition: transform 0.2s;
                ">
                  ${zone.name}
                </div>
              `;

              const labelIcon = L.divIcon({
                html: labelHTML,
                className: 'zone-label',
                iconSize: [100, 30]
              });

              // Add clickable label
              L.marker(zone.coords, { 
                icon: labelIcon,
                riseOnHover: true
              })
              .addTo(mapInstanceRef.current)
              .on('click', () => onZoneClick?.(zone))
              .on('mouseover', function(e) {
                e.target._icon.style.transform = 'scale(1.1)';
              })
              .on('mouseout', function(e) {
                e.target._icon.style.transform = 'scale(1)';
              });
            });
          }

          if (showRider) {
            // Add rider marker
            const riderIcon = L.icon({
              iconUrl: 'https://cdn-icons-png.flaticon.com/512/1048/1048318.png',
              iconSize: [36, 36],
            });

            // Set initial position based on tracking mode
            const initialPosition = useRealTracking && riderLocation 
              ? [riderLocation.lat, riderLocation.lng] 
              : deliveryRoute[0];

            riderMarkerRef.current = L.marker(initialPosition, { icon: riderIcon })
              .addTo(mapInstanceRef.current);

            // Set up tracking based on mode
            if (useRealTracking && deliveryId) {
              console.log('🔥 Setting up real-time Firebase tracking');
              // Real Firebase tracking - set up in separate effect
            } else {
              console.log('🎮 Setting up simulated tracking');
              // Simulated tracking (original animation)
              const STEPS_PER_PATH = 30;
              riderIntervalRef.current = setInterval(() => {
                const currentPath = deliveryRoute[currentPathIndex];
                const nextPath = deliveryRoute[(currentPathIndex + 1) % deliveryRoute.length];
                
                const newPos = moveRiderAlongPath(currentPath, nextPath, STEPS_PER_PATH, stepInPath);
                if (riderMarkerRef.current) {
                  riderMarkerRef.current.setLatLng(newPos);
                }

                if (stepInPath >= STEPS_PER_PATH) {
                  setStepInPath(0);
                  setCurrentPathIndex((prev) => (prev + 1) % deliveryRoute.length);
                } else {
                  setStepInPath(step => step + 1);
                }
              }, 100);
            }
          }

          // Force map size recognition
          setTimeout(() => {
            if (mapInstanceRef.current) {
              mapInstanceRef.current.invalidateSize();
            }
            console.log('✅ Map initialized successfully');
          }, 100);
        } catch (error) {
          console.error('❌ Error initializing map:', error);
        }
      } else if (!mapRef.current) {
        console.log('⏳ Waiting for map container ref...');
      } else if (mapInstanceRef.current) {
        console.log('ℹ️ Map already initialized');
      }
    };

    // Use setTimeout to ensure DOM is ready
    const timer = setTimeout(initializeMap, 250);
    
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        } catch (e) {
          console.warn('Map cleanup warning:', e);
        }
      }
      if (riderIntervalRef.current) {
        clearInterval(riderIntervalRef.current);
        riderIntervalRef.current = null;
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [onZoneClick, showRider, showZones]);

  // Real-time Firebase tracking effect
  useEffect(() => {
    if (useRealTracking && deliveryId && showRider && mapInstanceRef.current) {
      console.log('🔥 Starting Firebase rider location listener');
      
      const handleLocationUpdate = (locationData) => {
        if (locationData) {
          console.log('📍 Real rider location update:', locationData);
          setRiderLocation(locationData);
          setRiderStatus(locationData.status || 'active');
          
          // Update marker position if it exists
          if (riderMarkerRef.current && isRiderVisible) {
            riderMarkerRef.current.setLatLng([locationData.lat, locationData.lng]);
          }
          
          // Update route history visualization
          if (locationData.routeHistory && locationData.routeHistory.length > 1 && mapInstanceRef.current) {
            // Remove existing route polyline
            if (routePolylineRef.current) {
              mapInstanceRef.current.removeLayer(routePolylineRef.current);
            }
            
            // Create new route polyline from history
            const routePoints = locationData.routeHistory.map(point => [point.lat, point.lng]);
            routePolylineRef.current = L.polyline(routePoints, {
              color: '#3B82F6',
              weight: 4,
              opacity: 0.7,
              dashArray: '5, 10'
            }).addTo(mapInstanceRef.current);
            
            console.log(`🛣️ Route updated with ${routePoints.length} points`);
          }
        } else {
          console.log('📍 No rider location data');
          setRiderLocation(null);
          setRiderStatus('unknown');
          
          // Clear route visualization
          if (routePolylineRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(routePolylineRef.current);
            routePolylineRef.current = null;
          }
        }
      };

      // Subscribe to Firebase updates
      unsubscribeRef.current = subscribeToRiderLocation(deliveryId, handleLocationUpdate);

      return () => {
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }
      };
    }
  }, [useRealTracking, deliveryId, showRider, isRiderVisible]);

  // Toggle rider visibility
  useEffect(() => {
    if (riderMarkerRef.current) {
      if (isRiderVisible) {
        riderMarkerRef.current.addTo(mapInstanceRef.current);
      } else {
        riderMarkerRef.current.remove();
      }
    }
  }, [isRiderVisible]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', ...style }} className={className}>
      <div 
        ref={mapRef} 
        id={mapId.current}
        style={{ 
          width: '100%', 
          height: '600px',
          minHeight: '600px',
          position: 'relative'
        }} 
      />
      
      {showRider && (
        <button
          onClick={() => setIsRiderVisible(!isRiderVisible)}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '8px 16px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 1000
          }}
        >
          {isRiderVisible ? 'Hide' : 'Show'} Rider
        </button>
      )}

      {showBanner && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          width: '100%',
          padding: '10px',
          background: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '14px',
          borderTop: '1px solid #ccc',
          zIndex: 999,
        }}>
          {bannerText}
        </div>
      )}
    </div>
  );
}