import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const DeliveryAreasMap = ({ onAreaSelect }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [selectedArea, setSelectedArea] = useState(null);

  // Delivery neighborhoods with distinct brand colors
  const neighborhoods = [
    { name: "Camp", coords: [7.1280, 3.3560], color: "#FF6D00" },
    { name: "Kuto", coords: [7.1465, 3.3502], color: "#D50000" },
    { name: "Ibara", coords: [7.1548, 3.3425], color: "#0097A7" },
    { name: "Panseke", coords: [7.1678, 3.3523], color: "#AA00FF" },
    { name: "Adigbe", coords: [7.1632, 3.3360], color: "#00C853" },
    { name: "Oke-Ilewo", coords: [7.1634, 3.3612], color: "#F50057" },
    { name: "Asero", coords: [7.1789, 3.3445], color: "#2962FF" },
  ];

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapRef.current, {
        center: [7.1608, 3.3481],
        zoom: 13,
        zoomControl: false,
        scrollWheelZoom: true,
        dragging: true,
        attributionControl: false,
      });

      // Add road lines SVG overlay
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgElement.style.position = 'absolute';
      svgElement.style.top = '0';
      svgElement.style.left = '0';
      svgElement.style.width = '100%';
      svgElement.style.height = '100%';
      svgElement.style.pointerEvents = 'none';
      svgElement.style.zIndex = '1';
      
      svgElement.innerHTML = `
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#f4cc84" stroke-width="4" opacity="0.8"/>
        <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
        <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#f4cc84" stroke-width="4" opacity="0.8"/>
        <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#f4cc84" stroke-width="3" opacity="0.7"/>
      `;
      
      mapRef.current.appendChild(svgElement);

      // Add neighborhood labels
      neighborhoods.forEach(n => {
        const label = L.divIcon({
          className: 'chowdeck-tiny',
          html: `<div class="tiny-label" style="background-color: ${n.color};">${n.name}</div>`,
          iconSize: [null, null],
          iconAnchor: [25, 12],
        });

        const marker = L.marker(n.coords, { 
          icon: label,
          zIndexOffset: 100 
        }).addTo(map);

        marker.on('click', () => {
          setSelectedArea(n.name);
          if (onAreaSelect) {
            onAreaSelect(n.name);
          }
        });
      });

      mapInstanceRef.current = map;

      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }
  }, []);

  return (
    <div className="location-selector">
      <div className="location-header">
        <h1 className="location-title">Choose Delivery Area</h1>
        <p className="location-subtitle">
          Select your neighborhood in Abeokuta to see available restaurants
        </p>
        {selectedArea && (
          <div className="selected-badge">
            📍 Selected: {selectedArea}
          </div>
        )}
      </div>

      <div className="map-container">
        <div ref={mapRef} id="map" className="delivery-map" />
      </div>

      <div className="abeokuta-grid">
        {neighborhoods.map((area) => (
          <button
            key={area.name}
            onClick={() => {
              setSelectedArea(area.name);
              if (onAreaSelect) onAreaSelect(area.name);
              if (mapInstanceRef.current) {
                mapInstanceRef.current.flyTo(area.coords, 15, { duration: 1.5 });
              }
            }}
            className={`area-card ${selectedArea === area.name ? 'selected' : ''}`}
          >
            {area.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DeliveryAreasMap;