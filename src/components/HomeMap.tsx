import React, { useMemo, useRef, useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import * as L from 'leaflet';
// Leaflet CSS is already imported in main.jsx
import '../styles/map.css';
import '../styles/mapOverlay.css';
import { abeokutaAreas, ABEOKUTA_CENTER, type AbeokutaArea } from '../data/abeokutaAreas';

interface AreaPillProps {
  area: AbeokutaArea;
  onClick?: (area: AbeokutaArea) => void;
}

const AreaPill: React.FC<AreaPillProps> = ({ area, onClick }) => {
  const handleClick = () => {
    onClick?.(area);
  };

  return (
    <div
      className="go7-area-pill"
      style={{
        '--area-bg-color': area.bgColor,
        '--area-border-color': area.borderColor,
        '--area-text-color': area.color,
      } as React.CSSProperties}
      onClick={handleClick}
    >
      <div
        className="go7-area-dot"
        style={{ '--dot-color': area.dotColor } as React.CSSProperties}
      />
      {area.name}
    </div>
  );
};

// Component to handle pill positioning on the map
const MapPillsOverlay: React.FC<{
  areas: AbeokutaArea[];
  onAreaClick?: (area: AbeokutaArea) => void;
}> = ({ areas, onAreaClick }) => {
  const map = useMap();
  const [pillPositions, setPillPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const updatePillPositions = () => {
      const newPositions: Record<string, { x: number; y: number }> = {};
      
      areas.forEach((area) => {
        const point = map.latLngToContainerPoint([area.lat, area.lng]);
        newPositions[area.id] = {
          x: point.x - 50, // Offset to center the pill
          y: point.y - 15  // Offset to position above the point
        };
      });
      
      setPillPositions(newPositions);
    };

    // Update positions on map events
    map.on('zoom', updatePillPositions);
    map.on('move', updatePillPositions);
    map.on('resize', updatePillPositions);
    
    // Initial positioning
    updatePillPositions();

    return () => {
      map.off('zoom', updatePillPositions);
      map.off('move', updatePillPositions);
      map.off('resize', updatePillPositions);
    };
  }, [map, areas]);

  return (
    <>
      {areas.map((area) => {
        const position = pillPositions[area.id];
        if (!position) return null;
        
        return (
          <div
            key={area.id}
            className="go7-area-position"
            style={{
              '--area-x': `${position.x}px`,
              '--area-y': `${position.y}px`,
            } as React.CSSProperties}
          >
            <AreaPill area={area} onClick={onAreaClick} />
          </div>
        );
      })}
    </>
  );
};

interface HomeMapProps {
  onAreaClick?: (area: AbeokutaArea) => void;
  className?: string;
}

const HomeMap: React.FC<HomeMapProps> = ({ onAreaClick, className = '' }) => {
  const mapRef = useRef<L.Map>(null);

  const handleAreaClick = (area: AbeokutaArea) => {
    console.log(`Clicked on ${area.name}`);
    
    // Pan to the selected area
    if (mapRef.current) {
      mapRef.current.setView([area.lat, area.lng], 14, {
        animate: true,
        duration: 0.5
      });
    }
    
    onAreaClick?.(area);
  };

  return (
    <div className={`go7-map-card ${className}`}>
      <div className="go7-map-container">
        <MapContainer
          ref={mapRef}
          center={ABEOKUTA_CENTER as [number, number]}
          zoom={13}
          scrollWheelZoom={true}
          zoomControl={true}
          attributionControl={false}
          className="go7-map-leaflet"
        >
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
            {...({ attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>' } as any)}
          />
          
          <MapPillsOverlay areas={abeokutaAreas} onAreaClick={handleAreaClick} />
        </MapContainer>
      </div>

      {/* Footer Help Bar */}
      <div className="go7-map-help">
        <div className="go7-help-dot" />
        <p className="go7-help-text">
          Click on any live location in Abeokuta to order from vendors near you
        </p>
      </div>
    </div>
  );
};

export default HomeMap;
