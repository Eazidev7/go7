import { 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  query, 
  where, 
  limit, 
  onSnapshot, 
  Unsubscribe 
} from 'firebase/firestore';

import { 
  bookingDoc, 
  deliveryDoc, 
  deliveriesCol 
} from './dbRefs';

import { 
  CustomerDelivery, 
  DeliveryLive, 
  DeliveryEvent 
} from '../types/models';

/**
 * Create a new customer delivery in the database
 * @param cd CustomerDelivery object to create
 */
export async function createCustomerDelivery(cd: CustomerDelivery): Promise<void> {
  await setDoc(bookingDoc(cd.id), cd);
}

/**
 * Update or insert a delivery live object
 * Uses merge:true to update only the provided fields
 * @param dl DeliveryLive object to upsert
 */
export async function upsertDeliveryLive(dl: DeliveryLive): Promise<void> {
  await setDoc(deliveryDoc(dl.id), dl, { merge: true });
}

/**
 * Get a delivery by its ID
 * @param id The delivery ID to retrieve
 * @returns The DeliveryLive object or null if not found
 */
export async function getDeliveryLive(id: string): Promise<DeliveryLive | null> {
  const docSnap = await getDoc(deliveryDoc(id));
  if (docSnap.exists()) {
    return docSnap.data();
  }
  return null;
}

/**
 * Listen for changes to a delivery by job ID
 * @param jobId The customer delivery job ID to listen for
 * @param cb Callback function called when data changes
 * @returns Unsubscribe function to stop listening
 */
export function listenDeliveryByJobId(jobId: string, cb: (d?: DeliveryLive) => void): Unsubscribe {
  const q = query(
    deliveriesCol,
    where('jobId', '==', jobId),
    limit(1)
  );
  
  return onSnapshot(q, (querySnapshot) => {
    if (querySnapshot.empty) {
      cb(undefined);
      return;
    }
    
    const doc = querySnapshot.docs[0];
    cb(doc.data());
  });
}

/**
 * Append an event to a delivery's event array
 * Also updates the updatedAt timestamp
 * @param deliveryId The delivery ID to append the event to
 * @param ev The event to append
 */
export async function appendEvent(deliveryId: string, ev: DeliveryEvent): Promise<void> {
  await updateDoc(deliveryDoc(deliveryId), { 
    events: arrayUnion(ev),
    updatedAt: new Date()
  });
}
