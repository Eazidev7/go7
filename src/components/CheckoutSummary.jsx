import React, { useMemo } from 'react';
import { calculateGo7DeliveryFare, getActivePricingSettings } from '../utils/pricingSettings';

// 🎯 GO7 SERVICE DEFINITIONS
// Each service has unique pricing logic and UI labels
const GO7_SERVICES = {
  parcel: {
    label: "Parcel Delivery",
    description: "Fast & secure package delivery across Abeokuta",
    baseFee: 700,
    perKmRate: 200,
    icon: "📦"
  },
  gobuy: {
    label: "GoBuy Shopping",
    description: "We shop for you and deliver to your doorstep",
    baseFee: 800,
    perKmRate: 200,
    serviceFee: 500, // Additional fee for shopping service
    icon: "🛒"
  },
  errand: {
    label: "Quick Errand",
    description: "Personal errands handled with care",
    baseFee: 800,
    perKmRate: 100,
    icon: "🏃"
  },
  restaurant: {
    label: "Restaurant Delivery",
    description: "Hot meals delivered fresh from your favorite spots",
    baseFee: 500,
    perKmRate: 200,
    flatRate: true, // Uses flat rate for short distances
    icon: "🍔"
  },
  vendor: {
    label: "Vendor Pickup",
    description: "Quick pickup from local vendors & markets",
    baseFee: 600,
    perKmRate: 150,
    icon: "🏪"
  },
  pharmacy: {
    label: "Pharmacy Delivery",
    description: "Fast & confidential medication delivery",
    baseFee: 600,
    perKmRate: 150,
    icon: "💊"
  }
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} coord1 - {lat, lng}
 * @param {Object} coord2 - {lat, lng}
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (coord1, coord2) => {
  if (!coord1 || !coord2 || !coord1.lat || !coord1.lng || !coord2.lat || !coord2.lng) {
    return 0;
  }

  const R = 6371; // Radius of Earth in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(coord1.lat * Math.PI / 180) *
    Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Calculate fare based on service type and distance
 * @param {string} serviceType - Service category
 * @param {number} distance - Distance in km
 * @param {Object} options - Additional options (packageSize, weight, etc.)
 * @returns {Object} Fare breakdown
 */
const calculateFare = (serviceType, distance, options = {}) => {
  const settings = getActivePricingSettings();
  const { packageSize = 'small', packageWeight = 'under_5kg' } = options;

  // Package multipliers (mirror BookDelivery's tiering)
  const sizeMultiplier = { small: 1, medium: 1.3, large: 1.6, extra_large: 2 }[packageSize] || 1;
  const weightMultiplier = { 'under_5kg': 1, '5_10kg': 1.2, '10_20kg': 1.4, 'over_20kg': 1.6 }[packageWeight] || 1;
  const packageMultiplier = sizeMultiplier * weightMultiplier;

  const result = calculateGo7DeliveryFare(settings, {
    distanceKm: distance,
    durationMin: undefined,
    waitingMinutes: 0,
    packageMultiplier,
  });

  return {
    baseFee: result.baseFee,
    distanceFee: result.distanceCharge,
    serviceFee: 0,
    surcharge: result.packageSurcharge,
    total: result.total,
    breakdown: null
  };
};

/**
 * CheckoutSummary Component
 * Universal checkout card for all Go7 services
 */
const CheckoutSummary = ({
  serviceType = 'parcel',
  pickup,
  dropoff,
  packageSize = 'small',
  packageWeight = 'under_5kg',
  onCheckout,
  className = ''
}) => {
  // Calculate distance and fare
  const distance = useMemo(() => {
    if (!pickup || !dropoff) return 0;
    const dist = calculateDistance(pickup, dropoff);
    return Math.round(dist * 100) / 100; // Round to 2 decimals
  }, [pickup, dropoff]);

  const fareDetails = useMemo(() => {
    return calculateFare(serviceType, distance, { packageSize, packageWeight });
  }, [serviceType, distance, packageSize, packageWeight]);

  const service = GO7_SERVICES[serviceType] || GO7_SERVICES.parcel;

  // Handle checkout button click
  const handleCheckout = () => {
    if (onCheckout) {
      onCheckout({
        serviceType,
        distance,
        fare: fareDetails.total,
        fareBreakdown: fareDetails,
        pickup,
        dropoff
      });
    }
  };

  // Show placeholder if no locations selected
  if (!pickup || !dropoff) {
    return (
      <div className={`bg-gray-50 rounded-xl shadow-md p-4 mt-4 border-2 border-dashed border-gray-300 ${className}`}>
        <div className="text-center py-6">
          <div className="text-4xl mb-2">{service.icon}</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">
            {service.label}
          </h3>
          <p className="text-gray-500 text-sm">
            Select pickup and dropoff locations to see pricing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-md p-4 mt-4 border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{service.icon}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-black">
            {service.label}
          </h3>
          <p className="text-gray-500 text-sm">
            {service.description}
          </p>
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="mt-4 space-y-2 border-t border-gray-200 pt-3">
        
        {/* Distance */}
        <div className="flex justify-between text-sm text-gray-700">
          <span className="flex items-center gap-1">
            📍 Distance
          </span>
          <span className="font-medium">{distance.toFixed(2)} km</span>
        </div>

        {/* Base Fee */}
        <div className="flex justify-between text-sm text-gray-700">
          <span>Base Fee</span>
          <span className="font-medium">₦{fareDetails.baseFee.toLocaleString()}</span>
        </div>

        {/* Distance Fee */}
        {fareDetails.distanceFee > 0 && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>Distance Charge</span>
            <span className="font-medium">₦{fareDetails.distanceFee.toLocaleString()}</span>
          </div>
        )}

        {/* Service Fee (GoBuy) */}
        {fareDetails.serviceFee > 0 && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>Service Fee</span>
            <span className="font-medium">₦{fareDetails.serviceFee.toLocaleString()}</span>
          </div>
        )}

        {/* Surcharge (Parcel weight) */}
        {fareDetails.surcharge > 0 && (
          <div className="flex justify-between text-sm text-gray-700">
            <span>Weight Surcharge</span>
            <span className="font-medium">₦{fareDetails.surcharge.toLocaleString()}</span>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
          <span className="text-base font-bold text-black">Total Fare</span>
          <span className="text-xl font-bold text-red-600">
            ₦{fareDetails.total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Additional Info */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        {fareDetails.breakdown || 'Includes service + distance charge'}
      </p>

      {/* Checkout Button */}
      <button
        onClick={handleCheckout}
        className="mt-4 w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 active:bg-red-800 transition-all duration-200 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
      >
        Proceed to Checkout
      </button>

      {/* Service Type Badge */}
      <div className="mt-2 text-center">
        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
          {service.label}
        </span>
      </div>
    </div>
  );
};

export default CheckoutSummary;

// Export service definitions for external use
export { GO7_SERVICES, calculateDistance, calculateFare };
