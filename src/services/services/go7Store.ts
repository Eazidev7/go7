/**
 * Go7Store.ts - Firestore Helpers for Go7 Delivery App
 * 
 * This file provides helper functions for interacting with Firestore,
 * specifically for customer deliveries and live delivery tracking.
 */

import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RiderStatus } from '../models/firestore';

// Collection references
const CUSTOMER_DELIVERIES_COLLECTION = 'customer_deliveries';
const DELIVERIES_COLLECTION = 'deliveries';
const RIDERS_COLLECTION = 'riders';

/**
 * Location interface for addresses with coordinates
 */
export interface Location {
  address: string;
  lat: number;
  lng: number;
}

/**
 * Route information interface
 */
export interface RouteInfo {
  distance: number; // in meters
  duration: number; // in seconds
  polyline?: string; // encoded polyline for the route
}

/**
 * Status types for deliveries
 */
export enum DeliveryStatus {
  CREATED = 'created',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Interface for the customer delivery request
 */
export interface CustomerDeliveryInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  itemDescription: string;
  specialInstructions?: string;
  serviceType: 'standard' | 'express';
}

/**
 * Interface for the customer delivery document stored in Firestore
 */
export interface CustomerDelivery extends CustomerDeliveryInput {
  jobId: string;
  status: DeliveryStatus;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  distanceKm?: number;
  estimatedPrice?: number;
  currency?: string;
}

/**
 * Interface for the live delivery tracking document stored in Firestore
 */
export interface DeliveryLive {
  liveId: string;
  jobId: string;
  status: DeliveryStatus;
  route?: RouteInfo;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  riderCode?: string;
  currentLocation?: Location;
  distanceKm?: number;
  estimatedPrice?: number;
  currency?: string;
  etaMinutes?: number;
  estimatedPickupTime?: Date | Timestamp;
  estimatedDeliveryTime?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  timeline: {
    status: DeliveryStatus;
    timestamp: Date | Timestamp;
    note?: string;
  }[];
}

/**
 * Creates a new customer delivery in Firestore
 * @param input The customer delivery input data
 * @returns The created customer delivery with jobId
 */
