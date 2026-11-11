/**
 * Firestore Data Models
 * 
 * This file defines the types and interfaces for the Firestore data models.
 */

/**
 * Booking Status enum
 */
export const BookingStatus = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  ENROUTE_PICKUP: 'enroute_pickup',
  PICKED_UP: 'picked_up',
  ENROUTE_DROPOFF: 'enroute_dropoff',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

/**
 * Rider Status enum
 */
export const RiderStatus = {
  OFFLINE: 'offline',
  AVAILABLE: 'available',
  BUSY: 'busy'
};

/**
 * Service Type enum
 */
export const ServiceType = {
  STANDARD: 'standard',
  EXPRESS: 'express'
};

/**
 * Timeline Item object structure
 * @typedef {Object} TimelineItem
 * @property {string} status - Status of the delivery at this point
 * @property {number} at - Timestamp when this status was recorded
 * @property {string} [note] - Optional note about this status change
 */

/**
 * Location object structure
 * @typedef {Object} Location
 * @property {string} area - Area name (e.g., neighborhood, district)
 * @property {string} [address] - Full address
 * @property {number} [lat] - Latitude coordinate
 * @property {number} [lng] - Longitude coordinate
 */

/**
 * Customer object structure
 * @typedef {Object} Customer
 * @property {string} name - Customer's name
 * @property {string} phone - Customer's phone number
 */

/**
 * Rider object structure
 * @typedef {Object} Rider
 * @property {string} id - Rider's unique identifier
 * @property {string} name - Rider's name
 * @property {string} [phone] - Rider's phone number
 * @property {string} [code] - Rider's code
 * @property {string} [status] - Rider's current status
 * @property {number} [lat] - Rider's current latitude
 * @property {number} [lng] - Rider's current longitude
 * @property {number} [updatedAt] - Timestamp of last update
 */

/**
 * Booking object structure
 * @typedef {Object} Booking
 * @property {string} id - Booking's unique identifier
 * @property {Customer} customer - Customer information
 * @property {Location} pickup - Pickup location information
 * @property {Location} dropoff - Dropoff location information
 * @property {Rider} [rider] - Assigned rider information
 * @property {number} distanceKm - Distance in kilometers
 * @property {number} fare - Price of the delivery
 * @property {number} etaMins - Estimated time of arrival in minutes
 * @property {string} service - Service type
 * @property {string} status - Current booking status
 * @property {TimelineItem[]} timeline - Timeline of status changes
 * @property {number} createdAt - Creation timestamp
 * @property {number} updatedAt - Last update timestamp
 * @property {string} [notes] - Additional notes
 * @property {Object} [payment] - Payment information
 * @property {string} payment.method - Payment method
 * @property {string} payment.status - Payment status
 */
