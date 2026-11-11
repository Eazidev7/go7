import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { haversineKm } from "../utils/distance";
import { formatDistance, currencyFormatNGN } from "../utils/pricing";
import DeliveryStatusTimeline from "../components/DeliveryStatusTimeline";
import { useRealTimeTracking } from "../hooks/useRealTimeTracking";
import { formatDuration, getEstimatedArrival } from "../utils/directions";
import api from "../api";
import MapTracking from "../components/MapTracking";
import {
  normalizeTrackingId,
  subscribeToBookingByTrackingId,
} from "../utils/bookingTracking";
import {
  showRiderStarted,
  showPickupComplete,
  showHalfwayPoint,
  showNearDestination,
  showDeliveryComplete
} from '../utils/notifications';
import {
  animateMarker,
  createScooterMarker,
  snapToRoute,
  ETACountdown,
  StatusCard
} from '../components/RiderTracking';
import { subscribeToRiderLocation } from '../services/riderTracking';
import { ref, onValue, set } from 'firebase/database';
import { database } from '../firebase/config';
import { db } from '../firebase/config';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Rider tracking utilities
const createRiderTracking = (riderId, initialLat, initialLng) => {
  const riderRef = ref(database, `riders/${riderId}`);
  set(riderRef, {
    id: riderId,
    name: `Rider ${riderId}`,
    lat: initialLat,
    lng: initialLng,
    status: BOOKING_STATUSES.ASSIGNED,
    lastUpdated: Date.now()
  });
  return riderRef;
};

const updateRiderLocation = (riderRef, { lat, lng, status = null }) => {
  set(riderRef, {
    lat,
    lng,
    status: status || BOOKING_STATUSES.ENROUTE_PICKUP,
    lastUpdated: Date.now()
  }, { merge: true });
};

// Calculate bearing between two points
const calculateBearing = (startLat, startLng, endLat, endLng) => {
  const startLatRad = startLat * Math.PI / 180;
  const startLngRad = startLng * Math.PI / 180;
  const endLatRad = endLat * Math.PI / 180;
  const endLngRad = endLng * Math.PI / 180;

  const y = Math.sin(endLngRad - startLngRad) * Math.cos(endLatRad);
  const x = Math.cos(startLatRad) * Math.sin(endLatRad) -
    Math.sin(startLatRad) * Math.cos(endLatRad) * Math.cos(endLngRad - startLngRad);

  const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  return bearing;
};

// Icons and helpers
const ArrowLeft = ({ className = "" }) => <span className={`${className} inline-block`}>←</span>;
const Clock = () => <span className="mr-1">⏱️</span>;
const Phone = () => <span className="mr-1">📞</span>;
const Chat = () => <span className="mr-1">💬</span>;
const Share = () => <span className="mr-1">📤</span>;
const Cancel = () => <span className="mr-1">❌</span>;

// Status constants
const BOOKING_STATUSES = {
  PENDING: "pending",
  ASSIGNED: "assigned",
  ENROUTE_PICKUP: "enroute_pickup",
  PICKED_UP: "picked_up",
  ENROUTE_DROPOFF: "enroute_dropoff",
  DELIVERED: "delivered",
  CANCELLED: "cancelled"
};

// Status display info
const STATUS_INFO = {
  [BOOKING_STATUSES.PENDING]: {
    label: "Pending",
    description: "Finding a rider for your delivery",
    icon: "⏳"
  },
  searching_rider: {
    label: "Finding Rider",
    description: "Our team has been notified. A rider will be assigned shortly.",
    icon: "🔍"
  },
  [BOOKING_STATUSES.ASSIGNED]: {
    label: "Assigned",
    description: "Rider has been assigned to your delivery",
    icon: "🛵"
  },
  [BOOKING_STATUSES.ENROUTE_PICKUP]: {
    label: "En Route to Pickup",
    description: "Rider is heading to pickup location",
    icon: "🏃"
  },
  [BOOKING_STATUSES.PICKED_UP]: {
    label: "Picked Up",
    description: "Rider has picked up your package",
    icon: "📦"
  },
  [BOOKING_STATUSES.ENROUTE_DROPOFF]: {
    label: "En Route to Dropoff",
    description: "Rider is heading to dropoff location",
    icon: "🚚"
  },
  [BOOKING_STATUSES.DELIVERED]: {
    label: "Delivered",
    description: "Package has been delivered",
    icon: "✅"
  },
  [BOOKING_STATUSES.CANCELLED]: {
    label: "Cancelled",
    description: "This delivery has been cancelled",
    icon: "❌"
  }
};