export const createCustomerDelivery = async (
  input: CustomerDeliveryInput
): Promise<CustomerDelivery> => {
  try {
    // Import necessary functions
    const { haversineKm } = await import('../utils/distance');
    const { computeFareSimple } = await import('../utils/pricing');
    
    // Generate a unique job ID
    const jobId = `GO7-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Calculate distance between pickup and dropoff
    const distanceKm = haversineKm(
      [input.pickupLocation.lat, input.pickupLocation.lng],
      [input.dropoffLocation.lat, input.dropoffLocation.lng]
    );
    
    // Calculate estimated price
    const fareDetails = computeFareSimple(distanceKm, input.serviceType);
    
    // Create the customer delivery object
    const customerDelivery: CustomerDelivery = {
      ...input,
      jobId,
      status: DeliveryStatus.CREATED,
      createdAt: serverTimestamp() as unknown as Date,
      updatedAt: serverTimestamp() as unknown as Date,
      distanceKm, // Store the estimated distance
      estimatedPrice: fareDetails.fare, // Store the estimated fare
      currency: 'NGN'
    };
    
    // Write to the customer_deliveries collection
    const customerDeliveryRef = doc(db, CUSTOMER_DELIVERIES_COLLECTION, jobId);
    await setDoc(customerDeliveryRef, customerDelivery);
    
    // Fetch and return the created delivery to ensure we have server timestamps
    const deliveryDoc = await getDoc(customerDeliveryRef);
    return { ...deliveryDoc.data(), jobId: deliveryDoc.id } as CustomerDelivery;
  } catch (error) {
    console.error('Error creating customer delivery:', error);
    throw error;
  }
};

/**
 * Ensures a delivery is live by creating or updating a document in the deliveries collection
 * @param jobId The customer delivery job ID
 * @param route Optional route information
 * @returns The created or updated live delivery
 */
export const ensureDeliveryLive = async (
  jobId: string,
  route?: RouteInfo
): Promise<DeliveryLive> => {
  try {
    // Generate a unique live ID if needed or use the jobId
    const liveId = `LIVE-${jobId}`;
    
    // Check if we already have a live delivery document
    const liveDeliveryRef = doc(db, DELIVERIES_COLLECTION, liveId);
    const liveDeliveryDoc = await getDoc(liveDeliveryRef);
    
    if (liveDeliveryDoc.exists()) {
      // Update the existing live delivery
      const updates = {
        route: route || liveDeliveryDoc.data().route,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(liveDeliveryRef, updates);
      
      // Fetch and return the updated document
      const updatedDoc = await getDoc(liveDeliveryRef);
      return { ...updatedDoc.data(), liveId: updatedDoc.id } as DeliveryLive;
    } else {
      // Fetch the original customer delivery
      const customerDeliveryRef = doc(db, CUSTOMER_DELIVERIES_COLLECTION, jobId);
      const customerDeliveryDoc = await getDoc(customerDeliveryRef);
      
      if (!customerDeliveryDoc.exists()) {
        throw new Error(`Customer delivery not found with jobId: ${jobId}`);
      }
      
      const customerDelivery = customerDeliveryDoc.data() as CustomerDelivery;
      
      // Create a new live delivery
      const liveDelivery: DeliveryLive = {
        liveId,
        jobId,
        status: DeliveryStatus.CREATED,
        route,
        distanceKm: customerDelivery.distanceKm,
        estimatedPrice: customerDelivery.estimatedPrice,
        currency: customerDelivery.currency,
        createdAt: serverTimestamp() as unknown as Date,
        updatedAt: serverTimestamp() as unknown as Date,
        timeline: [
          {
            status: DeliveryStatus.CREATED,
            timestamp: serverTimestamp() as unknown as Date,
            note: 'Delivery created'
          }
        ]
      };
      
      // Write to the deliveries collection
      await setDoc(liveDeliveryRef, liveDelivery);
      
      // Fetch and return the created live delivery
      const newLiveDoc = await getDoc(liveDeliveryRef);
      return { ...newLiveDoc.data(), liveId: newLiveDoc.id } as DeliveryLive;
    }
  } catch (error) {
    console.error('Error ensuring delivery is live:', error);
    throw error;
  }
};

/**
 * Simulates assigning a rider to a delivery after a short delay
 * @param liveId The live delivery ID
 * @returns The updated live delivery with rider information
 */
export const assignRiderSim = async (liveId: string): Promise<DeliveryLive> => {
  try {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the live delivery document
    const liveDeliveryRef = doc(db, DELIVERIES_COLLECTION, liveId);
    const liveDeliveryDoc = await getDoc(liveDeliveryRef);
    
    if (!liveDeliveryDoc.exists()) {
      throw new Error(`Live delivery not found with liveId: ${liveId}`);
    }
    
    // Create a mock rider (in a real app, you'd query available riders)
    const mockRiders = [
      { id: 'rider-1', name: 'John Rider', phone: '+1-555-123-4567' },
      { id: 'rider-2', name: 'Jane Delivery', phone: '+1-555-987-6543' },
      { id: 'rider-3', name: 'Sam Swift', phone: '+1-555-456-7890' }
    ];
    
    const selectedRider = mockRiders[Math.floor(Math.random() * mockRiders.length)];
    
    // Update the live delivery with rider information and change status
    const updatedDelivery = {
      status: DeliveryStatus.ASSIGNED,
      riderId: selectedRider.id,
      riderName: selectedRider.name,
      riderPhone: selectedRider.phone,
      updatedAt: serverTimestamp(),
      timeline: [
        ...liveDeliveryDoc.data().timeline,
        {
          status: DeliveryStatus.ASSIGNED,
          timestamp: serverTimestamp(),
          note: `Assigned to rider: ${selectedRider.name}`
        }
      ]
    };
    
    await updateDoc(liveDeliveryRef, updatedDelivery);
    
    // In a real app, you'd also update the rider's status in the riders collection
    // This is simulated here
    const riderRef = doc(db, RIDERS_COLLECTION, selectedRider.id);
    try {
      await updateDoc(riderRef, {
        status: RiderStatus.BUSY,
        assignedDelivery: liveId,
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.log('Rider document may not exist, would be created in a real app');
      // In a real app, you might create the rider document if it doesn't exist
    }
    
    // Fetch and return the updated live delivery
    const updatedDoc = await getDoc(liveDeliveryRef);
    return { ...updatedDoc.data(), liveId: updatedDoc.id } as DeliveryLive;
  } catch (error) {
    console.error('Error simulating rider assignment:', error);
    throw error;
  }
};

/**
 * Subscribes to real-time updates of a delivery
 * @param jobId The customer delivery job ID
 * @param callback The callback function that receives delivery updates
 * @returns An unsubscribe function to stop listening for updates
 */
export const subscribeDelivery = (
  jobId: string,
  callback: (delivery: DeliveryLive | null) => void
): Unsubscribe => {
  const liveId = `LIVE-${jobId}`;
  const liveDeliveryRef = doc(db, DELIVERIES_COLLECTION, liveId);
  
  return onSnapshot(
    liveDeliveryRef,
    (docSnapshot) => {
      if (docSnapshot.exists()) {
        const liveDelivery = { 
          ...docSnapshot.data(), 
          liveId: docSnapshot.id 
        } as DeliveryLive;
        callback(liveDelivery);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error(`Error subscribing to delivery ${jobId}:`, error);
      callback(null);
    }
  );
};

/**
 * Gets a delivery by job ID (one-time fetch)
 * @param jobId The customer delivery job ID
 * @returns The live delivery or null if not found
 */
export const getDeliveryByJobId = async (jobId: string): Promise<DeliveryLive | null> => {
  try {
    const liveId = `LIVE-${jobId}`;
    const liveDeliveryRef = doc(db, DELIVERIES_COLLECTION, liveId);
    const liveDeliveryDoc = await getDoc(liveDeliveryRef);
    
    if (!liveDeliveryDoc.exists()) {
      return null;
    }
    
    return { ...liveDeliveryDoc.data(), liveId: liveDeliveryDoc.id } as DeliveryLive;
  } catch (error) {
    console.error('Error getting delivery:', error);
    throw error;
  }
};

/**
 * Gets a customer delivery by job ID
 * @param jobId The customer delivery job ID
 * @returns The customer delivery or null if not found
 */
export const getCustomerDelivery = async (jobId: string): Promise<CustomerDelivery | null> => {
  try {
    const customerDeliveryRef = doc(db, CUSTOMER_DELIVERIES_COLLECTION, jobId);
    const customerDeliveryDoc = await getDoc(customerDeliveryRef);
    
    if (!customerDeliveryDoc.exists()) {
      return null;
    }
    
    return { ...customerDeliveryDoc.data(), jobId: customerDeliveryDoc.id } as CustomerDelivery;
  } catch (error) {
    console.error('Error getting customer delivery:', error);
    throw error;
  }
};

/**
 * Updates the payment information for a customer delivery
 * @param jobId The customer delivery job ID
 * @param paymentInfo The payment information to update
 * @returns The updated customer delivery
 */
export const updateDeliveryPayment = async (jobId: string, paymentInfo: any): Promise<CustomerDelivery | null> => {
  try {
    // Get references to both customer delivery and live delivery
    const customerDeliveryRef = doc(db, CUSTOMER_DELIVERIES_COLLECTION, jobId);
    
    // Update the customer delivery with payment information
    await updateDoc(customerDeliveryRef, {
      payment: {
        ...paymentInfo,
        updatedAt: serverTimestamp()
      }
    });
    
    // Get the updated customer delivery
    const updatedDoc = await getDoc(customerDeliveryRef);
    
    if (!updatedDoc.exists()) {
      return null;
    }
    
    return { ...updatedDoc.data(), jobId: updatedDoc.id } as CustomerDelivery;
  } catch (error) {
    console.error('Error updating delivery payment:', error);
    throw error;
  }
};
