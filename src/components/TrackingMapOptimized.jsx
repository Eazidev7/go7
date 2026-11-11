import React, { memo, useMemo, Suspense } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapSkeleton from './maps/MapSkeleton';
import MapPreloader from './maps/MapPreloader';
import { useMapOptimization } from '../hooks/useMapOptimization';

// Optimized tile configuration
const TILE_CONFIG = {
  url: "https://api.mapbox.com/styles/v1/mapbox/light-v10/tiles/{z}/{x}/{y}?access_token={accessToken}",
  attribution: '&copy; <a href="https://www.mapbox.com/">Mapbox</a>',
  accessToken: "YOUR_MAPBOX_TOKEN",
  tileSize: 512,
  zoomOffset: -1,
  detectRetina: true,
  crossOrigin: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2,
  maxZoom: 18,
  minZoom: 12
};

// Abeokuta bounds
const ABEOKUTA_BOUNDS = [
  [7.0475, 3.2619],
  [7.2475, 3.4619]
];

// Map bounds controller
const TrackingMapBounds = memo(() => {
  const map = useMap();

  React.useEffect(() => {
    if (!map) return;
    
    map.setMaxBounds(ABEOKUTA_BOUNDS);
    map.options.minZoom = 12;
    map.options.maxZoom = 18;
  }, [map]);

  return null;
});

TrackingMapBounds.displayName = 'TrackingMapBounds';

// Optimized tracking map component
const OptimizedTrackingMap = memo(({ 
  pickupLocation, 
  dropoffLocation, 
  riderLocation, 
  route,
  className = "",
  height = "400px" 
}) => {
  const { mapOptions } = useMapOptimization([7.1475, 3.3619], 13);

  // Memoize markers and route data
  const markers = useMemo(() => {
    const markerList = [];

    if (pickupLocation) {
      markerList.push({
        key: 'pickup',
        position: [pickupLocation.lat, pickupLocation.lng],
        icon: L.divIcon({
          html: '<div style="background: #059669; color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; border: 2px solid white;">Pickup</div>',
          className: 'custom-pickup-marker',
          iconSize: [50, 25],
          iconAnchor: [25, 12]
        }),
        popup: `Pickup: ${pickupLocation.address || 'Pickup Location'}`
      });
    }

    if (dropoffLocation) {
      markerList.push({
        key: 'dropoff',
        position: [dropoffLocation.lat, dropoffLocation.lng],
        icon: L.divIcon({
          html: '<div style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; border: 2px solid white;">Dropoff</div>',
          className: 'custom-dropoff-marker',
          iconSize: [60, 25],
          iconAnchor: [30, 12]
        }),
        popup: `Dropoff: ${dropoffLocation.address || 'Dropoff Location'}`
      });
    }

    if (riderLocation) {
      markerList.push({
        key: 'rider',
        position: [riderLocation.lat, riderLocation.lng],
        icon: L.divIcon({
          html: '<div style="background: #2563eb; color: white; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 600; border: 2px solid white;">🛵 Rider</div>',
          className: 'custom-rider-marker',
          iconSize: [60, 25],
          iconAnchor: [30, 12]
        }),
        popup: 'Current Rider Location'
      });
    }

    return markerList;
  }, [pickupLocation, dropoffLocation, riderLocation]);

  // Memoize route coordinates
  const routeCoordinates = useMemo(() => {
    if (!route || !Array.isArray(route)) return [];
    return route.map(point => [point.lat, point.lng]);
  }, [route]);

  // Calculate map bounds to fit all markers and route
  const mapBounds = useMemo(() => {
    const allPoints = [
      ...markers.map(m => m.position),
      ...routeCoordinates
    ];

    if (allPoints.length === 0) {
      return [[7.1475, 3.3619], [7.1475, 3.3619]]; // Default to Abeokuta center
    }

    const lats = allPoints.map(p => p[0]);
    const lngs = allPoints.map(p => p[1]);

    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)]
    ];
  }, [markers, routeCoordinates]);

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        {...mapOptions}
        bounds={mapBounds}
        boundsOptions={{ padding: [20, 20] }}
        className="w-full h-full rounded-lg"
        style={{ height, minHeight: height }}
      >
        <TileLayer {...TILE_CONFIG} />
        <TrackingMapBounds />
        
        {/* Render markers */}
        {markers.map((marker) => (
          <Marker
            key={marker.key}
            position={marker.position}
            icon={marker.icon}
          >
            <Popup>{marker.popup}</Popup>
          </Marker>
        ))}

        {/* Render route if available */}
        {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#2563eb"
            weight={4}
            opacity={0.7}
            smoothFactor={1}
          />
        )}
      </MapContainer>

      {/* Status indicator */}
      <div className="absolute top-2 left-2 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-medium">
          {riderLocation ? (
            <span className="text-green-600">🟢 Live Tracking</span>
          ) : (
            <span className="text-gray-600">📍 Route Preview</span>
          )}
        </div>
      </div>
    </div>
  );
});

OptimizedTrackingMap.displayName = 'OptimizedTrackingMap';

// Lazy-loaded wrapper
const LazyTrackingMap = React.lazy(() => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ default: OptimizedTrackingMap });
    }, 200);
  });
});

// Final component with Suspense
const TrackingMapOptimized = (props) => {
  return (
    <Suspense fallback={<MapSkeleton height={props.height || "400px"} className={props.className} />}>
      <LazyTrackingMap {...props} />
    </Suspense>
  );
};

export default TrackingMapOptimized;
