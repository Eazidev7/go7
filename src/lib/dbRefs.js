import { collection, doc } from 'firebase/firestore';
import { db } from './firebase';

// Simple collection and document references without converters
export const bookingsCol = collection(db, 'customer_deliveries');
export const deliveriesCol = collection(db, 'deliveries');

export const deliveryDoc = (id) =>
  doc(db, 'deliveries', id);

export const bookingDoc = (id) =>
  doc(db, 'customer_deliveries', id);
