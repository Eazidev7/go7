import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import AuthSheet from '../components/auth/AuthSheet';
import BookDeliveryCheckoutBar from '../components/bookDelivery/BookDeliveryCheckoutBar';
import BookDeliveryAddressPanel from '../components/bookDelivery/BookDeliveryAddressPanel';
import { useAuthContext } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext.jsx';
import { useLocation } from '../contexts/LocationContext.jsx';
import { extractCoordsFromAddress } from '../utils/locationQuality';
import { calculateFare, getFareBreakdown, formatFare, estimateDeliveryTime, computeTripFare } from '../utils/fareUtils';
import { computeBookDeliveryFee, BOOK_DELIVERY_ORDER_TYPE } from '../services/serverDeliveryPricing';
import { createBookDeliveryOrder, confirmBookDeliveryPayment } from '../services/bookDeliveryOrderService';
import { usePricingSettings } from '../hooks/usePricingSettings';
import { getRoadDistanceKm } from '../utils/routeDistance';
import {
  loadBookDeliveryDraft,
  saveBookDeliveryDraft,
  clearBookDeliveryDraft,
} from '../utils/bookDeliveryDraft';
import { ORS_API_KEY } from '../config/routing';
import { buildParcelOrderPricing } from '../utils/orderPricing';
import {
  getCustomerWalletInfo,
  payForDeliveryWithWallet,
  refundWalletPayment,
  formatCurrency,
  hasSufficientBalance
} from '../services/customerWalletService';
import { Helmet } from 'react-helmet-async';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import Swal from 'sweetalert2';
import { createDeliveryEvent } from '../types/models';
import { showOrderConfirmed } from '../utils/notifications';
import { db } from '../config/firebase';
import { searchLandmarks } from '../data/landmarks';
import {
  ABEOKUTA_CENTER as ABEOKUTA_CENTER_OBJ,
  MAPTILER_BBOX,
  SERVICE_BOUNDS,
  isWithinAbeokutaServiceArea,
  mentionsAbeokutaArea,
  resolveLocalAreaCoords,
  preferLocalAreaCoords,
  validateServiceLocation,
  fixNigeriaCoords,
} from '../utils/abeokutaServiceArea';
import { subscribeToUnifiedWalletBalance } from '../utils/walletBalance';

// 🚀 GO7 BRANDED NOTIFICATIONS SYSTEM
import {
  showGo7Success,
  showGo7Error,
  showGo7Warning,
  showRiderUpdate,
  showPricingUpdate,
  showLocationUpdate,
  showOrderStatus,
  showGo7Toast
} from '../utils/go7Notifications';

// 🆕 GO7 MODERN BOOKING SYSTEM
import {
  showBookingSuccess,
  showRiderAssigned,
  showRiderEnroute,
  showDeliveryCompleted,
  showInvalidAddress,
  showRiderAtPickup,
  showRiderAtDropoff,
  showBookingProcessing
} from '../utils/modernAlerts';

// 🔍 LOCATION DIAGNOSTICS (for debugging GPS accuracy issues)
import { runLocationDiagnostic } from '../utils/locationDiagnostics';

// 🎯 VENDOR GEO-RADIUS MATCHING (automatic vendor discovery within 10km)
import { findNearbyVendors } from '../utils/vendorMatching';

// 🚴 SMART RIDER AUTO-DISPATCH (automatic rider assignment within 5km)

// 🌐 ENHANCED HYBRID ADDRESS SUGGESTIONS (Google + OSM + Zone Detection)
import fetchAddressSuggestions, { getCoordinatesFromSuggestion, reverseGeocode, detectLocalZone } from '../utils/fetchAddressSuggestions';

// 💰 CENTRALIZED FARE CALCULATOR - SINGLE SOURCE OF TRUTH
// Note: Now using centralized fareUtils.js imported above
const PackageDetection = lazy(() => import('../components/PackageDetection'));

// GO7 BOOK DELIVERY OPTIMIZATION (ABEOKUTA EDITION)
// --------------------------------------------------
// 🧠 Objectives:
// 1️⃣ Improve address accuracy using Google Places Autocomplete with strict Abeokuta bounds.
// 2️⃣ Validate final coordinates via Reverse Geocoding.
// 3️⃣ Ensure drop-off inside Abeokuta zone.
// 4️⃣ Implement fair, zone-based dynamic pricing formula with distance tiers and surges.
// 5️⃣ Return accurate pricing summary + estimated time.

// Google Maps configuration
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Google Maps will be loaded dynamically when needed

// Utility function to detect insecure origins that may block geolocation
function isInsecureOrigin() {
  return !window.isSecureContext && !location.hostname.includes('localhost');
}

// Abeokuta delivery zones with enhanced styling
const abeokutaNeighborhoods = [
  {
    id: 'camp',
    name: "Camp",
    coords: [7.1600, 3.3450],
    color: "#E53935",
    polygon: [
      [7.1620, 3.3470], [7.1620, 3.3430], [7.1580, 3.3430], [7.1580, 3.3470]
    ]
  },
  {
    id: 'panseke',
    name: "Panseke",
    coords: [7.1516, 3.3467],
    color: "#FB8C00",
    polygon: [
      [7.1536, 3.3487], [7.1536, 3.3447], [7.1496, 3.3447], [7.1496, 3.3487]
    ]
  },
  {
    id: 'kuto',
    name: "Kuto",
    coords: [7.1315, 3.3622],
    color: "#43A047",
    polygon: [
      [7.1335, 3.3642], [7.1335, 3.3602], [7.1295, 3.3602], [7.1295, 3.3642]
    ]
  },
  {
    id: 'adigbe',
    name: "Adigbe",
    coords: [7.1490, 3.3411],
    color: "#8E24AA",
    polygon: [
      [7.1510, 3.3431], [7.1510, 3.3391], [7.1470, 3.3391], [7.1470, 3.3431]
    ]
  },
  {
    id: 'lafenwa',
    name: "Lafenwa",
    coords: [7.1588, 3.3784],
    color: "#3949AB",
    polygon: [
      [7.1608, 3.3804], [7.1608, 3.3764], [7.1568, 3.3764], [7.1568, 3.3804]
    ]
  }
];

// MapTiler API configuration - Using Go7 custom cartoon style
const MAPTILER_KEY = 'nRGZ9lGblbV9lFK2KclL';
const MAPTILER_STYLE_ID = '019996dd-306b-7019-acc5-de8469c0388d'; // Go7 cream cartoon style
const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/style.json?key=${MAPTILER_KEY}`;

// OpenRouteService — shared key in src/config/routing.js

// Abeokuta coordinates for map centering
const ABEOKUTA_CENTER = [ABEOKUTA_CENTER_OBJ.lat, ABEOKUTA_CENTER_OBJ.lng];
const DEFAULT_ZOOM = 13;

const parseSuggestionCoords = (suggestion) => {
  if (!suggestion) return null;

  if (suggestion.coordinates?.lat != null && suggestion.coordinates?.lng != null) {
    return {
      lat: Number(suggestion.coordinates.lat),
      lng: Number(suggestion.coordinates.lng),
    };
  }

  if (Array.isArray(suggestion.coordinates) && suggestion.coordinates.length >= 2) {
    const [a, b] = suggestion.coordinates.map(Number);
    // GeoJSON arrays are usually [lng, lat] in Nigeria (lng ~3, lat ~7)
    if (a >= 3 && a <= 15 && b >= 4 && b <= 14) {
      return { lat: b, lng: a };
    }
    return { lat: a, lng: b };
  }

  if (suggestion.lat != null && suggestion.lon != null) {
    const fixed = fixNigeriaCoords(suggestion.lat, suggestion.lon);
    return { lat: fixed.lat, lng: fixed.lng };
  }

  if (suggestion.lat != null && suggestion.lng != null) {
    const fixed = fixNigeriaCoords(suggestion.lat, suggestion.lng);
    return { lat: fixed.lat, lng: fixed.lng };
  }

  if (suggestion.landmarkData?.lat != null && suggestion.landmarkData?.lng != null) {
    return { lat: Number(suggestion.landmarkData.lat), lng: Number(suggestion.landmarkData.lng) };
  }

  return null;
};

const normalizeCoords = (coords) => {
  if (!coords) return null;

  if (Array.isArray(coords) && coords.length >= 2) {
    const [a, b] = coords.map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    // GeoJSON [lng, lat] in Nigeria (lng ~3, lat ~7)
    if (a >= 3 && a <= 15 && b >= 4 && b <= 14) {
      return { lat: b, lng: a };
    }
    return { lat: a, lng: b };
  }

  const lat = Number(coords.lat);
  const lng = Number(coords.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const fixed = fixNigeriaCoords(lat, lng);
  return { lat: fixed.lat, lng: fixed.lng };
};

const hasValidCoords = (coords) => normalizeCoords(coords) != null;

// 🗺️ ABEOKUTA SMART LOCATION VALIDATION
async function validateAbeokutaZone(lat, lng, addressOrLabel = 'location') {
  const result = validateServiceLocation({ lat, lng, address: addressOrLabel, label: addressOrLabel });
  console.log(`🔍 Validating ${addressOrLabel}:`, result);

  if (result.valid) {
    return {
      valid: true,
      snapped: result.snapped,
      correctedCoords: result.snapped ? { lat: result.lat, lng: result.lng } : undefined,
      message: result.message,
      distance: result.distance,
    };
  }

  return {
    valid: false,
    snapped: false,
    message: `${addressOrLabel} seems far from Abeokuta delivery area. Please pick a nearby landmark.`,
    distance: result.distance,
  };
}

// Legacy bounds check (aligned with abeokutaServiceArea SERVICE_BOUNDS)
const ABEOKUTA_BOUNDS = {
  north: SERVICE_BOUNDS.north,
  south: SERVICE_BOUNDS.south,
  east: SERVICE_BOUNDS.east,
  west: SERVICE_BOUNDS.west,
};

const roundCoordinates = (coords) => {
  const normalized = normalizeCoords(coords);
  if (!normalized) return { lat: 0, lng: 0 };
  return {
    lat: Math.round(normalized.lat * 10000) / 10000,
    lng: Math.round(normalized.lng * 10000) / 10000,
  };
};

const isWithinAbeokutaBounds = (coords) => {
  const rounded = roundCoordinates(coords);
  return (
    rounded.lat >= ABEOKUTA_BOUNDS.south &&
    rounded.lat <= ABEOKUTA_BOUNDS.north &&
    rounded.lng >= ABEOKUTA_BOUNDS.west &&
    rounded.lng <= ABEOKUTA_BOUNDS.east
  );
};

// NEW: Smart validation for both pickup and dropoff
const validateDeliveryArea = async (pickupCoords, dropoffCoords, pickupAddress = '', dropoffAddress = '') => {
  const pickup = normalizeCoords(pickupCoords);
  const dropoff = normalizeCoords(dropoffCoords);

  if (!pickup || !dropoff) {
    return {
      valid: false,
      error: 'coordinates',
      message: 'Pickup and dropoff coordinates are required',
    };
  }

  console.log('🔍 Smart validation for delivery area:', {
    pickup: roundCoordinates(pickup),
    dropoff: roundCoordinates(dropoff)
  });

  // Validate pickup location
  const pickupValidation = await validateAbeokutaZone(
    pickup.lat,
    pickup.lng,
    pickupAddress || 'Pickup'
  );

  if (!pickupValidation.valid) {
    return {
      valid: false,
      error: 'pickup',
      message: pickupValidation.message,
      distance: pickupValidation.distance
    };
  }

  // Validate dropoff location
  const dropoffValidation = await validateAbeokutaZone(
    dropoff.lat,
    dropoff.lng,
    dropoffAddress || 'Dropoff'
  );

  if (!dropoffValidation.valid) {
    return {
      valid: false,
      error: 'dropoff',
      message: dropoffValidation.message,
      distance: dropoffValidation.distance
    };
  }

  // If coordinates were snapped, update them
  const finalPickup = pickupValidation.snapped
    ? pickupValidation.correctedCoords
    : pickup;

  const finalDropoff = dropoffValidation.snapped
    ? dropoffValidation.correctedCoords
    : dropoff;

  console.log('✅ Both locations validated successfully', {
    pickupSnapped: pickupValidation.snapped,
    dropoffSnapped: dropoffValidation.snapped
  });

  return { 
    valid: true,
    pickupCoords: finalPickup,
    dropoffCoords: finalDropoff,
    pickupSnapped: pickupValidation.snapped,
    dropoffSnapped: dropoffValidation.snapped
  };
};

const MAP_STYLES = {
  customMapTiler: `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  maptilerBasic: `https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`,
  fallback: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
};

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Haversine formula for quick distance calculation
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c; // Returns distance in kilometers
};

// Quick fee estimation based on Haversine distance using unified calculator
const calculateQuickEstimate = (pickup, dropoff) => {
  if (!pickup || !dropoff) return null;
  const distance = calculateHaversineDistance(
    pickup[0], pickup[1],
    dropoff[0], dropoff[1]
  );
  // Use unified fare calculation for consistency
  const estimatedDuration = estimateDeliveryTime(distance);
  return calculateFare(distance, estimatedDuration);
};

// � UNIFIED PRICING UPDATE FUNCTION: Ensures consistent pricing across all components
const _DISABLED_updateUnifiedPricing = (distanceKm, durationMin = null) => {
  // DISABLED: This duplicate function causes conflicts with component state
  return { fare: 0, breakdown: {} };
  /*
  const estimatedDuration = durationMin || estimateDeliveryTime(distanceKm);
  const totalFare = calculateFare(distanceKm, estimatedDuration);
  const breakdown = getFareBreakdown(distanceKm, estimatedDuration);
  
  // Update both pricing states consistently - ERROR: these don't exist here!
  // setEstimatedFare(totalFare);
  setPricingBreakdown({
    baseFee: breakdown.baseFare,
    distanceFee: breakdown.distanceFee,
    serviceFee: breakdown.serviceFee,
    timeFee: breakdown.timeFee,
    subtotal: breakdown.subtotal,
    total: breakdown.total,
    totalKobo: Math.round(breakdown.total * 100),
    distance: distanceKm,
    duration: estimatedDuration,
    isCalculating: false
  */
};

// �🏗️ UNIFIED PRICING FUNCTION: Uses Go7's standard fare calculator
function calculateAdvancedPrice(distanceKm, durationMin = null) {
  // Use standard Go7 fare calculation
  const estimatedDuration = durationMin || estimateDeliveryTime(distanceKm);
  const totalFare = calculateFare(distanceKm, estimatedDuration);
  const breakdown = getFareBreakdown(distanceKm, estimatedDuration);
  
  return {
    baseFee: breakdown.baseFare,
    serviceFee: 0,
    distanceCharge: breakdown.distanceFee,
    timeCharge: breakdown.timeFee,
    subtotal: breakdown.subtotal,
    total: totalFare,
    surgeApplied: false,
    surgePercentage: 0,
    // Legacy compatibility fields
    distanceKm,
    durationMin: estimatedDuration,
    formattedFare: formatFare(totalFare)
  };
}

// Function to detect peak hours for surge pricing
function isPeakHour() {
  const currentHour = new Date().getHours();
  // Peak hours: 7-9 AM and 5-8 PM
  return (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 20);
}

// Function to detect rush hours (higher surge)
function isRushHour() {
  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay(); // 0 = Sunday, 6 = Saturday
  // Rush hours: Friday evenings (5-8 PM) and weekend mornings (8-11 AM)
  return (currentDay === 5 && currentHour >= 17 && currentHour <= 20) ||
    ((currentDay === 0 || currentDay === 6) && currentHour >= 8 && currentHour <= 11);
}

// Abeokuta bounds for Google Places Autocomplete (wider metro + suburbs)
const abeokutaBounds = {
  north: 7.45,
  south: 6.85,
  east: 3.65,
  west: 3.05
};

