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

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { onValue, ref } from "firebase/database";
import { database, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Helmet } from "react-helmet-async";
import toast, { Toaster } from "react-hot-toast";
import { useNotification } from "../contexts/NotificationContext.jsx";
import RealTimeProgressBar from "../components/RealTimeProgressBar.jsx";
import { locationService } from "../services/enhancedLocationService.js";
import DeliverySheet from "../components/DeliverySheet.jsx";
import "./TrackDelivery.css";

export default function TrackDelivery() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { notify, riderAssigned, riderEnroute, packagePickedUp, riderDelivering, delivered, requestPushPermission, fcmSupported } = useNotification();
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  
  const [bookingData, setBookingData] = useState(null);
  const [pickupCoords, setPickupCoords] = useState([7.1475, 3.3619]); // Default Abeokuta
  const [dropoffCoords, setDropoffCoords] = useState([7.155, 3.350]); // Default Abeokuta
  
  // NEW: Live Rider Assignment & ETA Tracker State
  const [rider, setRider] = useState(null);
  const [riderMarker, setRiderMarker] = useState(null);
  const [assignmentStatus, setAssignmentStatus] = useState("Assigning Rider...");
  const [liveEta, setLiveEta] = useState("Calculating...");
  const [pickupZone] = useState("Kuto"); // Extract from pickup coords
  const [dropZone] = useState("Ibara"); // Extract from dropoff coords
  
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
  const [tileError, setTileError] = useState(false);
  
  // NEW: Live location tracking with street names
  const [currentLocation, setCurrentLocation] = useState({
    street: 'Getting location...',
    neighborhood: '',
    city: 'Lagos',
    formattedAddress: 'Locating rider...',
    lastUpdated: null
  });
  const [locationHistory, setLocationHistory] = useState([]);
  const [movementStatus, setMovementStatus] = useState('stationary');
  
  // Map zoom state for DeliverySheet integration
  const [mapZoom, setMapZoom] = useState('normal');

  // NEW: Fake assignRider function (simulating real dispatch logic)
  async function assignRider(pickupZone) {
    const availableRiders = [
      { name: "Sola", zone: "Kuto", lat: 7.139, lng: 3.349 },
      { name: "David", zone: "Camp", lat: 7.200, lng: 3.400 },
      { name: "Bisi", zone: "Ibara", lat: 7.160, lng: 3.340 },
      { name: "Tunde", zone: "Oke-Ilewo", lat: 7.130, lng: 3.360 },
      { name: "Kemi", zone: "Adatan", lat: 7.180, lng: 3.320 }
    ];

    // Pick the closest rider to pickupZone
    const assignedRider = availableRiders.find(r => r.zone === pickupZone) || availableRiders[0];
    
    console.log(`🏍️ [Rider Assignment] Assigning ${assignedRider.name} from ${assignedRider.zone} zone`);
    
    setRider(assignedRider);
    setAssignmentStatus(`Rider assigned: ${assignedRider.name} from ${assignedRider.zone}`);
    setLiveEta(`${Math.floor(Math.random() * 10) + 5} mins`);
    
    // Update main riderInfo for card display
    setRiderInfo(prev => ({
      ...prev,
      name: assignedRider.name,
      zone: assignedRider.zone
    }));

    // Trigger Go7 notification
    riderAssigned(assignedRider.name, assignedRider.zone);
    
    return assignedRider;
  }

  // Fetch booking data from Firestore
  useEffect(() => {
    const fetchBooking = async () => {
      if (!orderId) {
        console.error("❌ No order ID provided");
        toast.error("No order ID found");
        setIsLoading(false);
        return;
      }

      try {
        console.log("🔍 Fetching booking:", orderId);
        
        // Try to fetch by document ID first
        const bookingRef = doc(db, "bookings", orderId);
        let bookingSnap = await getDoc(bookingRef);
        
        // If not found by document ID, search by bookingId field
        if (!bookingSnap.exists()) {
          console.log("ℹ️ Not found by document ID, searching by bookingId field...");
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const bookingsRef = collection(db, "bookings");
          const q = query(bookingsRef, where("bookingId", "==", orderId));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            console.error("❌ Booking not found:", orderId);
            toast.error("Order not found. Please check your order ID.");
            setIsLoading(false);
            return;
          }
          
          bookingSnap = querySnapshot.docs[0];
          console.log("✅ Found by bookingId field!");
        }

        const data = bookingSnap.data();
        console.log("✅ Booking data:", data);
        setBookingData(data);

        // Set coordinates from booking data
        if (data.pickup?.coordinates) {
          setPickupCoords([data.pickup.coordinates.lat, data.pickup.coordinates.lng]);
        }
        if (data.dropoff?.coordinates) {
          setDropoffCoords([data.dropoff.coordinates.lat, data.dropoff.coordinates.lng]);
        }

        // Set status and rider info if available
        if (data.status) {
          setStatus(data.status);
        }
        if (data.riderName) {
          setRiderInfo(prev => ({
            ...prev,
            name: data.riderName,
            phone: data.riderPhone || prev.phone
          }));
        }

        setIsLoading(false);
      } catch (error) {
        console.error("❌ Error fetching booking:", error);
        toast.error("Failed to load order details");
        setIsLoading(false);
      }
    };

    fetchBooking();
  }, [orderId]);

  // Initialize map
  useEffect(() => {
    const initializeMap = () => {
      const mapElement = document.getElementById("go7-tracking-map");
      
      if (!mapElement) {
        console.error("❌ [TrackDelivery] Map element not found!");
        return;
      }

      if (mapInstanceRef.current) {
        console.log("ℹ️ [TrackDelivery] Map already initialized");
        return;
      }

      console.log("🗺️ [TrackDelivery] Initializing map...");
      console.log("📍 Map element dimensions:", {
        width: mapElement.offsetWidth,
        height: mapElement.offsetHeight
      });

      try {
        // Calculate center point between pickup and dropoff
        const centerLat = (pickupCoords[0] + dropoffCoords[0]) / 2;
        const centerLng = (pickupCoords[1] + dropoffCoords[1]) / 2;
        const centerPoint = [centerLat, centerLng];

        // Initialize map centered between pickup and dropoff
        mapInstanceRef.current = L.map("go7-tracking-map", {
          center: centerPoint,
          zoom: 13,
          zoomControl: false,
          attributionControl: false
        });

        console.log("✅ [TrackDelivery] Map instance created, centered at:", centerPoint);

        // Get MapTiler API key from environment
        const maptilerKey = import.meta.env.VITE_MAPTILER_API_KEY || 'qRlb1fwa9OgPpla4WO3q';
        
        // Primary: MapTiler Streets v2 tile layer
        const maptilerLayer = L.tileLayer(
          `https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=${maptilerKey}`,
          {
            attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; OpenStreetMap contributors',
            maxZoom: 20,
            tileSize: 256
          }
        );

        // Fallback: OpenStreetMap tile layer
        const osmLayer = L.tileLayer(
          "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19
          }
        );

        // Track tile loading success/failure
        let tilesLoaded = false;
        let tileErrorCount = 0;

        maptilerLayer.on('load', () => {
          console.log("✅ [TrackDelivery] MapTiler tiles loaded successfully");
          tilesLoaded = true;
          setTileError(false);
        });

        maptilerLayer.on('tileload', () => {
          if (!tilesLoaded) {
            console.log("🔄 [TrackDelivery] MapTiler tiles loading...");
          }
        });

        maptilerLayer.on('tileerror', (error) => {
          tileErrorCount++;
          console.error(`❌ [TrackDelivery] MapTiler tile error #${tileErrorCount}:`, error);
          
          // Switch to fallback after 3 errors
          if (tileErrorCount >= 3 && !tilesLoaded) {
            console.warn("⚠️ [TrackDelivery] Switching to OpenStreetMap fallback...");
            mapInstanceRef.current.removeLayer(maptilerLayer);
            osmLayer.addTo(mapInstanceRef.current);
            setTileError(true);
            toast.error("Using backup map tiles", { duration: 3000, icon: "🗺️" });
          }
        });

        // Add primary MapTiler layer
        maptilerLayer.addTo(mapInstanceRef.current);
        console.log("✅ [TrackDelivery] MapTiler tile layer added");

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
        console.log("✅ [TrackDelivery] Map initialization complete");
      } catch (error) {
        console.error("❌ [TrackDelivery] Map initialization failed:", error);
        setIsLoading(false);
      }
    };

    // Initialize map with small delay to ensure DOM is ready
    const timer = setTimeout(initializeMap, 100);
    
    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [pickupCoords, dropoffCoords]);

  // NEW: Auto-assign rider once pickup and drop zones are confirmed
  useEffect(() => {
    if (pickupZone && dropZone && !rider) {
      console.log(`🎯 [Auto Assignment] Pickup: ${pickupZone}, Drop: ${dropZone}`);
      
      // Small delay to ensure map is initialized
      const assignmentTimer = setTimeout(() => {
        assignRider(pickupZone);
      }, 2000);
      
      return () => clearTimeout(assignmentTimer);
    }
  }, [pickupZone, dropZone, rider]);

  // NEW: Spawn rider marker and animate fake movement
  useEffect(() => {
    if (mapInstanceRef.current && rider && pickupCoords && dropoffCoords) {
      console.log(`🏍️ [Rider Animation] Starting for ${rider.name}`);
      
      // Remove existing rider marker if any
      if (riderMarker && mapInstanceRef.current.hasLayer(riderMarker)) {
        mapInstanceRef.current.removeLayer(riderMarker);
      }

      // Create new Go7-styled rider marker with scooter icon
      const riderIcon = L.icon({
        iconUrl: '/assets/go7-bike.png',
        iconSize: [35, 35],
        iconAnchor: [17, 35],
        popupAnchor: [0, -35],
        className: 'live-rider-icon'
      });

      const marker = L.marker([rider.lat, rider.lng], {
        icon: riderIcon,
        zIndexOffset: 1000
      }).addTo(mapInstanceRef.current);

      // Add rider name tooltip
      marker.bindTooltip(rider.name, {
        permanent: true,
        direction: 'bottom',
        offset: [0, 10],
        className: 'rider-name-tooltip'
      });

      setRiderMarker(marker);
      console.log(`✅ [Rider Animation] Marker created for ${rider.name}`);

      // Fake motion toward pickup then drop-off
      let step = 0;
      const totalSteps = 100; // Animation smoothness
      const interval = setInterval(() => {
        step += 1;
        
        if (step > totalSteps) {
          clearInterval(interval);
          console.log(`🎯 [Rider Animation] ${rider.name} reached destination`);
          return;
        }
        
        // Calculate progress (0 to 1)
        const progress = step / totalSteps;
        
        // First half: move to pickup, second half: move to drop-off
        let targetLat, targetLng;
        if (progress <= 0.5) {
          // Moving to pickup (0 to 0.5 progress)
          const pickupProgress = progress * 2; // 0 to 1
          targetLat = rider.lat + (pickupCoords[0] - rider.lat) * pickupProgress;
          targetLng = rider.lng + (pickupCoords[1] - rider.lng) * pickupProgress;
        } else {
          // Moving to drop-off (0.5 to 1 progress)  
          const dropProgress = (progress - 0.5) * 2; // 0 to 1
          targetLat = pickupCoords[0] + (dropoffCoords[0] - pickupCoords[0]) * dropProgress;
          targetLng = pickupCoords[1] + (dropoffCoords[1] - pickupCoords[1]) * dropProgress;
        }
        
        marker.setLatLng([targetLat, targetLng]);
        
        // Update ETA based on progress
        const remainingTime = Math.max(1, Math.floor((totalSteps - step) / 8));
        setLiveEta(`${remainingTime} mins`);
        
      }, 1500); // Update every 1.5 seconds for smooth animation

    }
  }, [rider, pickupCoords, dropoffCoords]);

  // NEW: Progressive status updates with Go7 notifications
  useEffect(() => {
    if (rider) {
      console.log(`📝 [Status Updates] Starting for ${rider.name}`);
      
      const statusTimeline = [
        { 
          delay: 4000, 
          status: `${rider.name} is en route to pickup`, 
          eta: `${Math.floor(Math.random() * 3) + 3} mins`,
          notification: () => riderEnroute(rider.name)
        },
        { 
          delay: 10000, 
          status: `${rider.name} has picked up your order`, 
          eta: `${Math.floor(Math.random() * 5) + 8} mins`,
          notification: () => packagePickedUp(rider.name)
        },
        { 
          delay: 15000, 
          status: `${rider.name} is delivering to destination`, 
          eta: `${Math.floor(Math.random() * 3) + 2} mins`,
          notification: () => riderDelivering(rider.name, `${Math.floor(Math.random() * 3) + 2} mins`)
        },
        { 
          delay: 22000, 
          status: "Delivered ✅", 
          eta: "0 mins",
          notification: () => delivered()
        }
      ];

      const timeouts = statusTimeline.map(({ delay, status, eta, notification }) => 
        setTimeout(() => {
          setAssignmentStatus(status);
          setLiveEta(eta);
          
          // Trigger Go7 notification
          notification();
          
          console.log(`📱 [Status] ${status} (ETA: ${eta})`);
        }, delay)
      );

      // Cleanup timeouts on unmount
      return () => timeouts.forEach(clearTimeout);
    }
  }, [rider, riderEnroute, packagePickedUp, riderDelivering, delivered]);

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
      
      // NEW: Track location history and movement
      setLocationHistory(prev => {
        const newHistory = [...prev, { ...newPos, timestamp: Date.now() }];
        return newHistory.slice(-10); // Keep last 10 positions
      });
      
      // NEW: Get street name and address information
      locationService.debouncedGeocode(newPos.lat, newPos.lng, (locationInfo) => {
        console.log("🏠 [Location] Address resolved:", locationInfo.street);
        setCurrentLocation({
          ...locationInfo,
          lastUpdated: new Date().toLocaleTimeString()
        });
      });
      
      // NEW: Calculate movement status
      if (locationHistory.length > 0) {
        const previousPos = locationHistory[locationHistory.length - 1];
        const timeElapsed = (Date.now() - previousPos.timestamp) / 1000; // seconds
        const movement = locationService.getMovementStatus(newPos, previousPos, timeElapsed);
        setMovementStatus(movement);
      }
      
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

  // NEW: Movement status helper functions
  function getMovementIcon(movementStatus) {
    const icons = {
      stationary: "🛑",
      walking: "🚶",
      cycling: "🚴",
      driving: "🏍️",
      fast_driving: "🏍️💨"
    };
    return icons[movementStatus] || "📍";
  }

  function getMovementText(movementStatus) {
    const texts = {
      stationary: "Stopped",
      walking: "Walking", 
      cycling: "Cycling",
      driving: "Driving",
      fast_driving: "Fast"
    };
    return texts[movementStatus] || "Moving";
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

  // Handle map zoom changes when sheet expands/collapses
  const handleMapZoomChange = useCallback((sheetState) => {
    setMapZoom(sheetState);
    
    // Adjust map view based on sheet state
    if (mapInstanceRef.current && riderPos) {
      const map = mapInstanceRef.current;
      
      if (sheetState === 'expanded') {
        // Zoom out and center higher when sheet is expanded
        map.setView([riderPos.lat + 0.01, riderPos.lng], 13, { animate: true });
      } else {
        // Zoom in and center normally when sheet is collapsed
        map.setView([riderPos.lat, riderPos.lng], 15, { animate: true });
      }
    }
    
    console.log('🗺️ Map zoom adjusted for sheet state:', sheetState);
  }, [riderPos]);

  const handleTestFCM = async () => {
    try {
      const token = await requestPushPermission();
      if (token) {
        notify('🎯 FCM enabled! You can now receive push notifications even when the app is closed.', 'success', 5000);
        
        // Test notification after a delay
        setTimeout(() => {
          notify('🧪 This is a test push notification!', 'info', 4000);
        }, 2000);
      } else {
        notify('❌ Failed to enable push notifications. Please check your browser settings.', 'error');
      }
    } catch (error) {
      console.error('FCM test error:', error);
      notify('❌ Error testing FCM notifications', 'error');
    }
  };

  return (
    <>
      <Helmet>
        <title>Track Delivery - {orderId || 'Go7'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>

      <Toaster position="top-center" />

      {/* Show error state if no booking data after loading */}
      {!isLoading && !bookingData && (
        <div className="track-delivery-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center' }}>
          <div>
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#E30613' }}>Order Not Found</h2>
            <p style={{ marginBottom: '24px', color: '#666' }}>
              We couldn't find an order with ID: <strong>{orderId}</strong>
            </p>
            <button
              onClick={() => navigate('/book')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#E30613',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Book a Delivery
            </button>
          </div>
        </div>
      )}

      {/* Show tracking UI only if booking exists */}
      {(isLoading || bookingData) && (
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

        {/* NEW: Live Rider Assignment Status Card */}
        {rider && (
          <div className="rider-status">
            <h5>{assignmentStatus}</h5>
            <p>ETA: {liveEta}</p>
          </div>
        )}

        {/* Map Container */}
        <div id="go7-tracking-map" className="tracking-map"></div>

        {/* NEW: Live Location Overlay */}
        {riderPos && currentLocation.street !== 'Getting location...' && (
          <div className="live-location-overlay">
            <div className="location-header">
              <div className="location-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5"/>
                </svg>
              </div>
              <div className="location-status">
                <span className="movement-badge movement-${movementStatus}">
                  {getMovementIcon(movementStatus)} {getMovementText(movementStatus)}
                </span>
              </div>
            </div>
            
            <div className="location-details">
              <div className="street-name">{currentLocation.street}</div>
              {currentLocation.neighborhood && (
                <div className="neighborhood">{currentLocation.neighborhood}</div>
              )}
              <div className="coordinates">
                {riderPos.lat.toFixed(6)}, {riderPos.lng.toFixed(6)}
              </div>
            </div>
            
            <div className="location-footer">
              <span className="last-updated">Updated {currentLocation.lastUpdated}</span>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Loading tracking info...</p>
          </div>
        )}

        {/* Real-Time Transit Progress Bar */}
        <RealTimeProgressBar
          status={status}
          eta={eta}
          riderName={riderInfo.name}
          riderZone={riderInfo.zone}
          pickupZone={pickupZone}
          dropZone={dropZone}
          distance={distance}
          orderItems={bookingData?.items || []}
          onCallRider={handleCallRider}
          isActive={!isLoading && status !== 'delivered'}
        />

        {/* Modern Draggable Bottom Sheet */}
        <DeliverySheet 
          delivery={{
            id: orderId,
            status: status,
            eta: eta,
            pickupAddress: bookingData?.pickup?.fullAddress || "Restaurant Location",
            dropoffAddress: bookingData?.destination?.fullAddress || currentLocation.formattedAddress,
            orderItems: bookingData?.items?.map(item => ({
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })) || []
          }}
          rider={{
            name: riderInfo.name,
            phone: riderInfo.phone,
            photoURL: riderInfo.photo || "/api/placeholder/56/56",
            rating: riderInfo.rating,
            deliveries: "150+"
          }}
          onMapZoomChange={handleMapZoomChange}
        />
        </div>
      )}
    </>
  );
}
