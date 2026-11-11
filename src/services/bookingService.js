/**
 * Firestore Booking Service
 * 
 * This service handles all Firestore operations for bookings.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BookingStatus } from '../models/firestore';

const BOOKINGS_COLLECTION = 'bookings';

/**
 * Create a new booking in Firestore
 * @param {Object} bookingData - The booking data
 * @returns {Promise<Object>} The created booking
 */
export const createBooking = async (bookingData) => {
  try {
    // Generate booking ID if not provided
    const bookingId = bookingData.id || `GO7-${Date.now()}`;
    
    // Create the booking object with required Firestore structure
    const booking = {
      id: bookingId,
      customer: {
        name: bookingData.customerName || 'Anonymous',
        phone: bookingData.customerPhone || '',
      },
      pickup: {
        area: bookingData.pickupArea || '',
        address: bookingData.pickupAddress || '',
        lat: bookingData.pickup?.coords?.lat || bookingData.pickup?.lat || 0,
        lng: bookingData.pickup?.coords?.lng || bookingData.pickup?.lng || 0,
      },
      dropoff: {
        area: bookingData.dropoffArea || '',
        address: bookingData.dropoffAddress || '',
        lat: bookingData.dropoff?.coords?.lat || bookingData.dropoff?.lat || 0,
        lng: bookingData.dropoff?.coords?.lng || bookingData.dropoff?.lng || 0,
      },
      rider: bookingData.rider ? {
        id: bookingData.rider.id || '',
        name: bookingData.rider.name || '',
        phone: bookingData.rider.phone || '',
        code: bookingData.rider.code || '',
      } : null,
      distanceKm: bookingData.distanceKm || 0,
      fare: bookingData.fareNaira || bookingData.fare || 0,
      etaMins: bookingData.etaMins || 0,
      service: bookingData.serviceType || 'standard',
      status: bookingData.status || BookingStatus.ASSIGNED,
      timeline: [
        {
          status: 'created',
          at: Date.now(),
          note: 'Booking created'
        },
        {
          status: BookingStatus.ASSIGNED,
          at: Date.now(),
          note: `Assigned to ${bookingData.rider?.name || 'rider'}`
        }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: bookingData.notes || '',
      payment: bookingData.payment || {
        method: 'cash',
        status: 'pending'
      }
    };
    
    // Save to Firestore
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    await setDoc(bookingRef, booking);
    
    return booking;
  } catch (error) {
    console.error('Error creating booking in Firestore:', error);
    throw error;
  }
};

/**
 * Get a booking by ID from Firestore
 * @param {string} id - The booking ID
 * @returns {Promise<Object|null>} The booking or null if not found
 */
export const getBookingById = async (id) => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      return null;
    }
    
    return bookingSnap.data();
  } catch (error) {
    console.error('Error getting booking from Firestore:', error);
    throw error;
  }
};

/**
 * Update a booking's status
 * @param {string} id - The booking ID
 * @param {string} status - The new status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object|null>} The updated booking or null if not found
 */
export const updateBookingStatus = async (id, status, additionalData = {}) => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      return null;
    }
    
    const booking = bookingSnap.data();
    
    // Create new timeline item
    const timelineItem = {
      status,
      at: Date.now(),
      note: additionalData.note || getStatusDescription(status, booking)
    };
    
    // Update data
    const updateData = {
      status,
      updatedAt: Date.now(),
      timeline: [...booking.timeline, timelineItem],
      ...additionalData
    };
    
    // Update in Firestore
    await updateDoc(bookingRef, updateData);
    
    // Return updated booking
    return {
      ...booking,
      ...updateData
    };
  } catch (error) {
    console.error('Error updating booking status in Firestore:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time updates for a booking
 * @param {string} id - The booking ID
 * @param {function} callback - The callback function to call with updated data
 * @returns {function} Unsubscribe function
 */
export const subscribeToBooking = (id, callback) => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
    return onSnapshot(bookingRef, (doc) => {
      if (doc.exists()) {
        callback({ success: true, data: doc.data() });
      } else {
        callback({ success: false, error: 'Booking not found' });
      }
    }, (error) => {
      console.error('Error subscribing to booking:', error);
      callback({ success: false, error: error.message });
    });
  } catch (error) {
    console.error('Error setting up booking subscription:', error);
    callback({ success: false, error: error.message });
    return () => {}; // Empty unsubscribe function
  }
};

/**
 * Get all bookings from Firestore
 * @returns {Promise<Array>} Array of bookings
 */
export const getAllBookings = async () => {
  try {
    const bookingsCollection = collection(db, BOOKINGS_COLLECTION);
    const querySnapshot = await getDocs(bookingsCollection);
    
    const bookings = [];
    querySnapshot.forEach((doc) => {
      bookings.push(doc.data());
    });
    
    return bookings;
  } catch (error) {
    console.error('Error getting all bookings from Firestore:', error);
    throw error;
  }
};

/**
 * Get a description for a status
 * @param {string} status - The status
 * @param {Object} booking - The booking object
 * @returns {string} A description of the status
 */
const getStatusDescription = (status, booking) => {
  const riderName = booking.rider?.name || 'Rider';
  
  switch (status) {
    case BookingStatus.PENDING:
      return 'Booking pending';
    case BookingStatus.ASSIGNED:
      return `Assigned to ${riderName}`;
    case BookingStatus.ENROUTE_PICKUP:
      return `${riderName} is en route to pickup location`;
    case BookingStatus.PICKED_UP:
      return `${riderName} has picked up the package`;
    case BookingStatus.ENROUTE_DROPOFF:
      return `${riderName} is en route to dropoff location`;
    case BookingStatus.DELIVERED:
      return 'Package has been delivered';
    case BookingStatus.CANCELLED:
      return 'Booking has been cancelled';
    default:
      return `Status updated to ${status}`;
  }
};
