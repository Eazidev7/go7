/**
 * Go7 Chowdeck-Style Delivery Map Component
 * Features: Cartoon tiles, animated rider, pickup/dropoff pins, price overlay, rider profile
 */

import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { createMapIcons, createLeafletIcon, mapIconConfigs } from '../utils/mapIcons';
import { animateRider, generateSmoothPath } from '../utils/riderAnimation';
import 'leaflet/dist/leaflet.css';
import './Go7Map.css';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Abeokuta coordinates (pickup and dropoff locations)
const LOCATIONS = {
  pickup: [7.1475, 3.3619], // Ake area - pickup location  
  dropoff: [7.1532, 3.3698], // Isabo area - dropoff location
  olumoRock: [7.1567, 3.3483] // Olumo Rock landmark
};

// Generate route path with intermediate points for smooth animation
// Wrap in try-catch to handle any potential errors
let ROUTE_PATH;
try {
  ROUTE_PATH = generateSmoothPath(LOCATIONS.pickup, LOCATIONS.dropoff, 25);
} catch (error) {
  console.error('Error generating route path:', error);
  // Fallback to simple straight line
  ROUTE_PATH = [LOCATIONS.pickup, LOCATIONS.dropoff];
}

// Map center and zoom level
const MAP_CONFIG = {
  center: [7.1504, 3.3659], // Center between pickup and dropoff
  zoom: 14,
  maxZoom: 18,
  minZoom: 10
};

// Component to handle rider animation
const AnimatedRider = ({ routePath, onAnimationUpdate }) => {
  const map = useMap();
  const riderMarkerRef = useRef(null);
  const animationControllerRef = useRef(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {

    // Force map to recognize its size
    const icons = createMapIcons();
    const riderIcon = createLeafletIcon(
      icons.riderIcon,
      mapIconConfigs.rider.size,
      mapIconConfigs.rider.anchor
    );

    // Create rider marker
    const riderMarker = L.marker(routePath[0], { icon: riderIcon }).addTo(map);
    riderMarkerRef.current = riderMarker;

    // Start animation
    const controller = animateRider(riderMarker, routePath, {
      duration: 10000, // 10 seconds for full journey
      loop: true,
      easing: 'easeInOutQuad',
      onUpdate: (data) => {
        setAnimationProgress(data.progress);
        if (onAnimationUpdate) {
          onAnimationUpdate(data);
        }
      }
    });

    animationControllerRef.current = controller;

    // Cleanup
    return () => {
      if (controller) {
        controller.stop();
      }
      if (riderMarker) {
        map.removeLayer(riderMarker);
      }
    };
  }, [map, routePath, onAnimationUpdate]);

  return null; // This component doesn't render anything visible
};

// Component to handle static markers
const StaticMarkers = () => {
  const map = useMap();

  useEffect(() => {
    const icons = createMapIcons();

    // Create pickup marker (bag icon)
    const pickupIcon = createLeafletIcon(
      icons.bagIcon,
      mapIconConfigs.pickup.size,
      mapIconConfigs.pickup.anchor
    );
    const pickupMarker = L.marker(LOCATIONS.pickup, { icon: pickupIcon })
      .bindPopup('<strong>Pickup Location</strong><br>Ake, Abeokuta')
      .addTo(map);

    // Create dropoff marker (shop icon)
    const dropoffIcon = createLeafletIcon(
      icons.shopIcon,
      mapIconConfigs.dropoff.size,
      mapIconConfigs.dropoff.anchor
    );
    const dropoffMarker = L.marker(LOCATIONS.dropoff, { icon: dropoffIcon })
      .bindPopup('<strong>Dropoff Location</strong><br>Isabo, Abeokuta')
      .addTo(map);

    // Create Olumo Rock landmark marker
    const landmarkIcon = createLeafletIcon(
      icons.landmarkIcon,
      mapIconConfigs.landmark.size,
      mapIconConfigs.landmark.anchor
    );
    const landmarkMarker = L.marker(LOCATIONS.olumoRock, { icon: landmarkIcon })
      .bindTooltip('Olumo Rock', {
        permanent: false,
        direction: 'top',
        className: 'go7-tooltip'
      })
      .addTo(map);

    // Cleanup
    return () => {
      map.removeLayer(pickupMarker);
      map.removeLayer(dropoffMarker);
      map.removeLayer(landmarkMarker);
    };
  }, [map]);

  return null;
};

