/**
 * Firestore Data Models
 * 
 * This file defines the types and interfaces for the Firestore data models.
 */

/**
 * Booking Status enum
 */
export enum BookingStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  ENROUTE_PICKUP = 'enroute_pickup',
  PICKED_UP = 'picked_up',
  ENROUTE_DROPOFF = 'enroute_dropoff',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

/**
 * Rider Status enum
 */
export enum RiderStatus {
  OFFLINE = 'offline',
  AVAILABLE = 'available',
  BUSY = 'busy'
}

/**
 * Service Type enum
 */
export enum ServiceType {
  STANDARD = 'standard',
  EXPRESS = 'express'
}

/**
 * Timeline Item interface
 */
export interface TimelineItem {
  status: BookingStatus;
  timestamp: Date | firebase.firestore.Timestamp;
  note?: string;
}

/**
 * Location interface
 */
export interface Location {
  address: string;
  lat: number;
  lng: number;
}

/**
 * Customer interface
 */
export interface Customer {
  name: string;
  phone: string;
  email?: string;
}

/**
 * Route interface
 */
export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  polyline?: string;
}

/**
 * Fare interface
 */
export interface Fare {
  baseFare: number;
  distanceFare: number;
  total: number;
  currency: string;
}

/**
 * Rider interface
 */
export interface Rider {
  id: string;
  name: string;
  phone: string;
  email?: string;
  status: RiderStatus;
  currentLocation?: Location;
  lastUpdated: Date | firebase.firestore.Timestamp;
}

/**
 * Booking interface
 */
export interface Booking {
  id: string;
  customer: Customer;
  pickupLocation: Location;
  dropoffLocation: Location;
  status: BookingStatus;
  serviceType: ServiceType;
  fare?: Fare;
  route?: Route;
  assignedRider?: string; // rider ID
  timeline: TimelineItem[];
  estimatedPickupTime?: Date | firebase.firestore.Timestamp;
  estimatedDeliveryTime?: Date | firebase.firestore.Timestamp;
  createdAt: Date | firebase.firestore.Timestamp;
  updatedAt: Date | firebase.firestore.Timestamp;
}
