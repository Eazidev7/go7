/**
 * Agent & Vendor Validation Utilities
 * Enforces business rules for agent earnings system
 */

import { db } from '../firebase';

/**
 * Check if a vendor is already assigned to an agent
 */
export async function isVendorAssigned(vendorId) {
  const vendorDoc = await db.collection('vendors').doc(vendorId).get();
  return vendorDoc.exists && !!vendorDoc.data().agentId;
}

/**
 * Prevent duplicate earnings for the same vendor and type
 */
export async function hasDuplicateEarning(vendorId, type) {
  const snapshot = await db.collection('agentEarnings')
    .where('vendorId', '==', vendorId)
    .where('type', '==', type)
    .limit(1)
    .get();
  return !snapshot.empty;
}

/**
 * Only pay if vendor is live
 */
export async function canPayRegistration(vendorId) {
  const vendorDoc = await db.collection('vendors').doc(vendorId).get();
  return vendorDoc.exists && vendorDoc.data().isLive === true;
}

/**
 * Only trigger activation once
 */
export async function canTriggerActivation(vendorId) {
  const vendorDoc = await db.collection('vendors').doc(vendorId).get();
  return vendorDoc.exists && vendorDoc.data().hasFirstOrder === true;
}
