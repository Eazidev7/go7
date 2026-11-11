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
  Timestamp,
  Unsubscribe,
  DocumentSnapshot,
  DocumentReference,
  CollectionReference,
  Query,
  WhereFilterOp,
  QuerySnapshot
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Booking, BookingStatus, ServiceType, TimelineItem } from '../models/firestore';

const BOOKINGS_COLLECTION = 'bookings';

/**
 * Create a new booking in Firestore
 * @param bookingData - The booking data
 * @returns The created booking
 */
export const createBooking = async (bookingData: Partial<Booking>): Promise<Booking> => {
  try {
    // Generate booking ID if not provided
    const bookingId = bookingData.id || `GO7-${Date.now()}`;
    
    // Create the booking object with required Firestore structure
    const booking: Booking = {
      id: bookingId,
      customer: bookingData.customer || {
        name: '',
        phone: ''
      },
      pickupLocation: bookingData.pickupLocation || {
        address: '',
        lat: 0,
        lng: 0
      },
      dropoffLocation: bookingData.dropoffLocation || {
        address: '',
        lat: 0,
        lng: 0
      },
      status: bookingData.status || BookingStatus.PENDING,
      serviceType: bookingData.serviceType || ServiceType.STANDARD,
      fare: bookingData.fare,
      route: bookingData.route,
      assignedRider: bookingData.assignedRider,
      timeline: bookingData.timeline || [{
        status: BookingStatus.PENDING,
        timestamp: serverTimestamp() as unknown as Date,
        note: 'Booking created'
      }],
      estimatedPickupTime: bookingData.estimatedPickupTime,
      estimatedDeliveryTime: bookingData.estimatedDeliveryTime,
      createdAt: serverTimestamp() as unknown as Date,
      updatedAt: serverTimestamp() as unknown as Date
    };
    
    // Create or overwrite the booking document
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    await setDoc(bookingRef, booking);
    
    // Fetch and return the created booking
    const bookingDoc = await getDoc(bookingRef);
    return { ...bookingDoc.data(), id: bookingDoc.id } as Booking;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

/**
 * Get a booking by ID
 * @param bookingId - The booking ID
 * @returns The booking or null if not found
 */
export const getBookingById = async (bookingId: string): Promise<Booking | null> => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    const bookingDoc = await getDoc(bookingRef);
    
    if (!bookingDoc.exists()) {
      return null;
    }
    
    return { ...bookingDoc.data(), id: bookingDoc.id } as Booking;
  } catch (error) {
    console.error('Error getting booking:', error);
    throw error;
  }
};

/**
 * Get all bookings
 * @param filters - Optional query filters
 * @returns Array of bookings
 */
export const getBookings = async (filters?: { [key: string]: any }): Promise<Booking[]> => {
  try {
    let bookingsQuery: Query = collection(db, BOOKINGS_COLLECTION);
    
    // Apply filters if provided
    if (filters) {
      Object.entries(filters).forEach(([field, value]) => {
        bookingsQuery = query(bookingsQuery, where(field, '==', value));
      });
    }
    
    // Order by creation date, most recent first
    bookingsQuery = query(bookingsQuery, orderBy('createdAt', 'desc'));
    
    const bookingsSnapshot = await getDocs(bookingsQuery);
    const bookings: Booking[] = [];
    
    bookingsSnapshot.forEach((doc) => {
      bookings.push({ ...doc.data(), id: doc.id } as Booking);
    });
    
    return bookings;
  } catch (error) {
    console.error('Error getting bookings:', error);
    throw error;
  }
};

/**
 * Update a booking
 * @param bookingId - The booking ID
 * @param updateData - The data to update
 * @returns The updated booking
 */
export const updateBooking = async (bookingId: string, updateData: Partial<Booking>): Promise<Booking> => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    
    // Add updatedAt timestamp
    const updates = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(bookingRef, updates);
    
    // Fetch and return the updated booking
    const bookingDoc = await getDoc(bookingRef);
    return { ...bookingDoc.data(), id: bookingDoc.id } as Booking;
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
};

/**
 * Update booking status with timeline entry
 * @param bookingId - The booking ID
 * @param status - The new status
 * @param note - Optional note for the timeline
 * @returns The updated booking
 */
export const updateBookingStatus = async (
  bookingId: string, 
  status: BookingStatus, 
  note?: string
): Promise<Booking> => {
  try {
    // Get the current booking to update the timeline
    const currentBooking = await getBookingById(bookingId);
    
    if (!currentBooking) {
      throw new Error(`Booking not found with ID: ${bookingId}`);
    }
    
    // Create a new timeline entry
    const timelineEntry: TimelineItem = {
      status,
      timestamp: serverTimestamp() as unknown as Date,
      note: note || `Status updated to ${status}`
    };
    
    // Update the booking with the new status and timeline entry
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    await updateDoc(bookingRef, {
      status,
      timeline: [...(currentBooking.timeline || []), timelineEntry],
      updatedAt: serverTimestamp()
    });
    
    // Fetch and return the updated booking
    const bookingDoc = await getDoc(bookingRef);
    return { ...bookingDoc.data(), id: bookingDoc.id } as Booking;
  } catch (error) {
    console.error('Error updating booking status:', error);
    throw error;
  }
};

/**
 * Subscribe to booking updates
 * @param bookingId - The booking ID
 * @param callback - The callback function to receive updates
 * @returns An unsubscribe function
 */
export const subscribeToBooking = (
  bookingId: string, 
  callback: (booking: Booking | null) => void
): Unsubscribe => {
  const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
  
  return onSnapshot(
    bookingRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const booking = { ...docSnapshot.data(), id: docSnapshot.id } as Booking;
        callback(booking);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to booking ${bookingId}:`, error);
      callback(null);
    }
  );
};

/**
 * Delete a booking
 * @param bookingId - The booking ID
 * @returns A boolean indicating success
 */
export const deleteBooking = async (bookingId: string): Promise<boolean> => {
  try {
    const bookingRef = doc(db, BOOKINGS_COLLECTION, bookingId);
    
    // Instead of actually deleting, mark as cancelled
    await updateDoc(bookingRef, {
      status: BookingStatus.CANCELLED,
      updatedAt: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting booking:', error);
    throw error;
  }
};