// Enhanced reverse geocoding function for address confirmation
// FIX: Handles ZERO_RESULTS with retry using snapped coordinates + Abeokuta bias
async function confirmAddress(lat, lng) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.status === 'OK' && data.results?.length > 0) {
      const result = data.results[0];
      return {
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components,
        isAbeokuta: isWithinAbeokutaServiceArea(lat, lng) ||
          result.formatted_address.toLowerCase().includes('abeokuta') ||
          result.formatted_address.toLowerCase().includes('ogun'),
        coordinates: { lat, lng }
      };
    }

    // RETRY with snapped coordinates (nearest known road/landmark)
    if (data.status === 'ZERO_RESULTS') {
      console.log('⚠️ ZERO_RESULTS - Retrying with snapped coordinates...');

      const rounded = {
        lat: Math.round(lat * 10000) / 10000,
        lng: Math.round(lng * 10000) / 10000
      };

      const retryResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${rounded.lat},${rounded.lng}&key=${GOOGLE_MAPS_API_KEY}&region=ng&components=locality:Abeokuta`
      );
      const retryData = await retryResponse.json();

      if (retryData.status === 'OK' && retryData.results?.length > 0) {
        console.log('✅ Retry successful with snapped coordinates');
        const result = retryData.results[0];
        return {
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components,
          isAbeokuta: isWithinAbeokutaServiceArea(lat, lng) ||
          result.formatted_address.toLowerCase().includes('abeokuta') ||
          result.formatted_address.toLowerCase().includes('ogun'),
          coordinates: rounded
        };
      }
    }

    return {
      formattedAddress: "Address unavailable",
      isAbeokuta: isWithinAbeokutaServiceArea(lat, lng) || mentionsAbeokutaArea(`${lat},${lng}`),
      coordinates: { lat, lng }
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      formattedAddress: "Address unavailable",
      isAbeokuta: isWithinAbeokutaServiceArea(lat, lng),
      coordinates: { lat, lng }
    };
  }
}

/**
 * Go7 Book Delivery Page with Google Maps Places Autocomplete
 * 
 * ✅ GOOGLE MAPS PLACES INTEGRATION COMPLETE:
 * 
 * 1️⃣ API Key: AIzaSyAl_g5kJ7gts6QtRYGArqEpne277dJ0Bq4 ✅
 * 2️⃣ Script: Google Maps JS with &libraries=places and callback=initAutocomplete ✅
 * 3️⃣ Autocomplete: Restricted to Nigeria (NG) for both pickup and dropoff ✅
 * 4️⃣ Logging: Formatted address and geometry logged on selection ✅
 * 5️⃣ Route Display: Map shows route once both addresses are chosen ✅
 * 
 * Features:
 * - Real-time place suggestions with Nigeria restriction
 * - Detailed logging of place selection with geometry data
 * - Automatic route calculation and display using Google Directions API
 * - Fallback to MapTiler if Google Places fails
 * - Enhanced pricing calculation based on actual route distance
 * - Professional Go7 red-themed route display
 * 
 * Usage:
 * 1. Type in pickup address (minimum 3 characters)
 * 2. Select from Google Places suggestions (Nigeria only)
 * 3. Type in dropoff address (minimum 3 characters)  
 * 4. Select from Google Places suggestions (Nigeria only)
 * 5. View automatic route display and pricing calculation
 */

const INITIAL_FORM_DATA = {
  senderName: '',
  senderPhone: '',
  senderEmail: '',
  pickupAddress: '',
  dropoffAddress: '',
  recipientName: '',
  recipientPhone: '',
  recipientEmail: '',
  itemDescription: '',
  packageName: '',
  packageSize: 'small',
  packageWeight: 'under_5kg',
  packageType: 'document',
  deliveryMode: 'standard',
  note: '',
  paymentMethod: 'paystack',
  paymentType: 'pay_now',
};

const BookDelivery = ({ onBack } = {}) => {
  const navigate = useNavigate();
  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    // Full-app route: prefer real history, else land on home
    if (typeof window !== 'undefined' && window.history.state?.idx > 0) {
      navigate(-1);
      return;
    }
    navigate('/');
  };
  const { user, isGuestMode } = useAuthContext();
  const { savedAddresses = [] } = useLocation();
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const pendingSubmitAfterAuth = useRef(false);
  const { orderConfirmed } = useNotification();
  const { settings: pricingSettings } = usePricingSettings();
  const launchBaseFee = pricingSettings?.launchMode
    ? pricingSettings.launchBaseFee
    : pricingSettings?.standardBaseFee ?? 1000;

  // Local constants matching fareUtils.js values
  const LOCAL_BASE_FARE = launchBaseFee;
  const LOCAL_PER_KM = pricingSettings?.launchMode
    ? pricingSettings.launchPerKmAfterIncluded
    : pricingSettings?.standardPerKmAfterIncluded ?? 150;
  const LOCAL_PER_MIN = 20;
  const LOCAL_FARE_CONSTANTS = {
    BASE_FARE: LOCAL_BASE_FARE,
    PER_KM: LOCAL_PER_KM,
    PER_MIN: 20,
    ROUND_TO_NEAREST: 50
  };

  // Remove vendor logic - regular users can't use pay on delivery
  // Only verified vendors can use Pay on Delivery (handled in vendor dashboard separately)
  // Package pricing multipliers
  const getPackageSizeMultiplier = (size) => {
    const multipliers = {
      small: 1.0,   // Base rate
      medium: 1.3,  // 30% increase
      large: 1.6    // 60% increase
    };
    return multipliers[size] || 1.0;
  };

  const getPackageWeightMultiplier = (weight) => {
    const multipliers = {
      under_5kg: 1.0,  // Base rate
      over_5kg: 1.4    // 40% increase
    };
    return multipliers[weight] || 1.0;
  };

  const getPackageTypeMultiplier = (type) => {
    const multipliers = {
      document: 1.0,  // Base rate
      parcel: 1.1,    // 10% increase
      food: 1.2,      // 20% increase (special handling)
      fragile: 1.5    // 50% increase (extra care)
    };
    return multipliers[type] || 1.0;
  };

  const calculateTotalMultiplier = () => {
    try {
      const sizeMultiplier = getPackageSizeMultiplier(formData.packageSize) || 1;
      const weightMultiplier = getPackageWeightMultiplier(formData.packageWeight) || 1;
      const typeMultiplier = getPackageTypeMultiplier(formData.packageType) || 1;
      return sizeMultiplier * weightMultiplier * typeMultiplier;
    } catch (error) {
      console.warn('Error calculating multiplier, using default:', error);
      return 1; // Safe default
    }
  };

  const getServiceMultiplier = (service) => {
    if (!service) return 1;
    switch (service) {
      case 'parcel':
        return getPackageTypeMultiplier(formData.packageType) *
          getPackageSizeMultiplier(formData.packageSize) *
          getPackageWeightMultiplier(formData.packageWeight);
      case 'errand':
        return 1.2;
      case 'gobuy':
        return 1.5;
      default:
        return 1;
    }
  };

  // 🔧 FIX: Service type handler - resets pricing when service changes
  const handleServiceTypeChange = (newServiceType) => {
    setServiceType(newServiceType);
    const km = Number(distance) || Number(pricingBreakdown.distance) || 0;
    const { pickup, dropoff } = getBookingCoords();
    if (km > 0 && pickup && dropoff) {
      calculateServiceSpecificPricing(newServiceType, km);
    }
  };

  // Service-specific pricing — Firestore launch/standard settings
  const calculateServiceSpecificPricing = (service, distanceKm) => {
    if (!service) {
      setFare(null);
      return null;
    }

    const trip = computeTripFare(distanceKm, getServiceMultiplier(service), { pricingSettings });
    setDistance(trip.distance);
    setFare(trip.total);
    setEstimatedFare(trip.total);
    setPricingBreakdown({
      baseFee: trip.baseFee,
      includedKm: trip.includedKm,
      chargeableKm: trip.chargeableKm,
      distanceFee: trip.distanceCharge,
      waitingCharge: trip.waitingCharge,
      timeFee: trip.timeFee,
      serviceFee: 0,
      packageSurcharge: trip.packageSurcharge,
      total: trip.total,
      distance: trip.distance,
      duration: trip.duration,
      pricingMode: trip.pricingMode,
      isCalculating: false,
      serviceType: service,
    });

    return {
      finalPricing: {
        baseFee: trip.baseFee,
        distanceFee: trip.distanceCharge,
        timeFee: trip.timeFee,
        serviceFee: 0,
        packageSurcharge: trip.packageSurcharge,
        total: trip.total,
        surgeApplied: false,
        surgePercentage: 0,
      },
      fareBreakdown: { peakSurcharge: 0 },
    };
  };

  // Find nearest landmark from local JSON data
  const findNearestLandmark = (userLat, userLng) => {
    let nearestLandmark = null;
    let shortestDistance = Infinity;

    // Search through all landmarks from our local JSON
    const allLandmarks = searchLandmarks(''); // Get all landmarks

    allLandmarks.forEach(landmark => {
      if (landmark.lat && landmark.lng) {
        const distance = calculateHaversineDistance(
          userLat, userLng,
          landmark.lat,
          landmark.lng
        );

        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestLandmark = {
            ...landmark,
            distance: distance
          };
        }
      }
    });

    return nearestLandmark;
  };

  const calculatePricingWithPackage = (distance) => {
    const packageMultiplier = calculateTotalMultiplier();
    const trip = computeTripFare(distance, packageMultiplier, { pricingSettings });

    return {
      baseFee: trip.baseFee,
      distanceFee: trip.distanceCharge,
      serviceFee: 0,
      packageSurcharge: trip.packageSurcharge,
      packageMultiplier,
      subtotal: trip.subtotal,
      total: trip.total,
      distance,
    };
  };

  const [estimatedFee, setEstimatedFee] = useState(null);

  const restoredDraftRef = useRef(loadBookDeliveryDraft());

  const [formData, setFormData] = useState(() => {
    const draft = restoredDraftRef.current;
    if (draft?.formData) {
      return { ...INITIAL_FORM_DATA, ...draft.formData };
    }
    return INITIAL_FORM_DATA;
  });

  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setWalletBalance(0);
      return undefined;
    }
    return subscribeToUnifiedWalletBalance(user.uid, setWalletBalance);
  }, [user?.uid]);

  const enhancedUser = {
    ...user,
    role: user?.role || 'vendor',
    email: user?.email || 'user@go7.com',
    walletBalance,
  };

  // Coordinate state declarations (must be before useEffect)
  const [pickupCoords, setPickupCoords] = useState(() => restoredDraftRef.current?.pickupCoords ?? null);
  const [dropoffCoords, setDropoffCoords] = useState(() => restoredDraftRef.current?.dropoffCoords ?? null);
  const [pickupCoordsConfirmed, setPickupCoordsConfirmed] = useState(
    () => Boolean(restoredDraftRef.current?.pickupCoords)
  );
  const [dropoffCoordsConfirmed, setDropoffCoordsConfirmed] = useState(
    () => Boolean(restoredDraftRef.current?.dropoffCoords)
  );
  const [addressScenario, setAddressScenario] = useState(
    () => restoredDraftRef.current?.addressScenario || 'sending'
  );
  const lastGpsRef = useRef(null); // { lat, lng, address, at }
  const lastGpsTargetRef = useRef('pickup');

  // Location source is tracked independently from the address string so we can
  // tell how coordinates were obtained: 'search' | 'gps' | 'map-pin' | 'geocode' | 'saved'.
  const [pickupLocationSource, setPickupLocationSource] = useState(null);
  const [dropoffLocationSource, setDropoffLocationSource] = useState(null);

  const setConfirmedPickupCoords = useCallback((coords, source) => {
    const normalized = normalizeCoords(coords);
    if (!normalized) {
      setPickupCoords(null);
      setPickupCoordsConfirmed(false);
      setPickupLocationSource(null);
      return;
    }
    setPickupCoords(normalized);
    setPickupCoordsConfirmed(true);
    if (source) setPickupLocationSource(source);
  }, []);

  const setConfirmedDropoffCoords = useCallback((coords, source) => {
    const normalized = normalizeCoords(coords);
    if (!normalized) {
      setDropoffCoords(null);
      setDropoffCoordsConfirmed(false);
      setDropoffLocationSource(null);
      return;
    }
    setDropoffCoords(normalized);
    setDropoffCoordsConfirmed(true);
    if (source) setDropoffLocationSource(source);
  }, []);

  const getBookingCoords = useCallback((override = null) => {
    const pickup = normalizeCoords(override?.pickup ?? pickupCoords);
    const dropoff = normalizeCoords(override?.dropoff ?? dropoffCoords);
    return { pickup, dropoff };
  }, [pickupCoords, dropoffCoords]);

  const [apiStatus, setApiStatus] = useState({ loaded: false, working: false, testResult: null, error: null });
  const [showAIDetection, setShowAIDetection] = useState(false);
  const [aiDetectedSize, setAiDetectedSize] = useState(null);
  
  // Payment processing state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);
  const [distance, setDistance] = useState(() => restoredDraftRef.current?.distance ?? 0);
  const [estimatedFare, setEstimatedFare] = useState(
    () => restoredDraftRef.current?.estimatedFare ?? LOCAL_BASE_FARE
  );
  
  // 🔧 FIX: Unified pricing system - only one price should show
  const [serviceType, setServiceType] = useState(() => restoredDraftRef.current?.serviceType ?? '');
  const [fare, setFare] = useState(() => restoredDraftRef.current?.fare ?? null);
  
  const [routePolyline, setRoutePolyline] = useState(null);
  const [pickupMarker, setPickupMarker] = useState(null);
  const [dropoffMarker, setDropoffMarker] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);

  // Enhanced pricing breakdown state
  const [pricingBreakdown, setPricingBreakdown] = useState(() => {
    const draft = restoredDraftRef.current?.pricingBreakdown;
    if (draft) {
      return { ...draft, isCalculating: false };
    }
    return {
      baseFee: LOCAL_BASE_FARE,
      distanceFee: 0,
      serviceFee: 0,
      total: LOCAL_BASE_FARE,
      distance: 0,
      isCalculating: false,
    };
  });

  const draftSaveTimerRef = useRef(null);
  const draftRestoredToastRef = useRef(false);

  const persistBookingDraft = useCallback(() => {
    saveBookDeliveryDraft({
      formData,
      pickupCoords,
      dropoffCoords,
      serviceType,
      distance,
      fare,
      estimatedFare,
      pricingBreakdown: { ...pricingBreakdown, isCalculating: false },
      addressScenario,
    });
  }, [formData, pickupCoords, dropoffCoords, serviceType, distance, fare, estimatedFare, pricingBreakdown, addressScenario]);

  useEffect(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(persistBookingDraft, 400);
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [persistBookingDraft]);

  useEffect(() => {
    const flushDraft = () => persistBookingDraft();
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushDraft();
    };
    window.addEventListener('pagehide', flushDraft);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', flushDraft);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [persistBookingDraft]);

  useEffect(() => {
    if (!restoredDraftRef.current || draftRestoredToastRef.current) return;
    const hasContent =
      restoredDraftRef.current.formData?.pickupAddress ||
      restoredDraftRef.current.formData?.dropoffAddress ||
      restoredDraftRef.current.pickupCoords;
    if (!hasContent) return;

    draftRestoredToastRef.current = true;
    showGo7Toast('Your booking draft was restored', 'success');
  }, []);

  const syncDisplayedFare = useCallback((amount, breakdownPatch = {}) => {
    if (!amount || amount <= 0) return;
    setFare(amount);
    setEstimatedFare(amount);
    setPricingBreakdown((prev) => ({
      ...prev,
      ...breakdownPatch,
      total: amount,
      isCalculating: false,
    }));
  }, []);

  const applyTripPricing = useCallback((distanceKm, service = serviceType) => {
    const km = Number(distanceKm);
    if (!Number.isFinite(km) || km <= 0) return null;

    const trip = computeTripFare(km, getServiceMultiplier(service), { pricingSettings });
    setDistance(km);
    setFare(trip.total);
    setEstimatedFare(trip.total);
    setPricingBreakdown({
      baseFee: trip.baseFee,
      includedKm: trip.includedKm,
      chargeableKm: trip.chargeableKm,
      distanceFee: trip.distanceCharge,
      waitingCharge: trip.waitingCharge,
      timeFee: trip.timeFee,
      serviceFee: 0,
      packageSurcharge: trip.packageSurcharge,
      total: trip.total,
      distance: km,
      duration: trip.duration,
      pricingMode: trip.pricingMode,
      isCalculating: false,
      serviceType: service || '',
    });
    return trip;
  }, [serviceType, formData.packageSize, formData.packageWeight, formData.packageType, pricingSettings]);

  const updatePricingFromCoords = useCallback(async (pickup, dropoff, service) => {
    if (!pickup?.lat || !dropoff?.lat) return;

    setPricingBreakdown((prev) => ({ ...prev, isCalculating: true }));

    const { km, durationMin, source } = await getRoadDistanceKm(pickup, dropoff);
    if (km > 0) {
      setRouteInfo({
        distance: `${km.toFixed(2)} km`,
        duration: `${durationMin} mins`,
        eta: new Date(Date.now() + durationMin * 60 * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        source,
      });
      applyTripPricing(km, service || serviceType || '');
    }
  }, [applyTripPricing, serviceType]);

  // Recalculate pricing when package details change (lightweight — no API calls)
  useEffect(() => {
    const km = Number(pricingBreakdown.distance) || Number(distance) || 0;
    if (km > 0) {
      applyTripPricing(km, serviceType || '');
    }
  }, [formData.packageSize, formData.packageWeight, formData.packageType, serviceType, pricingBreakdown.distance, distance, applyTripPricing]);

  const effectiveDistanceKm = useMemo(() => {
    const fromBreakdown = Number(pricingBreakdown.distance);
    const fromState = Number(distance);
    if (Number.isFinite(fromBreakdown) && fromBreakdown > 0) return fromBreakdown;
    if (Number.isFinite(fromState) && fromState > 0) return fromState;
    return 0;
  }, [pricingBreakdown.distance, distance]);

  const displayedFare = useMemo(() => {
    if (effectiveDistanceKm > 0) {
      return computeTripFare(effectiveDistanceKm, getServiceMultiplier(serviceType), { pricingSettings }).total;
    }
    if (fare != null && fare > 0) return fare;
    return pricingBreakdown.total || LOCAL_BASE_FARE;
  }, [
    effectiveDistanceKm,
    serviceType,
    formData.packageSize,
    formData.packageWeight,
    formData.packageType,
    fare,
    pricingBreakdown.total,
    pricingSettings,
    LOCAL_BASE_FARE,
  ]);

  const parcelPricing = useMemo(
    () => buildParcelOrderPricing({ deliveryFee: displayedFare, itemTotal: 0 }),
    [displayedFare],
  );
  const customerGrandTotal = parcelPricing.grandTotal;

  const getQuotedFare = useCallback((distanceKm = effectiveDistanceKm) => {
    const km = Number(distanceKm);
    if (Number.isFinite(km) && km > 0) {
      return computeTripFare(km, getServiceMultiplier(serviceType), { pricingSettings }).total;
    }
    if (displayedFare > 0) return displayedFare;
    if (fare != null && fare > 0) return fare;
    return pricingBreakdown.total || LOCAL_BASE_FARE;
  }, [
    effectiveDistanceKm,
    displayedFare,
    serviceType,
    formData.packageSize,
    formData.packageWeight,
    formData.packageType,
    fare,
    pricingBreakdown.total,
    pricingSettings,
    LOCAL_BASE_FARE,
  ]);

  // Google Maps integration state
  const [googleMaps, setGoogleMaps] = useState(null);
  const [directionsService, setDirectionsService] = useState(null);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [trafficLayer, setTrafficLayer] = useState(null);
  const [routeInfo, setRouteInfo] = useState({ duration: '', distance: '', eta: '' });

  // Track if we're currently selecting (to prevent re-fetching suggestions)
  const isSelectingRef = useRef(false);

  // Google Places Autocomplete state - Enhanced with unified API management (using new Place API)
  const [autocompleteService, setAutocompleteService] = useState(null);
  const [geocoderService, setGeocoderService] = useState(null);
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [pickupAutocomplete, setPickupAutocomplete] = useState(null);
  const [dropoffAutocomplete, setDropoffAutocomplete] = useState(null);
  const [isManualPinMode, setIsManualPinMode] = useState(false);
  const [activeManualField, setActiveManualField] = useState('');

  // Order tracking states
  const [showOrderTracking, setShowOrderTracking] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('pending');
  const [riderInfo, setRiderInfo] = useState({
    name: 'Adebayo O.',
    rating: 4.9,
    phone: '+234-XXX-XXX-XXXX'
  });
  const [showPlaceSuggestions, setShowPlaceSuggestions] = useState(false);
  const [activeField, setActiveField] = useState(''); // 'pickup' or 'dropoff'
  const inputDebounceTimer = useRef(null);
  const pricingTimerRef = useRef(null);
  const routeTimerRef = useRef(null);
  const vendorLookupKeyRef = useRef(null);
  const bookingFormRef = useRef(null);
  const [isFormFocused, setIsFormFocused] = useState(false);
  const pendingBookingIdRef = useRef(null);
  const [gpsPermissionAsked, setGpsPermissionAsked] = useState(false);

  // Map refs
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.relative')) {
        setShowPickupSuggestions(false);
        setShowDropoffSuggestions(false);
        setShowPlaceSuggestions(false);
        setActiveField('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Paystack inline.js inside the booking form (required for inline checkout)
  useEffect(() => {
    const form = bookingFormRef.current;
    if (!form || document.getElementById('paystack-inline-js')) return;

    const script = document.createElement('script');
    script.id = 'paystack-inline-js';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    form.appendChild(script);
  }, []);

  // Calculate final route using Google Directions API
  const calculateFinalRoute = async () => {
    const { pickup, dropoff } = getBookingCoords();
    if (!pickup || !dropoff || !directionsService) {
      console.log('🚫 Cannot calculate route: missing coordinates or directions service');
      return false;
    }

    try {
      const pickupLatLng = pickup;
      const dropoffLatLng = dropoff;

      console.log('🗺️ Calculating Google Maps route:', {
        pickup: pickupLatLng,
        dropoff: dropoffLatLng
      });

      const result = await directionsService.route({
        origin: pickupLatLng,
        destination: dropoffLatLng,
        travelMode: google.maps.TravelMode.DRIVING,
        region: 'NG',
        drivingOptions: {
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
          departureTime: new Date()
        }
      });

      if (result.status === 'OK') {
        const route = result.routes[0];
        const leg = route.legs[0];

        console.log('✅ Google Maps route calculated successfully:', {
          distance: leg.distance.text,
          duration: leg.duration.text,
          startAddress: leg.start_address,
          endAddress: leg.end_address
        });

        // Update route info with actual distance and ETA
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
          eta: new Date(Date.now() + leg.duration.value * 1000).toLocaleTimeString()
        });

        // Update the fee based on actual distance
        const actualDistance = leg.distance.value / 1000; // Convert meters to kilometers
        applyTripPricing(actualDistance, serviceType || '');

        // Draw the route on the map
        if (directionsRenderer) {
          directionsRenderer.setDirections(result);
          console.log('🎨 Route displayed on map');
        }

        return true;
      } else {
        console.error('❌ Google Directions API failed:', result.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Google Directions API error:', error);
      // Try OpenRouteService as fallback
      const openRouteServiceSuccess = await calculateRouteWithORS();
      if (openRouteServiceSuccess) {
        await Swal.fire({
          title: 'Using Backup Route Service',
          text: 'The primary route service is unavailable. Using backup service instead.',
          icon: 'info',
          confirmButtonText: 'OK',
          confirmButtonColor: '#E30613'
        });
        return true;
      }
      return false;
    }
  };

  // Fallback route calculation using Haversine distance
  // No external API needed - works 100% offline
  // Provides instant, reliable distance and pricing calculations
  // Simulate rider movement along the route
  const simulateRiderMovement = (routeCoordinates) => {
    let currentIndex = 0;
    const riderMarker = new L.Marker([routeCoordinates[0][0], routeCoordinates[0][1]], {
      icon: L.icon({
        iconUrl: '/rider-icon.png',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })
    }).addTo(mapInstanceRef.current);

    const moveRider = () => {
      if (currentIndex < routeCoordinates.length - 1) {
        currentIndex++;
        const newPosition = routeCoordinates[currentIndex];
        riderMarker.setLatLng([newPosition[0], newPosition[1]]);

        // Update Firebase with new position
        if (deliveryRef.current) {
          updateDeliveryLocation(deliveryRef.current, {
            lat: newPosition[0],
            lng: newPosition[1]
          });
        }

        setTimeout(moveRider, 1000); // Move every second
      }
    };

    setTimeout(moveRider, 1000);
    return riderMarker;
  };

  const calculateRouteWithORS = async () => {
    const { pickup, dropoff } = getBookingCoords();
    if (!pickup || !dropoff) {
      console.warn('❌ Missing coordinates for route calculation');
      return false;
    }

    try {
      console.log('Calculating route with OpenRouteService...');

      // Call ORS API directly
      const response = await fetch(`https://api.openrouteservice.org/v2/directions/driving-car`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ORS_API_KEY,
          'Accept': 'application/json, application/geo+json'
        },
        body: JSON.stringify({
          coordinates: [
            [pickup.lng, pickup.lat],  // ORS uses [lng, lat] order
            [dropoff.lng, dropoff.lat]
          ],
          radiuses: [-1, -1],
          instructions: false,
          units: 'km'
        })
      });

      if (!response.ok) {
        throw new Error(`OpenRouteService API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        const summary = route.summary;

        // Distance in meters from ORS
        const distanceMeters = summary.distance;
        const distanceKm = distanceMeters / 1000;

        // Duration in minutes
        const durationMinutes = Math.round(summary.duration / 60);

        // Calculate ETA
        const etaTime = new Date(Date.now() + summary.duration * 1000);

        // Update route info
        setRouteInfo({
          distance: `${distanceKm.toFixed(2)} km`,
          duration: `${durationMinutes} mins`,
          eta: etaTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        });

        applyTripPricing(distanceKm, serviceType || '');

        console.log('✅ OpenRouteService route calculated:', {
          distance: `${distanceKm.toFixed(2)} km`,
          duration: `${durationMinutes} mins`,
          fee: formatFare(finalFee)
        });

        // Draw the route on the map using the returned geometry
        if (mapInstanceRef.current && mapInstanceRef.current.addSource && route.geometry) {
          try {
            // Decode the geometry (it's in encoded polyline format)
            const coordinates = route.geometry.coordinates;

            // Remove existing route if any
            if (mapInstanceRef.current.getSource('route')) {
              if (mapInstanceRef.current.getLayer('route')) {
                mapInstanceRef.current.removeLayer('route');
              }
              mapInstanceRef.current.removeSource('route');
            }

            // Add new route with actual road geometry
            mapInstanceRef.current.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'LineString',
                  coordinates: coordinates // Already in [lng, lat] format
                }
              }
            });

            mapInstanceRef.current.addLayer({
              id: 'route',
              type: 'line',
              source: 'route',
              layout: {
                'line-join': 'round',
                'line-cap': 'round'
              },
              paint: {
                'line-color': '#E30613',
                'line-width': 5,
                'line-opacity': 0.8
              }
            });

            console.log('✅ Route drawn on map with actual road geometry');
          } catch (mapError) {
            console.warn('⚠️ Could not draw route on map:', mapError.message);
          }
        }

        return true;
      }

      console.warn('⚠️ OpenRouteService returned no routes');
      return false;

    } catch (error) {
      console.error('❌ OpenRouteService error:', error.message);

      try {
        const road = await getRoadDistanceKm(pickup, dropoff);
        if (road.km > 0) {
          applyTripPricing(road.km, serviceType || '');
          setRouteInfo({
            distance: `${road.km.toFixed(2)} km`,
            duration: `${road.durationMin} mins`,
            eta: new Date(Date.now() + road.durationMin * 60 * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            source: road.source,
          });
          console.log('✅ OSRM/estimate route used for pricing:', road);
          return true;
        }
      } catch (osrmError) {
        console.warn('OSRM pricing fallback failed:', osrmError?.message);
      }

      // Fallback to Haversine calculation if ORS fails
      console.log('🔄 Falling back to Haversine distance calculation...');

      const distanceKm = calculateHaversineDistance(
        pickup.lat,
        pickup.lng,
        dropoff.lat,
        dropoff.lng
      );

      // Add 30% to account for actual road distance
      const actualDistanceKm = distanceKm * 1.3;
      const durationMinutes = Math.round((actualDistanceKm / 30) * 60);
      const etaTime = new Date(Date.now() + durationMinutes * 60 * 1000);

      setRouteInfo({
        distance: `${actualDistanceKm.toFixed(2)} km`,
        duration: `${durationMinutes} mins`,
        eta: etaTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      });

      // Use unified pricing function to ensure consistency
      setDistance(actualDistanceKm);
      if (serviceType) {
        calculateServiceSpecificPricing(serviceType, actualDistanceKm);
      } else {
        applyTripPricing(actualDistanceKm, serviceType || '');
      }

      console.log('✅ Fallback calculation successful with unified pricing:', {
        distance: `${actualDistanceKm.toFixed(2)} km`,
        duration: `${durationMinutes} mins`
      });

      // Draw simple straight line
      if (mapInstanceRef.current && mapInstanceRef.current.addSource) {
        try {
          if (mapInstanceRef.current.getSource('route')) {
            if (mapInstanceRef.current.getLayer('route')) {
              mapInstanceRef.current.removeLayer('route');
            }
            mapInstanceRef.current.removeSource('route');
          }

          mapInstanceRef.current.addSource('route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [pickup.lng, pickup.lat],
                  [dropoff.lng, dropoff.lat]
                ]
              }
            }
          });

          mapInstanceRef.current.addLayer({
            id: 'route',
            type: 'line',
            source: 'route',
            layout: {
              'line-join': 'round',
              'line-cap': 'round'
            },
            paint: {
              'line-color': '#E30613',
              'line-width': 4,
              'line-dasharray': [2, 2] // Dashed line for estimate
            }
          });

          console.log('✅ Fallback route line drawn on map');
        } catch (mapError) {
          console.warn('⚠️ Could not draw fallback route:', mapError.message);
        }
      }

      return true; // Return true even with fallback so pricing still works
    }
  };

  // Update estimated fee whenever markers change (sync only, debounced)
  useEffect(() => {
    const { pickup, dropoff } = getBookingCoords();
    if (!pickup || !dropoff) {
      if (!pickupCoords && !dropoffCoords) {
        setPricingBreakdown({
          baseFee: LOCAL_BASE_FARE,
          distanceFee: 0,
          serviceFee: 0,
          total: LOCAL_BASE_FARE,
          distance: 0,
          isCalculating: false
        });
        setEstimatedFare(LOCAL_BASE_FARE);
        setDistance(0);
        setFare(null);
      }
      return;
    }

    if (pricingTimerRef.current) clearTimeout(pricingTimerRef.current);
    pricingTimerRef.current = setTimeout(() => {
      updatePricingFromCoords(pickup, dropoff, serviceType);

      const vendorKey = `${pickup.lat.toFixed(3)},${pickup.lng.toFixed(3)}`;
      if (vendorLookupKeyRef.current !== vendorKey) {
        vendorLookupKeyRef.current = vendorKey;
        findNearbyVendors(pickup, 10)
          .then((vendorMatch) => {
            if (vendorMatch.success && vendorMatch.vendors.length > 0) {
              const closestVendor = vendorMatch.closestVendor;
              showGo7Toast(
                `📦 ${vendorMatch.totalVendorsFound} vendor${vendorMatch.totalVendorsFound !== 1 ? 's' : ''} nearby! Closest: ${closestVendor.name} (${closestVendor.distanceFormatted})`,
                'info',
                3000
              );
            }
          })
          .catch(() => {});
      }
    }, 250);

    return () => {
      if (pricingTimerRef.current) clearTimeout(pricingTimerRef.current);
    };
  }, [pickupCoords, dropoffCoords, serviceType, formData.packageSize, formData.packageWeight, formData.packageType, updatePricingFromCoords, getBookingCoords]);

  // Initialize MapTiler map with SDK
  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      console.log('Initializing MapTiler SDK map centered on Abeokuta...');

      // Configure MapTiler SDK
      maptilersdk.config.apiKey = MAPTILER_KEY;

      // Create MapTiler map instance
      try {
        mapInstanceRef.current = new maptilersdk.Map({
          container: mapRef.current,
          style: `https://api.maptiler.com/maps/${MAPTILER_STYLE_ID}/style.json?key=${MAPTILER_KEY}`,
          center: [ABEOKUTA_CENTER[1], ABEOKUTA_CENTER[0]], // MapTiler uses [lng, lat]
          zoom: DEFAULT_ZOOM,
          maxZoom: 19,
          minZoom: 10
        });
        // Reliable map-type flag — used everywhere instead of duck-typing
        mapInstanceRef.current._isMapTilerSDK = true;

        // Add load event listener
        mapInstanceRef.current.on('load', () => {
          console.log('MapTiler map loaded successfully');
          // Hide loading indicator
          const loadingEl = document.getElementById('map-loading');
          if (loadingEl) {
            loadingEl.style.display = 'none';
          }

          // 1️⃣ Create simple canvas-based marker icons (more reliable than loading images)
          const loadMarkerImages = () => {
            try {
              const size = 40;
              
              // Create canvas for bike icon (red circle)
              const bikeCanvas = document.createElement('canvas');
              bikeCanvas.width = size;
              bikeCanvas.height = size;
              const bikeCtx = bikeCanvas.getContext('2d');
              bikeCtx.fillStyle = '#E30613';
              bikeCtx.beginPath();
              bikeCtx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
              bikeCtx.fill();
              bikeCtx.strokeStyle = '#FFFFFF';
              bikeCtx.lineWidth = 3;
              bikeCtx.stroke();

              // Create canvas for bag icon (orange circle)
              const bagCanvas = document.createElement('canvas');
              bagCanvas.width = size;
              bagCanvas.height = size;
              const bagCtx = bagCanvas.getContext('2d');
              bagCtx.fillStyle = '#FF9800';
              bagCtx.beginPath();
              bagCtx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
              bagCtx.fill();
              bagCtx.strokeStyle = '#FFFFFF';
              bagCtx.lineWidth = 3;
              bagCtx.stroke();

              // Create canvas for shop icon (green circle)
              const shopCanvas = document.createElement('canvas');
              shopCanvas.width = size;
              shopCanvas.height = size;
              const shopCtx = shopCanvas.getContext('2d');
              shopCtx.fillStyle = '#4CAF50';
              shopCtx.beginPath();
              shopCtx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
              shopCtx.fill();
              shopCtx.strokeStyle = '#FFFFFF';
              shopCtx.lineWidth = 3;
              shopCtx.stroke();

              // Add images to map using ImageData
              if (mapInstanceRef.current) {
                mapInstanceRef.current.addImage('bike', bikeCanvas.getContext('2d').getImageData(0, 0, size, size));
                mapInstanceRef.current.addImage('bag', bagCanvas.getContext('2d').getImageData(0, 0, size, size));
                mapInstanceRef.current.addImage('shop', shopCanvas.getContext('2d').getImageData(0, 0, size, size));
                console.log('Canvas-based marker icons created successfully');

                // Now add all markers and other layers after images are loaded
                setTimeout(() => {
                  if (typeof addMapLayers === 'function') {
                    addMapLayers();
                  }
                }, 100);
              }
            } catch (error) {
              console.error('Error in loadMarkerImages:', error);
            }
          };

          // Function to add all map layers - DEFINED BEFORE USE
          const addMapLayers = () => {
            // Add markers after all images are loaded

            // Check if source already exists before adding
            if (!mapInstanceRef.current.getSource('rider1-data')) {
              // Rider 1 marker
              mapInstanceRef.current.addSource('rider1-data', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {
                    name: 'Rider 1',
                    description: 'Go7 Delivery Zone: Panseke'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [3.3475, 7.1555] // [lng, lat]
                  }
                }
              });
            }

            // Add layer only if it doesn't exist
            if (!mapInstanceRef.current.getLayer('rider1-layer')) {
              mapInstanceRef.current.addLayer({
                id: 'rider1-layer',
                type: 'symbol',
                source: 'rider1-data',
                layout: {
                  'icon-image': 'bike',
                  'icon-size': 0.12,
                  'icon-allow-overlap': true
                }
              });
            }

            // Rider 2 marker
            if (!mapInstanceRef.current.getSource('rider2-data')) {
              mapInstanceRef.current.addSource('rider2-data', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {
                    name: 'Rider 2',
                    description: 'Go7 Delivery Zone: Adatan'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [3.3405, 7.1650] // [lng, lat]
                  }
                }
              });
            }

            if (!mapInstanceRef.current.getLayer('rider2-layer')) {
              mapInstanceRef.current.addLayer({
                id: 'rider2-layer',
                type: 'symbol',
                source: 'rider2-data',
                layout: {
                  'icon-image': 'bike',
                  'icon-size': 0.12,
                  'icon-allow-overlap': true
                }
              });
            }

            // Bag marker
            if (!mapInstanceRef.current.getSource('bag-data')) {
              mapInstanceRef.current.addSource('bag-data', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {
                    name: 'Pickup Bag',
                    description: 'Go7 Delivery Zone: Ita Iyalode'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [3.3490, 7.1425] // [lng, lat]
                  }
                }
              });
            }

            if (!mapInstanceRef.current.getLayer('bag-layer')) {
              mapInstanceRef.current.addLayer({
                id: 'bag-layer',
                type: 'symbol',
                source: 'bag-data',
                layout: {
                  'icon-image': 'bag',
                  'icon-size': 0.12,
                  'icon-allow-overlap': true
                }
              });
            }

            // Shop marker
            if (!mapInstanceRef.current.getSource('shop-data')) {
              mapInstanceRef.current.addSource('shop-data', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {
                    name: 'Vendor Shop',
                    description: 'Go7 Delivery Zone: Lantoro'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [3.3430, 7.1365] // [lng, lat]
                  }
                }
              });
            }

            if (!mapInstanceRef.current.getLayer('shop-layer')) {
              mapInstanceRef.current.addLayer({
                id: 'shop-layer',
                type: 'symbol',
                source: 'shop-data',
                layout: {
                  'icon-image': 'shop',
                  'icon-size': 0.12,
                  'icon-allow-overlap': true
                }
              });
            }

            // Olumo Rock marker (historic landmark) - using 'shop' icon since 'olumo' not created
            if (!mapInstanceRef.current.getSource('olumo-data')) {
              mapInstanceRef.current.addSource('olumo-data', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {
                    name: 'Olumo Rock',
                    description: 'Go7 Delivery Zone: Historic Landmark - Olumo Rock'
                  },
                  geometry: {
                    type: 'Point',
                    coordinates: [3.351, 7.156] // [lng, lat] - Olumo Rock coordinates
                  }
                }
              });
            }

            if (!mapInstanceRef.current.getLayer('olumo-layer')) {
              mapInstanceRef.current.addLayer({
                id: 'olumo-layer',
                type: 'symbol',
                source: 'olumo-data',
                layout: {
                  'icon-image': 'shop', // Using 'shop' icon as fallback
                  'icon-size': 0.15, // Slightly larger for the landmark
                  'icon-allow-overlap': true
                }
              });
            }

            // 2️⃣ Add route line between Rider 1 and Bag
            if (!mapInstanceRef.current.getSource('route-data')) {
              mapInstanceRef.current.addSource('route-data', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [3.3475, 7.1555], // Rider 1
                      [3.3490, 7.1425]  // Bag
                    ]
                  }
                }
              });
            }

            if (!mapInstanceRef.current.getLayer('route-layer')) {
              mapInstanceRef.current.addLayer({
                id: 'route-layer',
                type: 'line',
                source: 'route-data',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': '#FF4D4F',
                  'line-width': 3,
                  'line-dasharray': [2, 2]
                }
              });
            }

            // 3️⃣ Add zone labels
            const zones = [
              { name: 'Adatan', coordinates: [3.346, 7.169] },
              { name: 'Ijemo', coordinates: [3.344, 7.164] },
              { name: 'Panseke', coordinates: [3.341, 7.157] },
              { name: 'Ita Iyalode', coordinates: [3.348, 7.151] },
              { name: 'Olumo Rock', coordinates: [3.351, 7.156] },
              { name: 'Kemta', coordinates: [3.352, 7.139] },
              { name: 'Lantoro', coordinates: [3.342, 7.133] }
            ];

            // Add all zones as a single source
            if (!mapInstanceRef.current.getSource('zone-labels')) {
              mapInstanceRef.current.addSource('zone-labels', {
                type: 'geojson',
                data: {
                  type: 'FeatureCollection',
                  features: zones.map(zone => ({
                    type: 'Feature',
                    properties: {
                      name: zone.name
                    },
                    geometry: {
                      type: 'Point',
                      coordinates: zone.coordinates
                    }
                  }))
                }
              });
            }

            // Add the text layer for zone labels
            if (!mapInstanceRef.current.getLayer('zone-labels-layer')) {
              mapInstanceRef.current.addLayer({
                id: 'zone-labels-layer',
                type: 'symbol',
                source: 'zone-labels',
                layout: {
                  'text-field': ['get', 'name'],
                  'text-size': 12,
                  'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
                  'text-offset': [0, 0],
                  'text-anchor': 'center',
                  'text-allow-overlap': false
                },
                paint: {
                  'text-color': '#333333',
                  'text-halo-color': '#ffffff',
                  'text-halo-width': 2
                }
              });
            }

            // 4️⃣ Add delivery area boundary
            if (!mapInstanceRef.current.getSource('delivery-area')) {
              mapInstanceRef.current.addSource('delivery-area', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Polygon',
                    coordinates: [[
                      [ABEOKUTA_BOUNDS.west, ABEOKUTA_BOUNDS.north],  // NW corner
                      [ABEOKUTA_BOUNDS.east, ABEOKUTA_BOUNDS.north],  // NE corner
                      [ABEOKUTA_BOUNDS.east, ABEOKUTA_BOUNDS.south],  // SE corner
                      [ABEOKUTA_BOUNDS.west, ABEOKUTA_BOUNDS.south],  // SW corner
                      [ABEOKUTA_BOUNDS.west, ABEOKUTA_BOUNDS.north]   // Close polygon
                    ]]
                  }
                }
              });
            }

            // Add delivery area boundary layer (semi-transparent)

            // Add delivery area boundary layer (Go7 cream style)
            if (!mapInstanceRef.current.getLayer('delivery-area-fill')) {
              mapInstanceRef.current.addLayer({
                id: 'delivery-area-fill',
                type: 'fill',
                source: 'delivery-area',
                paint: {
                  'fill-color': '#FFF5F2', // Go7 cream color
                  'fill-opacity': 0.25,    // Subtle but visible
                  'fill-outline-color': '#E30613' // Go7 red outline
                }
              });
            }

            // Add delivery area boundary outline (Go7 style)
            if (!mapInstanceRef.current.getLayer('delivery-area-outline')) {
              mapInstanceRef.current.addLayer({
                id: 'delivery-area-outline',
                type: 'line',
                source: 'delivery-area',
                paint: {
                  'line-color': '#E30613', // Go7 red
                  'line-width': 3,
                  'line-dasharray': [8, 4] // Larger dashes for cartoon feel
                }
              });
            }

            // 5️⃣ Add click events for all markers
            const markerLayers = ['rider1-layer', 'rider2-layer', 'bag-layer', 'shop-layer', 'olumo-layer'];

            markerLayers.forEach(layerId => {
              mapInstanceRef.current.on('click', layerId, (e) => {
                // Get clicked feature
                const features = mapInstanceRef.current.queryRenderedFeatures(e.point, { layers: [layerId] });
                if (!features.length) return;

                const feature = features[0];

                // Create popup content
                const popupContent = `
                  <div class="bg-white p-3 rounded-lg shadow-lg">
                    <h4 class="font-bold text-red-600">${feature.properties.name}</h4>
                    <p>${feature.properties.description}</p>
                  </div>
                `;

                // Create popup using MapTiler SDK
                new maptilersdk.Popup()
                  .setLngLat(feature.geometry.coordinates)
                  .setHTML(popupContent)
                  .addTo(mapInstanceRef.current);
              });

              // Change cursor on hover
              mapInstanceRef.current.on('mouseenter', layerId, () => {
                mapInstanceRef.current.getCanvas().style.cursor = 'pointer';
              });

              mapInstanceRef.current.on('mouseleave', layerId, () => {
                mapInstanceRef.current.getCanvas().style.cursor = '';
              });
            });
          };

          // Start loading marker images
          loadMarkerImages();
        });

        // Add click handler for MapTiler SDK
        mapInstanceRef.current.on('click', (e) => {
          const { lng, lat } = e.lngLat; // MapTiler SDK uses lngLat
          console.log('MapTiler map clicked at:', lat, lng);
          handleMapClick(lat, lng);
        });

      } catch (error) {
        console.error('MapTiler SDK failed, falling back to Leaflet:', error);
        // Fallback to Leaflet with CartoDB tiles
        initLeafletFallback();
      }
    }

    // Fallback Leaflet initialization function
    function initLeafletFallback() {
      mapInstanceRef.current = L.map(mapRef.current, {
        center: ABEOKUTA_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        maxZoom: 19,
        minZoom: 10,
        preferCanvas: true
      });

      // Create custom panes for proper layer ordering
      mapInstanceRef.current.createPane('basePane').style.zIndex = 100;
      mapInstanceRef.current.createPane('trafficPane').style.zIndex = 200;
      mapInstanceRef.current.createPane('routePane').style.zIndex = 300;
      mapInstanceRef.current.createPane('markerPane').style.zIndex = 400;

      // Add MapTiler custom style as base layer for consistency
      const mapTilerBaseLayer = L.tileLayer(MAP_STYLES.customMapTiler, {
        attribution: '&copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        minZoom: 8,
        pane: 'basePane' // Use custom base pane
      });

      // Add reliable fallback tiles with lower z-index
      const fallbackTileLayer = L.tileLayer(MAP_STYLES.fallback, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
        minZoom: 8,
        subdomains: 'abcd',
        pane: 'basePane' // Use custom base pane
      });

      // Try MapTiler first, fallback if needed
      try {
        mapTilerBaseLayer.addTo(mapInstanceRef.current);
        console.log('MapTiler base layer added to Leaflet map');
      } catch (error) {
        console.warn('MapTiler layer failed, using fallback:', error);
        fallbackTileLayer.addTo(mapInstanceRef.current);
      }

      // Hide loading indicator
      setTimeout(() => {
        const loadingEl = document.getElementById('map-loading');
        if (loadingEl) {
          loadingEl.style.display = 'none';
        }
      }, 1000);

      // Add geolocation control
      const geoControl = L.control({ position: 'topleft' });
      geoControl.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
        div.style.backgroundColor = 'white';
        div.style.width = '40px';
        div.style.height = '40px';
        div.style.cursor = 'pointer';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.fontSize = '18px';
        div.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>';
        div.title = 'Use My Location';
        div.onclick = function () {
          useCurrentLocation('pickup');
        };
        return div;
      };
      geoControl.addTo(mapInstanceRef.current);

      // Add click handler for Leaflet fallback
      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng; // Leaflet uses latlng
        console.log('Leaflet map clicked at:', lat, lng);
        handleMapClick(lat, lng);
      });
    }
  }, []);

  // 🚀 ENHANCED GOOGLE PLACES AUTOCOMPLETE INITIALIZATION (ABEOKUTA OPTIMIZED)
  useEffect(() => {
    let isMounted = true;

    const initializeEnhancedPlaces = async () => {
      try {
        console.log('🌍 Initializing enhanced Google Places with Abeokuta bounds...');

        // Load Google Maps script dynamically if not already loaded
        if (!window.google || !window.google.maps) {
          console.log('📡 Loading Google Maps API...');
          
          // Check if script already exists
          const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
          if (!existingScript) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry,directions&callback=initMap&loading=async`;
            script.async = true;
            script.defer = true;

            await Promise.race([
              new Promise((resolve, reject) => {
                window.initMap = resolve;
                script.onerror = () => reject(new Error('Google Maps script failed to load'));
                document.head.appendChild(script);
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Google Maps API timeout')), 10000)
              )
            ]);
            
            console.log('✅ Google Maps script loaded');
          } else {
            // Wait for existing script to load
            await Promise.race([
              new Promise((resolve) => {
                if (window.google && window.google.maps) {
                  resolve();
                } else {
                  window.initMap = resolve;
                }
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Google Maps API timeout')), 10000)
              )
            ]);
          }
        } else {
          console.log('✅ Google Maps already loaded');
        }

        if (!isMounted) return;

        // Initialize services
        // Note: Using new google.maps.places.Place API instead of deprecated PlacesService
        // as per Google's recommendation (March 2025+)
        const autocompleteService = new google.maps.places.AutocompleteService();
        const geocoderService = new google.maps.Geocoder();
        const directionsService = new google.maps.DirectionsService();

        setAutocompleteService(autocompleteService);
        setGeocoderService(geocoderService);
        setDirectionsService(directionsService);

        // Create Abeokuta bounds for autocomplete
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(abeokutaBounds.south, abeokutaBounds.west),
          new google.maps.LatLng(abeokutaBounds.north, abeokutaBounds.east)
        );

        // Enhanced autocomplete options with strict Abeokuta bounds
        const autocompleteOptions = {
          componentRestrictions: { country: "NG" },
          bounds: bounds,
          strictBounds: false,
          types: ['establishment', 'geocode'], // Include businesses and addresses
          fields: ['place_id', 'formatted_address', 'geometry', 'name', 'types']
        };

        console.log('✅ Enhanced Google Places services initialized with Abeokuta bounds');

        // Set up optimized place search function
        window.searchPlacesOptimized = async (query, fieldType) => {
          if (!query || query.length < 3) return [];

          try {
            const request = {
              input: query,
              ...autocompleteOptions
            };

            return new Promise((resolve) => {
              autocompleteService.getPlacePredictions(request, (predictions, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
                  console.log(`🔍 Found ${predictions.length} places for "${query}"`);
                  resolve(predictions.map(prediction => ({
                    place_id: prediction.place_id,
                    description: prediction.description,
                    formatted_address: prediction.structured_formatting.main_text,
                    secondary_text: prediction.structured_formatting.secondary_text,
                    types: prediction.types
                  })));
                } else {
                  console.warn('Places search failed:', status);
                  resolve([]);
                }
              });
            });
          } catch (error) {
            console.error('Places search error:', error);
            return [];
          }
        };

        // Enhanced place details function with validation using new Place API
        window.getPlaceDetailsOptimized = async (placeId) => {
          try {
            const place = new google.maps.places.Place({
              id: placeId
            });
            
            await place.fetchFields({
              fields: ['displayName', 'formattedAddress', 'location', 'types', 'addressComponents']
            });
            
            const coords = {
              lat: place.location.lat(),
              lng: place.location.lng()
            };

            // Validate coordinates are within Abeokuta bounds
            const validation = await validateAbeokutaZone(
              coords.lat,
              coords.lng,
              place.formattedAddress || place.displayName || 'Location'
            );

            if (validation.snapped && validation.correctedCoords) {
              coords.lat = validation.correctedCoords.lat;
              coords.lng = validation.correctedCoords.lng;
            }

            return {
              name: place.displayName,
              formatted_address: place.formattedAddress,
              geometry: {
                location: place.location
              },
              types: place.types,
              address_components: place.addressComponents,
              coordinates: coords,
              isValid: validation.valid,
              isAbeokuta: validation.valid || isWithinAbeokutaServiceArea(coords.lat, coords.lng),
              confirmedAddress: place.formattedAddress || place.displayName
            };
          } catch (error) {
            console.error('Place details failed:', error);
            return null;
          }
        };

        console.log('🎯 Enhanced Google Places system ready with Abeokuta optimization');

      } catch (error) {
        console.warn('⚠️ Google Maps API timeout - maps will use fallback');
        console.error('Error details:', error.message);
        // Continue with fallback - the app will use local landmark data
      }
    };

    initializeEnhancedPlaces();

    return () => {
      isMounted = false;
    };
  }, []);

  /*
   * 🚀 HYBRID ROUTING SYSTEM FOR GO7 DELIVERY BOOKING
   * ================================================
   * 
   * This system implements a two-phase routing approach optimized for cost efficiency and user experience:
   * 
   * 1️⃣ QUICK PREVIEW PHASE (Immediate, Free, Offline)
   *    - Triggered when pickup/dropoff markers change
   *    - Uses Haversine formula for instant distance calculation
   *    - Formula: distance = 6371 * 2 * asin(sqrt(...))
   *    - Pricing: ₦300 base + ₦120/km + ₦20/min + 5% platform fee
   *    - Shows "Estimated Fee" immediately under booking form
   *    - No API calls = zero cost and instant feedback
   * 
   * 2️⃣ FINAL ROUTE PHASE (After user confirms "Book Delivery")
   *    - Calls Google Directions API with Nigerian region preference
   *    - Parameters: origin/destination coords, mode=driving, region=NG, traffic_model=best_guess  
   *    - Renders accurate polyline on existing Leaflet + MapTiler map
   *    - Displays Google's ETA, duration, and precise distance
   *    - Replaces preview fee with accurate fee using returned distance
   * 
   * 3️⃣ FAIL-SAFE MECHANISM
   *    - If Google Directions fails (network/quota), falls back to OpenRouteService
   *    - Notifies user with SweetAlert: "Using backup route service"
   *    - Maintains service reliability and user confidence
   * 
   * 4️⃣ REAL-TIME RIDER TRACKING (Ready for Firebase integration)
   *    - Preserves existing Firebase simulation system
   *    - Updates rider icon position along new Google polyline
   *    - Maintains tracking accuracy with accurate route data
   * 
   * 5️⃣ STYLING & UX
   *    - Go7 color scheme: #E30613 for active routes
   *    - ETA + fee displayed in floating card on map
   *    - Mobile responsive design maintained
   *    - Smooth transitions between preview and final routing
   * 
   * 💡 BENEFITS:
   *    - Instant user feedback during location selection
   *    - Cost-effective (only uses paid APIs after booking confirmation)
   *    - Accurate final routing with traffic consideration
   *    - Reliable fallback system for service continuity
   *    - Ready for conversion to TypeScript (.tsx)
   */

  // Route calculation when both coordinates are available (debounced — avoids API storms)
  useEffect(() => {
    const { pickup, dropoff } = getBookingCoords();
    if (!pickup || !dropoff) {
      if (mapInstanceRef.current && mapInstanceRef.current.getSource) {
        try {
          if (mapInstanceRef.current.getLayer('route')) mapInstanceRef.current.removeLayer('route');
          if (mapInstanceRef.current.getSource('route')) mapInstanceRef.current.removeSource('route');
        } catch (_) {}
      }
      if (routePolyline && mapInstanceRef.current && typeof mapInstanceRef.current.removeLayer === 'function') {
        try { mapInstanceRef.current.removeLayer(routePolyline); } catch (_) {}
        setRoutePolyline(null);
      }
      return;
    }

    if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    routeTimerRef.current = setTimeout(() => {
      // Keep location-selection previews off Google Directions. The accurate
      // Google route is requested once, when the customer confirms the booking.
      calculateRouteWithORS().then((success) => {
        if (!success) console.log('⚠️ Route preview unavailable; keeping Haversine estimate');
      });
    }, 900);

    return () => {
      if (routeTimerRef.current) clearTimeout(routeTimerRef.current);
    };
  }, [pickupCoords, dropoffCoords, directionsService, directionsRenderer]);

  // 🚀 ENHANCED GOOGLE MAPS API INITIALIZATION
  // Initialize Google Maps, Places, and Geocoding services with unified API key
  useEffect(() => {
    // Function to initialize Google Maps services
    const initializeGoogleMapsServices = () => {
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps API loaded successfully in React component');
        console.log('🔑 API Key configured:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? 'Yes' : 'No');
        setGoogleMaps(window.google.maps);

        try {
          // Initialize all Google Maps services with error handling
          const directionsServiceInstance = new window.google.maps.DirectionsService();
          const directionsRendererInstance = new window.google.maps.DirectionsRenderer({
            suppressMarkers: true, // We'll use our own markers
            polylineOptions: {
              strokeColor: '#E30613', // Go7 red color
              strokeWeight: 5,
              strokeOpacity: 0.9
            }
          });

          // Initialize Geocoder service
          const geocoderServiceInstance = new window.google.maps.Geocoder();

          // Initialize Places services with Nigeria restriction
          const autocompleteServiceInstance = new window.google.maps.places.AutocompleteService();

          // Set all services in state
          setDirectionsService(directionsServiceInstance);
          setDirectionsRenderer(directionsRendererInstance);
          setGeocoderService(geocoderServiceInstance);
          setAutocompleteService(autocompleteServiceInstance);

          console.log('✅ All Google Maps services initialized successfully');
          console.log('🔧 Available services:', {
            maps: !!window.google.maps,
            geocoder: !!geocoderServiceInstance,
            places: !!window.google.maps.places,
            autocomplete: !!autocompleteServiceInstance,
            directionsService: !!directionsServiceInstance
          });

        } catch (error) {
          console.error('❌ Error initializing Google Maps services:', error);
        }
      } else {
        console.error('❌ Google Maps API not available in React component');
      }
    };

    // Set up the React component initialization function for the global callback
    window.initGoogleMapsInReact = initializeGoogleMapsServices;

    // Check if Google Maps API is already loaded
    if (window.googleMapsApiReady || (window.google && window.google.maps)) {
      console.log('🔄 Google Maps API already loaded, initializing services...');
      initializeGoogleMapsServices();
    } else {
      console.log('⏳ Waiting for Google Maps API to load...');
    }

    // Clean up on unmount
    return () => {
      if (window.initGoogleMapsInReact) {
        delete window.initGoogleMapsInReact;
      }
      if (inputDebounceTimer.current) {
        clearTimeout(inputDebounceTimer.current);
      }
    };
  }, []);

  // Address suggestions via shared util (Maps JS + rate limits — no CORS REST)
  const fetchAddressSuggestionsLocal = async (query, type) => {
    if (query.length < 3) {
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
      return;
    }

    try {
      const results = await fetchAddressSuggestions(query);
      const filtered = (results || []).map((p) => ({
        id: p.place_id || p.osm_id || p.description,
        text: p.description,
        description: p.description,
        source: p.source || 'google',
        place_id: p.place_id,
        placeId: p.place_id, // selectAddress / Places Details path
        isHybrid: true,
        originalData: p,
        coordinates:
          p.lat != null && p.lon != null
            ? { lat: Number(p.lat), lng: Number(p.lon) }
            : p.coordinates || null,
      }));

      if (type === 'pickup') {
        setPickupSuggestions(filtered);
        setShowPickupSuggestions(filtered.length > 0);
      } else {
        setDropoffSuggestions(filtered);
        setShowDropoffSuggestions(filtered.length > 0);
      }
    } catch (error) {
      console.error('Address suggestion error:', error);
      if (type === 'pickup') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
    }
  };

  // Google Places autocomplete with debouncing and Nigeria restriction
  const handleGooglePlacesAutocomplete = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setActiveField(field.replace('Address', '')); // 'pickup' or 'dropoff'

    // Clear previous timeout
    if (inputDebounceTimer.current) {
      clearTimeout(inputDebounceTimer.current);
    }

    // Debounce the input
    const timer = setTimeout(() => {
      if (value.length >= 3 && autocompleteService) {
        const request = {
          input: value,
          componentRestrictions: { country: 'ng' }, // Restrict to Nigeria
          types: ['establishment', 'geocode'], // Include businesses and addresses
          region: 'ng' // Additional Nigeria preference
        };

        console.log(`Searching Google Places for "${value}" in Nigeria...`);

        autocompleteService.getPlacePredictions(request, (predictions, status) => {
          if (status === googleMaps.places.PlacesServiceStatus.OK && predictions) {
            const suggestions = predictions.map(prediction => ({
              placeId: prediction.place_id,
              description: prediction.description,
              mainText: prediction.structured_formatting.main_text,
              secondaryText: prediction.structured_formatting.secondary_text
            }));

            setPlaceSuggestions(suggestions);
            setShowPlaceSuggestions(true);
          } else {
            console.log(`Google Places search failed, trying MapTiler fallback...`);
            // Fallback to shared suggestion util if Google Places fails
            fetchAddressSuggestionsLocal(value, field.replace('Address', ''));
          }
        });
      } else if (value.length >= 3) {
        console.log('Google Places not available, using shared suggestion util...');
        // Fallback to shared suggestion util if Google Places not available
        fetchAddressSuggestionsLocal(value, field.replace('Address', ''));
      } else {
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
      }
    }, 300);

    inputDebounceTimer.current = timer;
  };

  // Enhanced Google Geocoder for direct address input
  const geocodeAddress = async (address, field) => {
    if (!googleMaps || !address || address.length < 5) {
      console.log('❌ Geocoding requirements not met:', {
        hasGoogleMaps: !!googleMaps,
        hasAddress: !!address,
        addressLength: address?.length
      });
      return null;
    }

    try {
      console.log(`🌍 Geocoding address: "${address}" for ${field}`);

      const geocoder = new googleMaps.Geocoder();

      const result = await new Promise((resolve, reject) => {
        geocoder.geocode(
          {
            address: address,
            componentRestrictions: { country: 'ng' },
            region: 'ng'
          },
          (results, status) => {
            console.log(`📍 Geocoding response for "${address}":`, { status, resultsCount: results?.length });

            if (status === googleMaps.GeocoderStatus.OK && results && results[0]) {
              resolve(results[0]);
            } else {
              console.log(`❌ Geocoding failed for "${address}":`, status);
              reject(new Error(`Geocoding failed: ${status}`));
            }
          }
        );
      });

      const location = result.geometry.location;
      const coords = {
        lat: location.lat(),
        lng: location.lng()
      };

      console.log(`✅ Geocoded "${address}":`, coords, result.formatted_address);
      return {
        coords,
        formattedAddress: result.formatted_address,
        addressComponents: result.address_components
      };

    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Test geocoding API functionality
  const testGeocodingAPI = async () => {
    if (!googleMaps) return;

    try {
      console.log('🧪 Testing Google Geocoding API...');
      const geocoder = new googleMaps.Geocoder();

      geocoder.geocode(
        {
          address: 'Lagos, Nigeria',
          componentRestrictions: { country: 'ng' }
        },
        (results, status) => {
          if (status === googleMaps.GeocoderStatus.OK && results && results[0]) {
            console.log('✅ Geocoding API test successful:', {
              status,
              address: results[0].formatted_address,
              location: {
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
              }
            });
          } else {
            console.error('❌ Geocoding API test failed:', status);
          }
        }
      );
    } catch (error) {
      console.error('❌ Geocoding test error:', error);
    }
  };

  // MapTiler geocoding fallback
  const geocodeWithMapTiler = async (address) => {
    try {
      console.log(`🗺️ MapTiler geocoding: "${address}"`);

      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json?key=nRGZ9lGblbV9lFK2KclL&proximity=3.3619,7.1475&bbox=${MAPTILER_BBOX}&country=ng&limit=1`
      );

      if (!response.ok) throw new Error('MapTiler API error');

      const data = await response.json();

      if (data.features && data.features[0]) {
        const feature = data.features[0];
        const [lng, lat] = feature.center;

        console.log(`✅ MapTiler geocoded "${address}":`, { lat, lng });

        return {
          coordinates: { lat, lng },
          formattedAddress: feature.place_name
        };
      }

      return null;
    } catch (error) {
      console.error('MapTiler geocoding error:', error);
      return null;
    }
  };

  // Place-hint geocoding fallback.
  // Long pasted addresses like "Isale ijeun, Infront of Fatolas petrol Filling
  // station" often fail geocoding as-is, but the area/street name resolves fine.
  // Extract a hint (first comma segment / before landmark phrases) and geocode it
  // biased to Abeokuta so we auto-find the nearest location instead of popping up.
  const geocodePlaceHint = async (address) => {
    const q = String(address || '').trim();
    if (!q) return null;

    let hint = q.split(',')[0].trim();
    hint = hint
      .replace(/\b(infront of|in front of|beside|near|close to|opposite|behind|by|at)\b.*$/i, '')
      .trim();
    if (hint.length < 3) return null;

    const queries = [
      `${hint}, Abeokuta, Ogun, Nigeria`,
      `${hint}, Abeokuta`,
      hint,
    ];

    for (const query of queries) {
      if (geocoderService && googleMaps) {
        try {
          const res = await new Promise((resolve) => {
            geocoderService.geocode(
              { address: query, componentRestrictions: { country: 'ng' }, region: 'ng' },
              (results, status) => {
                if (status === googleMaps.GeocoderStatus.OK && results?.[0]) {
                  const loc = results[0].geometry.location;
                  resolve({
                    coordinates: { lat: loc.lat(), lng: loc.lng() },
                    address: results[0].formatted_address,
                  });
                } else {
                  resolve(null);
                }
              }
            );
          });
          if (res?.coordinates) return res;
        } catch {
          /* continue */
        }
      }
      const mt = await geocodeWithMapTiler(query);
      if (mt?.coordinates) return mt;
    }
    return null;
  };

  // 🎯 ENHANCED GEOCODING WITH GOOGLE GEOCODER AND FALLBACKS
  // Handle Enter key press or field blur for manual address entry with enhanced Google Geocoding
  const handleAddressSubmit = async (field, address) => {
    if (!address || address.trim().length < 3) {
      console.log('Address too short for geocoding');
      return;
    }

    console.log(`🔍 Starting geocoding for ${field}: "${address}"`);

    // Hide all suggestions
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);
    setPickupSuggestions([]);
    setShowPickupSuggestions(false);
    setDropoffSuggestions([]);
    setShowDropoffSuggestions(false);

    // Show loading status
    Swal.fire({
      title: '🔍 Finding address...',
      text: 'Searching for your location',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      let coordinatesFound = false;
      let finalCoordinates = null;
      let finalAddress = address;

      // Precise geocode first — never short-circuit to neighborhood centroids

      // Method 1: Google Geocoder (Primary)
      if (!coordinatesFound && geocoderService && googleMaps) {
        try {
          console.log('🌐 Attempting Google Geocoder...');

          const geocodeResult = await new Promise((resolve, reject) => {
            geocoderService.geocode({
              address: address,
              componentRestrictions: { country: 'ng' },
              region: 'ng'
            }, (results, status) => {
              console.log('🔍 Google Geocoder response:', { status, resultsCount: results?.length || 0 });

              if (status === googleMaps.GeocoderStatus.OK && results && results.length > 0) {
                const result = results[0];
                const location = result.geometry.location;
                const coords = {
                  lat: location.lat(),
                  lng: location.lng()
                };

                console.log('✅ Google Geocoder success:', {
                  address: result.formatted_address,
                  coordinates: coords
                });

                resolve({
                  coordinates: coords,
                  address: result.formatted_address,
                  source: 'Google Geocoder'
                });
              } else if (status === googleMaps.GeocoderStatus.ZERO_RESULTS) {
                console.log('ℹ️ Google Geocoder returned ZERO_RESULTS');
                resolve(null);
              } else {
                console.error('❌ Google Geocoder failed:', status);
                reject(new Error(`Google Geocoder failed: ${status}`));
              }
            });
          });

          if (geocodeResult) {
            finalCoordinates = geocodeResult.coordinates;
            finalAddress = geocodeResult.address;
            coordinatesFound = true;
            console.log('✅ Coordinates found via Google Geocoder:', finalCoordinates);
          }

        } catch (googleError) {
          console.error('❌ Google Geocoder error:', googleError);
        }
      }

      // Method 2: MapTiler Geocoding (Fallback)
      if (!coordinatesFound) {
        try {
          console.log('�️ Attempting MapTiler fallback geocoding...');
          const mapTilerResult = await geocodeWithMapTiler(address);

          if (mapTilerResult && mapTilerResult.coordinates) {
            finalCoordinates = mapTilerResult.coordinates;
            finalAddress = mapTilerResult.address || address;
            coordinatesFound = true;
            console.log('✅ Coordinates found via MapTiler:', finalCoordinates);
          }
        } catch (mapTilerError) {
          console.error('❌ MapTiler geocoding error:', mapTilerError);
        }
      }

      // If the full pasted address didn't geocode, try a place-hint fallback
      // (e.g. "Isale ijeun" from "Isale ijeun, Infront of Fatolas petrol Filling
      // station") so we auto-find the nearest location instead of showing a popup.
      if (!coordinatesFound) {
        console.warn('⚠️ No precise geocode for full address, trying place hint:', address);
        const hintResult = await geocodePlaceHint(address);
        if (hintResult?.coordinates) {
          finalCoordinates = hintResult.coordinates;
          finalAddress = hintResult.address || address;
          coordinatesFound = true;
          console.log('✅ Coordinates found via place-hint fallback:', finalCoordinates);
        }
      }

      // Geocoding failed after all fallbacks — keep the typed address (it is NOT
      // invalid) but leave coordinates unconfirmed. No blocking modal: the user can
      // resolve via the existing Use GPS / Home / Work buttons or drop a pin on the map.
      if (!coordinatesFound) {
        console.warn('⚠️ No coordinates found for:', address);
        Swal.close();
        if (field === 'pickupAddress') {
          setPickupCoordsConfirmed(false);
        } else {
          setDropoffCoordsConfirmed(false);
        }
        return;
      }

      // Handle results
      if (coordinatesFound && finalCoordinates) {
        const snapped = preferLocalAreaCoords(address, finalCoordinates);
        if (snapped?.snapped && snapped.lat != null) {
          finalCoordinates = { lat: snapped.lat, lng: snapped.lng };
          console.log('📍 Corrected coordinate order:', finalCoordinates);
        }

        const serviceCheck = validateServiceLocation({
          lat: finalCoordinates.lat,
          lng: finalCoordinates.lng,
          address: finalAddress,
        });

        if (!serviceCheck.valid) {
          Swal.close();
          showGo7Warning(
            'This address appears outside our Abeokuta delivery area. Please pick a location within Abeokuta or choose from suggestions.',
            '📍 Location Outside Service Area'
          );
          return;
        }

        if (serviceCheck.snapped) {
          finalCoordinates = { lat: serviceCheck.lat, lng: serviceCheck.lng };
        }

        // 📊 LOG RESOLVED COORDINATES FOR CONFIRMATION
        console.log(`📍 COORDINATES RESOLVED for ${field}:`, {
          field,
          address: finalAddress,
          coordinates: {
            lat: finalCoordinates.lat,
            lng: finalCoordinates.lng
          },
          timestamp: new Date().toISOString()
        });

        // Update form data and coordinates
        setFormData(prev => ({ ...prev, [field]: finalAddress }));

        if (field === 'pickupAddress') {
          setConfirmedPickupCoords(finalCoordinates, 'geocode');
          addMarker(finalCoordinates.lat, finalCoordinates.lng, 'pickup');
        } else if (field === 'dropoffAddress') {
          setConfirmedDropoffCoords(finalCoordinates, 'geocode');
          addMarker(finalCoordinates.lat, finalCoordinates.lng, 'dropoff');
        }

        // Auto-fit map after geocoding (pricing + route handled by effects)
        setTimeout(() => {
          fitMapBounds();
        }, 500);

        Swal.close();

        // Success notification
        Swal.fire({
          icon: 'success',
          title: '📍 Location found!',
          text: `${field === 'pickupAddress' ? 'Pickup' : 'Dropoff'} location set successfully`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        });

      } else {
        // 🚨 NO COORDINATES FOUND - SHOW MANUAL PIN OPTION
        console.log('❌ No coordinates found via any geocoding method');
        Swal.close();

        showManualPinDialog(field, address);
      }

    } catch (error) {
      console.error('❌ Geocoding error:', error);
      Swal.close();

      Swal.fire({
        icon: 'error',
        title: '⚠️ Error',
        text: 'Failed to process address. Please try again.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    }
  };

  // 📍 MANUAL PIN DROPPING DIALOG
  // Show dialog for manual pin dropping when geocoding fails
  const showManualPinDialog = (field, address) => {
    Swal.fire({
      icon: 'question',
      title: "Couldn't find this address",
      text: "Drop a pin manually?",
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Address searched:</strong> ${address}</p>
          <p>We couldn't find this exact address. You can:</p>
          <ul style="text-align: left; margin-left: 20px;">
            <li>Click on the map to drop a pin manually</li>
            <li>Try a different address or nearby landmark</li>
            <li>Use the address suggestions while typing</li>
          </ul>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '📍 Drop Pin on Map',
      cancelButtonText: '✏️ Try Different Address',
      confirmButtonColor: '#E30613',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        // Enable manual pin mode
        setIsManualPinMode(true);
        setActiveManualField(field);

        Swal.fire({
          icon: 'info',
          title: '📍 Pin Dropping Mode',
          text: 'Click anywhere on the map to set your location',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true
        });
      }
    });
  };

  // 🚀 ENHANCED ADDRESS INPUT WITH GOOGLE PLACES AUTOCOMPLETE
  // Handle address input with Google Places Autocomplete integration
  const isAuthenticatedForBooking = () =>
    Boolean(user?.uid) &&
    !(typeof isGuestMode === 'function' ? isGuestMode() : Boolean(isGuestMode));

  const openSignInModal = () => {
    setShowAuthSheet(true);
  };

  const promptSignInForBooking = () => {
    pendingSubmitAfterAuth.current = true;
    setShowAuthSheet(true);
  };

  const requireAuthForBooking = () => {
    if (isAuthenticatedForBooking()) return true;
    promptSignInForBooking();
    return false;
  };

  const handleBookNowClick = () => {
    if (!isAuthenticatedForBooking()) {
      promptSignInForBooking();
      return;
    }
    document.getElementById('book-delivery-form')?.requestSubmit();
  };

  useEffect(() => {
    if (!pendingSubmitAfterAuth.current || !isAuthenticatedForBooking()) return;
    pendingSubmitAfterAuth.current = false;
    const timer = setTimeout(() => {
      document.getElementById('book-delivery-form')?.requestSubmit();
    }, 300);
    return () => clearTimeout(timer);
  }, [user?.uid]);

  // Keep focused fields visible above the mobile keyboard
  useEffect(() => {
    const form = bookingFormRef.current;
    if (!form) return undefined;

    const onFocusIn = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      setIsFormFocused(true);
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    };

    const onFocusOut = () => {
      window.setTimeout(() => {
        const active = document.activeElement;
        const stillEditing =
          active instanceof HTMLElement &&
          form.contains(active) &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
        setIsFormFocused(stillEditing);
      }, 150);
    };

    form.addEventListener('focusin', onFocusIn);
    form.addEventListener('focusout', onFocusOut);
    return () => {
      form.removeEventListener('focusin', onFocusIn);
      form.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const handleAuthSuccess = () => {
    setShowAuthSheet(false);
  };

  const handleAddressInput = (field, value) => {
    // Skip if we're currently selecting an address
    if (isSelectingRef.current) {
      return;
    }

    if (inputDebounceTimer.current) {
      clearTimeout(inputDebounceTimer.current);
    }

    setFormData(prev => ({ ...prev, [field]: value }));

    // Mark coords unconfirmed while typing — keeps map pins but pauses pricing/routing
    if (field === 'pickupAddress') {
      setPickupCoordsConfirmed(false);
      setPickupSuggestions([]);
      setShowPickupSuggestions(false);
      setActiveField('pickup');
    } else if (field === 'dropoffAddress') {
      setDropoffCoordsConfirmed(false);
      setDropoffSuggestions([]);
      setShowDropoffSuggestions(false);
      setActiveField('dropoff');
    }

    // Clear place suggestions when switching between inputs
    setPlaceSuggestions([]);
    setShowPlaceSuggestions(false);

    // Fetch suggestions for queries >= 2 characters
    if (value.length >= 2) {
      const debounceTimer = setTimeout(async () => {
        console.log(`🔍 Searching for "${value}" using Google Places Autocomplete...`);

        // 1. First priority: Search local landmarks for instant suggestions
        const landmarkResults = searchLandmarks(value);
        console.log(`� Found ${landmarkResults.length} local landmarks`);

        const landmarkSuggestions = landmarkResults.map(landmark => ({
          id: `landmark-${landmark.id}`,
          placeId: null, // Landmark doesn't have Google Places ID
          description: landmark.name,
          mainText: landmark.shortName,
          secondaryText: landmark.address,
          isLandmark: true,
          landmarkData: landmark,
          priority: 1 // Highest priority
        }));

        // 2. Second priority: Enhanced Google Places API with Abeokuta bounds (if available)
        let googleSuggestions = [];
        if (window.searchPlacesOptimized && value.length >= 3) {
          try {
            console.log('🌐 Calling enhanced Google Places Autocomplete with Abeokuta bounds...');
            const predictions = await window.searchPlacesOptimized(value, field);

            googleSuggestions = predictions.map((prediction, index) => ({
              id: `google-${index}`,
              placeId: prediction.place_id,
              description: prediction.description,
              mainText: prediction.formatted_address || prediction.description,
              secondaryText: prediction.secondary_text || '',
              isLandmark: false,
              isGooglePlace: true,
              prediction: prediction,
              priority: 2 // Second priority
            }));

            console.log(`✅ Enhanced Google Places returned ${googleSuggestions.length} Abeokuta-focused suggestions`);

          } catch (error) {
            console.error('❌ Enhanced Google Places Autocomplete error:', error);
            googleSuggestions = [];
          }
        }

        // 3. MapTiler only if local + Google returned nothing (saves API quota)
        let mapTilerSuggestions = [];
        if (landmarkSuggestions.length === 0 && googleSuggestions.length === 0 && value.length >= 3) {
          try {
            const mapTilerResults = await fetchMapTilerSuggestions(value);
            mapTilerSuggestions = mapTilerResults.map((result, index) => ({
              id: `maptiler-${index}`,
              placeId: null,
              description: result.description,
              mainText: result.mainText,
              secondaryText: result.secondaryText,
              isLandmark: false,
              isMapTiler: true,
              coordinates: result.coordinates,
              priority: 3,
            }));
          } catch (error) {
            console.warn('⚠️ MapTiler fallback error:', error.message);
          }
        }

        // Combine all suggestions with priority ordering
        const allSuggestions = [
          ...landmarkSuggestions,
          ...googleSuggestions,
          ...mapTilerSuggestions
        ].slice(0, 8); // Limit to 8 suggestions

        console.log(`📋 Total suggestions: ${allSuggestions.length} (${landmarkSuggestions.length} landmarks + ${googleSuggestions.length} Google + ${mapTilerSuggestions.length} MapTiler)`);

        // Update appropriate suggestions based on field
        if (field === 'pickupAddress') {
          setPickupSuggestions(allSuggestions);
          setShowPickupSuggestions(allSuggestions.length > 0);
        } else if (field === 'dropoffAddress') {
          setDropoffSuggestions(allSuggestions);
          setShowDropoffSuggestions(allSuggestions.length > 0);
        }

      }, 300); // 300ms debounce

      inputDebounceTimer.current = debounceTimer;
    } else {
      // Clear suggestions for short queries
      if (field === 'pickupAddress') {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      } else if (field === 'dropoffAddress') {
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
      }
    }
  };

  // 🎯 ENHANCED GEOCODING WITH GOOGLE GEOCODER AND FALLBACKS
  // Handle Enter key press or field blur for manual address entry with enhanced Google Geocoding

  // Enhanced MapTiler Geocoding with Abeokuta focus
  const fetchMapTilerSuggestions = async (query) => {
    if (!query || query.length < 3) return [];

    const abeokutaLat = 7.1475;
    const abeokutaLng = 3.3441;
    const mapKey = import.meta.env.VITE_MAPTILER_API_KEY || 'nRGZ9lGblbV9lFK2KclL';

    const response = await fetch(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${mapKey}&proximity=${abeokutaLng},${abeokutaLat}&bbox=${MAPTILER_BBOX}&country=ng&limit=5`
    );

    if (!response.ok) throw new Error('MapTiler API error');

    const data = await response.json();
    return (data.features || [])
      .map((feature) => {
        const placeName = feature.place_name || '';
        return {
          description: placeName,
          mainText: placeName.split(',')[0] || placeName,
          secondaryText: placeName.split(',').slice(1).join(',').trim(),
          coordinates: feature.center ? { lat: feature.center[1], lng: feature.center[0] } : null,
          relevance: feature.relevance || 0,
        };
      })
      .filter((s) =>
        mentionsAbeokutaArea(s.description) || s.relevance > 0.35
      )
      .sort((a, b) => b.relevance - a.relevance);
  };

  // Get current location with enhanced accuracy
  const getCurrentLocation = () => {
    console.log('🌍 [BookDelivery] getCurrentLocation called');
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.error('❌ Geolocation not supported');
        reject(new Error('Geolocation not supported'));
        return;
      }

      console.log('📍 Requesting geolocation with high accuracy...');
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          console.log('✅ GPS Accuracy:', `${accuracy}m`, { latitude, longitude });

          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=nRGZ9lGblbV9lFK2KclL&language=en&country=ng&proximity=${longitude},${latitude}&limit=1`
            );
            const data = await response.json();
            const address = data.features?.[0]?.place_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

            console.log('✅ Address resolved:', address);
            resolve({ latitude, longitude, address });
          } catch (error) {
            console.error('⚠️ Reverse geocoding error:', error);
            resolve({ latitude, longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
          }
        },
        (error) => {
          console.error('❌ Geolocation error:', error.code, error.message);
          reject(error);
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }  // Increased timeout to 30s
      );
    });
  };



  // Haversine formula for distance calculation
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 🚀 ENHANCED DELIVERY SUMMARY GENERATOR (ABEOKUTA OPTIMIZED)
  const updateDeliverySummary = (distanceKm, duration) => {
    const isPeak = isPeakHour();
    const isRush = isRushHour();
    const pricing = calculateAdvancedPrice(distanceKm, duration);

    // Generate comprehensive summary with enhanced details
    // 🔧 FIX: Use the same fare displayed to user instead of separate calculation
    const summaryData = {
      distance: distanceKm.toFixed(2),
      duration: duration || `${Math.ceil(distanceKm * 3)}-${Math.ceil(distanceKm * 4)} mins`,
      baseFee: pricingBreakdown.baseFee || pricing.baseFee,
      serviceFee: pricingBreakdown.serviceFee || pricing.serviceFee,
      distanceCharge: pricingBreakdown.distanceFee || pricing.distanceCharge,
      surgeApplied: pricing.surgeApplied,
      surgePercentage: pricing.surgePercentage,
      total: fare || pricing.total, // 🎯 Use same fare as display
      eta: new Date(Date.now() + (distanceKm * 3 * 60 * 1000)).toLocaleTimeString(),
      currentTime: new Date().toLocaleTimeString(),
      isAbeokutaDelivery: true
    };

    console.log('📊 Enhanced Delivery Summary Generated:', summaryData);

    // Update pricing breakdown state
    setPricingBreakdown(prev => ({
      ...prev,
      ...pricing,
      distance: distanceKm
    }));

    // Display summary in console for debugging
    const summaryHTML = `
      <div style="font-family: system-ui; padding: 20px; background: #fff; border-radius: 12px;">
        <h4 style="color: #E30613; margin-bottom: 16px;">🚀 Go7 Enhanced Delivery Summary</h4>
        <div style="display: grid; gap: 8px;">
          <div style="display: flex; justify-content: space-between;">
            <span>📍 Distance:</span>
            <strong>${summaryData.distance} km</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>⏱️ Duration:</span>
            <strong>${summaryData.duration}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>🏠 Base Fee:</span>
            <strong>₦${summaryData.baseFee.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>🛣️ Distance Fee:</span>
            <strong>₦${summaryData.distanceCharge.toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>⚙️ Service Fee:</span>
            <strong>₦${summaryData.serviceFee.toLocaleString()}</strong>
          </div>
          ${summaryData.surgeApplied ? `
          <div style="display: flex; justify-content: space-between; color: #F59E0B;">
            <span>⚡ Peak Surge (${summaryData.surgePercentage}%):</span>
            <strong>₦${(summaryData.total - (summaryData.baseFee + summaryData.distanceCharge + summaryData.serviceFee)).toLocaleString()}</strong>
          </div>
          ` : ''}
          <div style="border-top: 2px solid #E30613; padding-top: 8px; margin-top: 8px; display: flex; justify-content: space-between; font-size: 18px;">
            <span><strong>Total:</strong></span>
            <strong style="color: #E30613;">₦${summaryData.total.toLocaleString()}</strong>
          </div>
          <div style="margin-top: 12px; font-size: 12px; color: #666;">
            📍 Abeokuta Delivery Zone ✅ | ETA: ${summaryData.eta}
          </div>
        </div>
      </div>
    `;

    return summaryData;
  };

  // Get icon for landmark category
  const getLandmarkIcon = (category) => {
    const icons = {
      'Government': '🏛️',
      'Education': '🎓',
      'Tourist Attraction': '🗿',
      'Event Venue': '🎭',
      'Cultural': '🏰',
      'Healthcare': '🏥',
      'Market': '🛒',
      'Transportation': '🚌',
      'Religious': '⛪',
      'Shopping': '🛍️',
      'Bank': '🏦',
      'Hotel': '🏨'
    };
    return icons[category] || '📍';
  };

  // Universal place selection handler for landmarks and Google Places
  const selectPlace = (suggestion, type, event) => {
    // Prevent form submission and event bubbling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Set flag to prevent re-fetching suggestions
    isSelectingRef.current = true;

    if (suggestion.isLandmark) {
      // Handle landmark selection
      const landmark = suggestion.landmarkData;

      console.log(`Selected ${type} landmark:`, {
        name: landmark.name,
        shortName: landmark.shortName,
        coordinates: { lat: landmark.lat, lng: landmark.lng },
        category: landmark.category
      });

      // Update form data and coordinates
      if (type === 'pickup') {
        setFormData(prev => ({ ...prev, pickupAddress: landmark.shortName }));
        setConfirmedPickupCoords({ lat: landmark.lat, lng: landmark.lng }, 'search');
        addMarker(landmark.lat, landmark.lng, 'pickup');
      } else {
        setFormData(prev => ({ ...prev, dropoffAddress: landmark.shortName }));
        setConfirmedDropoffCoords({ lat: landmark.lat, lng: landmark.lng }, 'search');
        addMarker(landmark.lat, landmark.lng, 'dropoff');
      }

      // Clear suggestions
      setPlaceSuggestions([]);
      setShowPlaceSuggestions(false);
      setActiveField('');

      // Coords update triggers debounced pricing + route effects
      if ((type === 'pickup' && dropoffCoords) || (type === 'dropoff' && pickupCoords)) {
        setTimeout(() => fitMapBounds(), 150);
      }

    } else {
      // Handle Google Places selection
      selectGooglePlace(suggestion, type);
    }
  };

  // Select Google Places suggestion with enhanced validation and address confirmation
  const selectGooglePlace = async (suggestion, type) => {
    if (!window.getPlaceDetailsOptimized && !window.google?.maps?.places?.PlacesService) {
      console.error('Places service not available');
      showGo7Error('Location service not available. Please try again.');
      return;
    }

    try {
      console.log(`🔍 Getting place details for ${type}:`, suggestion.placeId);

      let placeDetails;

      // Try enhanced method first, fall back to new Places API
      if (window.getPlaceDetailsOptimized) {
        placeDetails = await window.getPlaceDetailsOptimized(suggestion.placeId);
      } else {
        // Fallback: Use new Google Places API (Place class)
        try {
          const place = new window.google.maps.places.Place({
            id: suggestion.placeId
          });
          
          await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'location', 'id']
          });
          
          placeDetails = {
            name: place.displayName,
            formatted_address: place.formattedAddress,
            coordinates: {
              lat: place.location.lat(),
              lng: place.location.lng()
            },
            isValid: true,
            isAbeokuta: true,
            confirmedAddress: place.formattedAddress
          };
        } catch (error) {
          throw new Error(`Places API error: ${error.message}`);
        }
      }

      if (placeDetails && placeDetails.coordinates) {
        let { lat, lng } = placeDetails.coordinates;
        const formattedAddress = placeDetails.formatted_address;
        const name = placeDetails.name;

        const snapped = preferLocalAreaCoords(
          `${name || ''} ${formattedAddress || ''}`.trim(),
          { lat, lng }
        );
        if (snapped?.snapped) {
          lat = snapped.lat;
          lng = snapped.lng;
        }

        // Enhanced validation and logging
        console.log(`✅ Selected ${type} location with validation:`, {
          name: name,
          formatted_address: formattedAddress,
          coordinates: { lat, lng },
          isValid: placeDetails.isValid,
          isAbeokuta: placeDetails.isAbeokuta,
          confirmedAddress: placeDetails.confirmedAddress
        });

        const serviceCheck = validateServiceLocation({
          lat,
          lng,
          address: formattedAddress,
          label: name,
        });

        if (!serviceCheck.valid) {
          showGo7Warning(
            'This location appears to be outside our Abeokuta delivery area. Please select a location within Abeokuta.',
            '📍 Location Outside Service Area'
          );
          return;
        }

        const resolvedLat = serviceCheck.lat;
        const resolvedLng = serviceCheck.lng;

        if (type === 'pickup') {
          setFormData(prev => ({ ...prev, pickupAddress: formattedAddress }));
          setConfirmedPickupCoords({ lat: resolvedLat, lng: resolvedLng }, 'search');
          addMarker(resolvedLat, resolvedLng, 'pickup');
          showLocationUpdate(`Pickup location set: ${name || formattedAddress}`);
        } else {
          setFormData(prev => ({ ...prev, dropoffAddress: formattedAddress }));
          setConfirmedDropoffCoords({ lat: resolvedLat, lng: resolvedLng }, 'search');
          addMarker(resolvedLat, resolvedLng, 'dropoff');
          showLocationUpdate(`Drop-off location set: ${name || formattedAddress}`);
        }

        // Clear suggestions and trigger route calculation
        setPlaceSuggestions([]);
        setShowPlaceSuggestions(false);
        setActiveField('');

        // Pricing + route handled by debounced effects
        setTimeout(() => fitMapBounds(), 150);

        showGo7Toast(`${type === 'pickup' ? 'Pickup' : 'Drop-off'} location confirmed!`, 'success');

      } else {
        console.error('Failed to get enhanced place details');
        showGo7Toast('Failed to get place details', 'error');
      }
    } catch (error) {
      console.error('Enhanced place details error:', error);
      showGo7Toast('Error getting place details', 'error');
    }
  };

  // Select address from suggestions (supports landmarks, Google Places, OSM, and MapTiler)
  const selectAddress = async (suggestion, type, event) => {
    // Prevent form submission and event bubbling
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    // Set flag to prevent handleAddressInput from triggering
    isSelectingRef.current = true;

    // Check if it's a landmark suggestion
    if (suggestion.isLandmark) {
      selectPlace(suggestion, type);
      // Reset flag after a short delay
      setTimeout(() => { isSelectingRef.current = false; }, 100);
      return;
    }

    // Handle HYBRID suggestion (Google or OSM)
    if (suggestion.isHybrid && suggestion.originalData) {
      try {
        console.log(`🌐 Processing ${suggestion.source} suggestion:`, suggestion.description);

        // Prefer Places Details over OSM/list centroids — riders need the real pin
        let coords = null;
        if (suggestion.placeId || suggestion.place_id || suggestion.originalData?.place_id) {
          coords = await getCoordinatesFromSuggestion(suggestion.originalData);
        }
        if (!coords?.lat) {
          coords = parseSuggestionCoords(suggestion);
        }
        if (!coords?.lat) {
          coords = await getCoordinatesFromSuggestion(suggestion.originalData);
        }

        if (coords && coords.lat && coords.lng) {
          const addressText = suggestion.description || suggestion.text;
          const snapped = preferLocalAreaCoords(addressText, coords);
          const resolved = snapped?.snapped
            ? { lat: snapped.lat, lng: snapped.lng }
            : coords;

          const serviceCheck = validateServiceLocation({
            lat: resolved.lat,
            lng: resolved.lng,
            address: addressText,
          });

          if (!serviceCheck.valid) {
            showGo7Warning(
              'This location appears outside Abeokuta. Please choose another address.',
              '📍 Location Outside Service Area'
            );
            setTimeout(() => { isSelectingRef.current = false; }, 100);
            return;
          }

          const { lat, lng } = serviceCheck.snapped
            ? { lat: serviceCheck.lat, lng: serviceCheck.lng }
            : resolved;

          if (type === 'pickup') {
            setFormData(prev => ({ ...prev, pickupAddress: addressText }));
            setConfirmedPickupCoords({ lat, lng }, 'search');
            setPickupSuggestions([]);
            setShowPickupSuggestions(false);
            addMarker(lat, lng, 'pickup');
          } else {
            setFormData(prev => ({ ...prev, dropoffAddress: addressText }));
            setConfirmedDropoffCoords({ lat, lng }, 'search');
            setDropoffSuggestions([]);
            setShowDropoffSuggestions(false);
            addMarker(lat, lng, 'dropoff');
          }

          setTimeout(() => fitMapBounds(), 150);
        } else {
          console.error('❌ Failed to get coordinates from hybrid suggestion');
          showGo7Error('Could not get location coordinates. Please try another address.');
        }
      } catch (error) {
        console.error('❌ Error processing hybrid suggestion:', error);
        showGo7Error('Error processing location. Please try again.');
      }
      setTimeout(() => { isSelectingRef.current = false; }, 100);
      return;
    }

    // Check if it's a legacy Google Places suggestion (placeId without isHybrid flag)
    if (suggestion.placeId) {
      selectPlace(suggestion, type);
      // Reset flag after a short delay
      setTimeout(() => { isSelectingRef.current = false; }, 100);
      return;
    }

    const parsedCoords = parseSuggestionCoords(suggestion);
    if (parsedCoords?.lat && parsedCoords?.lng) {
      const addressText = suggestion.text || suggestion.description;
      const snapped = preferLocalAreaCoords(addressText, parsedCoords);
      const coordsForCheck = snapped?.snapped
        ? { lat: snapped.lat, lng: snapped.lng }
        : parsedCoords;

      const serviceCheck = validateServiceLocation({
        lat: coordsForCheck.lat,
        lng: coordsForCheck.lng,
        address: addressText,
      });

      if (!serviceCheck.valid) {
        showGo7Warning(
          'This location appears outside Abeokuta. Please choose another address.',
          '📍 Location Outside Service Area'
        );
        setTimeout(() => { isSelectingRef.current = false; }, 100);
        return;
      }

      const { lat, lng } = serviceCheck.snapped
        ? { lat: serviceCheck.lat, lng: serviceCheck.lng }
        : parsedCoords;

      if (type === 'pickup') {
        setFormData(prev => ({ ...prev, pickupAddress: addressText }));
        setConfirmedPickupCoords({ lat, lng }, 'search');
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
        addMarker(lat, lng, 'pickup');
      } else {
        setFormData(prev => ({ ...prev, dropoffAddress: addressText }));
        setConfirmedDropoffCoords({ lat, lng }, 'search');
        setDropoffSuggestions([]);
        setShowDropoffSuggestions(false);
        addMarker(lat, lng, 'dropoff');
      }

      setTimeout(() => fitMapBounds(), 150);
    }

    // Reset selection flag
    setTimeout(() => { isSelectingRef.current = false; }, 100);
  };

  // Add marker to map with custom Go7 icons
  const addMarker = (lat, lng, type) => {
    if (!mapInstanceRef.current) {
      console.warn('Map not initialized yet, skipping marker addition');
      return;
    }

    // Use reliable flag set at map creation time
    const isMapTilerMap = !!mapInstanceRef.current._isMapTilerSDK;
    if (isMapTilerMap) {
      if (!mapInstanceRef.current.loaded()) {
        console.warn('Map style not loaded yet, retrying in 500ms...');
        setTimeout(() => addMarker(lat, lng, type), 500);
        return;
      }
      // MapTiler maps use native addImage/addLayer — skip Leaflet markers
      console.log('MapTiler map detected — skipping Leaflet marker for', type);
      return;
    }
    const isLeafletMap = typeof mapInstanceRef.current.setView === 'function';
    if (!isLeafletMap) return;

    try {
      const existingMarker = type === 'pickup' ? pickupMarker : dropoffMarker;

      // Remove existing marker
      if (existingMarker) {
        mapInstanceRef.current.removeLayer(existingMarker);
      }

    // Custom icon configuration
    const iconConfig = {
      pickup: {
        iconUrl: '/bag.png',
        className: 'pickup-marker-bounce',
        shadowColor: '#ef4444'
      },
      dropoff: {
        iconUrl: '/shop.png',
        className: 'dropoff-marker-bounce',
        shadowColor: '#22c55e'
      },
      rider: {
        iconUrl: '/scooter.png',
        className: 'rider-marker-pulse',
        shadowColor: '#3b82f6'
      }
    };

    const config = iconConfig[type] || iconConfig.pickup;

    // Create custom icon with enhanced styling
    const customIcon = L.icon({
      iconUrl: config.iconUrl,
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40],
      shadowUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg width="50" height="20" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="25" cy="18" rx="15" ry="8" fill="${config.shadowColor}" opacity="0.3"/>
        </svg>
      `),
      shadowSize: [50, 20],
      shadowAnchor: [25, 18],
      className: config.className
    });

    // Create enhanced draggable marker with animation
    const marker = L.marker([lat, lng], {
      draggable: true,
      icon: customIcon,
      title: type === 'pickup' ? 'Pickup Location' : 'Delivery Location',
      riseOnHover: true
    }).addTo(mapInstanceRef.current);

    // Enhanced popup content with Go7 styling
    const popupContent = '<div class="go7-marker-popup bg-white rounded-lg shadow-lg">' +
      '<div class="flex items-center space-x-2 p-3">' +
      '<img src="' + config.iconUrl + '" alt="' + type + '" class="w-6 h-6">' +
      '<div>' +
      '<p class="font-semibold text-gray-800 text-sm">' + (type === 'pickup' ? 'Pickup Location' : 'Delivery Location') + '</p>' +
      '<p class="text-xs text-gray-500">Drag to adjust position</p>' +
      '<p class="text-xs text-blue-600">' + lat.toFixed(4) + ', ' + lng.toFixed(4) + '</p>' +
      '</div>' +
      '</div>' +
      '</div>';

    marker.bindPopup(popupContent, {
      className: 'go7-custom-popup',
      closeButton: false,
      offset: [0, -10],
      maxWidth: 200
    });

    // Add enhanced drag event handlers
    marker.on('dragstart', function (e) {
      console.log(`${type} marker drag started`);
      marker.openPopup();
      // Add dragging visual feedback
      e.target.setOpacity(0.8);
    });

    marker.on('drag', function (e) {
      const position = e.target.getLatLng();
      if (type === 'pickup') {
        setConfirmedPickupCoords({ lat: position.lat, lng: position.lng }, 'map-pin');
      } else {
        setConfirmedDropoffCoords({ lat: position.lat, lng: position.lng }, 'map-pin');
      }
    });

    marker.on('dragend', async function (e) {
      const position = e.target.getLatLng();
      console.log(`${type} marker moved to: `, position.lat, position.lng);

      // Restore full opacity
      e.target.setOpacity(1.0);
      marker.closePopup();

      // Update coordinates with final position
      if (type === 'pickup') {
        setConfirmedPickupCoords({ lat: position.lat, lng: position.lng }, 'map-pin');
      } else {
        setConfirmedDropoffCoords({ lat: position.lat, lng: position.lng }, 'map-pin');
      }

      // Reverse geocode new position to update address
      await reverseGeocode(position.lat, position.lng, type);
      fitMapBounds();
    });

    // Store marker reference
    if (type === 'pickup') {
      setPickupMarker(marker);
    } else {
      setDropoffMarker(marker);
    }

    // Auto-fit map bounds to show both markers
    fitMapBounds();
    
    } catch (error) {
      console.error('Error adding marker:', error);
      // Retry after delay if map style is still loading
      if (error.message?.includes('Style is not done loading')) {
        setTimeout(() => addMarker(lat, lng, type), 1000);
      }
    }
  };

  // Auto-fit map bounds to show all markers
  const fitMapBounds = () => {
    if (!mapInstanceRef.current) return;

    // Check for valid coordinates
    if (!pickupCoords || !pickupCoords.lat || !pickupCoords.lng) {
      console.warn('Invalid pickup coordinates for fitMapBounds');
      return;
    }

    try {
      // Detect map type using reliable flag
      const isMapTilerSDK = !!mapInstanceRef.current._isMapTilerSDK;
      const isLeaflet = !isMapTilerSDK && typeof mapInstanceRef.current.setView === 'function';

      console.log('Map type detection:', { isMapTilerSDK, isLeaflet });

      if (isMapTilerSDK) {
        // MapTiler SDK API
        const coordinates = [];

        console.log('🗺️ Map coordinates debug:', { pickupCoords, dropoffCoords });

        if (pickupCoords && pickupCoords.lat && pickupCoords.lng) {
          coordinates.push([pickupCoords.lng, pickupCoords.lat]); // MapTiler uses [lng, lat]
        }
        if (dropoffCoords && dropoffCoords.lat && dropoffCoords.lng) {
          coordinates.push([dropoffCoords.lng, dropoffCoords.lat]); // MapTiler uses [lng, lat]
        }

        console.log('🗺️ Final coordinates for map:', coordinates);

        if (coordinates.length === 1) {
          // Single point - center the map
          const coord = coordinates[0];
          if (Array.isArray(coord) && coord.length === 2 && 
              typeof coord[0] === 'number' && typeof coord[1] === 'number') {
            mapInstanceRef.current.jumpTo({
              center: coord,
              zoom: 15
            });
          }
        } else if (coordinates.length > 1) {
          // Multiple points - fit bounds using plain SW/NE array (safest for MapTiler SDK)
          try {
            const lngs = coordinates.map(c => c[0]).filter(v => typeof v === 'number' && !isNaN(v));
            const lats = coordinates.map(c => c[1]).filter(v => typeof v === 'number' && !isNaN(v));
            if (lngs.length >= 2 && lats.length >= 2) {
              const sw = [Math.min(...lngs), Math.min(...lats)];
              const ne = [Math.max(...lngs), Math.max(...lats)];
              // Only call fitBounds if SW and NE differ (non-zero extent)
              if (sw[0] !== ne[0] || sw[1] !== ne[1]) {
                mapInstanceRef.current.fitBounds([sw, ne], {
                  padding: 50,
                  maxZoom: 15
                });
              } else {
                mapInstanceRef.current.jumpTo({ center: sw, zoom: 15 });
              }
            }
          } catch (e) {
            console.warn('MapTiler fitBounds error:', e);
          }
        }
      } else if (isLeaflet) {
        // Leaflet API
        const coordinates = [];

        if (pickupCoords && pickupCoords.lat && pickupCoords.lng) {
          coordinates.push([pickupCoords.lat, pickupCoords.lng]); // Leaflet uses [lat, lng]
        }
        if (dropoffCoords && dropoffCoords.lat && dropoffCoords.lng) {
          coordinates.push([dropoffCoords.lat, dropoffCoords.lng]); // Leaflet uses [lat, lng]
        }

        if (coordinates.length === 1) {
          // Single point - center the map using flyTo for Leaflet
          mapInstanceRef.current.flyTo(coordinates[0], 15);
        } else if (coordinates.length > 1) {
          // Multiple points - fit bounds
          try {
            const bounds = L.latLngBounds(coordinates);
            if (bounds && bounds.isValid()) {
              mapInstanceRef.current.fitBounds(bounds, {
                padding: [30, 30],
                maxZoom: 15
              });
            }
          } catch (e) {
            console.warn('fitBounds error:', e);
          }
        }
      } else {
        console.warn('Unknown map instance type, cannot fit bounds');
      }
    } catch (error) {
      console.warn('Error fitting map bounds:', error);

      // Universal fallback - try basic centering
      try {
        if (pickupCoords && pickupCoords.lat && pickupCoords.lng) {
          if (mapInstanceRef.current.jumpTo) {
            // MapTiler SDK fallback
            mapInstanceRef.current.jumpTo({
              center: [pickupCoords.lng, pickupCoords.lat],
              zoom: 14
            });
          } else if (mapInstanceRef.current.flyTo) {
            // Leaflet fallback
            mapInstanceRef.current.flyTo([pickupCoords.lat, pickupCoords.lng], 14);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback centering also failed:', fallbackError);
      }
    }
  };

  // Add animated rider marker for live tracking
  const addRiderMarker = (lat, lng, riderId = 'rider1') => {
    if (!mapInstanceRef.current) return;

    // Remove existing rider marker
    if (window.currentRiderMarker) {
      mapInstanceRef.current.removeLayer(window.currentRiderMarker);
    }

    // Create animated rider marker
    const riderIcon = L.icon({
      iconUrl: '/scooter.png',
      iconSize: [35, 35],
      iconAnchor: [17, 35],
      popupAnchor: [0, -35],
      className: 'rider-marker-pulse'
    });

    const riderMarker = L.marker([lat, lng], {
      icon: riderIcon,
      title: 'Go7 Rider',
      zIndexOffset: 1000 // Keep rider on top
    }).addTo(mapInstanceRef.current);

    // Enhanced rider popup
    const riderPopup = '<div class="go7-rider-popup bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-3">' +
      '<div class="flex items-center space-x-2">' +
      '<div class="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>' +
      '<div>' +
      '<p class="font-bold text-sm">Go7 Rider En Route</p>' +
      '<p class="text-xs opacity-90">⭐ 4.9 • 120+ deliveries</p>' +
      '</div>' +
      '</div>' +
      '</div>';

    riderMarker.bindPopup(riderPopup, {
      className: 'go7-rider-popup-wrapper',
      closeButton: false,
      offset: [0, -10]
    });

    window.currentRiderMarker = riderMarker;
    return riderMarker;
  };

  // Smooth rider movement animation
  const animateRiderMovement = (fromLat, fromLng, toLat, toLng, duration = 3000) => {
    if (!window.currentRiderMarker) return;

    const startTime = Date.now();
    const startPos = [fromLat, fromLng];
    const endPos = [toLat, toLng];

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      const currentLat = startPos[0] + (endPos[0] - startPos[0]) * easedProgress;
      const currentLng = startPos[1] + (endPos[1] - startPos[1]) * easedProgress;

      window.currentRiderMarker.setLatLng([currentLat, currentLng]);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };


  // Simulate real-time status updates
  const simulateStatusUpdates = () => {
    const statusSequence = ['pending', 'assigned', 'pickup', 'enroute', 'delivered'];
    let currentIndex = 0;

    const updateStatus = () => {
      if (currentIndex < statusSequence.length) {
        setOrderStatus(statusSequence[currentIndex]);
        currentIndex++;

        // Show status update notification
        if (currentIndex > 1) {
          const statusMessages = {
            assigned: '🏍️ Rider assigned! Adebayo is on the way to pickup.',
            pickup: '📦 Item picked up! Your delivery is now in progress.',
            enroute: '🚚 En route! Rider is heading to your destination.',
            delivered: '✅ Delivered! Your item has been successfully delivered.'
          };

          const status = statusSequence[currentIndex - 1];
          if (statusMessages[status]) {
            Swal.fire({
              icon: 'info',
              title: 'Status Update',
              text: statusMessages[status],
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 3000,
              timerProgressBar: true
            });
          }
        }

        // Continue progression every 30 seconds for demo
        if (currentIndex < statusSequence.length) {
          setTimeout(updateStatus, 30000);
        }
      }
    };

    // Start the status progression after 5 seconds
    setTimeout(updateStatus, 5000);
  };

  // Show order confirmation with tracking details using Go7 branded notification
  const showOrderConfirmation = (orderId, orderData) => {
    // Display PIN prominently in confirmation
    Swal.fire({
      title: '🎉 Delivery Booked Successfully!',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p style="font-size: 16px; margin-bottom: 20px;"><strong>Order #${orderId}</strong></p>
          
          <!-- 🔐 DELIVERY PIN - Prominent Display -->
          <div style="background: linear-gradient(135deg, #E30613, #c62828); padding: 24px; border-radius: 16px; margin: 20px 0; box-shadow: 0 8px 24px rgba(227, 6, 19, 0.3);">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 12px;">
              <svg width="20" height="20" fill="none" stroke="white" stroke-width="2" viewBox="0 0 24 24">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span style="color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 600;">YOUR DELIVERY PIN</span>
            </div>
            <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); padding: 20px; border-radius: 12px; text-align: center;">
              <div style="color: white; font-size: 48px; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 0.2em; text-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                ${orderData.deliveryPin}
              </div>
            </div>
            <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin-top: 12px; text-align: center;">
              ⚠️ Share this PIN with the rider when they arrive
            </p>
          </div>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 12px; margin: 16px 0;">
            <p style="margin: 8px 0;"><strong>📍 Pickup:</strong> ${orderData.pickupAddress}</p>
            <p style="margin: 8px 0;"><strong>🎯 Dropoff:</strong> ${orderData.dropoffAddress}</p>
            <p style="margin: 8px 0;"><strong>💰 Total:</strong> ₦${orderData.total.toLocaleString()}</p>
            <p style="margin: 8px 0;"><strong>⏱️ ETA:</strong> ${orderData.estimatedDeliveryTime}</p>
          </div>

          <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; border-radius: 4px; margin-top: 16px;">
            <p style="margin: 0; font-size: 13px; color: #856404;">
              <strong>🔒 Security Tip:</strong> Only share your PIN with the GO7 rider delivering your order. Never share it via SMS or WhatsApp before the rider arrives.
            </p>
          </div>
        </div>
      `,
      icon: 'success',
      iconColor: '#E30613',
      confirmButtonText: 'Track My Order',
      confirmButtonColor: '#E30613',
      showCloseButton: true,
      width: '600px'
    }).then((result) => {
      if (result.isConfirmed) {
        // Navigate to order tracking
        setCurrentOrderId(orderId);
        setShowOrderTracking(true);
        setOrderStatus('pending');

        // Show rider update notification
        showRiderUpdate('Looking for available riders in your area...');

        // Simulate rider assignment after 3 seconds
        setTimeout(() => {
          showOrderStatus('rider_assigned', orderId, 'Akeem O.');
          setOrderStatus('rider_assigned');
        }, 3000);
        // Start simulating status updates
        simulateStatusUpdates();
      }
    });
  };

  // Reset form to initial state
  const resetForm = () => {
    clearBookDeliveryDraft();
    setFormData({ ...INITIAL_FORM_DATA });
    setPickupCoords(null);
    setDropoffCoords(null);
    setPickupCoordsConfirmed(false);
    setDropoffCoordsConfirmed(false);
    setPricingBreakdown({
      baseFee: 0,
      distanceFee: 0,
      serviceFee: 0,
      total: 0,
      distance: 0,
      isCalculating: false
    });

    // Clear map markers — only call removeLayer on Leaflet maps
    const isLeafletMap = mapInstanceRef.current && !mapInstanceRef.current._isMapTilerSDK && typeof mapInstanceRef.current.setView === 'function';
    if (isLeafletMap) {
      if (pickupMarker) { try { mapInstanceRef.current.removeLayer(pickupMarker); } catch (_) {} }
      if (dropoffMarker) { try { mapInstanceRef.current.removeLayer(dropoffMarker); } catch (_) {} }
      if (routePolyline) { try { mapInstanceRef.current.removeLayer(routePolyline); } catch (_) {} }
    } else if (mapInstanceRef.current && mapInstanceRef.current.getSource) {
      // MapTiler — remove route layer/source
      try {
        if (mapInstanceRef.current.getLayer('route')) mapInstanceRef.current.removeLayer('route');
        if (mapInstanceRef.current.getSource('route')) mapInstanceRef.current.removeSource('route');
      } catch (_) {}
    }
    setPickupMarker(null);
    setDropoffMarker(null);
    setRoutePolyline(null);
  };

  // Enhanced route display with Go7 styling
  const drawRoute = (coordinates) => {
    if (!mapInstanceRef.current || !coordinates || coordinates.length < 2) return;

    // Only run drawRoute on Leaflet maps; MapTiler handles its own route via addSource/addLayer
    if (mapInstanceRef.current._isMapTilerSDK) return;

    // Validate coordinates are valid numbers
    const validCoords = coordinates.filter(coord => 
      Array.isArray(coord) && coord.length === 2 &&
      typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
      !isNaN(coord[0]) && !isNaN(coord[1])
    );

    if (validCoords.length < 2) {
      console.warn('❌ Invalid coordinates for route, skipping:', coordinates);
      return;
    }

    try {
      // Remove existing route
      if (routePolyline) {
        try { mapInstanceRef.current.removeLayer(routePolyline); } catch (_) {}
      }

      // Create enhanced route polyline
      const route = L.polyline(validCoords, {
        color: '#E30613', // Go7 brand red
        weight: 6,
        opacity: 0.9,
        smoothFactor: 1,
        dashArray: '10, 5',
        lineCap: 'round',
        lineJoin: 'round',
        className: 'go7-route-line'
      }).addTo(mapInstanceRef.current);

      // Add route animation effect
      let dashOffset = 0;
      let rafActive = true;
      const animateDash = () => {
        if (!rafActive) return;
        dashOffset -= 1;
        try { route.setStyle({ dashOffset: dashOffset }); } catch (_) { rafActive = false; return; }
        requestAnimationFrame(animateDash);
      };
      animateDash();
      // Stop animation when route is removed
      route.on('remove', () => { rafActive = false; });

      setRoutePolyline(route);

      // Fit bounds to show entire route
      try {
        const bounds = L.latLngBounds(validCoords);
        if (bounds && bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [30, 30],
            maxZoom: 15
          });
        }
      } catch (e) {
        console.warn('fitBounds error:', e);
      }
    } catch (e) {
      console.warn('drawRoute error:', e);
    }
  };

  // Enhanced GPS location for pickup OR dropoff
  const useCurrentLocation = (type = 'pickup') => {
    const target = type === 'dropoff' ? 'dropoff' : 'pickup';
    lastGpsTargetRef.current = target;

    if (!navigator.geolocation) {
      showGo7Error(
        'Geolocation is not supported by this browser. Please enter your address manually or try a different browser.',
        '📍 GPS Not Available'
      );
      return;
    }

    // Check for insecure origin (Firefox and browsers on HTTP/IP)
    if (isInsecureOrigin()) {
      showGo7Warning(
        'Some browsers block GPS on unsecured connections.\n\nOptions:\n• Switch to https:// if available\n• Enable location manually in browser settings\n• For Firefox: Set geo.security.allowinsecure = true in about:config',
        '🔒 Secure Location Needed'
      );
      return;
    }

    // Reuse fresh GPS fix (< 60s) when switching scenarios quickly
    const cached = lastGpsRef.current;
    if (cached && Date.now() - cached.at < 60000 && hasValidCoords(cached)) {
      applyGpsResultToField(target, cached.lat, cached.lng, cached.address);
      return;
    }

    // For HTTPS or localhost, attempt geolocation normally
    attemptGeolocation(target);
  };

  // Show mobile-friendly location settings guide
  const showLocationSettingsGuide = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

    let guideContent = '';

    if (isMobile) {
      guideContent = `
        <div style="text-align: left; color: #333;">
          <h4 style="color: #E30613; margin-bottom: 15px;">📱 Mobile Browser Settings</h4>
          <div style="margin-bottom: 15px;">
            <strong>Chrome/Safari:</strong>
            <ol style="margin: 5px 0; padding-left: 20px;">
              <li>Tap the address bar or site info icon</li>
              <li>Select "Permissions" or "Site Settings"</li>
              <li>Enable "Location" access</li>
              <li>Refresh the page</li>
            </ol>
          </div>
          ${isFirefox ? `
          <div style="margin-bottom: 15px;">
            <strong>Firefox Mobile:</strong>
            <ol style="margin: 5px 0; padding-left: 20px;">
              <li>Tap menu (⋮) → Settings</li>
              <li>Go to "Site Permissions"</li>
              <li>Select "Location"</li>
              <li>Choose "Allow" for this site</li>
            </ol>
          </div>
          ` : ''}
          <p style="color: #6B7280; font-size: 14px; margin-top: 15px;">
            💡 Make sure device location/GPS is enabled in system settings
          </p>
        </div>
      `;
    } else {
      guideContent = `
        <div style="text-align: left; color: #333;">
          <h4 style="color: #E30613; margin-bottom: 15px;">🖥️ Desktop Browser Settings</h4>
          <div style="margin-bottom: 15px;">
            <strong>Chrome:</strong>
            <p>Click 🔒 in address bar → Site Settings → Location → Allow</p>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Firefox:</strong>
            <p>Click 🔒 in address bar → Permissions → Location → Allow</p>
            <p><small>Or type: about:config → geo.security.allowinsecure = true</small></p>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Safari:</strong>
            <p>Safari menu → Preferences → Websites → Location → Allow</p>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Edge:</strong>
            <p>Click 🔒 in address bar → Permissions → Location → Allow</p>
          </div>
        </div>
      `;
    }

    Swal.fire({
      title: 'Location Settings Guide',
      html: guideContent,
      confirmButtonText: 'Got it!',
      confirmButtonColor: '#E30613',
      background: '#ffffff',
      color: '#333333',
      width: isMobile ? '90%' : '500px'
    });
  };

  // Apply reverse-geocoded GPS result to pickup or dropoff
  const applyGpsResultToField = (type, lat, lng, address) => {
    const target = type === 'dropoff' ? 'dropoff' : 'pickup';
    const fullAddress = String(address || '').trim() || `My Location (${lat.toFixed(5)}, ${lng.toFixed(5)})`;

    lastGpsRef.current = { lat, lng, address: fullAddress, at: Date.now() };

    if (target === 'pickup') {
      setFormData((prev) => ({ ...prev, pickupAddress: fullAddress }));
      setConfirmedPickupCoords({ lat, lng }, 'gps');
      addMarker(lat, lng, 'pickup');
      setErrors((prev) => ({ ...prev, pickupAddress: '', coordinates: '' }));
    } else {
      setFormData((prev) => ({ ...prev, dropoffAddress: fullAddress }));
      setConfirmedDropoffCoords({ lat, lng }, 'gps');
      addMarker(lat, lng, 'dropoff');
      setErrors((prev) => ({ ...prev, dropoffAddress: '', coordinates: '' }));
    }

    if (mapInstanceRef.current?.flyTo) {
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 15,
        essential: true,
      });
    }

    const label = target === 'pickup' ? 'Pick up from' : 'Deliver to';
    Swal.fire({
      icon: 'success',
      title: `📍 ${label}: ${fullAddress}`,
      text: 'Location set with validated address and coordinates.',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      background: '#ffffff',
      color: '#059669',
      iconColor: '#059669',
    });
  };

  // Main geolocation attempt function
  // GPS accuracy beyond ~100m can shift road distance enough to change the
  // delivery fee noticeably between attempts (customers shouldn't have to
  // know/care about this). Instead of accepting the first single reading —
  // which on a cold GPS fix is often the least accurate — sample a few
  // readings for a short window and keep whichever is most accurate.
  const getBestGpsFix = (options = {}) => {
    const maxWaitMs = options.maxWaitMs ?? 6000;
    const goodEnoughAccuracyM = options.goodEnoughAccuracyM ?? 30;

    return new Promise((resolve, reject) => {
      let best = null;
      let watchId = null;
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        if (watchId != null) navigator.geolocation.clearWatch(watchId);
        clearTimeout(timer);
        if (best) resolve(best);
        else reject(new Error('No GPS fix acquired'));
      };

      const timer = setTimeout(finish, maxWaitMs);

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const acc = position.coords.accuracy;
          if (!best || (Number.isFinite(acc) && acc < best.coords.accuracy)) {
            best = position;
          }
          if (Number.isFinite(acc) && acc <= goodEnoughAccuracyM) {
            finish();
          }
        },
        (error) => {
          if (!best) {
            settled = true;
            clearTimeout(timer);
            if (watchId != null) navigator.geolocation.clearWatch(watchId);
            reject(error);
          }
          // If we already have a reading, keep sampling/finish on timeout
          // instead of failing outright on a transient watch error.
        },
        { enableHighAccuracy: true, timeout: maxWaitMs, maximumAge: 0 }
      );
    });
  };

  const attemptGeolocation = (type = 'pickup') => {
    const target = type === 'dropoff' ? 'dropoff' : 'pickup';
    // Set GPS permission flag to prevent multiple prompts
    if (!gpsPermissionAsked) {
      setGpsPermissionAsked(true);
    }

    // Show loading state
    Swal.fire({
      title: 'Getting Your Location...',
      text: 'Please allow location access',
      allowOutsideClick: false,
      showConfirmButton: false,
      background: '#ffffff',
      color: '#333333',
      didOpen: () => {
        Swal.showLoading();
      }
    });

    getBestGpsFix().then(
      async (position) => {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        Swal.close();

        // 🚨 ENHANCED DEBUG: Show exact GPS coordinates
        console.log('� RAW GPS COORDINATES:', {
          lat,
          lng,
          accuracy: `${accuracy}m`,
          timestamp: new Date(position.timestamp).toLocaleString(),
          expectedAbeokuta: { lat: 7.1475, lng: 3.3619 }
        });

        // Calculate distance from Abeokuta center
        const distanceFromAbeokuta = calculateHaversineDistance(lat, lng, 7.1475, 3.3619);
        console.log(`📏 Distance from Abeokuta center: ${distanceFromAbeokuta.toFixed(2)} km`);

        try {
          let address = '';
          let streetAddress = '';

          // Only try Google Maps if API key is available
          const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
          if (googleMapsApiKey && googleMapsApiKey !== 'undefined') {
            try {
              // Enhanced geocoding with Abeokuta bias and Nigerian region
              const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&location_type=ROOFTOP|RANGE_INTERPOLATED&result_type=street_address|route|locality&region=ng&language=en&key=${googleMapsApiKey}`;
              const response = await fetch(geocodeUrl);
              const data = await response.json();

              if (data.status === 'OK' && data.results && data.results[0]) {
                const result = data.results[0];
                streetAddress = result.formatted_address;

                // Extract street and area for display
                const addressComponents = result.address_components;
                const street = addressComponents.find(comp => comp.types.includes('route'))?.long_name || '';
                const area = addressComponents.find(comp => comp.types.includes('sublocality_level_1') || comp.types.includes('locality'))?.long_name || '';
                const city = addressComponents.find(comp => comp.types.includes('locality') || comp.types.includes('administrative_area_level_2'))?.long_name || '';

                // Prefer full validated formatted address for booking + fare pins
                address = streetAddress || (street && area ? `${street}, ${area}` : '');

                console.log('✅ Google Geocode:', { street, area, city, full: streetAddress });
              } else if (data.status === 'REQUEST_DENIED') {
                console.warn('Google Maps API request denied. Check API key.');
                throw new Error('API key invalid');
              } else {
                console.warn('Google Geocoding returned no results:', data.status);
                throw new Error('No results');
              }
            } catch (geocodeError) {
              console.warn('Google Geocoding failed:', geocodeError.message || geocodeError);
              // Will fall through to OSM fallback
            }
          } else {
            console.warn('Google Maps API key not configured');
          }

          // ENHANCED: Use our improved reverse geocoding with zone detection
          if (!address) {
            try {
              console.log('🔄 Using enhanced reverse geocoding...');
              
              // First, try to detect if we're in a Go7 local zone
              const localZone = detectLocalZone(lat, lng);
              if (localZone) {
                console.log('🎯 Detected Go7 Local Zone:', localZone);
                address = `Near ${localZone}, Abeokuta`;
                streetAddress = address;
              } else {
                // Use enhanced reverse geocoding
                const reverseGeocodedAddress = await reverseGeocode(lat, lng);
                
                if (reverseGeocodedAddress && reverseGeocodedAddress !== "Unknown address") {
                  streetAddress = reverseGeocodedAddress;
                  address = reverseGeocodedAddress;
                  console.log('✅ Enhanced Reverse Geocode:', { address, full: streetAddress });
                } else {
                  address = `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
                  streetAddress = address;
                }
              }
            } catch (enhancedError) {
              console.warn('Enhanced geocoding failed:', enhancedError.message);
              address = `My Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
              streetAddress = address;
            }
          }

          applyGpsResultToField(target, lat, lng, streetAddress || address);

          // GPS accuracy beyond ~100m can shift road distance enough to change
          // the delivery fee noticeably between attempts. Warn upfront so
          // customers pick a landmark/address instead of hitting a confusing
          // fare mismatch later at checkout.
          if (Number.isFinite(accuracy) && accuracy > 100) {
            showGo7Toast(
              `GPS accuracy is low (~${Math.round(accuracy)}m) for ${target === 'dropoff' ? 'drop-off' : 'pickup'}. For a stable price, search and select the address/landmark instead of using current location.`,
              'warning'
            );
          }

        } catch (error) {
          console.error('Location processing error:', error);

          applyGpsResultToField(
            target,
            lat,
            lng,
            `Location ${lat.toFixed(4)}, ${lng.toFixed(4)}`
          );
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        Swal.close();
        handleGeolocationError(error);
      }
    );
  };

  // Enhanced error handling with Go7-styled toasts and retry functionality
  const handleGeolocationError = (error) => {
    let title = '';
    let message = '';
    let showRetry = false;
    let showSettings = false;

    switch (error.code) {
      case error.PERMISSION_DENIED:
        title = '❌ Location Access Denied';
        message = 'We couldn\'t access your location. Please turn on GPS and retry.';
        showRetry = true;
        showSettings = true;
        break;

      case error.POSITION_UNAVAILABLE:
        title = '📡 GPS Signal Lost';
        message = 'GPS signal lost — please move closer to an open area.';
        showRetry = true;
        break;

      case error.TIMEOUT:
        title = '⏱️ Location Timeout';
        message = 'GPS signal lost — please move closer to an open area.';
        showRetry = true;
        break;

      default:
        title = '❌ Location Error';
        message = 'Unable to retrieve your location. Please try again.';
        showRetry = true;
        break;
    }

    const buttonConfig = {};

    if (showRetry && showSettings) {
      buttonConfig.showCancelButton = true;
      buttonConfig.confirmButtonText = 'Retry';
      buttonConfig.cancelButtonText = 'Open Settings';
      buttonConfig.confirmButtonColor = '#E30613';
      buttonConfig.cancelButtonColor = '#6B7280';
    } else if (showRetry) {
      buttonConfig.confirmButtonText = 'Retry';
      buttonConfig.confirmButtonColor = '#E30613';
    } else {
      buttonConfig.confirmButtonText = 'OK';
      buttonConfig.confirmButtonColor = '#E30613';
    }

    Swal.fire({
      title: title,
      text: message,
      background: '#ffffff',
      color: '#E30613',
      ...buttonConfig
    }).then((result) => {
      if (result.isConfirmed && showRetry) {
        // Retry geolocation
        setTimeout(() => attemptGeolocation(lastGpsTargetRef.current || 'pickup'), 500);
      } else if (result.dismiss === Swal.DismissReason.cancel && showSettings) {
        // Show settings guide
        showLocationSettingsGuide();
      }
    });
  };  // 🗺️ ENHANCED MAP CLICK WITH MANUAL PIN DROPPING

  const findSavedAddressByKind = useCallback(
    (kind) => {
      const re = kind === 'work' ? /\bwork\b/i : /\bhome\b/i;
      const list = Array.isArray(savedAddresses) ? savedAddresses : [];
      return (
        list.find((a) => re.test(String(a?.name || a?.label || a?.title || ''))) ||
        null
      );
    },
    [savedAddresses]
  );

  const applySavedAddressToField = useCallback(
    (field, kind) => {
      const target = field === 'dropoff' ? 'dropoff' : 'pickup';
      const saved = findSavedAddressByKind(kind);
      if (!saved) {
        showGo7Warning(
          `Add a ${kind === 'work' ? 'Work' : 'Home'} address in Profile first.`,
          'Address not found'
        );
        return;
      }
      const coords = extractCoordsFromAddress(saved);
      if (!coords || !hasValidCoords(coords)) {
        showGo7Warning(
          `Your ${kind === 'work' ? 'Work' : 'Home'} address needs a map pin. Edit it in Profile.`,
          'Missing coordinates'
        );
        return;
      }
      const address = String(saved.address || saved.formattedAddress || saved.name || '').trim();
      if (!address) {
        showGo7Warning('Saved address has no street text. Edit it in Profile.', 'Invalid address');
        return;
      }

      if (target === 'pickup') {
        setFormData((prev) => ({ ...prev, pickupAddress: address }));
        setConfirmedPickupCoords(coords, 'saved');
        addMarker(coords.lat, coords.lng, 'pickup');
        setErrors((prev) => ({ ...prev, pickupAddress: '', coordinates: '' }));
      } else {
        setFormData((prev) => ({ ...prev, dropoffAddress: address }));
        setConfirmedDropoffCoords(coords, 'saved');
        addMarker(coords.lat, coords.lng, 'dropoff');
        setErrors((prev) => ({ ...prev, dropoffAddress: '', coordinates: '' }));
      }

      if (mapInstanceRef.current?.flyTo) {
        mapInstanceRef.current.flyTo({
          center: [coords.lng, coords.lat],
          zoom: 15,
          essential: true,
        });
      }

      showGo7Toast(
        `${kind === 'work' ? 'Work' : 'Home'} set as ${target === 'pickup' ? 'pick-up' : 'deliver-to'}`,
        'success'
      );
    },
    [findSavedAddressByKind, setConfirmedPickupCoords, setConfirmedDropoffCoords]
  );

  const swapAddresses = useCallback(() => {
    const prevPickupAddr = formData.pickupAddress;
    const prevDropoffAddr = formData.dropoffAddress;
    const prevPickup = pickupCoords ? { ...pickupCoords } : null;
    const prevDropoff = dropoffCoords ? { ...dropoffCoords } : null;
    const prevPickupSource = pickupLocationSource;
    const prevDropoffSource = dropoffLocationSource;

    setFormData((prev) => ({
      ...prev,
      pickupAddress: prevDropoffAddr,
      dropoffAddress: prevPickupAddr,
    }));

    const isLeafletMap =
      mapInstanceRef.current &&
      !mapInstanceRef.current._isMapTilerSDK &&
      typeof mapInstanceRef.current.setView === 'function';

    if (prevDropoff) {
      setConfirmedPickupCoords(prevDropoff, prevDropoffSource);
      addMarker(prevDropoff.lat, prevDropoff.lng, 'pickup');
    } else {
      setConfirmedPickupCoords(null);
      if (isLeafletMap && pickupMarker) {
        try {
          mapInstanceRef.current.removeLayer(pickupMarker);
        } catch (_) {}
        setPickupMarker(null);
      }
    }

    if (prevPickup) {
      setConfirmedDropoffCoords(prevPickup, prevPickupSource);
      addMarker(prevPickup.lat, prevPickup.lng, 'dropoff');
    } else {
      setConfirmedDropoffCoords(null);
      if (isLeafletMap && dropoffMarker) {
        try {
          mapInstanceRef.current.removeLayer(dropoffMarker);
        } catch (_) {}
        setDropoffMarker(null);
      }
    }

    setErrors((prev) => ({
      ...prev,
      pickupAddress: '',
      dropoffAddress: '',
      coordinates: '',
    }));

    showGo7Toast('Pick-up and deliver-to swapped', 'success');
  }, [
    formData.pickupAddress,
    formData.dropoffAddress,
    pickupCoords,
    dropoffCoords,
    pickupMarker,
    dropoffMarker,
    pickupLocationSource,
    dropoffLocationSource,
    setConfirmedPickupCoords,
    setConfirmedDropoffCoords,
  ]);

  const handleAddressScenarioChange = (scenario) => {
    const next = scenario === 'receiving' ? 'receiving' : 'sending';
    const prev = addressScenario;
    setAddressScenario(next);
    if (prev === next) return;

    // Fill only the "my location" side when that field is still empty — never overwrite
    const target = next === 'sending' ? 'pickup' : 'dropoff';
    const targetEmpty =
      target === 'pickup'
        ? !String(formData.pickupAddress || '').trim() && !pickupCoords
        : !String(formData.dropoffAddress || '').trim() && !dropoffCoords;
    if (targetEmpty) {
      useCurrentLocation(target);
    }
  };

  const handleAddressQuickAction = (field, action) => {
    if (action === 'gps') {
      useCurrentLocation(field);
      return;
    }
    if (action === 'home' || action === 'work') {
      applySavedAddressToField(field, action);
    }
  };

  // Handle map click for both automatic location setting and manual pin dropping
  const handleMapClick = (lat, lng) => {
    console.log(`🗺️ Map clicked at: ${lat}, ${lng}`);

    // Check if we're in manual pin dropping mode
    if (isManualPinMode && activeManualField) {
      console.log(`📍 Manual pin drop for: ${activeManualField}`);
      handleManualPinDrop(lat, lng, activeManualField);
      return;
    }

    // Standard map click behavior - determine if we should set pickup or dropoff
    if (!pickupCoords) {
      // Set pickup first
      console.log('🔵 Setting pickup location from map click');
      reverseGeocode(lat, lng, 'pickup');
    } else if (!dropoffCoords) {
      // Set dropoff second
      console.log('🔴 Setting dropoff location from map click');
      reverseGeocode(lat, lng, 'dropoff');
    } else {
      // Both are set, ask user which one to replace
      Swal.fire({
        title: 'Replace Location?',
        text: 'Both pickup and dropoff are set. Which would you like to replace?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '🔵 Replace Pickup',
        cancelButtonText: '🔴 Replace Dropoff',
        confirmButtonColor: '#007bff',
        cancelButtonColor: '#dc3545'
      }).then((result) => {
        if (result.isConfirmed) {
          reverseGeocode(lat, lng, 'pickup');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          reverseGeocode(lat, lng, 'dropoff');
        }
      });
    }
  };

  // 📍 MANUAL PIN DROP HANDLER
  // Handle manual pin dropping when geocoding fails
  const handleManualPinDrop = async (lat, lng, field) => {
    console.log(`📍 Manual pin dropped for ${field} at:`, { lat, lng });

    // Show confirmation
    Swal.fire({
      title: '📍 Pin Dropped!',
      text: 'Fetching address for this location...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Reverse geocode to get address
      const address = await reverseGeocodeCoordinates(lat, lng);

      // 📊 LOG RESOLVED COORDINATES FOR CONFIRMATION
      console.log(`📍 MANUAL PIN COORDINATES RESOLVED for ${field}:`, {
        field,
        address,
        coordinates: { lat, lng },
        source: 'Manual Pin Drop',
        timestamp: new Date().toISOString()
      });

      // Set coordinates and update form
      const coords = { lat, lng };
      setFormData(prev => ({ ...prev, [field]: address }));

      if (field === 'pickupAddress') {
        setConfirmedPickupCoords(coords, 'map-pin');
        addMarker(lat, lng, 'pickup');
      } else if (field === 'dropoffAddress') {
        setConfirmedDropoffCoords(coords, 'map-pin');
        addMarker(lat, lng, 'dropoff');
      }

      // Disable manual pin mode
      setIsManualPinMode(false);
      setActiveManualField('');

      // Update map bounds (pricing + route handled by effects)
      setTimeout(() => fitMapBounds(), 500);

      Swal.close();

      Swal.fire({
        icon: 'success',
        title: '📍 Location Set!',
        text: `${field === 'pickupAddress' ? 'Pickup' : 'Dropoff'} location set via pin drop`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

    } catch (error) {
      console.error('❌ Manual pin drop error:', error);

      // Still set the coordinates even if reverse geocoding fails
      const coords = { lat, lng };
      const fallbackAddress = `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      setFormData(prev => ({ ...prev, [field]: fallbackAddress }));

      if (field === 'pickupAddress') {
        setConfirmedPickupCoords(coords, 'map-pin');
        addMarker(lat, lng, 'pickup');
      } else if (field === 'dropoffAddress') {
        setConfirmedDropoffCoords(coords, 'map-pin');
        addMarker(lat, lng, 'dropoff');
      }

      // Disable manual pin mode
      setIsManualPinMode(false);
      setActiveManualField('');

      Swal.close();

      Swal.fire({
        icon: 'warning',
        title: '📍 Location Set',
        text: 'Pin dropped successfully, but couldn\'t get exact address',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    }
  };

  // Enhanced reverse geocoding for manual pin drops
  const reverseGeocodeCoordinates = async (lat, lng) => {
    // Try Google Geocoder first
    if (geocoderService && googleMaps) {
      try {
        const result = await new Promise((resolve, reject) => {
          geocoderService.geocode(
            { location: { lat, lng } },
            (results, status) => {
              if (status === googleMaps.GeocoderStatus.OK && results && results[0]) {
                resolve(results[0].formatted_address);
              } else {
                reject(new Error(`Google reverse geocoding failed: ${status}`));
              }
            }
          );
        });
        return result;
      } catch (error) {
        console.error('Google reverse geocoding failed:', error);
      }
    }

    // Fallback to coordinate display
    return `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  // Reverse geocode coordinates
  const reverseGeocode = async (lat, lng, type) => {
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`
      );
      const data = await response.json();
      const address = data.features[0]?.place_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

      if (type === 'pickup') {
        setFormData(prev => ({ ...prev, pickupAddress: address }));
        setConfirmedPickupCoords({ lat, lng }, 'map-pin');
        addMarker(lat, lng, 'pickup');
      } else {
        setFormData(prev => ({ ...prev, dropoffAddress: address }));
        setConfirmedDropoffCoords({ lat, lng }, 'map-pin');
        addMarker(lat, lng, 'dropoff');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  // Calculate straight line distance as fallback

  // Calculate dynamic delivery pricing using unified fare system
  const calculateDeliveryFee = (distanceKm) => {
    return computeTripFare(distanceKm, getServiceMultiplier(serviceType), { pricingSettings }).total;
  };

  // Get distance between pickup and dropoff
  const calculateStraightLineDistance = () => {
    if (!pickupCoords || !dropoffCoords) return 0;
    return calculateHaversineDistance(
      pickupCoords.lat,
      pickupCoords.lng,
      dropoffCoords.lat,
      dropoffCoords.lng
    );
  };

  // Draw enhanced route on map


  // 4️⃣ Render Google polyline on existing Leaflet + MapTiler map with Go7 styling
  const drawGoogleRouteOnMap = (directionsResult) => {
    if (!mapInstanceRef.current) return;
    // Only works on Leaflet maps
    if (typeof mapInstanceRef.current.setView !== 'function') return;

    try {
    // Remove existing route
    if (routePolyline) {
      try { mapInstanceRef.current.removeLayer(routePolyline); } catch (_) {}
    }

    // Extract path from Google Directions result
    const route = directionsResult.routes[0];
    const path = route.overview_path;

    // Convert Google LatLng objects to Leaflet format
    const coordinates = path.map(point => [point.lat(), point.lng()]);

    // 5️⃣ STYLING - Go7 color scheme (#E30613 for active route) with enhanced visuals
    const polyline = L.polyline(coordinates, {
      color: '#E30613', // Go7 brand color for active route
      weight: 6,
      opacity: 0.9,
      dashArray: '8, 12',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'go7-active-route',
      pane: 'routePane', // Use custom route pane above traffic
      interactive: false // Don't interfere with map interactions
    }).addTo(mapInstanceRef.current);

    // Add pulsing animation effect
    polyline.on('add', function () {
      const path = polyline.getElement();
      if (path) {
        path.style.strokeDasharray = '5, 10';
        path.style.animation = 'dash 2s linear infinite, pulse 1.5s ease-in-out infinite';
      }
    });

    setRoutePolyline(polyline);

    // Fit map to show the route with better padding for mobile
    const isMobile = window.innerWidth < 768;
    const padding = isMobile ? [40, 40] : [60, 60];
    try {
      const routeBounds = polyline.getBounds();
      if (routeBounds && routeBounds.isValid()) {
        mapInstanceRef.current.fitBounds(routeBounds, {
          padding: padding,
          maxZoom: 15
        });
      }
    } catch (e) {
      console.warn('fitBounds error:', e);
    }

    // Add route waypoints as small markers
    if (route.legs && route.legs.length > 0) {
      route.legs.forEach((leg, index) => {
        // Add start marker
        if (index === 0) {
          L.circleMarker([leg.start_location.lat(), leg.start_location.lng()], {
            radius: 5,
            fillColor: '#22c55e', // Go7 green for start
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9,
            pane: 'markerPane' // Use custom marker pane on top
          }).addTo(mapInstanceRef.current);
        }

        // Add end marker
        L.circleMarker([leg.end_location.lat(), leg.end_location.lng()], {
          radius: 5,
          fillColor: '#E30613', // Go7 brand red for destination
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
          pane: 'markerPane' // Use custom marker pane on top
        }).addTo(mapInstanceRef.current);
      });
    }
    } catch (e) {
      console.warn('drawGoogleRouteOnMap error:', e);
    }
  };

  // Toggle Google Traffic Layer as Leaflet tile overlay
  const toggleTrafficLayer = () => {
    if (!mapInstanceRef.current) return;

    try {
      if (trafficLayer) {
        // Remove existing traffic layer from Leaflet map
        mapInstanceRef.current.removeLayer(trafficLayer);
        setTrafficLayer(null);
        showGo7Toast('Traffic layer disabled', 'success');
      } else {
        // Create Google Maps traffic tile layer overlay
        // Using Google's traffic tiles service
        const trafficKey = GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        const googleTrafficLayer = L.tileLayer(
          trafficKey
            ? `https://mt1.googleapis.com/vt/lyrs=h@221097413,traffic&x={x}&y={y}&z={z}&key=${trafficKey}`
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '© Google',
            maxZoom: 18,
            opacity: 0.6,
            pane: 'trafficPane', // Use custom traffic pane
            className: 'leaflet-traffic-layer',
            transparent: true
          }
        );

        // Add traffic overlay to Leaflet map
        googleTrafficLayer.addTo(mapInstanceRef.current);
        setTrafficLayer(googleTrafficLayer);
        showGo7Toast('Google Traffic overlay enabled', 'success');

        console.log('Google Traffic tile layer added to Leaflet map');
      }
    } catch (error) {
      console.error('Traffic layer toggle error:', error);

      // Fallback: Try alternative traffic overlay approach
      try {
        if (!trafficLayer) {
          // Alternative: Use a different traffic data source
          const alternativeTrafficLayer = L.tileLayer(
            'https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=YOUR_THUNDERFOREST_KEY',
            {
              attribution: '© Thunderforest, © OpenStreetMap contributors',
              maxZoom: 18,
              opacity: 0.5,
              pane: 'overlayPane',
              zIndex: 1000
            }
          );

          // For now, create a visual indicator overlay
          const trafficIndicatorLayer = L.tileLayer(
            'data:image/svg+xml;base64,' + btoa(`
              <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
                <defs>
                  <pattern id="traffic" patternUnits="userSpaceOnUse" width="4" height="4">
                    <rect width="2" height="2" fill="rgba(255,0,0,0.1)"/>
                    <rect x="2" y="2" width="2" height="2" fill="rgba(255,165,0,0.1)"/>
                  </pattern>
                </defs>
                <rect width="256" height="256" fill="url(#traffic)"/>
                <text x="128" y="128" text-anchor="middle" fill="rgba(255,0,0,0.3)" font-size="12">TRAFFIC</text>
              </svg>
            `),
            {
              attribution: 'Traffic Simulation',
              maxZoom: 18,
              opacity: 0.3,
              pane: 'overlayPane',
              zIndex: 1000
            }
          );

          trafficIndicatorLayer.addTo(mapInstanceRef.current);
          setTrafficLayer(trafficIndicatorLayer);
          showGo7Toast('Traffic simulation overlay enabled', 'success');
        }
      } catch (fallbackError) {
        console.error('Fallback traffic layer error:', fallbackError);
        showGo7Toast('Traffic layer unavailable', 'error');
      }
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // NEW: Navigate to enhanced checkout page
  const proceedToEnhancedCheckout = () => {
    if (!requireAuthForBooking()) return;

    // Validate required fields first
    const validationErrors = {};
    if (!formData.senderName) validationErrors.senderName = 'Sender name is required';
    if (!formData.senderPhone) validationErrors.senderPhone = 'Sender phone is required';
    if (!formData.pickupAddress) validationErrors.pickupAddress = 'Pickup address is required';
    if (!formData.dropoffAddress) validationErrors.dropoffAddress = 'Dropoff address is required';
    if (!formData.recipientName) validationErrors.recipientName = 'Recipient name is required';
    if (!formData.recipientPhone) validationErrors.recipientPhone = 'Recipient phone is required';
    if (!pickupCoords || !dropoffCoords) validationErrors.coordinates = 'Please set both pickup and dropoff locations on the map';
    if (!formData.packageName.trim()) validationErrors.packageName = 'Package name is required';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showGo7Warning(
        `Please complete all required fields`,
        '⚠️ Form Incomplete'
      );
      return;
    }

    // Navigate to enhanced checkout with all data
    console.log('🚀 NAVIGATING TO CONFIRM & PAY WITH FARE:', fare);
    console.log('🚀 PRICING BREAKDOWN:', pricingBreakdown);
    
    navigate('/confirm-and-pay', {
      state: {
        serviceType: 'parcel',
        distance: distance,
        itemTotal: 0,
        items: [],
        pickup: pickupCoords,
        dropoff: dropoffCoords,
        // 🎯 CRITICAL FIX: Pass the actual calculated fare from BookDelivery
        calculatedFare: fare,
        pricingBreakdown: pricingBreakdown,
        deliveryDetails: {
          pickupAddress: formData.pickupAddress,
          dropoffAddress: formData.dropoffAddress,
          senderName: formData.senderName,
          senderPhone: formData.senderPhone,
          deliveryMode: formData.deliveryMode
        },
        recipientInfo: {
          name: formData.recipientName,
          phone: formData.recipientPhone
        },
        packageDetails: {
          name: formData.packageName,
          size: formData.packageSize,
          weight: formData.packageWeight,
          type: formData.packageType,
          description: formData.packageDescription
        }
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!requireAuthForBooking()) {
      return;
    }

    // Validate form data
    const validationErrors = {};
    if (!formData.senderName) validationErrors.senderName = 'Sender name is required';
    if (!formData.senderPhone) validationErrors.senderPhone = 'Sender phone is required';
    if (!formData.senderEmail) validationErrors.senderEmail = 'Sender email is required';
    if (!formData.pickupAddress) validationErrors.pickupAddress = 'Pickup address is required';
    if (!formData.dropoffAddress) validationErrors.dropoffAddress = 'Dropoff address is required';
    if (!formData.recipientName) validationErrors.recipientName = 'Recipient name is required';
    if (!formData.recipientPhone) validationErrors.recipientPhone = 'Recipient phone is required';
    if (!formData.recipientEmail) validationErrors.recipientEmail = 'Recipient email is required';
    if (!pickupCoords || !dropoffCoords) validationErrors.coordinates = 'Please set both pickup and dropoff locations on the map';

    // NEW: Enhanced payment validation with role-based options
    if (!formData.paymentMethod) {
      validationErrors.payment = 'Please select a payment method';
    }
    
    // NEW: Package name validation
    if (!formData.packageName.trim()) {
      validationErrors.packageName = 'Package name is required';
    }

    // Wallet balance validation for wallet payments (amount checked after quote refresh below)

    console.log('🔍 Form validation check:', {
      formData,
      pickupCoords,
      dropoffCoords,
      validationErrors
    });

    if (Object.keys(validationErrors).length > 0) {
      console.log('❌ Validation failed:', validationErrors);
      setErrors(validationErrors);

      // Show validation error notification
      const errorMessages = Object.values(validationErrors).join(', ');
      await showGo7Warning(
        `Please complete all required fields: ${errorMessages}`,
        '⚠️ Form Incomplete'
      );
      return;
    }

    const pickupCheck = validateServiceLocation({
      lat: pickupCoords?.lat,
      lng: pickupCoords?.lng,
      address: formData.pickupAddress,
    });
    const dropoffCheck = validateServiceLocation({
      lat: dropoffCoords?.lat,
      lng: dropoffCoords?.lng,
      address: formData.dropoffAddress,
    });

    if (!pickupCheck.valid || !dropoffCheck.valid) {
      await showGo7Warning(
        'One or both addresses appear outside Abeokuta. Please pick locations within Abeokuta or choose from suggestions.',
        '📍 Location Outside Service Area'
      );
      return;
    }

    if (pickupCheck.snapped && pickupCheck.lat != null && pickupCheck.lng != null) {
      // snapped === lat/lng order swap only (soft city-center snap removed)
      setConfirmedPickupCoords({ lat: pickupCheck.lat, lng: pickupCheck.lng }, pickupLocationSource);
    }
    if (dropoffCheck.snapped && dropoffCheck.lat != null && dropoffCheck.lng != null) {
      setConfirmedDropoffCoords({ lat: dropoffCheck.lat, lng: dropoffCheck.lng }, dropoffLocationSource);
    }

    // Lock quoted fare before checkout — same amount shown on the booking form.
    // Do NOT re-fetch road distance here: getRoadDistanceKm can silently land on
    // a different provider (Google/ORS/OSRM/straight-line estimate) between calls,
    // producing a different fare than what the customer just saw on screen.
    let quotedFare = getQuotedFare();
    let quotedDistanceKm = effectiveDistanceKm;

    if (!quotedFare || quotedFare <= 0) {
      await showGo7Warning(
        'Unable to calculate delivery fare. Please check your pickup and dropoff addresses.',
        '⚠️ Pricing Error'
      );
      return;
    }

    let orderPricing = buildParcelOrderPricing({ deliveryFee: quotedFare, itemTotal: 0 });
    let quotedGrandTotal = orderPricing.grandTotal;

    // 🔒 SERVER-AUTHORITATIVE: fetch the TRUE fee BEFORE any balance check or
    // payment. The server recomputes distance/zone/orderType/fee from the real
    // coordinates and throws if the client preview was manipulated or the
    // destination is outside Abeokuta — payment is never reached on failure.
    const authoritative = await computeBookDeliveryFee({
      orderType: BOOK_DELIVERY_ORDER_TYPE,
      pickup: { lat: pickupCoords.lat, lng: pickupCoords.lng },
      destination: { lat: dropoffCoords.lat, lng: dropoffCoords.lng },
      clientFee: quotedFare,
      clientDistanceKm: quotedDistanceKm,
      clientOrderType: BOOK_DELIVERY_ORDER_TYPE,
    });
    quotedFare = authoritative.deliveryFee;
    quotedDistanceKm = authoritative.distanceKm;
    orderPricing = buildParcelOrderPricing({ deliveryFee: quotedFare, itemTotal: 0 });
    quotedGrandTotal = orderPricing.grandTotal;

    if (formData.paymentMethod === 'wallet' && user && enhancedUser.walletBalance < quotedGrandTotal) {
      setErrors({
        payment: `Insufficient wallet balance. Required: ₦${quotedGrandTotal.toLocaleString()}, Available: ₦${enhancedUser.walletBalance.toLocaleString()}`,
      });
      await showGo7Warning(
        `Insufficient wallet balance. Required: ₦${quotedGrandTotal.toLocaleString()}, Available: ₦${enhancedUser.walletBalance.toLocaleString()}`,
        '⚠️ Insufficient Balance'
      );
      return;
    }

    // Fail closed before charging — never invent pins when coords are missing
    if (
      pickupCoords?.lat == null ||
      pickupCoords?.lng == null ||
      dropoffCoords?.lat == null ||
      dropoffCoords?.lng == null
    ) {
      await showGo7Warning(
        'Pickup and dropoff must be pinned on the map (suggestion, GPS, or drag pin) before booking.',
        '📍 Precise pins required'
      );
      return;
    }

    // Console log booking details
    console.log('=== BOOKING DETAILS ===');
    console.log('Pickup:', {
      address: formData.pickupAddress,
      coordinates: pickupCoords
    });
    console.log('Dropoff:', {
      address: formData.dropoffAddress,
      coordinates: dropoffCoords
    });
    console.log('Distance:', distance.toFixed(2), 'km');
    console.log('Estimated Fare:', '₦' + estimatedFare);
    console.log('Sender:', formData.senderName, formData.senderPhone);
    console.log('Recipient:', formData.recipientName, formData.recipientPhone);
    console.log('Payment Type:', formData.paymentType);

    // Show confirmation with payment details
    const result = await Swal.fire({
      title: 'Confirm Your Booking',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong><svg class="w-4 h-4 inline text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.25 18.75a1.5 1.5 0 01-3 0V6a3 3 0 013-3h6a3 3 0 013 3v7.5M8.25 18.75h1.5a1.5 1.5 0 001.5-1.5V12a1.5 1.5 0 00-1.5-1.5h-1.5m0 7.5v-7.5m0 0H6a1.5 1.5 0 00-1.5 1.5v1.5a1.5 1.5 0 001.5 1.5h2.25M19.5 12v6a1.5 1.5 0 01-1.5 1.5h-1.5a1.5 1.5 0 01-1.5-1.5v-1.5a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5z"/></svg> From:</strong> ${formData.pickupAddress}</p>
          <p><strong><svg class="w-4 h-4 inline text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> To:</strong> ${formData.dropoffAddress}</p>
          <p><strong><svg class="w-4 h-4 inline text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg> Distance:</strong> ${quotedDistanceKm.toFixed(2)} km</p>
          <p><strong><svg class="w-4 h-4 inline text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Fare:</strong> ₦${quotedFare.toLocaleString()}</p>
          <p><strong><svg class="w-4 h-4 inline text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Sender:</strong> ${formData.senderName}</p>
          <p><strong><svg class="w-4 h-4 inline text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> Recipient:</strong> ${formData.recipientName}</p>
          <div style="background: #fff5f5; border: 1px solid #fed7d7; border-radius: 8px; padding: 12px; margin-top: 15px;">
            <p style="color: #e61e25; font-weight: 600; margin: 0;">💳 Payment Required</p>
            <p style="color: #666; font-size: 14px; margin: 5px 0 0 0;">Payment is required before your parcel can be picked up.</p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e61e25',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Proceed to Payment',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    // Start payment processing
    setIsProcessingPayment(true);

    // 🔒 SERVER-AUTHORITATIVE ORDER CREATION — the server generates the booking
    // ID, validates the pins, recomputes distance/zone/fee and returns the
    // authoritative totals. The client never writes bookings/orders directly.
    let createdOrder = null;
    try {
      createdOrder = await createBookDeliveryOrder({
        pickup: { address: formData.pickupAddress, lat: pickupCoords.lat, lng: pickupCoords.lng },
        dropoff: { address: formData.dropoffAddress, lat: dropoffCoords.lat, lng: dropoffCoords.lng },
        pickupLocationSource,
        dropoffLocationSource,
        sender: {
          name: formData.senderName,
          phone: formData.senderPhone,
          email: formData.senderEmail || user?.email || '',
        },
        recipient: {
          name: formData.recipientName,
          phone: formData.recipientPhone,
          email: formData.recipientEmail || '',
        },
        itemDescription: formData.itemDescription,
        packageDetails: {
          name: formData.packageName,
          size: formData.packageSize,
          weight: formData.packageWeight,
          type: formData.packageType,
          multiplier: calculateTotalMultiplier(),
        },
        deliveryMode: formData.deliveryMode,
        specialNotes: formData.note,
        paymentMethod: formData.paymentMethod,
        paymentType: formData.paymentType,
        referralCode: formData.referralCode,
        referrerId: formData.referrerId,
        promotionId: formData.promotionId,
        promoCreditApplied: formData.promoCreditApplied || formData.prePromoCredit,
        clientFee: quotedFare,
        clientDistanceKm: quotedDistanceKm,
      });
    } catch (createErr) {
      console.error('❌ Server booking creation failed:', createErr);
      setIsProcessingPayment(false);
      await Swal.fire({
        icon: 'error',
        title: '❌ Booking Failed',
        text: createErr.message || 'Could not create your booking. Please try again.',
        confirmButtonColor: '#e61e25'
      });
      return;
    }

    const pendingBookingId = createdOrder.bookingId;
    pendingBookingIdRef.current = pendingBookingId;
    let walletCharged = false;
    let paystackReference = null;

    // Show payment processing notification
    await Swal.fire({
      title: 'Processing Payment...',
      html: `
        <div style="text-align: center; padding: 20px;">
          <div style="width: 50px; height: 50px; border: 4px solid #f3f3f3; border-top: 4px solid #e61e25; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
          <p style="color: #666; margin: 0;">Processing Payment via Go7 Secure Gateway...</p>
          <p style="color: #e61e25; font-weight: 600; margin: 10px 0 0 0;">Please wait while we process your payment</p>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      timer: 3000
    });

    try {
      let paymentSuccessful = false;
      
      if (formData.paymentMethod === 'wallet') {
        // Process wallet payment — server-authoritative grand total only
        if (user?.uid) {
          try {
            const walletPaymentAmount = createdOrder.grandTotal;
            const walletResult = await payForDeliveryWithWallet(
              user.uid,
              pendingBookingId,
              walletPaymentAmount,
              'Book Delivery'
            );
            paymentSuccessful = walletResult.success;
            walletCharged = Boolean(paymentSuccessful);
            if (!paymentSuccessful) {
              throw new Error(walletResult.message || 'Insufficient wallet balance');
            }
          } catch (walletError) {
            // Idempotent retry: the debit transaction already exists for this
            // bookingId — treat as paid and let the server confirm it.
            if (/already been paid|already-exists/i.test(String(walletError?.message || ''))) {
              paymentSuccessful = true;
              walletCharged = true;
            } else {
              await Swal.fire({
                icon: 'error',
                title: '❌ Payment Failed',
                text: 'Insufficient wallet balance or payment error. Please try another payment method.',
                confirmButtonColor: '#e61e25'
              });
              setIsProcessingPayment(false);
              return;
            }
          }
        } else {
          await Swal.fire({
            icon: 'error',
            title: '❌ Authentication Required',
            text: 'Please log in to use wallet payment.',
            confirmButtonColor: '#e61e25'
          });
          setIsProcessingPayment(false);
          return;
        }
      } else if (formData.paymentMethod === 'paystack') {
        try {
          const formEl = bookingFormRef.current;
          const paystackEmail =
            formEl?.querySelector('#paystack-email-address')?.value ||
            user?.email ||
            formData.senderEmail ||
            'customer@go7.ng';
          // NEVER trust a client-editable hidden amount field — the Paystack
          // charge must use the server-authoritative grand total only.
          const amountKobo = createdOrder.totalKobo;

          const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY
            || 'pk_live_c04fd74b02d6034f4f1cf946887b8e3fc1a06831';

          if (!window.PaystackPop) {
            throw new Error('Payment system is still loading. Please wait a moment and try again.');
          }
          if (!paystackKey?.startsWith('pk_')) {
            throw new Error('Payment is not configured. Please contact support.');
          }
          if (!amountKobo || amountKobo <= 0) {
            throw new Error('Invalid payment amount. Please check your delivery fee.');
          }

          const paystackPayment = new Promise((resolve, reject) => {
            const handler = window.PaystackPop.setup({
              key: paystackKey,
              email: paystackEmail,
              amount: amountKobo,
              ref: `go7_${new Date().getTime()}`,
              currency: 'NGN',
              metadata: {
                paymentType: 'service_payment',
                userId: user?.uid || 'guest',
                serviceType: 'Book Delivery',
                paymentMethod: 'paystack',
                bookingId: pendingBookingId,
              },
              callback: function(response) {
                console.log('✅ Paystack payment callback:', response?.reference);
                resolve(response);
              },
              onClose: function() {
                console.log('❌ Paystack payment window closed');
                reject(new Error('Payment cancelled by user'));
              }
            });
            handler.openIframe();
          });

          const paystackResponse = await paystackPayment;
          paystackReference = paystackResponse?.reference || null;
          paymentSuccessful = true;

        } catch (paystackError) {
          console.error('Paystack error:', paystackError);
          await Swal.fire({
            icon: 'error',
            title: '❌ Payment Cancelled',
            text: paystackError.message || 'Payment was not completed. Please try again.',
            confirmButtonColor: '#e61e25'
          });
          setIsProcessingPayment(false);
          return;
        }
      } else if (formData.paymentMethod === 'pod') {
        // NEW: Pay on Delivery (only for vendors)
        if (enhancedUser.role === 'vendor') {
          console.log('✅ Pay on Delivery selected - Payment will be collected on delivery');
          paymentSuccessful = true; // No upfront payment required
        } else {
          await Swal.fire({
            icon: 'error',
            title: '❌ Payment Method Not Available',
            text: 'Pay on Delivery is only available for verified vendors.',
            confirmButtonColor: '#e61e25'
          });
          setIsProcessingPayment(false);
          return;
        }
      }

      if (!paymentSuccessful) {
        await Swal.fire({
          icon: 'error',
          title: '❌ Payment Required',
          text: 'Payment is required before delivery can be scheduled.',
          confirmButtonColor: '#e61e25'
        });
        setIsProcessingPayment(false);
        return;
      }

      // Payment successful - show confirmation
      await Swal.fire({
        icon: 'success',
        title: '✅ Payment Received',
        text: 'Payment received — your delivery is now being processed.',
        confirmButtonColor: '#e61e25'
      });

    } catch (paymentError) {
      console.error('Payment error:', paymentError);
      await Swal.fire({
        icon: 'error',
        title: '❌ Payment Error',
        text: paymentError.message || 'Payment processing failed. Please try again.',
        confirmButtonColor: '#e61e25'
      });
      setIsProcessingPayment(false);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Draw route on map only — fare was locked at checkout
      await calculateFinalRoute();

      // 🔒 SERVER VERIFY + CREATE + DISPATCH — the server verifies the payment
      // (Paystack reference / wallet transaction / POD vendor check), then
      // creates the bookings/orders records and assigns a rider. The client
      // supplies only the payment reference — it never marks anything paid.
      const processingToast = showBookingProcessing();

      const confirmation = await confirmBookDeliveryPayment({
        bookingId: pendingBookingId,
        method: formData.paymentMethod,
        reference: paystackReference,
      });
      const bookingId = confirmation.bookingId;

      if (confirmation.dispatch?.assigned && confirmation.dispatch?.rider) {
        window.assignedRiderInfo = {
          name: confirmation.dispatch.rider.name,
          phone: confirmation.dispatch.rider.phone,
          vehicle: confirmation.dispatch.rider.vehicleType,
          distance: confirmation.dispatch.rider.distanceFormatted,
        };
      } else {
        window.assignedRiderInfo = null;
      }

      // Hide processing toast
      if (processingToast && processingToast.hideToast) {
        processingToast.hideToast();
      }

      // NEW: Enhanced Console Logging
      console.log('=== 🎉 BOOKING CONFIRMATION SUCCESS ===');
      console.log('📱 Booking ID:', bookingId);
      console.log('🏠 Pickup Address:', formData.pickupAddress);
      console.log('🎯 Dropoff Address:', formData.dropoffAddress);
      console.log('📦 Package Name:', formData.packageName);
      console.log('📏 Package Size:', formData.packageSize);
      console.log('🚚 Delivery Mode:', formData.deliveryMode);
      console.log('💳 Payment Method:', formData.paymentMethod);
      console.log('💰 Total Fee:', `₦${estimatedFare}`);
      console.log('📍 Distance Calculated:', `${pricingBreakdown.distance?.toFixed(2)} km`);
      console.log('🔥 Firebase Write:', 'SUCCESS');
      console.log('=============================');

      // Prepare rider info for success message
      const riderInfo = window.assignedRiderInfo;

      // Navigate directly to tracking page (before form reset so a reset error can't block tracking)
      try {
        localStorage.setItem('go7_last_tracking_id', bookingId);
      } catch (_) {}
      navigate(`/track-order/${bookingId}`);
      resetForm();

      console.log('✅ Booking saved to Firestore with ID:', bookingId);

      // NEW: Enhanced Go7 Success Toast/Modal

      // Send order confirmation email with all details
      try {
        console.log('­ƒôº Sending order confirmation email...');
        
        // Prepare detailed order summary for email
        const orderSummary = {
          bookingId: bookingId,
          customerName: formData.senderName,
          customerEmail: formData.senderEmail || user?.email,
          customerPhone: formData.senderPhone,
          pickupAddress: formData.pickupAddress,
          dropoffAddress: formData.dropoffAddress,
          recipientName: formData.recipientName,
          recipientPhone: formData.recipientPhone,
          packageName: formData.packageName,
          packageSize: formData.packageSize,
          deliveryMode: formData.deliveryMode,
          totalFee: fare || pricingBreakdown.total || estimatedFare,
          distance: pricingBreakdown.distance?.toFixed(2) || distance.toFixed(2),
          paymentMethod: formData.paymentMethod,
          paymentStatus: 'Paid',
          orderStatus: 'Confirmed',
          estimatedDeliveryTime: `${Math.ceil(distance * 3)}-${Math.ceil(distance * 4)} minutes`,
          createdAt: new Date().toLocaleString()
        };

        // Log order details to console for now (in production, send actual email)
        console.log('­ƒôª ORDER CONFIRMATION DETAILS:', orderSummary);
        console.log('ÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöü');
        console.log('­ƒô▒ Booking ID:', orderSummary.bookingId);
        console.log('­ƒæñ Customer:', orderSummary.customerName, '|', orderSummary.customerPhone);
        console.log('­ƒôº Email:', orderSummary.customerEmail);
        console.log('­ƒÅá Pickup:', orderSummary.pickupAddress);
        console.log('­ƒÄ» Dropoff:', orderSummary.dropoffAddress);
        console.log('­ƒôª Package:', orderSummary.packageName, '|', orderSummary.packageSize);
        console.log('­ƒÜÜ Delivery:', orderSummary.deliveryMode);
        console.log('­ƒÆ░ Total Fee:', 'Ôéª' + orderSummary.totalFee.toLocaleString());
        console.log('­ƒôÅ Distance:', orderSummary.distance, 'km');
        console.log('ÔÅ▒´©Å ETA:', orderSummary.estimatedDeliveryTime);
        console.log('­ƒÆ│ Payment:', orderSummary.paymentMethod, '|', orderSummary.paymentStatus);
        console.log('ÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöüÔöü');
        
        // TODO: Implement actual email sending service
        // await sendOrderConfirmationEmail(orderSummary);
        
      } catch (emailError) {
        console.error('ÔØî Failed to send confirmation email:', emailError);
        // Non-critical error - don't block the flow
      }

    } catch (error) {
      console.error('Error booking delivery:', error);

      if (walletCharged && user?.uid && pendingBookingId) {
        try {
          await refundWalletPayment(
            user.uid,
            pendingBookingId,
            error.message || 'Booking failed after wallet payment'
          );
          console.log('✅ Wallet refunded after failed booking');
        } catch (refundError) {
          console.error('❌ Wallet refund failed after booking error:', refundError);
        }
      }

      // Show modern error alert
      await showInvalidAddress(
        error.message || "We couldn't complete your booking. Please check your connection and try again."
      );

      setErrors({ submit: 'Failed to book delivery. Please try again.' });
    } finally {
      setIsSubmitting(false);
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen min-h-[100dvh] relative overflow-x-hidden">
      <Helmet>
        <title>Book a Delivery | Go7</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          {`
            @keyframes dash {
              from {
                stroke-dashoffset: 20;
              }
              to {
                stroke-dashoffset: 0;
              }
            }
            @keyframes pulse {
              0%, 100% {
                opacity: 0.8;
                transform: scale(1);
              }
              50% {
                opacity: 1;
                transform: scale(1.02);
              }
            }
            /* 5️⃣ STYLING - Go7 active route with brand colors */
            .go7-active-route {
              filter: drop-shadow(0 3px 6px rgba(227, 6, 19, 0.4));
              z-index: 2000 !important;
            }
            .google-route-line {
              filter: drop-shadow(0 2px 4px rgba(37, 99, 235, 0.3));
              z-index: 2000 !important;
            }
            .custom-delivery-marker {
              z-index: 3000 !important;
            }
            /* Layer ordering for proper map display */
            .leaflet-tile-pane {
              z-index: 1 !important;
            }
            .leaflet-overlay-pane {
              z-index: 1000 !important;
            }
            .leaflet-shadow-pane {
              z-index: 2000 !important;
            }
            .leaflet-marker-pane {
              z-index: 3000 !important;
            }
            .leaflet-tooltip-pane {
              z-index: 3500 !important;
            }
            .leaflet-popup-pane {
              z-index: 4000 !important;
            }
            /* Traffic layer styling */
            .leaflet-traffic-layer {
              mix-blend-mode: multiply;
              opacity: 0.6 !important;
            }
            .leaflet-container {
              font-family: inherit;
              background-color: #f8fafc !important;
              width: 100% !important;
              height: 100% !important;
            }
            .leaflet-tile-container {
              background-color: transparent !important;
            }
            .leaflet-tile {
              background-color: transparent !important;
            }
            .leaflet-popup-content-wrapper {
              border-radius: 8px;
            }
            .touch-manipulation {
              touch-action: manipulation;
            }
            #book-delivery-form input,
            #book-delivery-form textarea,
            #book-delivery-form select {
              scroll-margin-bottom: 120px;
              scroll-margin-top: 80px;
            }
            .leaflet-control-custom {
              background: white !important;
              border-radius: 4px !important;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
            }
            .leaflet-control-custom:hover {
              background: #f0f0f0 !important;
            }
            /* Ensure map tiles load properly */
            .leaflet-tile {
              transition: opacity 0.2s ease-in-out;
            }
            .leaflet-tile-loaded {
              opacity: 1;
            }
          `}
        </style>
      </Helmet>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg`}>
          <div className="flex items-center gap-2">
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 text-white hover:text-gray-200">×</button>
          </div>
        </div>
      )}

      {/* Authentication Required Banner */}
      {!isAuthenticatedForBooking() && (
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white py-4 shadow-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-lg">Sign in Required</p>
                  <p className="text-sm text-white/90">You must be signed in to book a delivery and make payments</p>
                </div>
              </div>
              <button
                type="button"
                onClick={openSignInModal}
                className="bg-white text-red-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-red-50 transition-all shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Sign In Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Go7 Brand Header */}
      <div className="bg-gradient-to-br from-red-600 via-red-700 to-red-800 text-white shadow-2xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Back Button */}
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go back"
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center transform hover:scale-105 transition-transform duration-200">
                <span className="text-red-600 font-bold text-xl tracking-tight">Go7</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-clip-text bg-gradient-to-r from-white to-red-100">Book Delivery</h1>
                <p className="text-red-100 text-sm font-medium">⚡ Fast & Reliable in Abeokuta</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <span>⚡</span>
                <span>30min Average</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>📍</span>
                <span>All Abeokuta</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <div className="max-w-7xl mx-auto">
          {/* Mobile-First Grid Layout */}
          <div className="max-w-2xl mx-auto">
            <div className="card-float bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-visible hover:shadow-3xl transition-shadow duration-300">
                <div className="bg-gradient-to-br from-red-50 via-orange-50 to-red-50 border-b border-red-100 p-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-red-700 to-red-600 bg-clip-text text-transparent flex items-center space-x-3">
                    <span className="text-2xl">📋</span>
                    <span>Delivery Details</span>
                  </h2>
                  <p className="text-red-600 text-sm mt-2 font-medium">Fill in your delivery information accurately</p>
                </div>
                <div className="p-4 sm:p-8">
                  <form id="book-delivery-form" ref={bookingFormRef} onSubmit={handleSubmit} className="space-y-6 pb-4">
                    <div className="space-y-6">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                        <span className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 text-white rounded-lg flex items-center justify-center text-sm font-bold shadow-md">1</span>
                        <span>Sender Information</span>
                      </h3>
                      <div className="grid md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-800 mb-2">Your Name *</label>
                          <input
                            type="text"
                            value={formData.senderName}
                            onChange={(e) => handleInputChange('senderName', e.target.value)}
                            className={`form-input-enhanced w-full p-4 border-2 rounded-xl transition-all duration-300 hover:border-red-400 focus:ring-4 focus:ring-red-100 ${errors.senderName ? 'border-red-500 bg-red-50 shadow-red-200' : 'border-gray-200 hover:shadow-xl focus:border-red-500'
                              }`}
                            placeholder="Enter your full name"
                          />
                          {errors.senderName && <p className="text-red-600 text-xs mt-1 font-medium flex items-center"><span className="mr-1">⚠️</span>{errors.senderName}</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-gray-800 mb-2">Your Phone *</label>
                          <input
                            type="tel"
                            value={formData.senderPhone}
                            onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                            className={`w-full p-4 border-2 rounded-xl transition-all duration-300 hover:border-red-400 focus:ring-4 focus:ring-red-100 ${errors.senderPhone ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:shadow-xl focus:border-red-500'
                              }`}
                            placeholder="e.g., +234 801 234 5678"
                          />
                          {errors.senderPhone && <p className="text-red-600 text-xs mt-1 font-medium flex items-center"><span className="mr-1">⚠️</span>{errors.senderPhone}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">Your Email *</label>
                        <input
                          type="email"
                          value={formData.senderEmail}
                          onChange={(e) => handleInputChange('senderEmail', e.target.value)}
                          className={`w-full p-4 border-2 rounded-xl transition-all duration-300 hover:border-red-400 hover:shadow-xl focus:ring-4 focus:ring-red-100 ${errors.senderEmail ? 'border-red-500 bg-red-50' : 'border-gray-200 focus:border-red-500'
                            }`}
                          placeholder="your.email@example.com"
                          required
                        />
                        {errors.senderEmail && <p className="text-red-600 text-xs mt-1 font-medium flex items-center"><span className="mr-1">⚠️</span>{errors.senderEmail}</p>}
                      </div>
                    </div>

                    <BookDeliveryAddressPanel
                      scenario={addressScenario}
                      onScenarioChange={handleAddressScenarioChange}
                      pickupAddress={formData.pickupAddress}
                      dropoffAddress={formData.dropoffAddress}
                      pickupCoords={pickupCoords}
                      dropoffCoords={dropoffCoords}
                      pickupCoordsConfirmed={pickupCoordsConfirmed}
                      dropoffCoordsConfirmed={dropoffCoordsConfirmed}
                      errors={errors}
                      hasHome={(() => {
                        const a = findSavedAddressByKind('home');
                        const c = a ? extractCoordsFromAddress(a) : null;
                        return Boolean(a && c && hasValidCoords(c));
                      })()}
                      hasWork={(() => {
                        const a = findSavedAddressByKind('work');
                        const c = a ? extractCoordsFromAddress(a) : null;
                        return Boolean(a && c && hasValidCoords(c));
                      })()}
                      onPickupChange={(value) => handleAddressInput('pickupAddress', value)}
                      onDropoffChange={(value) => handleAddressInput('dropoffAddress', value)}
                      onPickupKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddressSubmit('pickupAddress', formData.pickupAddress);
                        }
                      }}
                      onDropoffKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddressSubmit('dropoffAddress', formData.dropoffAddress);
                        }
                      }}
                      onPickupBlur={() => {
                        setTimeout(() => {
                          if (
                            formData.pickupAddress &&
                            !pickupCoordsConfirmed &&
                            !isSelectingRef.current
                          ) {
                            handleAddressSubmit('pickupAddress', formData.pickupAddress);
                          }
                        }, 400);
                      }}
                      onDropoffBlur={() => {
                        setTimeout(() => {
                          if (
                            formData.dropoffAddress &&
                            !dropoffCoordsConfirmed &&
                            !isSelectingRef.current
                          ) {
                            handleAddressSubmit('dropoffAddress', formData.dropoffAddress);
                          }
                        }, 400);
                      }}
                      onPickupFocus={() => {
                        setActiveField('pickup');
                        if (formData.pickupAddress.length >= 3) {
                          if (autocompleteService) {
                            setShowPlaceSuggestions(true);
                          } else {
                            setShowPickupSuggestions(true);
                          }
                        }
                      }}
                      onDropoffFocus={() => {
                        setActiveField('dropoff');
                        if (formData.dropoffAddress.length >= 3) {
                          if (autocompleteService) {
                            setShowPlaceSuggestions(true);
                          } else {
                            setShowDropoffSuggestions(true);
                          }
                        }
                      }}
                      onGps={useCurrentLocation}
                      onSwap={swapAddresses}
                      onQuickAction={handleAddressQuickAction}
                      coordinatesError={errors.coordinates || null}
                      routeSummary={
                        routeInfo.distance
                          ? `Route: ${routeInfo.distance} • ${routeInfo.duration}${
                              routeInfo.eta ? ` • ETA ${routeInfo.eta}` : ''
                            }`
                          : null
                      }
                      pickupSuggestionsSlot={(
                        <>
{/* Enhanced Suggestions with Landmarks Priority */}
                              {showPlaceSuggestions && activeField === 'pickup' && placeSuggestions.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                                  <div className="p-2 bg-gradient-to-r from-red-50 to-orange-50 text-xs text-red-600 border-b border-red-200">
                                    <svg className="w-3 h-3 mr-1 text-red-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Landmarks + Google Places (Nigeria)
                                  </div>
                                  {placeSuggestions.map((suggestion) => (
                                    <div
                                      key={suggestion.id || suggestion.placeId}
                                      className={`p-3 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors duration-200 ${suggestion.isLandmark
                                        ? 'hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 bg-gradient-to-r from-red-25 to-orange-25'
                                        : 'hover:bg-gray-100'
                                        }`}
                                      onClick={(e) => selectAddress(suggestion, 'pickup', e)}
                                    >
                                      {suggestion.isLandmark ? (
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                              {getLandmarkIcon(suggestion.landmarkData.category)} {suggestion.landmarkData.category}
                                            </span>
                                          </div>
                                          <div className="font-medium text-gray-900 mt-1">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* HYBRID Suggestions (Landmarks + Google + OSM) */}
                              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                                  <div className="p-2 bg-gradient-to-r from-red-50 to-orange-50 text-xs text-red-600 border-b border-red-200 flex items-center gap-2">
                                    <svg className="w-3 h-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="font-medium">Landmarks + Hybrid Search (Google + OSM)</span>
                                  </div>
                                  {pickupSuggestions.map((suggestion) => (
                                    <div
                                      key={suggestion.id}
                                      className={`p-3 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors duration-200 ${suggestion.isLandmark
                                        ? 'hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 bg-gradient-to-r from-red-25 to-orange-25'
                                        : 'hover:bg-gray-50'
                                        }`}
                                      onClick={(e) => selectAddress(suggestion, 'pickup', e)}
                                    >
                                      {suggestion.isLandmark ? (
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base">{suggestion.icon || '📍'}</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                              {getLandmarkIcon(suggestion.landmarkData.category)} {suggestion.landmarkData.category}
                                            </span>
                                          </div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      ) : suggestion.isHybrid ? (
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base">{suggestion.sourceIcon}</span>
                                            <span className="text-xs text-gray-500">
                                              {suggestion.source === 'google' ? 'Google Places' : 'OpenStreetMap'}
                                            </span>
                                          </div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText || suggestion.description}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                        </>
                      )}
                      dropoffSuggestionsSlot={(
                        <>
{/* Enhanced Suggestions with Landmarks Priority */}
                              {showPlaceSuggestions && activeField === 'dropoff' && placeSuggestions.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                                  <div className="p-2 bg-gradient-to-r from-red-50 to-orange-50 text-xs text-red-600 border-b border-red-200">
                                    <svg className="w-3 h-3 mr-1 text-red-500 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Landmarks + Google Places (Nigeria)
                                  </div>
                                  {placeSuggestions.map((suggestion) => (
                                    <div
                                      key={suggestion.id || suggestion.placeId}
                                      className={`p-3 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors duration-200 ${suggestion.isLandmark
                                        ? 'hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 bg-gradient-to-r from-red-25 to-orange-25'
                                        : 'hover:bg-gray-100'
                                        }`}
                                      onClick={(e) => selectAddress(suggestion, 'dropoff', e)}
                                    >
                                      {suggestion.isLandmark ? (
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                              {getLandmarkIcon(suggestion.landmarkData.category)} {suggestion.landmarkData.category}
                                            </span>
                                          </div>
                                          <div className="font-medium text-gray-900 mt-1">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* HYBRID Suggestions (Landmarks + Google + OSM) */}
                              {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                                <div className="absolute z-50 top-full left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                                  <div className="p-2 bg-gradient-to-r from-green-50 to-emerald-50 text-xs text-green-600 border-b border-green-200 flex items-center gap-2">
                                    <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <span className="font-medium">Landmarks + Hybrid Search (Google + OSM)</span>
                                  </div>
                                  {dropoffSuggestions.map((suggestion) => (
                                    <div
                                      key={suggestion.id}
                                      className={`p-3 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors duration-200 ${suggestion.isLandmark
                                        ? 'hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 bg-gradient-to-r from-green-25 to-emerald-25'
                                        : 'hover:bg-gray-50'
                                        }`}
                                      onClick={(e) => selectAddress(suggestion, 'dropoff', e)}
                                    >
                                      {suggestion.isLandmark ? (
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base">{suggestion.icon || '📍'}</span>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                              {getLandmarkIcon(suggestion.landmarkData.category)} {suggestion.landmarkData.category}
                                            </span>
                                          </div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      ) : suggestion.isHybrid ? (
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-base">{suggestion.sourceIcon}</span>
                                            <span className="text-xs text-gray-500">
                                              {suggestion.source === 'google' ? 'Google Places' : 'OpenStreetMap'}
                                            </span>
                                          </div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      ) : (
                                        <div>
                                          <div className="font-medium text-gray-900">{suggestion.mainText || suggestion.description}</div>
                                          <div className="text-xs text-gray-600">{suggestion.secondaryText}</div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                        </>
                      )}
                    />

                    <div>
                      <h3 className="text-lg font-medium mb-4 text-gray-900">Recipient Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Name *</label>
                          <input
                            type="text"
                            value={formData.recipientName}
                            onChange={(e) => handleInputChange('recipientName', e.target.value)}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors.recipientName ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="Recipient's full name"
                          />
                          {errors.recipientName && <p className="text-red-500 text-sm mt-1">{errors.recipientName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Phone *</label>
                          <input
                            type="tel"
                            value={formData.recipientPhone}
                            onChange={(e) => handleInputChange('recipientPhone', e.target.value)}
                            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors.recipientPhone ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="Recipient's phone number"
                          />
                          {errors.recipientPhone && <p className="text-red-500 text-sm mt-1">{errors.recipientPhone}</p>}
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email *</label>
                        <input
                          type="email"
                          value={formData.recipientEmail}
                          onChange={(e) => handleInputChange('recipientEmail', e.target.value)}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${errors.recipientEmail ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="recipient@example.com"
                          required
                        />
                        {errors.recipientEmail && <p className="text-red-500 text-sm mt-1">{errors.recipientEmail}</p>}
                      </div>
                    </div>

                    {/* Package Details Section */}
                    <div>
                      <h3 className="text-lg font-medium mb-4 text-gray-900">Package Details</h3>

                      {/* NEW: Package Name */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Package Name *</label>
                        <input
                          type="text"
                          value={formData.packageName}
                          onChange={(e) => handleInputChange('packageName', e.target.value)}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="e.g., Electronics, Documents, Clothing..."
                          required
                        />
                      </div>

                      {/* 🔧 FIX: Service Type Selection - Controls pricing */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Service Type *
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => handleServiceTypeChange('parcel')}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${serviceType === 'parcel'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">📦</div>
                            <div className="text-sm font-medium">Parcel Delivery</div>
                            <div className="text-xs text-gray-600">Documents & packages</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleServiceTypeChange('errand')}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${serviceType === 'errand'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">🏃‍♂️</div>
                            <div className="text-sm font-medium">Errand</div>
                            <div className="text-xs text-gray-600">Personal tasks</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleServiceTypeChange('gobuy')}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${serviceType === 'gobuy'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">🛒</div>
                            <div className="text-sm font-medium">GoBuy</div>
                            <div className="text-xs text-gray-600">Shop & deliver</div>
                          </button>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                          Final price appears at the bottom when pickup and dropoff are set.
                        </p>

                        {!serviceType && (
                          <p className="text-amber-600 text-sm mt-2 flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Please select a service type
                          </p>
                        )}
                      </div>

                      {/* NEW: Delivery Mode */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Delivery Mode *</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => handleInputChange('deliveryMode', 'standard')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.deliveryMode === 'standard'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">🚚</div>
                            <div className="text-sm font-medium">Standard</div>
                            <div className="text-xs text-gray-600">1-2 hours</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('deliveryMode', 'express')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.deliveryMode === 'express'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">⚡</div>
                            <div className="text-sm font-medium">Express</div>
                            <div className="text-xs text-gray-600">30-60 mins</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('deliveryMode', 'scheduled')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.deliveryMode === 'scheduled'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">📅</div>
                            <div className="text-sm font-medium">Scheduled</div>
                            <div className="text-xs text-gray-600">Pick time</div>
                          </button>
                        </div>
                      </div>

                      {/* AI Package Detection */}
                      <div className="mb-4">
                        <button
                          type="button"
                          onClick={() => setShowAIDetection(p => !p)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          {showAIDetection ? '✕ Hide AI Detection' : '🤖 Detect Package Size with AI (take / upload photo)'}
                        </button>
                        {showAIDetection && (
                          <div className="mt-3 border border-red-100 rounded-xl overflow-hidden">
                            <Suspense fallback={<div className="p-4 text-center text-sm text-gray-500">Loading AI detection…</div>}>
                              <PackageDetection
                                onSelect={(analysis) => {
                                  const map = { small: 'small', medium: 'medium', large: 'large', extra_large: 'large' };
                                  handleInputChange('packageSize', map[analysis.size] || 'medium');
                                  setAiDetectedSize(analysis.size);
                                  setShowAIDetection(false);
                                }}
                                bookingData={{
                                  pickupAddress: formData.pickupAddress,
                                  deliveryAddress: formData.dropoffAddress,
                                  distance: distance || 0
                                }}
                              />
                            </Suspense>
                          </div>
                        )}
                        {aiDetectedSize && !showAIDetection && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                            <span>✅ AI detected: <strong>{aiDetectedSize}</strong> — size pre-filled below</span>
                            <button type="button" onClick={() => { setAiDetectedSize(null); setShowAIDetection(true); }} className="ml-auto text-xs text-gray-500 underline">Re-scan</button>
                          </div>
                        )}
                      </div>

                      {/* Package Size */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Package Size *</label>
                        <div className="grid grid-cols-3 gap-3">
                          <button
                            type="button"
                            onClick={() => handleInputChange('packageSize', 'small')}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageSize === 'small'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">📦</div>
                            <div className="text-sm font-medium">Small</div>
                            <div className="text-xs text-gray-600">Documents, keys</div>
                            <div className="text-xs text-gray-500 mt-1">Up to 30cm</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('packageSize', 'medium')}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageSize === 'medium'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">📋</div>
                            <div className="text-sm font-medium">Medium</div>
                            <div className="text-xs text-gray-600">Clothes, books</div>
                            <div className="text-xs text-gray-500 mt-1">30-60cm</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('packageSize', 'large')}
                            className={`p-4 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageSize === 'large'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-2xl mb-2">📊</div>
                            <div className="text-sm font-medium">Large</div>
                            <div className="text-xs text-gray-600">Electronics, gifts</div>
                            <div className="text-xs text-gray-500 mt-1">Up to 100cm</div>
                          </button>
                        </div>
                      </div>

                      {/* Package Weight */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Package Weight *</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleInputChange('packageWeight', 'under_5kg')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageWeight === 'under_5kg'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">⚖️</div>
                            <div className="text-sm font-medium">Under 5kg</div>
                            <div className="text-xs text-gray-600">Light items</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('packageWeight', 'over_5kg')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageWeight === 'over_5kg'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">💪</div>
                            <div className="text-sm font-medium">Over 5kg</div>
                            <div className="text-xs text-gray-600">Heavy items</div>
                          </button>
                        </div>
                      </div>

                      {/* Package Type */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Package Type *</label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => handleInputChange('packageType', 'document')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageType === 'document'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">📄</div>
                            <div className="text-sm font-medium">Documents</div>
                            <div className="text-xs text-gray-600">Papers, files</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('packageType', 'parcel')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageType === 'parcel'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">📦</div>
                            <div className="text-sm font-medium">Parcel</div>
                            <div className="text-xs text-gray-600">Items, goods</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('packageType', 'food')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageType === 'food'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">🍔</div>
                            <div className="text-sm font-medium">Food</div>
                            <div className="text-xs text-gray-600">Meals, snacks</div>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleInputChange('packageType', 'fragile')}
                            className={`p-3 border-2 rounded-lg text-center transition-all duration-200 ${formData.packageType === 'fragile'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                              }`}
                          >
                            <div className="text-xl mb-1">⚠️</div>
                            <div className="text-sm font-medium">Fragile</div>
                            <div className="text-xs text-gray-600">Handle with care</div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item Description</label>
                      <textarea
                        value={formData.itemDescription}
                        onChange={(e) => handleInputChange('itemDescription', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={3}
                        placeholder="Describe what you're sending (optional)"
                      />
                    </div>

                    {/* NEW: Special Delivery Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Special Notes</label>
                      <textarea
                        value={formData.note}
                        onChange={(e) => handleInputChange('note', e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={2}
                        placeholder="Special delivery instructions (optional)"
                      />
                    </div>

                    {/* Enhanced Payment Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                      <div className="grid gap-3">
                        {/* Wallet Option - Check sufficient balance */}
                        <button
                          type="button"
                          onClick={() => {
                            const walletBalance = enhancedUser?.walletBalance || 0;
                            const requiredTotal = customerGrandTotal || 0;
                            if (requiredTotal > 0 && walletBalance >= requiredTotal) {
                              handleInputChange('paymentMethod', 'wallet');
                            } else {
                              showGo7Error(
                                'Insufficient Wallet Balance',
                                `Your wallet balance (₦${walletBalance.toLocaleString()}) is less than the total (₦${requiredTotal.toLocaleString()}). Please top up your wallet or use Paystack.`
                              );
                            }
                          }}
                          disabled={!customerGrandTotal || (enhancedUser?.walletBalance || 0) < customerGrandTotal}
                          className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                            !customerGrandTotal || (enhancedUser?.walletBalance || 0) < customerGrandTotal
                              ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                              : formData.paymentMethod === 'wallet'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-xl">💳</div>
                              <div>
                                <div className="font-medium">Go7 Wallet</div>
                                <div className={`text-sm ${
                                  customerGrandTotal && (enhancedUser?.walletBalance || 0) < customerGrandTotal
                                    ? 'text-red-600 font-medium' 
                                    : 'text-gray-600'
                                }`}>
                                  Balance: ₦{(enhancedUser?.walletBalance || 0).toLocaleString()}
                                  {customerGrandTotal && (enhancedUser?.walletBalance || 0) < customerGrandTotal && ' - Insufficient'}
                                </div>
                              </div>
                            </div>
                            {formData.paymentMethod === 'wallet' && <div className="text-green-500">✓</div>}
                          </div>
                        </button>

                        {/* Paystack Option - Available to all */}
                        <button
                          type="button"
                          onClick={() => handleInputChange('paymentMethod', 'paystack')}
                          className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${formData.paymentMethod === 'paystack'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 hover:border-red-300 hover:bg-red-50'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="text-xl">💰</div>
                              <div>
                                <div className="font-medium">Paystack (Card/Bank)</div>
                                <div className="text-sm text-gray-600">Pay with card or bank transfer</div>
                              </div>
                            </div>
                            {formData.paymentMethod === 'paystack' && <div className="text-green-500">✓</div>}
                          </div>
                        </button>
                      </div>

                      <p className="text-xs text-red-600 mt-2">
                        ⚠️ Payment is required before pickup.
                      </p>

                      {/* Paystack inline checkout fields — script loads inside this form */}
                      {formData.paymentMethod === 'paystack' && (
                        <div className="sr-only" aria-hidden="true">
                          <label htmlFor="paystack-email-address">Email Address</label>
                          <input
                            type="email"
                            id="paystack-email-address"
                            name="email"
                            value={user?.email || formData.senderEmail || ''}
                            readOnly
                            tabIndex={-1}
                          />
                          <label htmlFor="paystack-amount">Amount (kobo)</label>
                          <input
                            type="hidden"
                            id="paystack-amount"
                            name="amount"
                            value={Math.round((customerGrandTotal || displayedFare || fare || pricingBreakdown.total || 0) * 100)}
                          />
                        </div>
                      )}
                    </div>

                    {/* Hidden submit — sticky checkout bar triggers requestSubmit() */}
                    <button
                      type="submit"
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                      disabled={isSubmitting || isProcessingPayment || !pickupCoords || !dropoffCoords}
                    />

                    {errors.submit && (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700 text-sm">{errors.submit}</p>
                      </div>
                    )}
                  </form>
                </div>

                <BookDeliveryCheckoutBar
                  displayedFare={displayedFare}
                  pricingBreakdown={pricingBreakdown}
                  pricingSettings={pricingSettings}
                  serviceType={serviceType}
                  effectiveDistanceKm={effectiveDistanceKm}
                  routeInfo={routeInfo}
                  isCalculating={pricingBreakdown.isCalculating}
                  isAuthenticated={isAuthenticatedForBooking()}
                  isSubmitting={isSubmitting}
                  isProcessingPayment={isProcessingPayment}
                  pickupReady={Boolean(pickupCoords && formData.pickupAddress)}
                  dropoffReady={Boolean(dropoffCoords && formData.dropoffAddress)}
                  onBook={handleBookNowClick}
                  onSignIn={promptSignInForBooking}
                  paymentMethod={formData.paymentMethod}
                  baseFareFallback={LOCAL_BASE_FARE}
                  parcelPricing={parcelPricing}
                  isFormFocused={isFormFocused}
                />
              </div>
            </div>

            {/* Order Tracking Modal */}
            {showOrderTracking && currentOrderId && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Track Your Delivery</h3>
                      <button
                        onClick={() => setShowOrderTracking(false)}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">Order ID: {currentOrderId}</p>
                  </div>

                  <div className="p-4 space-y-4">
                    {/* Order Status Timeline */}
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${orderStatus === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <div>
                          <p className="font-medium text-sm">Order Confirmed</p>
                          <p className="text-xs text-gray-500">Looking for available riders</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${['assigned', 'pickup', 'enroute', 'delivered'].includes(orderStatus) ? 'bg-green-500' : orderStatus === 'pending' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <div>
                          <p className="font-medium text-sm">Rider Assigned</p>
                          <p className="text-xs text-gray-500">Go7 rider is on the way to pickup</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${['pickup', 'enroute', 'delivered'].includes(orderStatus) ? 'bg-green-500' : orderStatus === 'assigned' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <div>
                          <p className="font-medium text-sm">Item Picked Up</p>
                          <p className="text-xs text-gray-500">Rider has collected your item</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${['enroute', 'delivered'].includes(orderStatus) ? 'bg-green-500' : orderStatus === 'pickup' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <div>
                          <p className="font-medium text-sm">En Route</p>
                          <p className="text-xs text-gray-500">Rider is heading to delivery location</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className={`w-4 h-4 rounded-full ${orderStatus === 'delivered' ? 'bg-green-500' : orderStatus === 'enroute' ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300'}`}></div>
                        <div>
                          <p className="font-medium text-sm">Delivered</p>
                          <p className="text-xs text-gray-500">Item successfully delivered!</p>
                        </div>
                      </div>
                    </div>

                    {/* Live Mini Map */}
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <div className="bg-red-600 text-white px-3 py-2 text-xs font-semibold flex items-center justify-between">
                        <span>🗺️ Live Tracking</span>
                        <span className="bg-white/20 px-2 py-1 rounded-full">Active</span>
                      </div>
                      <div
                        id="tracking-mini-map"
                        className="h-32 bg-gradient-to-br from-blue-50 to-green-50 relative overflow-hidden"
                      >
                        {/* Mini map will be rendered here */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {orderStatus === 'pending' ? (
                            <div className="text-center">
                              <div className="animate-spin w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                              <p className="text-xs text-gray-600">Searching for rider...</p>
                            </div>
                          ) : (
                            <div className="w-full h-full relative bg-gray-200 rounded">
                              {/* Simulated route visualization */}
                              <div className="absolute top-1/2 left-4 w-3 h-3 bg-red-500 rounded-full shadow-lg"></div>
                              <div className="absolute top-1/2 right-4 w-3 h-3 bg-green-500 rounded-full shadow-lg"></div>
                              <svg className="absolute inset-0 w-full h-full">
                                <path
                                  d="M 16 50 Q 50 30 84 50"
                                  stroke="#E30613"
                                  strokeWidth="2"
                                  fill="none"
                                  strokeDasharray="5,3"
                                  className="animate-pulse"
                                />
                              </svg>
                              {orderStatus !== 'delivered' && (
                                <div
                                  className="absolute top-1/2 transform -translate-y-1/2 w-4 h-4 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white text-xs font-bold animate-bounce"
                                  style={{
                                    left: orderStatus === 'assigned' ? '25%' :
                                      orderStatus === 'pickup' ? '40%' :
                                        orderStatus === 'enroute' ? '65%' : '80%'
                                  }}
                                >
                                  🏍️
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rider Details */}
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          🏍️
                        </div>
                        <div>
                          <p className="font-medium text-sm">Adebayo O.</p>
                          <p className="text-xs text-gray-600">⭐ 4.9 • Go7 Pro Rider</p>
                        </div>
                        <div className="ml-auto">
                          <button className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                            📞 Call
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ETA */}
                    <div className="text-center bg-red-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-800">Estimated Delivery Time</p>
                      <p className="text-lg font-bold text-red-600">15-20 minutes</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

        </div>
      </div>

      {showAuthSheet && createPortal(
        <AuthSheet
          mode="login"
          onClose={() => {
            setShowAuthSheet(false);
            pendingSubmitAfterAuth.current = false;
          }}
          onSuccess={handleAuthSuccess}
        />,
        document.body
      )}
    </div>
  );
};

export default BookDelivery;



