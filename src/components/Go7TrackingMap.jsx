import React, { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';

// Safe base64 encoding for Unicode strings
const safeBase64Encode = (str) => {
  try {
    // Convert Unicode to UTF-8 bytes, then to Latin-1, then base64
    return btoa(unescape(encodeURIComponent(str)));
  } catch (error) {
    console.error('Base64 encoding error:', error);
    // Fallback: remove non-Latin1 characters
    const latin1Str = str.replace(/[^\x00-\xFF]/g, '');
    return btoa(latin1Str);
  }
};

// Static data outside component to prevent recreation on every render
const PICKUP_LOCATION = { lat: 7.1557, lng: 3.3491 }; // Oke-Ilewo
const DROPOFF_LOCATION = { lat: 7.1500, lng: 3.3412 }; // Abeokuta DC

// Detailed route path with intermediate points for smooth animation
const PATH_COORDINATES = [
  PICKUP_LOCATION,
  { lat: 7.1550, lng: 3.3485 },
  { lat: 7.1542, lng: 3.3478 },
  { lat: 7.1535, lng: 3.3470 },
  { lat: 7.1528, lng: 3.3462 },
  { lat: 7.1520, lng: 3.3450 },
  { lat: 7.1512, lng: 3.3438 },
  { lat: 7.1505, lng: 3.3425 },
  DROPOFF_LOCATION
];

const Go7TrackingMap = ({ orderId }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [map, setMap] = useState(null);
  const [riderPosition, setRiderPosition] = useState(null);
  const [routeIndex, setRouteIndex] = useState(0);

  // Use static references
  const pickup = PICKUP_LOCATION;
  const dropoff = DROPOFF_LOCATION;
  const pathCoordinates = PATH_COORDINATES;
  
  // Center point between pickup and dropoff
  const center = {
    lat: (pickup.lat + dropoff.lat) / 2,
    lng: (pickup.lng + dropoff.lng) / 2
  };

  // Go7 custom map style (light gray with white roads)
  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    scrollwheel: true,
    draggable: true,
    styles: [
      {
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }]
      },
      {
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }]
      },
      {
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }]
      },
      {
        elementType: 'labels.text.stroke',
        stylers: [{ color: '#f5f5f5' }]
      },
      {
        featureType: 'administrative.land_parcel',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#bdbdbd' }]
      },
      {
        featureType: 'poi',
        elementType: 'geometry',
        stylers: [{ color: '#eeeeee' }]
      },
      {
        featureType: 'poi',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'geometry',
        stylers: [{ color: '#e5e5e5' }]
      },
      {
        featureType: 'poi.park',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }]
      },
      {
        featureType: 'road',
        elementType: 'geometry',
        stylers: [{ color: '#ffffff' }]
      },
      {
        featureType: 'road.arterial',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#757575' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'geometry',
        stylers: [{ color: '#dadada' }]
      },
      {
        featureType: 'road.highway',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#616161' }]
      },
      {
        featureType: 'road.local',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }]
      },
      {
        featureType: 'transit.line',
        elementType: 'geometry',
        stylers: [{ color: '#e5e5e5' }]
      },
      {
        featureType: 'transit.station',
        elementType: 'geometry',
        stylers: [{ color: '#eeeeee' }]
      },
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#c9c9c9' }]
      },
      {
        featureType: 'water',
        elementType: 'labels.text.fill',
        stylers: [{ color: '#9e9e9e' }]
      }
    ]
  };

  // Route line options (Go7 red)
  const polylineOptions = {
    strokeColor: '#E0001B',
    strokeOpacity: 1.0,
    strokeWeight: 4,
    geodesic: true
  };

  // Custom marker icons
  const pickupIcon = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 12,
    fillColor: '#ffffff',
    fillOpacity: 1,
    strokeColor: '#000000',
    strokeWeight: 2,
    labelOrigin: new window.google.maps.Point(0, -30)
  } : undefined;

  const dropoffIcon = isLoaded && window.google ? {
    path: window.google.maps.SymbolPath.CIRCLE,
    scale: 12,
    fillColor: '#000000',
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    labelOrigin: new window.google.maps.Point(0, -30)
  } : undefined;

  // Animate rider movement along the route
  useEffect(() => {
    if (!isLoaded || !PATH_COORDINATES.length) return;
    
    // Start rider at pickup location
    setRiderPosition(PICKUP_LOCATION);
    
    const interval = setInterval(() => {
      setRouteIndex((prevIndex) => {
        const nextIndex = prevIndex + 1;
        
        if (nextIndex >= PATH_COORDINATES.length) {
          // Reached destination, stop animation
          clearInterval(interval);
          return prevIndex;
        }
        
        // Update rider position
        const newPosition = PATH_COORDINATES[nextIndex];
        setRiderPosition(newPosition);
        
        // Center map on rider with smooth animation
        if (map) {
          map.panTo(newPosition);
        }
        
        console.log(`🏍️ Rider moved to checkpoint ${nextIndex}:`, newPosition);
        return nextIndex;
      });
    }, 2500); // Move every 2.5 seconds for realistic delivery pace
    
    return () => clearInterval(interval);
  }, [isLoaded, map]); // Removed pathCoordinates from dependencies since it's now static

  const onLoad = useCallback((map) => {
    setMap(map);
    
    // Fit bounds to show both markers initially
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(pickup);
    bounds.extend(dropoff);
    map.fitBounds(bounds);
    
    console.log('✅ Google Maps loaded successfully');
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        fontSize: '18px',
        color: '#666'
      }}>
        🗺️ Loading Go7 Maps...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{
        width: '100%',
        height: '100vh'
      }}
      center={center}
      zoom={14}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={mapOptions}
    >
      {/* Route line */}
      <Polyline
        path={pathCoordinates}
        options={polylineOptions}
      />
      
      {/* Pickup marker */}
      <Marker
        position={pickup}
        icon={pickupIcon}
        label={{
          text: 'Oke-Ilewo',
          color: '#000000',
          fontWeight: 'bold',
          fontSize: '12px'
        }}
        title="Pickup Location"
      />
      
      {/* Dropoff marker */}
      <Marker
        position={dropoff}
        icon={dropoffIcon}
        label={{
          text: 'Abeokuta DC',
          color: '#ffffff',
          fontWeight: 'bold',
          fontSize: '12px'
        }}
        title="Dropoff Location"
      />
      
      {/* Animated Rider Marker */}
      {riderPosition && (
        <Marker
          position={riderPosition}
          icon={{
            url: 'data:image/svg+xml;base64,' + safeBase64Encode(`
              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                <circle cx="20" cy="20" r="18" fill="#E0001B" stroke="#ffffff" stroke-width="3"/>
                <g fill="white">
                  <rect x="15" y="14" width="10" height="4" rx="2"/>
                  <circle cx="14" cy="22" r="3"/>
                  <circle cx="26" cy="22" r="3"/>
                  <rect x="18" y="18" width="4" height="2"/>
                  <path d="M16 16 L18 12 L22 12 L24 16 Z"/>
                </g>
              </svg>
            `),
            scaledSize: isLoaded && window.google && window.google.maps ? new window.google.maps.Size(40, 40) : undefined,
            anchor: isLoaded && window.google && window.google.maps ? new window.google.maps.Point(20, 20) : undefined
          }}
          title="Go7 Rider - Live Location"
          animation={isLoaded && window.google ? window.google.maps.Animation.BOUNCE : undefined}
        />
      )}
    </GoogleMap>
  );
};

export default Go7TrackingMap;