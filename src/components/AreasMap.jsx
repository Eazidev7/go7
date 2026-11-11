import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
// Leaflet CSS is already imported in main.jsx
import { areas } from '../data/areas';

// Fix for default markers in Leaflet with Webpack
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const AreaMarker = ({ area, onClick, activeField }) => {
  const map = useMap();
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Create custom icon
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

    // Create marker
    const marker = L.marker([area.lat, area.lng], { icon: customIcon })
      .addTo(map)
      .on('click', () => onClick(area));

    markerRef.current = marker;

    // Cleanup
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map, area, onClick, activeField]);

  return null;
};

const AreasMap = ({ onAreaClick, activeField, className = '' }) => {
  const mapRef = useRef(null);

  const handleAreaClick = (area) => {
    console.log(`Map area clicked: ${area.name} (active field: ${activeField})`);
    onAreaClick(area);
  };

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        ref={mapRef}
        center={[7.1475, 3.3619]} // Abeokuta center
        zoom={12}
        scrollWheelZoom={true}
        zoomControl={true}
        attributionControl={false}
        className="w-full h-full rounded-lg"
        style={{ height: '400px', minHeight: '400px' }}
      >
        <TileLayer
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
        />
        
        {areas.map((area) => (
          <AreaMarker
            key={area.id}
            area={area}
            onClick={handleAreaClick}
            activeField={activeField}
          />
        ))}
      </MapContainer>
      
      {/* Map hint */}
      <div className="absolute bottom-2 left-2 right-2 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-medium">💡 Tip:</span> Click any area to auto-fill {activeField} location
        </div>
      </div>
    </div>
  );
};
export default AreasMap;
