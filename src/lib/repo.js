// Repository functions for delivery event management
// JavaScript version for GO7 delivery app

import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase/config';

/**
 * Append an event to a delivery's event timeline
 * @param {string} deliveryId - The delivery document ID
 * @param {Object} event - The event to append (created with createDeliveryEvent)
 * @returns {Promise<void>}
 */
export async function appendEvent(deliveryId, event) {
  try {
    console.log(`📝 Appending event to delivery ${deliveryId}:`, event);
    
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    
    // Add the event to the events array and update status
    await updateDoc(deliveryRef, {
      events: arrayUnion(event),
      status: event.status,
      updatedAt: new Date()
    });
    
    console.log(`✅ Event appended successfully to delivery ${deliveryId}`);
  } catch (error) {
    console.error(`❌ Error appending event to delivery ${deliveryId}:`, error);
    throw error;
  }
}

/**
 * Get delivery with events
 * @param {string} deliveryId - The delivery document ID
 * @returns {Promise<Object|null>}
 */
export async function getDeliveryWithEvents(deliveryId) {
  try {
    const deliveryRef = doc(db, 'deliveries', deliveryId);
    const deliverySnap = await getDoc(deliveryRef);
    
    if (deliverySnap.exists()) {
      return {
        id: deliverySnap.id,
        ...deliverySnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error(`❌ Error getting delivery ${deliveryId}:`, error);
    throw error;
  }
}

// Export default for convenience
export default {
  appendEvent,
  getDeliveryWithEvents
};