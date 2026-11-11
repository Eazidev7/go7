// GO7 Store Service - Delivery management functions
// Compatible with TrackOrder.jsx requirements

import { 
  doc, 
  getDoc, 
  onSnapshot,
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

// Delivery Status constants to match TrackOrder.jsx expectations
export const DeliveryStatus = {
  CREATED: 'created',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Subscribe to delivery updates by jobId
export function subscribeDelivery(jobId, callback) {
  try {
    console.log(`🔔 Setting up subscription for delivery: ${jobId}`);
    
    // Create a query to find delivery by jobId field
    const deliveriesQuery = query(
      collection(db, 'deliveries'),
      where('jobId', '==', jobId)
    );
    
    const unsubscribe = onSnapshot(deliveriesQuery, (snapshot) => {
      if (!snapshot.empty) {
        const deliveryDoc = snapshot.docs[0];
        const deliveryData = {
          id: deliveryDoc.id,
          ...deliveryDoc.data()
        };
        callback(deliveryData);
      } else {
        // Try by document ID if jobId query fails
        const deliveryRef = doc(db, 'deliveries', jobId);
        const unsubscribeDoc = onSnapshot(deliveryRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const deliveryData = {
              id: docSnapshot.id,
              ...docSnapshot.data()
            };
            callback(deliveryData);
          } else {
            console.log(`📄 No delivery found with jobId: ${jobId}`);
            callback(null);
          }
        });
        return unsubscribeDoc;
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('❌ Error setting up delivery subscription:', error);
    throw error;
  }
}

// Get delivery by jobId (one-time fetch)
export async function getDeliveryByJobId(jobId) {
  try {
    console.log(`📄 Fetching delivery by jobId: ${jobId}`);
    
    // First try to find by jobId field
    const deliveriesQuery = query(
      collection(db, 'deliveries'),
      where('jobId', '==', jobId)
    );
    
    const snapshot = await getDocs(deliveriesQuery);
    
    if (!snapshot.empty) {
      const deliveryDoc = snapshot.docs[0];
      return {
        id: deliveryDoc.id,
        ...deliveryDoc.data()
      };
    }
    
    // If not found by jobId field, try by document ID
    const deliveryRef = doc(db, 'deliveries', jobId);
    const docSnapshot = await getDoc(deliveryRef);
    
    if (docSnapshot.exists()) {
      return {
        id: docSnapshot.id,
        ...docSnapshot.data()
      };
    }
    
    console.log(`📄 No delivery found with jobId: ${jobId}`);
    return null;
  } catch (error) {
    console.error('❌ Error fetching delivery by jobId:', error);
    throw error;
  }
}

// Export default for convenience
export default {
  subscribeDelivery,
  getDeliveryByJobId,
  DeliveryStatus
};