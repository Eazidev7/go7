import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
// Leaflet CSS is already imported in main.jsx
import '../../styles/leaflet.css'; // Only importing custom styles, not base Leaflet

// Fix Leaflet's default markers in webpack
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Default center: Abeokuta
const ABEOKUTA_CENTER = { lat: 7.1475, lng: 3.3619 };
const DEFAULT_ZOOM = 12;

/**
 * Safe MapContainer wrapper that handles mounting and errors
 */
const MapShell = ({ 
  children, 
  pickup, 
  dropoff, 
  className = "h-80 md:h-[420px] w-full" 
}) => {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Only render map after component mounts (client-side)
    setMounted(true);
  }, []);

  const handleMapCreated = (map) => {
    mapRef.current = map;
    
    // Set up error handling
    map.on('error', (e) => {
      console.error('Map error:', e);
      setError('Map failed to load');
    });

    // Ensure map renders properly
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  };

  if (!mounted) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center map-loading`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} bg-red-50 border border-red-200 flex items-center justify-center`}>
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm text-red-700">{error}</p>
          <button 
            onClick={() => {
              setError(null);
              setMounted(false);
              setTimeout(() => setMounted(true), 100);
            }}
            className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  try {
    return (
      <div className={className}>
        <MapContainer
          center={[ABEOKUTA_CENTER.lat, ABEOKUTA_CENTER.lng]}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="h-full w-full rounded-lg"
          whenCreated={handleMapCreated}
          onError={(e) => setError('Failed to initialize map')}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            errorTileUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Crect width='256' height='256' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280'%3ETile failed%3C/text%3E%3C/svg%3E"
          />
          {children}
        </MapContainer>
      </div>
    );
  } catch (error) {
    console.error('MapShell render error:', error);
    return (
      <div className={`${className} bg-red-50 border border-red-200 flex items-center justify-center`}>
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm text-red-700">Map failed to render</p>
        </div>
      </div>
    );
  }
};

export default MapShell;
