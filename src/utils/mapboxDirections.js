/**
 * Mapbox Directions API Utilities
 * 
 * Provides functions to get directions, ETA, and distances between points
 * using the Mapbox Directions API, with fallback to haversine calculations.
 */

import { haversineKm } from './distance';
import { calculateGo7DeliveryFare, getActivePricingSettings } from './pricingSettings';

// Mapbox access token (use your own token or environment variable)
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.placeholder'; 

/**
 * Get directions, distance, and ETA between two points using Mapbox API
 * @param {Object} origin - Origin coordinates {lat, lng}
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Promise<Object>} Object with distance (km), duration (seconds), and route geometry
 */
export const getMapboxDirections = async (origin, destination) => {
  try {
    // Format coordinates for Mapbox API (lng,lat format)
    const originCoords = `${origin.lng || origin.longitude},${origin.lat || origin.latitude}`;
    const destCoords = `${destination.lng || destination.longitude},${destination.lat || destination.latitude}`;
    
    // Build the Mapbox Directions API URL
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords};${destCoords}?access_token=${MAPBOX_ACCESS_TOKEN}&geometries=geojson&overview=full`;
    
    // Make the API request
    const response = await fetch(url);
    const data = await response.json();
    
    // Check if the response has routes
    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      
      return {
        success: true,
        // Convert distance from meters to kilometers
        distanceKm: Math.round((route.distance / 1000) * 100) / 100,
        // Convert duration from seconds to minutes
        durationMinutes: Math.ceil(route.duration / 60),
        // Route geometry for drawing on map
        geometry: route.geometry,
        // Route overview for debugging
        legs: route.legs
      };
    } else {
      console.warn('No routes found in Mapbox response, falling back to haversine');
      // Fall back to haversine calculation
      return fallbackToHaversine(origin, destination);
    }
  } catch (error) {
    console.error('Error fetching Mapbox directions:', error);
    // Fall back to haversine calculation
    return fallbackToHaversine(origin, destination);
  }
};

/**
 * Fallback to haversine calculation when Mapbox API fails
 * @param {Object} origin - Origin coordinates {lat, lng}
 * @param {Object} destination - Destination coordinates {lat, lng}
 * @returns {Object} Object with distance and estimated duration
 */
const fallbackToHaversine = (origin, destination) => {
  // Calculate distance using haversine formula
  const distanceKm = haversineKm(
    origin.lat || origin.latitude,
    origin.lng || origin.longitude,
    destination.lat || destination.latitude,
    destination.lng || destination.longitude
  );
  
  // Estimate duration based on average speed of 20 km/h
  const durationMinutes = Math.ceil((distanceKm / 20) * 60);
  
  return {
    success: true,
    distanceKm,
    durationMinutes,
    geometry: null,
    isEstimate: true
  };
};

/**
 * Calculate the fare based on distance and service type
 * @param {number} distanceKm - Distance in kilometers
 * @param {string} serviceType - Service type (standard or express)
 * @returns {Object} Object with fare details
 */
export const calculateFare = (distanceKm, serviceType = 'standard') => {
  // Admin-driven centralized fare (pricingSettings/current)
  const settings = getActivePricingSettings();
  const result = calculateGo7DeliveryFare(settings, {
    distanceKm,
    durationMin: undefined,
    waitingMinutes: 0,
    packageMultiplier: 1,
  });

  const EXPRESS_MULTIPLIER = 1.5;
  let fare = result.total;
  if (serviceType === 'express') {
    fare = Math.ceil((fare * EXPRESS_MULTIPLIER) / 10) * 10;
  }

  return {
    baseFare: result.baseFee,
    distanceCharge: result.distanceCharge,
    expressMultiplier: serviceType === 'express' ? EXPRESS_MULTIPLIER : 1,
    totalFare: fare
  };
};
