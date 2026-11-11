/**
 * Pricing service for Go7 delivery app
 * Handles fetching and calculating pricing information
 */

import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

// Default pricing configuration in case Firestore is unavailable
const DEFAULT_PRICING_CONFIG = {
  basePrice: 500, // in Naira
  perKmPrice: 100, // in Naira per kilometer
  minimumPrice: 700, // minimum price in Naira
  expressMultiplier: 1.5, // multiplier for express delivery
  packageSizeMultipliers: {
    small: 1.0,
    medium: 1.2,
    large: 1.5,
    'extra-large': 2.0
  },
  currency: 'NGN',
  timestamp: new Date().toISOString()
};

/**
 * Fetch pricing configuration from Firestore
 * Falls back to default config if Firestore is unavailable
 * @returns Pricing configuration object
 */
export const fetchPricingConfig = async () => {
  try {
    const pricingDocRef = doc(db, 'configuration', 'pricing');
    const pricingDoc = await getDoc(pricingDocRef);
    
    if (pricingDoc.exists()) {
      return { ...pricingDoc.data(), timestamp: new Date().toISOString() };
    } else {
      console.warn('Pricing configuration not found, using defaults');
      return DEFAULT_PRICING_CONFIG;
    }
  } catch (error) {
    console.error('Error fetching pricing configuration:', error);
    return DEFAULT_PRICING_CONFIG;
  }
};

/**
 * Calculate the price for a delivery based on distance and options
 * @param {number} distanceKm Distance in kilometers
 * @param {object} options Options affecting the price
 * @param {string} options.packageSize Size of the package ('small', 'medium', 'large', 'extra-large')
 * @param {boolean} options.isExpress Whether the delivery is express
 * @param {object} pricingConfig Pricing configuration
 * @returns {number} The calculated price in Naira
 */
export const calculatePrice = (distanceKm, options = {}, pricingConfig = DEFAULT_PRICING_CONFIG) => {
  const { packageSize = 'small', isExpress = false } = options;
  
  // Get the multiplier for the package size
  const sizeMultiplier = pricingConfig.packageSizeMultipliers[packageSize] || 1.0;
  
  // Calculate the base price plus distance
  let price = pricingConfig.basePrice + (pricingConfig.perKmPrice * distanceKm);
  
  // Apply the size multiplier
  price *= sizeMultiplier;
  
  // Apply express multiplier if needed
  if (isExpress) {
    price *= pricingConfig.expressMultiplier;
  }
  
  // Ensure the minimum price
  price = Math.max(price, pricingConfig.minimumPrice);
  
  // Round to the nearest whole number
  return Math.round(price);
};

/**
 * Format a price in Naira
 * @param {number} price Price in Naira
 * @param {string} currency Currency code (default: 'NGN')
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency = 'NGN') => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};
