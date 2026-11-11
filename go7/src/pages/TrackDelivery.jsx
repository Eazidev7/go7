// ========================================
// GO7 UBER-STYLE REAL-TIME DELIVERY TRACKING
// ========================================
// Clean, modern tracking screen with:
// - White/grey minimal map background
// - Pickup + Drop-off markers
// - Red route line (OSRM powered)
// - Rider marker that moves live via Firebase
// - Auto-calculated ETA + distance (OSRM - no Google billing)
// - Floating bottom card with rider info
// - Toast notifications for status changes
// ========================================

import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { onValue, ref } from "firebase/database";
import { database } from "../config/firebase";
import { Helmet } from "react-helmet-async";
import toast, { Toaster } from "react-hot-toast";
import "./TrackDelivery.css";

export default function TrackDelivery() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  
  const [pickupCoords] = useState([7.1475, 3.3619]); // Abeokuta pickup
  const [dropoffCoords] = useState([7.155, 3.350]); // Abeokuta dropoff
  
  const [riderInfo, setRiderInfo] = useState({
    name: "Akeem",
    rating: 4.9,
    phone: "+234 801 234 5678",
    vehicle: "Honda CRF 250L",
    plateNumber: "ABC-123-XY"
  });
  
  const [eta, setEta] = useState("Calculating...");
  const [distance, setDistance] = useState("--");
  const [status, setStatus] = useState("rider_assigned"); // rider_assigned, picked_up, on_the_way, near_destination, delivered
  const [riderPos, setRiderPos] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize map
  useEffect(() => {
    if (!mapInstanceRef.current && document.getElementById("go7-tracking-map")) {
      console.log("🗺️ [TrackDelivery] Initializing map...");
      
      mapInstanceRef.current = L.map("go7-tracking-map", {
        zoomControl: false,
        attributionControl: false
      }).setView(pickupCoords, 14);

      // Clean, minimal tile layer (Humanitarian style)
      L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(mapInstanceRef.current);

      // Add zoom control to bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current);

      // Pickup marker (green circle with icon)
      const pickupIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="marker-container pickup-marker">
            <div class="marker-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="marker-label">Pickup</div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 50]
      });

      // Dropoff marker (red circle with icon)
      const dropoffIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div class="marker-container dropoff-marker">
            <div class="marker-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div class="marker-label">Drop-off</div>
          </div>
        `,
        iconSize: [40, 50],
        iconAnchor: [20, 50]
      });

      L.marker(pickupCoords, { icon: pickupIcon }).addTo(mapInstanceRef.current);
      L.marker(dropoffCoords, { icon: dropoffIcon }).addTo(mapInstanceRef.current);

      // Fetch and draw OSRM route
      fetchOSRMRoute(pickupCoords, dropoffCoords);

      setIsLoading(false);
      console.log("✅ [TrackDelivery] Map initialized");
    }
  }, [pickupCoords, dropoffCoords]);

  // Fetch OSRM route and draw on map
  async function fetchOSRMRoute(start, end) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        
        // Draw route line
        if (routeLineRef.current) {
          mapInstanceRef.current.removeLayer(routeLineRef.current);
        }
        
        routeLineRef.current = L.polyline(coords, {
          color: "#E53935",
          weight: 4,
          opacity: 0.8,
          dashArray: "8, 12",
          lineJoin: "round",
          lineCap: "round"
        }).addTo(mapInstanceRef.current);

        // Fit map to show entire route
        mapInstanceRef.current.fitBounds(routeLineRef.current.getBounds(), {
          padding: [80, 80]
        });

        console.log(`🛣️ [OSRM] Route fetched: ${(route.distance / 1000).toFixed(1)} km, ${Math.round(route.duration / 60)} min`);
      }
    } catch (error) {
      console.error("❌ [OSRM] Route fetch failed:", error);
      // Fallback: draw straight line
      const straightLine = L.polyline([start, end], {
        color: "#E53935",
        weight: 4,
        opacity: 0.6,
        dashArray: "8, 12"
      }).addTo(mapInstanceRef.current);
      
      mapInstanceRef.current.fitBounds(straightLine.getBounds(), {
        padding: [80, 80]
      });
    }
  }

  // Calculate ETA using OSRM
  async function calculateETA(startPos, endPos) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startPos.lng},${startPos.lat};${endPos.lng},${endPos.lat}?overview=false`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const minutes = Math.round(route.duration / 60);
        const km = (route.distance / 1000).toFixed(1);
        
        setEta(`${minutes} min`);
        setDistance(`${km} km`);
        
        console.log(`⏱️ [ETA] ${minutes} min, ${km} km`);
      }
    } catch (error) {
      console.error("❌ [ETA] Calculation failed:", error);
      setEta("--");
      setDistance("--");
    }
  }

  // Smooth marker animation
  function animateMarker(marker, fromLatLng, toLatLng, duration = 1500) {
    const startTime = performance.now();
    
    function frame(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth movement
      const easeProgress = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      
      const lat = fromLatLng.lat + (toLatLng.lat - fromLatLng.lat) * easeProgress;
      const lng = fromLatLng.lng + (toLatLng.lng - fromLatLng.lng) * easeProgress;
      
      marker.setLatLng([lat, lng]);
      
      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    }
    
    requestAnimationFrame(frame);
  }

  // Firebase real-time listener for rider location
  useEffect(() => {
    if (!database || !orderId) {
      console.warn("⚠️ [Firebase] No database or orderId available");
      return;
    }

    console.log(`🔥 [Firebase] Listening to: orders/${orderId}/riderLocation`);
    
    const locationRef = ref(database, `orders/${orderId}/riderLocation`);
    
    const unsubscribe = onValue(locationRef, (snapshot) => {
      const locationData = snapshot.val();
      
      if (!locationData || !locationData.lat || !locationData.lng) {
        console.warn("⚠️ [Firebase] No location data available");
        return;
      }

      console.log("📍 [Firebase] Rider location updated:", locationData);
      
      const newPos = { lat: locationData.lat, lng: locationData.lng };
      
      // Create or update rider marker
      if (!riderMarkerRef.current) {
        // Create rider marker
        const riderIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="marker-container rider-marker">
              <div class="rider-pulse"></div>
              <div class="marker-icon rider-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </div>
            </div>
          `,
          iconSize: [50, 50],
          iconAnchor: [25, 25]
        });
        
        riderMarkerRef.current = L.marker([newPos.lat, newPos.lng], {
          icon: riderIcon,
          zIndexOffset: 1000
        }).addTo(mapInstanceRef.current);
        
        console.log("✅ [Rider] Marker created");
      } else {
        // Animate existing marker to new position
        const currentPos = riderMarkerRef.current.getLatLng();
        animateMarker(riderMarkerRef.current, currentPos, L.latLng(newPos.lat, newPos.lng));
        
        console.log("🎬 [Rider] Marker animated to new position");
      }
      
      // Update state
      setRiderPos(newPos);
      
      // Recalculate ETA
      calculateETA(newPos, { lat: dropoffCoords[0], lng: dropoffCoords[1] });
      
      // Update rider info if provided
      if (locationData.name) setRiderInfo(prev => ({ ...prev, name: locationData.name }));
      if (locationData.rating) setRiderInfo(prev => ({ ...prev, rating: locationData.rating }));
      
      // Update status and show toast if changed
      if (locationData.status && locationData.status !== status) {
        const prevStatus = status;
        setStatus(locationData.status);
        showStatusToast(locationData.status, prevStatus);
      }
      
      // Pan map to keep rider in view
      mapInstanceRef.current.panTo([newPos.lat, newPos.lng], {
        animate: true,
        duration: 1
      });
      
    }, (error) => {
      console.error("❌ [Firebase] Listener error:", error);
      toast.error("Failed to connect to live tracking");
    });

    return () => {
      console.log("🔥 [Firebase] Unsubscribing from location updates");
      unsubscribe();
    };
  }, [orderId, status, dropoffCoords]);

  // Show toast notification on status change
  function showStatusToast(newStatus, prevStatus) {
    const statusMessages = {
      rider_assigned: "🏍️ Rider assigned to your order",
      picked_up: "✅ Package picked up!",
      on_the_way: "🚀 Rider is on the way",
      near_destination: "📍 Rider is nearby! Get ready",
      delivered: "🎉 Package delivered successfully!"
    };
    
    const message = statusMessages[newStatus] || "Status updated";
    
    if (prevStatus !== newStatus) {
      toast.success(message, {
        duration: 4000,
        icon: getStatusIcon(newStatus),
        style: {
          background: '#fff',
          color: '#1f2937',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }
      });
    }
  }

  function getStatusIcon(statusCode) {
    const icons = {
      rider_assigned: "🏍️",
      picked_up: "✅",
      on_the_way: "🚀",
      near_destination: "📍",
      delivered: "🎉"
    };
    return icons[statusCode] || "📦";
  }

  function getStatusText(statusCode) {
    const texts = {
      rider_assigned: "Rider Assigned",
      picked_up: "Package Picked Up",
      on_the_way: "On the Way",
      near_destination: "Nearby",
      delivered: "Delivered"
    };
    return texts[statusCode] || "Tracking...";
  }

  function getStatusColor(statusCode) {
    const colors = {
      rider_assigned: "#3b82f6",
      picked_up: "#f59e0b",
      on_the_way: "#8b5cf6",
      near_destination: "#10b981",
      delivered: "#22c55e"
    };
    return colors[statusCode] || "#6b7280";
  }

  const handleCallRider = () => {
    toast.success(`📞 Calling ${riderInfo.name}...`, {
      duration: 3000
    });
    // In production, trigger actual phone call
    // window.location.href = `tel:${riderInfo.phone}`;
  };

  const handleChatRider = () => {
    navigate(`/chat/${orderId}`);
  };

  return (
    <>
      <Helmet>
        <title>Track Delivery - {orderId || 'Go7'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>

      <Toaster position="top-center" />

      <div className="track-delivery-container">
        {/* Back Button */}
        <button 
          className="back-button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Status Bar */}
        <div className="status-bar">
          <div className="status-indicator" style={{ backgroundColor: getStatusColor(status) }}>
            <span className="status-pulse"></span>
          </div>
          <span className="status-text">{getStatusText(status)}</span>
        </div>

        {/* Order ID Badge */}
        {orderId && (
          <div className="order-id-badge">
            <span className="order-label">Order</span>
            <span className="order-number">{orderId}</span>
          </div>
        )}

        {/* Map Container */}
        <div id="go7-tracking-map" className="tracking-map"></div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading tracking info...</p>
          </div>
        )}

        {/* Floating Info Card */}
        <div className="tracking-info-card">
          {/* Rider Info */}
          <div className="rider-info">
            <div className="rider-avatar">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
              </svg>
            </div>
            <div className="rider-details">
              <h3 className="rider-name">{riderInfo.name}</h3>
              <div className="rider-rating">
                <span className="star">⭐</span>
                <span className="rating-value">{riderInfo.rating}</span>
              </div>
            </div>
            <div className="rider-vehicle">
              <span className="vehicle-icon">🏍️</span>
              <span className="plate-number">{riderInfo.plateNumber}</span>
            </div>
          </div>

          {/* ETA & Distance */}
          <div className="delivery-stats">
            <div className="stat-item">
              <div className="stat-icon">⏱️</div>
              <div className="stat-content">
                <span className="stat-label">Estimated Arrival</span>
                <span className="stat-value">{eta}</span>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-icon">📍</div>
              <div className="stat-content">
                <span className="stat-label">Distance</span>
                <span className="stat-value">{distance}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="action-btn call-btn" onClick={handleCallRider}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Call Rider
            </button>
            <button className="action-btn chat-btn" onClick={handleChatRider}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Message
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
