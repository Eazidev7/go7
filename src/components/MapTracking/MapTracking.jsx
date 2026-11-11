// Go7 Live Route + ETA Tracking Component
// Real-time rider tracking with Google Directions API integration

import React, { useEffect, useState, useCallback } from "react";
import GoogleMapReact from "google-map-react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import "./MapTracking.css";

// Marker Components
const RiderMarker = ({ lat, lng }) => (
  <div className="rider-marker">
    <div className="rider-pulse"></div>
    <div className="scooter-container">
      <img 
        src="/images/go7-scooter.png" 
        alt="Delivery Rider" 
        className="scooter-image"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextElementSibling.style.display = 'block';
        }}
      />
      <div className="scooter-icon-fallback" style={{ display: 'none' }}>🏍️</div>
    </div>
    <div className="scooter-shadow"></div>
  </div>
);

const PickupMarker = ({ lat, lng }) => (
  <div className="pickup-marker">
    <div className="marker-icon pickup">📍</div>
    <div className="marker-label">Pickup</div>
  </div>
);

const DropoffMarker = ({ lat, lng }) => (
  <div className="dropoff-marker">
    <div className="marker-icon dropoff">🎯</div>
    <div className="marker-label">Drop-off</div>
  </div>
);

const RoutePoint = ({ lat, lng, isFirst, isLast }) => (
  <div className={`route-point ${isFirst ? 'first' : ''} ${isLast ? 'last' : ''}`}></div>
);

export default function MapTracking({ 
  orderId, 
  riderId, 
  pickup, 
  dropoff, 
  showETA = true,
  height = "65vh",
  className = ""
}) {
  const [riderLocation, setRiderLocation] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default center for Go7 (Nigeria - Lagos)
  const defaultCenter = { lat: 6.5244, lng: 3.3792 };
  
  // Use environment variable for Google Maps API key
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

  // Listen to rider's live location updates
  useEffect(() => {
    if (!riderId) {
      setLoading(false);
      return;
    }

    console.log('🏍️ Setting up rider location listener for:', riderId);
    
    const unsubscribe = onSnapshot(
      doc(db, "riders", riderId),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.currentLocation) {
            setRiderLocation(data.currentLocation);
            console.log('📍 Rider location updated:', data.currentLocation);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error listening to rider location:', error);
        setError('Failed to track rider location');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [riderId]);

  // Decode Google Polyline format
  const decodePolyline = useCallback((encoded) => {
    if (!encoded) return [];
    
    const points = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      points.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    
    return points;
  }, []);

  // Fetch route and ETA from Google Directions API
  const fetchRouteAndETA = useCallback(async () => {
    if (!pickup || !dropoff) {
      console.warn('⚠️ Missing pickup or dropoff coordinates');
      return;
    }

    try {
      console.log('🗺️ Fetching route from Google Directions API...');
      
      // Use rider location as origin if available, otherwise use pickup
      const origin = riderLocation 
        ? `${riderLocation.lat},${riderLocation.lng}`
        : `${pickup.lat},${pickup.lng}`;
      
      const destination = `${dropoff.lat},${dropoff.lng}`;
      
      const url = `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin}&` +
        `destination=${destination}&` +
        `mode=driving&` +
        `traffic_model=best_guess&` +
        `departure_time=now&` +
        `key=${googleMapsApiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes?.[0]) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        setRouteData({
          polyline: route.overview_polyline.points,
          bounds: route.bounds
        });
        
        setEta({
          text: leg.duration_in_traffic?.text || leg.duration.text,
          value: leg.duration_in_traffic?.value || leg.duration.value,
          inTraffic: !!leg.duration_in_traffic
        });
        
        setDistance({
          text: leg.distance.text,
          value: leg.distance.value
        });
        
        console.log('✅ Route data updated:', {
          duration: leg.duration.text,
          distance: leg.distance.text
        });
      } else {
        throw new Error(data.error_message || 'No route found');
      }
    } catch (error) {
      console.error('❌ Error fetching route:', error);
      setError('Failed to load route information');
    }
  }, [pickup, dropoff, riderLocation, googleMapsApiKey]);

  // Set up route fetching with periodic updates
  useEffect(() => {
    if (!pickup || !dropoff) return;

    // Initial fetch
    fetchRouteAndETA();
    
    // Update every 7 seconds as specified
    const interval = setInterval(fetchRouteAndETA, 7000);
    
    return () => clearInterval(interval);
  }, [fetchRouteAndETA]);

  // Calculate map center and zoom
  const getMapCenter = useCallback(() => {
    if (riderLocation) {
      return riderLocation;
    } else if (pickup) {
      return pickup;
    }
    return defaultCenter;
  }, [riderLocation, pickup, defaultCenter]);

  const getMapZoom = useCallback(() => {
    if (riderLocation && dropoff) {
      // Calculate zoom based on distance between points
      const distance = Math.abs(riderLocation.lat - dropoff.lat) + Math.abs(riderLocation.lng - dropoff.lng);
      if (distance < 0.01) return 16; // Very close
      if (distance < 0.05) return 14; // Close
      if (distance < 0.1) return 12;  // Medium
      return 10; // Far
    }
    return 13; // Default zoom
  }, [riderLocation, dropoff]);

  // Decode and render route points
  const routePoints = routeData ? decodePolyline(routeData.polyline) : [];
  const sampledRoutePoints = routePoints.filter((_, index) => index % 5 === 0); // Sample every 5th point for performance

  if (loading) {
    return (
      <div className={`map-tracking loading ${className}`} style={{ height }}>
        <div className="map-loading">
          <div className="loading-spinner"></div>
          <p>Loading live tracking...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`map-tracking error ${className}`} style={{ height }}>
        <div className="map-error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`map-tracking ${className}`} style={{ height }}>
      <GoogleMapReact
        bootstrapURLKeys={{ 
          key: googleMapsApiKey,
          libraries: ['geometry', 'places']
        }}
        center={getMapCenter()}
        zoom={getMapZoom()}
        options={{
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: false,
          fullscreenControl: true
        }}
      >
        {/* Route Points */}
        {sampledRoutePoints.map((point, index) => (
          <RoutePoint
            key={index}
            lat={point.lat}
            lng={point.lng}
            isFirst={index === 0}
            isLast={index === sampledRoutePoints.length - 1}
          />
        ))}

        {/* Pickup Marker */}
        {pickup && (
          <PickupMarker lat={pickup.lat} lng={pickup.lng} />
        )}

        {/* Dropoff Marker */}
        {dropoff && (
          <DropoffMarker lat={dropoff.lat} lng={dropoff.lng} />
        )}

        {/* Rider Marker */}
        {riderLocation && (
          <RiderMarker lat={riderLocation.lat} lng={riderLocation.lng} />
        )}
      </GoogleMapReact>

      {/* ETA Banner */}
      {showETA && (eta || distance) && (
        <div className="eta-banner">
          <div className="eta-content">
            {eta && (
              <div className="eta-item">
                <span className="eta-icon">⏱️</span>
                <span className="eta-label">ETA:</span>
                <span className="eta-value">{eta.text}</span>
                {eta.inTraffic && <span className="traffic-indicator">📊</span>}
              </div>
            )}
            {distance && (
              <div className="distance-item">
                <span className="distance-icon">📏</span>
                <span className="distance-value">{distance.text}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Live Indicator */}
      {riderLocation && (
        <div className="live-indicator">
          <div className="live-dot"></div>
          <span>LIVE</span>
        </div>
      )}
    </div>
  );
}