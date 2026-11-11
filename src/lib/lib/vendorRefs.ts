/**
 * Firestore references for vendor-related collections and documents
 * These references are used to access vendor, product, order, and payment data
 */

import { 
  collection, 
  doc, 
  query, 
  where, 
  CollectionReference,
  DocumentReference,
  QueryConstraint,
  orderBy
} from 'firebase/firestore';

import { db } from './firebase';

import {
  Vendor,
  Product,
  Order,
  PodLedger,
  Payout,
  vendorConverter,
  productConverter,
  orderConverter,
  podLedgerConverter,
  payoutConverter
} from '../types/marketplace';

/**
 * Collection reference for vendors
 */
export const vendorsCol = collection(db, 'vendors').withConverter(vendorConverter);

/**
 * Get document reference for a specific vendor
 * @param vendorId The vendor's ID
 * @returns DocumentReference for the vendor
 */
export const vendorDoc = (vendorId: string): DocumentReference<Vendor> => {
  return doc(db, 'vendors', vendorId).withConverter(vendorConverter);
};

/**
 * Get collection reference for a vendor's products
 * @param vendorId The vendor's ID
 * @returns CollectionReference for the vendor's products
 */
export const productsCol = collection(db, 'products').withConverter(productConverter);

/**
 * Get collection reference for a specific vendor's products
 * @param vendorId The vendor's ID
 * @returns CollectionReference for the vendor's products
 */
export const vendorProductsCol = (vendorId: string): CollectionReference<Product> => {
  return collection(db, `vendors/${vendorId}/products`).withConverter(productConverter);
};

/**
 * Collection reference for all orders
 */
export const ordersCol = collection(db, 'orders').withConverter(orderConverter);

/**
 * Get document reference for a specific order
 * @param orderId The order's ID
 * @returns DocumentReference for the order
 */
export const orderDoc = (orderId: string): DocumentReference<Order> => {
  return doc(db, 'orders', orderId).withConverter(orderConverter);
};

/**
 * Get collection reference for a vendor's POD ledger entries
 * @param vendorId The vendor's ID
 * @returns CollectionReference for the vendor's POD ledger
 */
export const podLedgerCol = (vendorId: string): CollectionReference<PodLedger> => {
  return collection(db, `vendors/${vendorId}/pod_ledger`).withConverter(podLedgerConverter);
};

/**
 * Get collection reference for a vendor's payouts
 * @param vendorId The vendor's ID
 * @returns CollectionReference for the vendor's payouts
 */
export const payoutsCol = (vendorId: string): CollectionReference<Payout> => {
  return collection(db, `vendors/${vendorId}/payouts`).withConverter(payoutConverter);
};

// Query functions

/**
 * Query for orders from a specific vendor
 * @param vendorId The vendor's ID
 * @param constraints Optional additional query constraints
 * @returns Query for the vendor's orders
 */
export const ordersByVendor = (vendorId: string, ...constraints: QueryConstraint[]) => {
  return query(
    ordersCol,
    where('vendorId', '==', vendorId),
    orderBy('createdAt', 'desc'),
    ...constraints
  );
};

/**
 * Query for products from a specific vendor
 * @param vendorId The vendor's ID
 * @param constraints Optional additional query constraints
 * @returns Query for the vendor's products
 */
export const productsByVendor = (vendorId: string, ...constraints: QueryConstraint[]) => {
  return query(
    productsCol(vendorId),
    orderBy('createdAt', 'desc'),
    ...constraints
  );
};

/**
 * Query for active orders (not delivered or cancelled) from a specific vendor
 * @param vendorId The vendor's ID
 * @returns Query for the vendor's active orders
 */
export const activeOrdersByVendor = (vendorId: string) => {
  return query(
    ordersCol,
    where('vendorId', '==', vendorId),
    where('status', 'not-in', ['delivered', 'cancelled']),
    orderBy('createdAt', 'desc')
  );
};

/**
 * Query for POD ledger entries with a specific state from a vendor
 * @param vendorId The vendor's ID
 * @param state The POD state to filter by
 * @returns Query for the vendor's POD ledger entries with the specified state
 */
export const podLedgerByState = (vendorId: string, state: 'to_collect' | 'collected' | 'remitted') => {
  return query(
    podLedgerCol(vendorId),
    where('state', '==', state),
    orderBy('createdAt', 'desc')
  );
};

/**
 * Query for pending payouts for a vendor
 * @param vendorId The vendor's ID
 * @returns Query for the vendor's pending payouts
 */
export const pendingPayouts = (vendorId: string) => {
  return query(
    payoutsCol(vendorId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
};