// Helper to calculate ETA based on distance and speed
const calculateETA = (distanceKm, speedKmh = 20) => {
  if (!distanceKm) return null;
  const timeHours = distanceKm / speedKmh;
  const timeMinutes = Math.ceil(timeHours * 60);
  return timeMinutes;
};

// Route snapping utilities (imported from RiderTracking components)

// Snap point to route segment
const snapToSegment = (pLat, pLng, aLat, aLng, bLat, bLng) => {
  const A = { lat: aLat, lng: aLng };
  const B = { lat: bLat, lng: bLng };
  const P = { lat: pLat, lng: pLng };

  const AB = {
    lat: B.lat - A.lat,
    lng: B.lng - A.lng
  };

  const AP = {
    lat: P.lat - A.lat,
    lng: P.lng - A.lng
  };

  const ab2 = AB.lat * AB.lat + AB.lng * AB.lng;
  const ap_ab = AP.lat * AB.lat + AP.lng * AB.lng;

  const t = Math.max(0, Math.min(1, ap_ab / ab2));

  return {
    lat: A.lat + AB.lat * t,
    lng: A.lng + AB.lng * t
  };
};

// Calculate progress along route
const calculateRouteProgress = (snappedPoint, route) => {
  if (!snappedPoint || !route || route.length < 2) return 0;

  let distanceToCurrent = 0;
  let totalDistance = 0;

  // Calculate distance to current point
  for (let i = 0; i < snappedPoint.segmentStart; i++) {
    distanceToCurrent += haversineKm(
      route[i][0], route[i][1],
      route[i + 1][0], route[i + 1][1]
    );
  }

  // Add partial segment distance
  distanceToCurrent += haversineKm(
    route[snappedPoint.segmentStart][0],
    route[snappedPoint.segmentStart][1],
    snappedPoint.lat,
    snappedPoint.lng
  );

  // Calculate total route distance
  for (let i = 0; i < route.length - 1; i++) {
    totalDistance += haversineKm(
      route[i][0], route[i][1],
      route[i + 1][0], route[i + 1][1]
    );
  }

  return totalDistance > 0 ? distanceToCurrent / totalDistance : 0;
};

// Copy to clipboard helper
const copyToClipboard = async (text) => {
  if (!text) {
    showTrackOrderToast("Nothing to copy", 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    console.log("URL copied to clipboard!");
    showTrackOrderToast("URL copied!", 'success');
  } catch (err) {
    console.error("Failed to copy URL: ", err);
    // Fallback for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("URL copied to clipboard!");
    } catch (fallbackError) {
      console.error("Fallback copy failed:", fallbackError);
      showTrackOrderToast("Copy failed", 'error');
    }
  }
};

