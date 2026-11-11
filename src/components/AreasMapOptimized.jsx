import React, { useEffect, useRef, useMemo, memo, Suspense } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
// Leaflet CSS is already imported in main.jsx
import { areas } from '../data/areas';
import MapSkeleton from './maps/MapSkeleton';

// Fix for default markers in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Abeokuta bounds for map restriction
const ABEOKUTA_BOUNDS = [
  [7.0475, 3.2619], // Southwest corner
  [7.2475, 3.4619]  // Northeast corner
];

// Optimized tile layer configuration
const TILE_CONFIG = {
  // Use OpenStreetMap HOT tiles for better performance (no API key required)
  url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by <a href="https://www.hotosm.org/" target="_blank">Humanitarian OpenStreetMap Team</a>',
  // Performance optimizations
  detectRetina: true,
  crossOrigin: true,
  updateWhenIdle: true,
  updateWhenZooming: false,
  keepBuffer: 2,
  // Cache control
  maxZoom: 18,
  minZoom: 12
};

// Memoized marker component for performance
const AreaMarker = memo(({ area, onClick, activeField }) => {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create custom icon with memoized styles
    const isActive = activeField === 'pickup';
    const iconHtml = `
      <div style="
        background: ${isActive ? '#dc2626' : '#059669'};
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        border: 2px solid white;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
      ">
        ${area.name}
      </div>
    `;

    const customIcon = L.divIcon({
      html: iconHtml,
      className: 'custom-area-marker',
      iconSize: [60, 30],
      iconAnchor: [30, 15]
    });

    // Create marker with optimized options
    const marker = L.marker([area.lat, area.lng], { 
      icon: customIcon,
      riseOnHover: true,
      bubblingMouseEvents: false
    })
      .addTo(map)
      .on('click', () => onClick(area));

    markerRef.current = marker;

    // Cleanup
    return () => {
      if (markerRef.current && map) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map, area, onClick, activeField]);

  return null;
});

AreaMarker.displayName = 'AreaMarker';

// Map bounds controller component
const MapBounds = memo(() => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Set maximum bounds to restrict panning
    map.setMaxBounds(ABEOKUTA_BOUNDS);
    map.options.minZoom = 12;
    map.options.maxZoom = 18;

    // Fit map to Abeokuta bounds on load
    map.fitBounds(ABEOKUTA_BOUNDS, { 
      padding: [20, 20],
      maxZoom: 14
    });

  }, [map]);

  return null;
});

MapBounds.displayName = 'MapBounds';

// Main optimized map component
const OptimizedAreasMap = ({ onAreaClick, activeField, className = '' }) => {
  const mapRef = useRef(null);
  
  // Memoize area data to prevent unnecessary re-renders
  const memoizedAreas = useMemo(() => areas, []);
  
  // Memoize area click handler
  const handleAreaClick = useMemo(() => (area) => {
    console.log(`Map area clicked: ${area.name} (active field: ${activeField})`);
    onAreaClick(area);
  }, [onAreaClick, activeField]);

  // Memoize map options for stable reference
  const mapOptions = useMemo(() => ({
    center: [7.1475, 3.3619], // Abeokuta center
    zoom: 13,
    scrollWheelZoom: false, // Disable scroll wheel zoom by default
    zoomControl: true,
    attributionControl: false,
    preferCanvas: true, // Better performance on mobile
    zoomAnimation: true,
    updateWhenIdle: true,
    maxBounds: ABEOKUTA_BOUNDS,
    minZoom: 12,
    maxZoom: 18
  }), []);

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        ref={mapRef}
        {...mapOptions}
        className="w-full h-full rounded-lg"
        style={{ height: '400px', minHeight: '400px' }}
      >
        <TileLayer {...TILE_CONFIG} />
        
        {/* Map bounds controller */}
        <MapBounds />
        
        {/* Render markers */}
        {memoizedAreas.map((area) => (
          <AreaMarker
            key={area.id}
            area={area}
            onClick={handleAreaClick}
            activeField={activeField}
          />
        ))}
      </MapContainer>
      
      {/* Map controls and hints */}
      <div className="absolute bottom-2 left-2 right-2 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-medium">💡 Tip:</span> Click any area to auto-fill {activeField} location
          <span className="ml-2 text-gray-500">• Scroll to zoom disabled</span>
        </div>
      </div>

      {/* Enable scroll zoom button */}
      <button
        className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-2 text-xs text-gray-600 hover:bg-white transition-colors"
        onClick={() => {
          if (mapRef.current) {
            const map = mapRef.current;
            const isEnabled = map.scrollWheelZoom.enabled();
            if (isEnabled) {
              map.scrollWheelZoom.disable();
            } else {
              map.scrollWheelZoom.enable();
            }
          }
        }}
        title="Toggle scroll zoom"
      >
        🖱️
      </button>
    </div>
  );
};

// Lazy-loaded wrapper component
const LazyAreasMap = React.lazy(() => {
  // Simulate minimum loading time for smoother UX
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ default: OptimizedAreasMap });
    }, 300);
  });
});

// Final component with Suspense wrapper
const AreasMapOptimized = (props) => {
  return (
    <Suspense fallback={<MapSkeleton height="400px" className={props.className} />}>
      <LazyAreasMap {...props} />
    </Suspense>
  );
};

export default AreasMapOptimized;
