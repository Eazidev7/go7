/**
 * API Service - A REST API implementation with Firestore backend
 */

import { getMapboxDirections, calculateFare } from '../utils/mapboxDirections';
import * as bookingService from '../services/bookingService';
import * as riderService from '../services/riderService';

// Simulate network delay
const NETWORK_DELAY = 400; // ms

/**
 * Simulate a delay for API calls
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise} A promise that resolves after the delay
 */
const delay = (ms = NETWORK_DELAY) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a standard API response
 * @param {boolean} success - Whether the request was successful
 * @param {Object} data - The response data
 * @param {string} error - Error message if any
 * @returns {Object} A standardized API response
 */
const createResponse = (success, data = null, error = null) => ({
  success,
  data,
  error
});

const api = {
  /**
   * Create a booking
   * @param {Object} bookingData - The booking data
   * @returns {Promise<Object>} API response with booking data
   */
  async createBooking(bookingData) {
    try {
      await delay();
      
      // Extract pickup and dropoff coordinates
      const pickup = bookingData.pickup?.coords || bookingData.pickup;
      const dropoff = bookingData.dropoff?.coords || bookingData.dropoff;
      
      // Calculate distance, ETA, and fare if coordinates are available
      if (pickup && dropoff) {
        try {
          // Get directions from Mapbox API with fallback to haversine
          const directions = await getMapboxDirections(pickup, dropoff);
          
          // Calculate fare based on distance and service type
          const serviceType = bookingData.serviceType || 'standard';
          const fareDetails = calculateFare(directions.distanceKm, serviceType);
          
          // Add calculated values to booking data
          bookingData = {
            ...bookingData,
            distanceKm: directions.distanceKm,
            etaMins: directions.durationMinutes,
            fareNaira: fareDetails.totalFare,
            fare: fareDetails.totalFare, // For backward compatibility
            fareDetails: fareDetails,
            routeGeometry: directions.geometry,
            isRouteEstimated: directions.isEstimate || false
          };
        } catch (directionError) {
          console.error('Error calculating directions:', directionError);
          // Continue with booking creation even if direction calculation fails
        }
      }
      
      // Create booking in Firestore
      const booking = await bookingService.createBooking(bookingData);
      return createResponse(true, booking);
    } catch (error) {
      console.error('API error creating booking:', error);
      return createResponse(false, null, error.message || 'Failed to create booking');
    }
  },

  /**
   * Get a booking by ID
   * @param {string} id - The booking ID
   * @returns {Promise<Object>} API response with booking data
   */
  async getBooking(id) {
    try {
      await delay();
      const booking = await bookingService.getBookingById(id);
      
      if (!booking) {
        return createResponse(false, null, `Booking with ID ${id} not found`);
      }
      
      return createResponse(true, booking);
    } catch (error) {
      console.error('API error getting booking:', error);
      return createResponse(false, null, error.message || 'Failed to get booking');
    }
  },

  /**
   * Update a booking
   * @param {string} id - The booking ID
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} API response with updated booking
   */
  async updateBooking(id, updateData) {
    try {
      await delay();
      // For updates, we use the status update method with additional data
      const booking = await bookingService.updateBookingStatus(
        id, 
        updateData.status || 'updated', 
        updateData
      );
      
      if (!booking) {
        return createResponse(false, null, `Booking with ID ${id} not found`);
      }
      
      return createResponse(true, booking);
    } catch (error) {
      console.error('API error updating booking:', error);
      return createResponse(false, null, error.message || 'Failed to update booking');
    }
  },

  /**
   * Ping a booking to update its status
   * @param {string} id - The booking ID
   * @returns {Promise<Object>} API response with updated booking
   */
  async pingBooking(id) {
    try {
      await delay();
      // Get the current booking to determine next status
      const currentBooking = await bookingService.getBookingById(id);
      
      if (!currentBooking) {
        return createResponse(false, null, `Booking with ID ${id} not found`);
      }
      
      // Determine next status based on current status
      const nextStatus = getNextStatus(currentBooking.status);
      
      // Update the booking with the new status
      const booking = await bookingService.updateBookingStatus(id, nextStatus);
      
      return createResponse(true, booking);
    } catch (error) {
      console.error('API error pinging booking:', error);
      return createResponse(false, null, error.message || 'Failed to update booking status');
    }
  },

  /**
   * Get all bookings
   * @returns {Promise<Object>} API response with all bookings
   */
  async getAllBookings() {
    try {
      await delay();
      const bookings = await bookingService.getAllBookings();
      return createResponse(true, bookings);
    } catch (error) {
      console.error('API error getting all bookings:', error);
      return createResponse(false, null, error.message || 'Failed to get bookings');
    }
  },
  
  /**
   * Subscribe to real-time updates for a booking
   * @param {string} id - The booking ID
   * @param {function} callback - The callback function
   * @returns {function} Unsubscribe function
   */
  subscribeToBooking(id, callback) {
    try {
      return bookingService.subscribeToBooking(id, callback);
    } catch (error) {
      console.error('API error subscribing to booking:', error);
      callback({
        success: false,
        error: error.message || 'Failed to subscribe to booking updates'
      });
      return () => {}; // Return empty unsubscribe function
    }
  },
  
  /**
   * Get all riders
   * @returns {Promise<Object>} API response with all riders
   */
  async getAllRiders() {
    try {
      await delay();
      const riders = await riderService.getAllRiders();
      return createResponse(true, riders);
    } catch (error) {
      console.error('API error getting all riders:', error);
      return createResponse(false, null, error.message || 'Failed to get riders');
    }
  },
  
  /**
   * Get available riders
   * @returns {Promise<Object>} API response with available riders
   */
  async getAvailableRiders() {
    try {
      await delay();
      const riders = await riderService.getAvailableRiders();
      return createResponse(true, riders);
    } catch (error) {
      console.error('API error getting available riders:', error);
      return createResponse(false, null, error.message || 'Failed to get available riders');
    }
  }
};

/**
 * Get the next status in the progression
 * @param {string} currentStatus - The current status
 * @returns {string} The next status
 */
const getNextStatus = (currentStatus) => {
  const STATUS_PROGRESSION = [
    'assigned',
    'enroute_pickup',
    'picked_up',
    'enroute_dropoff',
    'delivered'
  ];
  
  const currentIndex = STATUS_PROGRESSION.indexOf(currentStatus);
  
  // If current status is not in the progression or is the last one, return the current status
  if (currentIndex === -1 || currentIndex === STATUS_PROGRESSION.length - 1) {
    return currentStatus;
  }
  
  // Return the next status
  return STATUS_PROGRESSION[currentIndex + 1];
};

export default api;