// Modern track order toast
const showTrackOrderToast = (message, type = 'success') => {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    z-index: 10000;
    padding: 14px 18px;
    border-radius: 15px;
    background: ${type === 'success' ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #dc2626, #b91c1c)'};
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: trackOrderSlide 0.3s ease;
  `;
  toast.textContent = `${type === 'success' ? '✓' : '✕'} ${message}`;
  
  const keyframes = `
    @keyframes trackOrderSlide {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
  `;
  
  if (!document.querySelector('#track-order-keyframes')) {
    const style = document.createElement('style');
    style.id = 'track-order-keyframes';
    style.textContent = keyframes;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
};

// ETA Counter component
const ETACounter = ({ eta }) => {
  const [timeLeft, setTimeLeft] = useState('Calculating...');

  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      const distance = new Date(eta).getTime() - now;

      if (distance < 0) {
        setTimeLeft('Arriving now');
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
    };

    const timer = setInterval(updateCountdown, 1000);
    updateCountdown();

    return () => clearInterval(timer);
  }, [eta]);

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 absolute top-4 right-4 z-50">
      <div className="text-sm font-semibold text-gray-600">Estimated Arrival</div>
      <div className="text-2xl font-bold text-go7-red">{timeLeft}</div>
    </div>
  );
};

// Main TrackOrder component
const TrackOrder = () => {
  const { orderId: paramOrderId, id: legacyId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const jobId = normalizeTrackingId(paramOrderId || legacyId || queryParams.get("job"));

  // State
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [isActiveDelivery, setIsActiveDelivery] = useState(false);
  const [riderData, setRiderData] = useState(null);
  const [routeProgress, setRouteProgress] = useState(0);
  const [estimatedArrival, setEstimatedArrival] = useState(null);
  const unsubscribeRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const mapRef = useRef(null);
  const routePolylineRef = useRef(null);

  // Live rider position comes from Firestore (rider_locations + riders), not simulation
  const { status, isDelivered } = useRealTimeTracking(
    null,
    booking?.status || BOOKING_STATUSES.PENDING
  );

  // Check if the delivery is active
  useEffect(() => {
    if (booking) {
      // Consider a delivery active if it's not in the final states
      const activeStatuses = [
        BOOKING_STATUSES.PENDING,
        BOOKING_STATUSES.ASSIGNED,
        BOOKING_STATUSES.ENROUTE_PICKUP,
        BOOKING_STATUSES.PICKED_UP,
        BOOKING_STATUSES.ENROUTE_DROPOFF
      ];

      setIsActiveDelivery(activeStatuses.includes(booking.status));
    } else {
      setIsActiveDelivery(false);
    }
  }, [booking]);

  // Real-time subscription to book-delivery `bookings` collection
  useEffect(() => {
    if (!jobId) {
      setError("No booking ID provided. Please check the URL or make a new booking.");
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError(null);

    let cancelled = false;
    let unsubscribe = null;

    (async () => {
      unsubscribe = await subscribeToBookingByTrackingId(
        jobId,
        (liveBooking) => {
          if (cancelled) return;
          if (liveBooking) {
            const distance = liveBooking.distanceKm;
            setDistanceKm(distance);
            setEtaMinutes(liveBooking.etaMins);
            setBooking(liveBooking);
            setError(null);
            setLoading(false);
          } else {
            setBooking(null);
            setError(`No delivery found for "${jobId}". Check your booking code (e.g. Go7-XXXXXXX).`);
            setLoading(false);
          }
        },
        () => {
          if (!cancelled) {
            setError("Failed to load tracking updates. Please try again.");
            setLoading(false);
          }
        }
      );
      unsubscribeRef.current = unsubscribe;
    })();

    return () => {
      cancelled = true;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [jobId]);

  // Set up share URL
  useEffect(() => {
    if (jobId) {
      setShareUrl(`${window.location.origin}/track-order/${jobId}`);
    }
  }, [jobId]);

  // Helper for formatting timeline dates
  const formatTimelineDate = (date) => {
    if (!date) return '';

    try {
      // Convert Firestore timestamp to JS Date if needed
      const jsDate = date.toDate ? date.toDate() : new Date(date);

      return new Intl.DateTimeFormat('en-NG', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        day: 'numeric',
        month: 'short'
      }).format(jsDate);
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  // Update booking status based on tracking status
  useEffect(() => {
    if (booking && status && status !== booking.status) {
      setBooking(prev => ({
        ...prev,
        status: status
      }));
    }
  }, [booking, status]);

  // Real-time rider tracking with Firebase
  useEffect(() => {
    if (!booking?.id) return;

    console.log('🚚 Setting up real-time rider tracking for delivery:', booking.id);

    const unsubscribeRider = subscribeToRiderLocation(booking.id, (riderUpdate) => {
      if (!riderUpdate) return;
      console.log('📍 Rider location update:', riderUpdate);
      setRiderData(riderUpdate);

      // Calculate route progress if route exists
      if (booking.pickup?.coords && booking.dropoff?.coords) {
        const routePoints = [
          [booking.pickup.coords.lat, booking.pickup.coords.lng],
          [booking.dropoff.coords.lat, booking.dropoff.coords.lng]
        ];

        const snappedData = snapToRoute(
          { lat: riderUpdate.lat, lng: riderUpdate.lng },
          routePoints
        );

        setRouteProgress(snappedData.progress);

        // Trigger notifications based on progress
        const progress = snappedData.progress;
        if (progress >= 0.95 && riderUpdate.status !== 'delivered') {
          showDeliveryComplete();
        } else if (progress >= 0.7 && riderUpdate.status !== 'arriving') {
          showNearDestination();
        } else if (progress >= 0.3 && riderUpdate.status !== 'picked_up') {
          showPickupComplete();
        } else if (progress >= 0.1) {
          showHalfwayPoint();
        }

        // Update ETA based on remaining distance
        const dropoffCoords = { lat: booking.dropoff.coords.lat, lng: booking.dropoff.coords.lng };
        const remainingDistance = getDistance(
          { lat: riderUpdate.lat, lng: riderUpdate.lng },
          dropoffCoords
        );
        const speedKmh = riderUpdate.speed || 20;
        const etaMinutes = (remainingDistance / speedKmh) * 60;
        const etaTime = new Date(Date.now() + etaMinutes * 60 * 1000);
        setEstimatedArrival(etaTime);
      }
    });

    // Cleanup subscription
    return () => {
      if (unsubscribeRider) {
        unsubscribeRider();
      }
    };
  }, [booking?.id, booking?.pickup, booking?.dropoff]);

  // Helper function for distance calculation
  const getDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Determine current timeline events for display
  const determineTimelineEvents = () => {
    if (timelineEvents && timelineEvents.length > 0) {
      return timelineEvents;
    } else if (booking?.timeline && booking.timeline.length > 0) {
      return booking.timeline;
    } else {
      return [
        {
          status: booking?.status || BOOKING_STATUSES.PENDING,
          timestamp: booking?.createdAt || new Date(),
          note: 'Delivery created'
        }
      ];
    }
  };

  // Handle cancel booking
  const handleCancelBooking = async () => {
    // Check if booking can be cancelled
    if (!booking ||
      booking.status === BOOKING_STATUSES.PICKED_UP ||
      booking.status === BOOKING_STATUSES.ENROUTE_DROPOFF ||
      booking.status === BOOKING_STATUSES.DELIVERED ||
      booking.status === BOOKING_STATUSES.CANCELLED) {
      alert("This booking cannot be cancelled at this stage.");
      return;
    }

    // Confirm cancellation
    if (window.confirm("Are you sure you want to cancel this delivery? Our team will review your payment for a refund if applicable.")) {
      try {
        await updateDoc(doc(db, 'bookings', jobId), {
          status: BOOKING_STATUSES.CANCELLED,
          cancellationReason: 'Customer cancelled — no rider assigned in time',
          cancelledBy: 'customer',
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        alert("Booking cancelled. If you already paid, our team will contact you about a refund within 24 hours.");
      } catch (error) {
        console.error("Error cancelling booking:", error);
        alert("Could not cancel online. Please WhatsApp Go7 support with your booking code.");
      }
    }
  };

  // Helper to format rider phone for tel: link
  const formatPhoneForCall = (phone) => {
    if (!phone) return "tel:+2348000000000"; // Placeholder
    return `tel:${phone.replace(/\s+/g, '')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative mx-auto mb-6">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
              <img
                src="/go7-logo.png"
                alt="Go7 Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-red-600 border-t-transparent animate-spin"></div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Tracking Your Delivery</h2>
          <p className="text-gray-600 max-w-md mx-auto">Connecting to Firestore for real-time updates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-2">Track Order</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">❌</span>
            </div>
            <h2 className="text-xl font-semibold mb-2">{error}</h2>
            <p className="text-gray-600 mb-6">We couldn't locate your delivery information. Please try again or start a new delivery.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/book-delivery')}
                className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Book a New Delivery
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-2">Track Order</h1>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-20 h-20 bg-yellow-50 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-3xl">🔍</span>
            </div>
            <h2 className="text-xl font-semibold mb-3">Delivery Not Found</h2>
            <p className="text-gray-600 mb-2">We couldn't find any delivery with the ID:</p>
            <p className="font-mono bg-gray-100 p-2 rounded mb-6 inline-block">{jobId}</p>
            <p className="text-gray-600 mb-6">The delivery might have been completed or the ID is incorrect.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-100 text-gray-800 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/book-delivery')}
                className="bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Book a New Delivery
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pickupCoords = booking.pickup?.coords;
  const dropoffCoords = booking.dropoff?.coords;
  const hasMapCoords =
    pickupCoords?.lat != null &&
    pickupCoords?.lng != null &&
    dropoffCoords?.lat != null &&
    dropoffCoords?.lng != null &&
    !(pickupCoords.lat === 0 && pickupCoords.lng === 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Go back to home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900 ml-2">Track Order</h1>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Order ID</div>
            <div className="font-mono text-gray-900">{booking.jobId || booking.id}</div>
          </div>
        </div>

        {/* Dev Controls */}
        {import.meta.env.DEV && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="font-medium text-yellow-800">Real-Time Tracking Active</div>
              <div className="text-sm text-yellow-700">
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1 animate-ping"></span>
                Live Tracking Enabled
              </div>
            </div>
          </div>
        )}

        {(booking.status === 'searching_rider' || booking.status === BOOKING_STATUSES.PENDING) && !booking.riderId && !booking.rider?.id && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-semibold text-amber-900">We&apos;re on it — your payment is confirmed</p>
            <p className="mt-1 text-sm text-amber-800">
              Our dispatch team has been notified and is assigning a rider. You&apos;ll see an update here as soon as a rider accepts.
            </p>
            <p className="mt-3 text-sm text-amber-900">
              Need help now?{' '}
              <a href="https://wa.me/2348000000000" className="font-semibold underline" target="_blank" rel="noreferrer">
                Message Go7 on WhatsApp
              </a>{' '}
              with booking code <span className="font-mono">{booking.jobId || booking.id}</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details and Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Timeline */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Status</h2>

              {/* Determine timeline events to show */}
              {timelineEvents && timelineEvents.length > 0 ? (
                <div className="space-y-4">
                  {timelineEvents.map((item, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mr-4 text-red-600">
                        {STATUS_INFO[item.status]?.icon || '📦'}
                      </div>
                      <div className="flex-grow">
                        <h4 className="font-medium">{STATUS_INFO[item.status]?.label || 'Update'}</h4>
                        <p className="text-sm text-gray-500">
                          {formatTimelineDate(item.timestamp)}
                        </p>
                        {item.note && <p className="text-sm mt-1">{item.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DeliveryStatusTimeline
                  currentStatus={booking.status}
                  estimatedTime={booking.etaMins || etaMinutes}
                />
              )}
            </div>

            {/* Order Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Customer</h3>
                  <p className="font-medium">{booking.customerName}</p>
                  <p className="text-gray-600">{booking.phone}</p>
                </div>

                {/* Order Info */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Order Info</h3>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-medium">{formatDistance(booking.distanceKm || distanceKm)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Est. Time:</span>
                    <span className="font-medium">
                      {booking.durationMin
                        ? formatDuration(booking.durationMin)
                        : etaMinutes
                          ? `${etaMinutes} mins`
                          : '--'}
                    </span>
                  </div>
                  {booking.durationMin && isActiveDelivery && (
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Est. Arrival:</span>
                      <span className="font-medium text-green-600">
                        {getEstimatedArrival(booking.durationMin)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium capitalize">{booking.serviceType || booking.priority || 'Standard'}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-red-600">{currencyFormatNGN(booking.fareNaira || booking.fare)}</span>
                  </div>
                  {booking.payment && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment:</span>
                      <span className={`font-medium ${booking.payment.method === 'paystack' ? 'text-green-600' : 'text-purple-600'
                        }`}>
                        {booking.payment.method === 'paystack' ? 'Card/Transfer' : 'Pay on Delivery'}
                      </span>
                    </div>
                  )}
                  {booking.payment && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`font-medium ${booking.payment.status === 'paid' ? 'text-green-600' :
                        booking.payment.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                        {booking.payment.status === 'paid' ? 'Paid' :
                          booking.payment.status === 'failed' ? 'Failed' : 'Pending'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pickup */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Pickup Location</h3>
                  <p className="font-medium">{booking.pickupArea}</p>
                  <p className="text-gray-600">{booking.pickupAddress}</p>
                </div>

                {/* Dropoff */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Dropoff Location</h3>
                  <p className="font-medium">{booking.dropoffArea}</p>
                  <p className="text-gray-600">{booking.dropoffAddress}</p>
                </div>

                {/* Rider Info */}
                {booking.rider && (
                  <div className="sm:col-span-2 bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Rider Info</h3>
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xl">
                        🛵
                      </div>
                      <div className="ml-4">
                        <p className="font-medium">{booking.rider.name}</p>
                        <p className="text-gray-600">ID: #{booking.rider.id}</p>
                        {booking.rider.code && (
                          <p className="text-gray-600">Code: {booking.rider.code}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Call Rider */}
                <a
                  href={formatPhoneForCall(booking.rider?.phone)}
                  className="bg-green-50 hover:bg-green-100 text-green-700 py-3 px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center text-center"
                  aria-label="Call rider"
                >
                  <Phone />
                  <span>Call Rider</span>
                </a>

                {/* Chat */}
                <button
                  onClick={() => navigate(`/chat/${booking.jobId || booking.id}`)}
                  className="bg-blue-50 hover:bg-blue-100 text-blue-700 py-3 px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center text-center"
                  aria-label="Chat with rider"
                >
                  <Chat />
                  <span>Chat</span>
                </button>

                {/* Share */}
                <button
                  onClick={() => copyToClipboard(shareUrl)}
                  className="bg-purple-50 hover:bg-purple-100 text-purple-700 py-3 px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center text-center"
                  aria-label="Share tracking link"
                >
                  <Share />
                  <span>Share</span>
                </button>

                {/* Cancel */}
                <button
                  onClick={handleCancelBooking}
                  disabled={
                    booking.status === BOOKING_STATUSES.PICKED_UP ||
                    booking.status === BOOKING_STATUSES.ENROUTE_DROPOFF ||
                    booking.status === BOOKING_STATUSES.DELIVERED ||
                    booking.status === BOOKING_STATUSES.CANCELLED ||
                    isDelivered
                  }
                  className="bg-red-50 hover:bg-red-100 text-red-700 py-3 px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center text-center disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Cancel order"
                >
                  <Cancel />
                  <span>Cancel</span>
                </button>

                {/* Development Tool - Simulate Next Status */}
                {process.env.NODE_ENV !== 'production' && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await api.pingBooking(jobId);
                        if (response.success) {
                          setBooking(response.data);
                          // Show success toast or notification
                          alert('Status updated successfully!');
                        } else {
                          // Show error toast or notification
                          alert(`Error: ${response.error || 'Failed to update status'}`);
                        }
                      } catch (error) {
                        console.error('Error updating status:', error);
                        alert('Error updating status. See console for details.');
                      }
                    }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3 px-4 rounded-lg font-medium transition-colors flex flex-col items-center justify-center text-center"
                    aria-label="Simulate next status"
                    disabled={booking.status === BOOKING_STATUSES.DELIVERED || booking.status === BOOKING_STATUSES.CANCELLED}
                  >
                    <span className="mr-1">🔄</span>
                    <span>Simulate Next Status</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-[500px] flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Map</h2>

                {hasMapCoords ? (
                  <div className="flex-grow rounded-lg overflow-hidden">
                    <MapTracking
                      orderId={booking.id}
                      riderId={booking.riderId || booking.rider?.id}
                      pickup={pickupCoords}
                      dropoff={dropoffCoords}
                      showETA={Boolean(booking.riderId || booking.rider?.id)}
                      height="400px"
                      className="comprehensive-track-map"
                    />
                    {/* Map overlay for status */}
                    <div className="bg-white rounded-lg shadow-md p-3 mt-2">
                      <div className="flex items-center">
                        <div className="text-xl mr-2">{STATUS_INFO[booking.status]?.icon || '📦'}</div>
                        <div>
                          <p className="font-medium">{STATUS_INFO[booking.status]?.label || 'Tracking'}</p>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Clock />
                            <span>{booking.etaMins || etaMinutes ? `${booking.etaMins || etaMinutes} mins` : 'Calculating...'}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex items-center justify-center bg-gray-100 rounded-lg">
                    <div className="text-center text-gray-500">
                      <div className="text-4xl mb-2">🗺️</div>
                      <p>Map unavailable</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackOrder;
