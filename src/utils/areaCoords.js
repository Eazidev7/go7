// src/utils/areaCoords.js
/**
 * Utility functions for handling area coordinates in Abeokuta
 */

import { areas } from '../data/areas';

/**
 * Check if we have valid coordinates for the pickup and dropoff areas
 * @param {string} pickupArea - The pickup area name
 * @param {string} dropoffArea - The dropoff area name
 * @returns {boolean} True if both areas have valid coordinates
 */
export function hasValidCoordinates(pickupArea, dropoffArea) {
  const pickupCoords = getAreaCoordinates(pickupArea);
  const dropoffCoords = getAreaCoordinates(dropoffArea);
  
  return (
    pickupCoords && 
    dropoffCoords && 
    typeof pickupCoords.lat === 'number' && 
    typeof pickupCoords.lng === 'number' &&
    typeof dropoffCoords.lat === 'number' && 
    typeof dropoffCoords.lng === 'number'
  );
}

/**
 * Get coordinates for a specific area in Abeokuta
 * @param {string} areaName - The area name to lookup
 * @returns {Object|null} Coordinates {lat, lng} or null if not found
 */
export function getAreaCoordinates(areaName) {
  if (!areaName || typeof areaName !== 'string') {
    return null;
  }
  
  // Normalize area name for comparison
  const normalizedName = areaName.toLowerCase().trim();
  
  // First look for exact match
  const exactMatch = areas.find(area => 
    area.name.toLowerCase() === normalizedName
  );
  
  if (exactMatch) {
    return {
      lat: exactMatch.lat,
      lng: exactMatch.lng
    };
  }
  
  // Then look for partial match (area name might be part of a longer address)
  const partialMatch = areas.find(area => 
    normalizedName.includes(area.name.toLowerCase())
  );
  
  if (partialMatch) {
    return {
      lat: partialMatch.lat,
      lng: partialMatch.lng
    };
  }
  
  // Check if we have comma-separated parts and try to match the first part
  if (normalizedName.includes(',')) {
    const firstPart = normalizedName.split(',')[0].trim();
    
    const partMatch = areas.find(area => 
      firstPart.includes(area.name.toLowerCase()) ||
      area.name.toLowerCase().includes(firstPart)
    );
    
    if (partMatch) {
      return {
        lat: partMatch.lat,
        lng: partMatch.lng
      };
    }
  }
  
  // No match found
  console.warn(`No coordinates found for area: ${areaName}`);
  return null;
}