// Main component
const Go7Map = ({
  className = '',
  height = '400px',
  maptilerApiKey = import.meta.env.VITE_MAPTILER_API_KEY || 'your_maptiler_key_here'
}) => {
  const [riderStatus, setRiderStatus] = useState('En route to pickup');
  const [estimatedTime, setEstimatedTime] = useState('12 mins');
  const [animationData, setAnimationData] = useState(null);

  // Handle animation updates
  const handleAnimationUpdate = (data) => {
    setAnimationData(data);

    // Update status based on progress
    if (data.progress < 0.1) {
      setRiderStatus('Starting journey');
      setEstimatedTime('12 mins');
    } else if (data.progress < 0.5) {
      setRiderStatus('En route to pickup');
      setEstimatedTime('8 mins');
    } else if (data.progress < 0.9) {
      setRiderStatus('Heading to dropoff');
      setEstimatedTime('4 mins');
    } else {
      setRiderStatus('Arriving soon');
      setEstimatedTime('1 min');
    }
  };

  // WhatsApp contact function
  const contactRider = () => {
    const message = encodeURIComponent('Hi Akeem! I want to track my Go7 delivery.');
    const whatsappUrl = `https://wa.me/2348123456789?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`go7-map-container ${className}`} style={{ height }}>
      {/* Accessibility live region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        Rider status: {riderStatus}. Estimated time: {estimatedTime}.
      </div>

      {/* Map container */}
      <MapContainer
        center={MAP_CONFIG.center}
        zoom={MAP_CONFIG.zoom}
        maxZoom={MAP_CONFIG.maxZoom}
        minZoom={MAP_CONFIG.minZoom}
        className="go7-leaflet-map"
        zoomControl={false}
        attributionControl={false}
      >
        {/* MapTiler custom Go7 style tile layer */}
        <TileLayer
          url={`https://api.maptiler.com/maps/019996dd-306b-7019-acc5-de8469c0388d/256/{z}/{x}/{y}.png?key=${maptilerApiKey}`}
          attribution='&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="http://osm.org/copyright">OpenStreetMap</a>'
          opacity={0.8}
        />

        {/* Route polyline */}
        <Polyline
          positions={ROUTE_PATH}
          pathOptions={{
            color: '#E30613',
            weight: 4,
            opacity: 0.8,
            dashArray: '6 8',
            lineCap: 'round',
            lineJoin: 'round'
          }}
        />

        {/* Static markers (pickup, dropoff, landmark) */}
        <StaticMarkers />

        {/* Animated rider */}
        <AnimatedRider
          routePath={ROUTE_PATH}
          onAnimationUpdate={handleAnimationUpdate}
        />
      </MapContainer>

      {/* Price pill overlay */}
      <div className="go7-price-pill">
        <span className="price-amount">₦1,450</span>
        <span className="price-label">Est. delivery fee</span>
      </div>

      {/* Rider profile chip */}
      <div className="go7-rider-chip">
        <div className="rider-avatar">
          🏍️
        </div>
        <div className="rider-info">
          <div className="rider-name">Akeem · Rider</div>
          <div className="rider-rating">
            <span className="stars">⭐ 4.9</span>
            <span className="deliveries">120 deliveries</span>
          </div>
          <div className="rider-status">{riderStatus}</div>
        </div>
        <button
          className="whatsapp-btn"
          onClick={contactRider}
          aria-label="Contact rider via WhatsApp"
        >
          💬
        </button>
      </div>

      {/* Status bar */}
      <div className="go7-status-bar">
        <div className="status-info">
          <span className="eta">ETA: {estimatedTime}</span>
          <span className="progress-text">
            {animationData ? `${Math.round(animationData.progress * 100)}% complete` : 'Starting...'}
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: animationData ? `${animationData.progress * 100}%` : '0%'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Go7Map;