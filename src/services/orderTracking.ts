import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  where,
  type DocumentReference,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const DELIVERY_PIN_LENGTH = 6;

export function generateDeliveryPIN(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getDeliveryPinFromOrder(data: Record<string, unknown> | null | undefined): string {
  if (!data) return '';
  const dropoff = data.dropoff as { pin?: string } | undefined;
  return String(
    data.deliveryPIN ||
      data.deliveryPin ||
      data.customerPIN ||
      data.pin ||
      dropoff?.pin ||
      data.receiverPin ||
      ''
  );
}

export function shouldShowDeliveryPin(status: string): boolean {
  const s = status.toLowerCase();
  return [
    'assigned',
    'accepted',
    'rider-assigned',
    'picked_up',
    'picked-up',
    'in_transit',
    'in-transit',
    'in_progress',
    'in-progress',
    'on-the-way',
    'nearby',
    'enroute_dropoff',
    'delivering',
    'searching_rider',
    'shopper-assigned',
    'shopper_assigned',
    'shopping',
  ].includes(s);
}

export async function resolveOrderRef(orderId: string): Promise<{
  ref: DocumentReference;
  collection: string;
  id: string;
} | null> {
  if (!orderId) return null;

  for (const colName of ['bookings', 'orders', 'gobuyOrders', 'deliveries']) {
    const ref = doc(db, colName, orderId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return { ref, collection: colName, id: snap.id };
    }
  }

  for (const colName of ['bookings', 'orders']) {
    const snap = await getDocs(
      query(collection(db, colName), where('bookingId', '==', orderId), limit(1))
    );
    if (!snap.empty) {
      const docSnap = snap.docs[0];
      return { ref: docSnap.ref, collection: colName, id: docSnap.id };
    }
  }

  return null;
}

export function subscribeToOrder(
  orderId: string,
  onData: (data: Record<string, unknown> & { id: string }, collection: string) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  let innerUnsub: Unsubscribe | null = null;
  let cancelled = false;

  void resolveOrderRef(orderId).then((resolved) => {
    if (cancelled) return;
    if (!resolved) {
      onError?.(new Error(`Order ${orderId} not found`));
      return;
    }

    innerUnsub = onSnapshot(
      resolved.ref,
      (snap) => {
        if (!snap.exists()) return;
        onData({ id: snap.id, ...(snap.data() as Record<string, unknown>) }, resolved.collection);
      },
      (err) => onError?.(err)
    );
  });

  return () => {
    cancelled = true;
    innerUnsub?.();
  };
}
