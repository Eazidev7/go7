// GO7 DELIVERY FLOW - FIREBASE + REACT + LEAFLET
// Complete delivery booking and management system

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  setDoc,
  increment,
  onSnapshot,
  serverTimestamp,
  runTransaction,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  FieldValue
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { validatePickupTime } from '../utils/pickupTimeValidation';

// Import stub functions for missing features
import {
  subscribeToDelivery,
  verifyDeliveryOTP,
  completeDelivery,
  calculateDeliveryPrice,
  getAvailableRiders,
  riderAcceptsDelivery
} from './deliveryServiceStub';

// Re-export the stub functions
export {
  subscribeToDelivery,
  verifyDeliveryOTP,
  completeDelivery,
  calculateDeliveryPrice,
  getAvailableRiders,
  riderAcceptsDelivery
};

// 1. BOOK DELIVERY FUNCTION
export async function bookDelivery(deliveryDetails) {
  try {
    console.log('📦 Booking new delivery:', deliveryDetails);

    // Validate pickup time if scheduled
    const isScheduled = deliveryDetails.pickupOption === 'scheduled';
    if (isScheduled && deliveryDetails.scheduledPickupTime) {
      const validation = validatePickupTime(deliveryDetails.scheduledPickupTime);
      if (!validation.isValid) {
        throw new Error(`Pickup time validation failed: ${validation.error}`);
      }
      console.log('✅ Pickup time validation passed');
    }

    // Generate a random 6-digit OTP for delivery verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('🔐 Generated OTP:', otp);

    // Determine pickup time and delivery status
    const pickupTime = isScheduled ?
      new Date(deliveryDetails.scheduledPickupTime) :
      new Date(); // immediate pickup

    const initialStatus = isScheduled ? "scheduled" : "pending";

    // Try Firebase first, fallback to local storage
    try {
      if (db) {
        // Create delivery document in Firebase
        const docRef = await addDoc(collection(db, "deliveries"), {
          ...deliveryDetails,
          status: initialStatus,
          otp: otp,
          pickupTime: pickupTime,
          isScheduled: isScheduled,
          riderReminderSent: false,
          customerReminderSent: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });

        console.log(`✅ Delivery created with Firebase ID: ${docRef.id} (${isScheduled ? 'scheduled' : 'immediate'})`);
        return docRef.id;
      } else {
        throw new Error('Firebase not available');
      }
    } catch (firebaseError) {
      console.warn('⚠️ Firebase unavailable, using local storage fallback:', firebaseError.message);
      
      // Fallback to local storage
      const deliveryId = `GO7-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const deliveryData = {
        id: deliveryId,
        ...deliveryDetails,
        status: initialStatus,
        otp: otp,
        pickupTime: pickupTime.toISOString(),
        isScheduled: isScheduled,
        riderReminderSent: false,
        customerReminderSent: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store in localStorage for demo purposes
      const existingDeliveries = JSON.parse(localStorage.getItem('go7_deliveries') || '[]');
      existingDeliveries.push(deliveryData);
      localStorage.setItem('go7_deliveries', JSON.stringify(existingDeliveries));

      console.log(`✅ Delivery created with local ID: ${deliveryId} (${isScheduled ? 'scheduled' : 'immediate'})`);
      return deliveryId;
    }
  } catch (error) {
    console.error('❌ Error booking delivery:', error);
    throw error;
  }
}

// 2. Get scheduled deliveries for admin/management
export async function getScheduledDeliveries() {
  try {
    const q = query(
      collection(db, 'deliveries'),
      where('status', '==', 'scheduled'),
      orderBy('pickupTime', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const scheduledDeliveries = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      scheduledDeliveries.push({
        id: doc.id,
        ...data,
        pickupTime: data.pickupTime?.toDate() || new Date(data.scheduledPickupTime),
        createdAt: data.createdAt?.toDate()
      });
    });

    console.log(`📅 Retrieved ${scheduledDeliveries.length} scheduled deliveries`);
    return scheduledDeliveries;
  } catch (error) {
    console.error('❌ Error fetching scheduled deliveries:', error);
    throw error;
  }
}
