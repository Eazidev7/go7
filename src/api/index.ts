/**
 * API Service - A REST API implementation with Firestore backend
 */

import { getMapboxDirections, calculateFare } from '../utils/mapboxDirections';
import * as bookingService from '../services/bookingService';
import * as riderService from '../services/riderService';
import { 
  Booking, 
  BookingStatus, 
  ServiceType, 
  Location, 
  Rider, 
  RiderStatus 
} from '../models/firestore';

// Simulate network delay
const NETWORK_DELAY = 400; // ms

/**
 * Simulate a delay for API calls
 * @param ms - Milliseconds to delay
 * @returns A promise that resolves after the delay
 */
const delay = (ms = NETWORK_DELAY): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * API Response interface
 */
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Create a standard API response
 * @param success - Whether the request was successful
 * @param data - The response data
 * @param error - Error message if any
 * @returns A standardized API response
 */
const createResponse = <T>(success: boolean, data: T | null = null, error: string | null = null): ApiResponse<T> => ({
  success,
  data,
  error
});

/**
 * Booking creation request interface
 */
interface CreateBookingRequest {
  pickupLocation: Location;
  dropoffLocation: Location;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  serviceType?: ServiceType;
}

/**
 * API service with TypeScript types
 */
const api = {
  /**
   * Create a booking
   * @param bookingData - The booking data
   * @returns API response with booking data
   */
  async createBooking(bookingData: CreateBookingRequest): Promise<ApiResponse<Booking>> {
    try {
      await delay();
      
      // Calculate route using Mapbox Directions API
      const routeData = await getMapboxDirections(
        bookingData.pickupLocation,
        bookingData.dropoffLocation
      );
      
      // Calculate fare based on distance and service type
      const fare = calculateFare(
        routeData.distance,
        bookingData.serviceType || ServiceType.STANDARD
      );
      
      // Create booking in Firestore
      const booking = await bookingService.createBooking({
        pickupLocation: bookingData.pickupLocation,
        dropoffLocation: bookingData.dropoffLocation,
        customer: bookingData.customer,
        serviceType: bookingData.serviceType || ServiceType.STANDARD,
        status: BookingStatus.PENDING,
        route: routeData,
        fare
      });
      
      return createResponse(true, booking);
    } catch (error) {
      console.error('Error creating booking:', error);
      return createResponse(false, null, (error as Error).message);
    }
  },
  
  /**
   * Get a booking by ID
   * @param bookingId - The booking ID
   * @returns API response with booking data
   */
  async getBooking(bookingId: string): Promise<ApiResponse<Booking>> {
    try {
      await delay();
      
      const booking = await bookingService.getBookingById(bookingId);
      
      if (!booking) {
        return createResponse(false, null, 'Booking not found');
      }
      
      return createResponse(true, booking);
    } catch (error) {
      console.error('Error getting booking:', error);
      return createResponse(false, null, (error as Error).message);
    }
  },
  
  /**
   * Ping a booking to check status (backward compatibility)
   * @param bookingId - The booking ID
   * @returns API response with booking data
   */
  async pingBooking(bookingId: string): Promise<ApiResponse<Booking>> {
    // This method is maintained for backward compatibility
    // Real-time updates should use subscribeToBooking instead
    return this.getBooking(bookingId);
  },
  
  /**
   * Cancel a booking
   * @param bookingId - The booking ID
   * @returns API response with success status
   */
  async cancelBooking(bookingId: string): Promise<ApiResponse<boolean>> {
    try {
      await delay();
      
      // Update booking status to CANCELLED
      await bookingService.updateBookingStatus(
        bookingId, 
        BookingStatus.CANCELLED,
        'Cancelled by customer'
      );
      
      return createResponse(true, true);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      return createResponse(false, null, (error as Error).message);
    }
  },
  
  /**
   * Get available riders
   * @param maxResults - Maximum number of results to return
   * @returns API response with array of available riders
   */
  async getAvailableRiders(maxResults: number = 10): Promise<ApiResponse<Rider[]>> {
    try {
      await delay();
      
      const riders = await riderService.findAvailableRiders(maxResults);
      
      return createResponse(true, riders);
    } catch (error) {
      console.error('Error getting available riders:', error);
      return createResponse(false, null, (error as Error).message);
    }
  },
  
  /**
   * Assign a rider to a booking
   * @param bookingId - The booking ID
   * @param riderId - The rider ID
   * @returns API response with updated booking
   */
  async assignRider(bookingId: string, riderId: string): Promise<ApiResponse<Booking>> {
    try {
      await delay();
      
      // Check if rider exists and is available
      const rider = await riderService.getRiderById(riderId);
      
      if (!rider) {
        return createResponse(false, null, 'Rider not found');
      }
      
      if (rider.status !== RiderStatus.AVAILABLE) {
        return createResponse(false, null, 'Rider is not available');
      }
      
      // Update rider status to BUSY
      await riderService.updateRiderStatus(riderId, RiderStatus.BUSY);
      
      // Update booking with assigned rider and change status to ASSIGNED
      const updatedBooking = await bookingService.updateBookingStatus(
        bookingId, 
        BookingStatus.ASSIGNED,
        `Assigned to rider ${riderId}`
      );
      
      // Update booking with rider ID
      await bookingService.updateBooking(bookingId, { assignedRider: riderId });
      
      return createResponse(true, updatedBooking);
    } catch (error) {
      console.error('Error assigning rider:', error);
      return createResponse(false, null, (error as Error).message);
    }
  }
};

export default api;
