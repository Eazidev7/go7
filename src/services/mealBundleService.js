import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  collection, getDocs, getDoc, doc, query, where, limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const fn = (name) => httpsCallable(getFunctions(), name);

/** Create a pending bundle — server validates + reprices everything. */
export const createMealBundle = ({ legs, notes, paymentMethod = 'paystack', clientRequestId }) =>
  fn('createMealBundle')({ legs, notes, paymentMethod, clientRequestId }).then((r) => r.data);

/** Server-side confirmation after a verified Paystack reference. */
export const confirmMealBundlePayment = ({ bundleId, reference }) =>
  fn('confirmMealBundlePayment')({ bundleId, reference }).then((r) => r.data);

/** Cancel one scheduled leg (wallet refund, idempotent). */
export const cancelMealBundleLeg = ({ bundleId, legIndex }) =>
  fn('cancelMealBundleLeg')({ bundleId, legIndex }).then((r) => r.data);

/** Cancel the whole bundle — refunds every scheduled leg. */
export const cancelMealBundle = ({ bundleId }) =>
  fn('cancelMealBundle')({ bundleId }).then((r) => r.data);

/** My bundles — newest first, sorted client-side (no index needed). */
export const fetchMyBundles = async (uid) => {
  const snap = await getDocs(
    query(collection(db, 'mealBundles'), where('userId', '==', uid), limit(50))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};

/** Live vendors for the picker — client-filtered (no index needed). */
export const fetchLiveVendors = async () => {
  const snap = await getDocs(collection(db, 'vendors'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((v) => v.live !== false && v.isOpen !== false && v.status !== 'closed');
};

/** Vendor's active meal plans (sellable bundle products). */
export const fetchVendorPlans = async (vendorId) => {
  const snap = await getDocs(
    query(collection(db, 'mealPlanProducts'), where('vendorId', '==', vendorId))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.active !== false);
};

/** All active CheapChop plans across vendors — the browse carousel. */
export const fetchActivePlans = async () => {
  const snap = await getDocs(
    query(collection(db, 'mealPlanProducts'), where('active', '==', true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/** Subscribe to a vendor meal plan — server builds legs from the plan doc. */
export const createMealBundleFromPlan = ({ planId, daySlots, dropoff, clientRequestId }) =>
  fn('createMealBundle')({ planId, daySlots, dropoff, clientRequestId }).then((r) => r.data);

/** Server-priced quote — same validation/pricing as purchase, no writes. */
export const quoteMealBundle = (payload) =>
  fn('quoteMealBundle')(payload).then((r) => r.data);

/** Feature flag — CheapChop hidden until rollout is approved. */
export const fetchMealPlansEnabled = async () => {
  const snap = await getDoc(doc(db, 'appConfig', 'features'));
  return snap.exists() && snap.data().mealPlansEnabled === true;
};

/** Vendor's sellable products. */
export const fetchVendorProducts = async (vendorId) => {
  const snap = await getDocs(collection(db, 'vendors', vendorId, 'products'));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.available !== false && p.inStock !== false);
};

/** Pull the customer's saved dropoff (coords) from their user doc. */
export const pickSavedDropoff = (userDoc) => {
  const candidates = [
    userDoc?.defaultAddress, userDoc?.address, userDoc?.location,
    ...(Array.isArray(userDoc?.addresses) ? userDoc.addresses : []),
    ...(Array.isArray(userDoc?.savedLocations) ? userDoc.savedLocations : []),
    ...(Array.isArray(userDoc?.locations) ? userDoc.locations : []),
  ].filter(Boolean);
  for (const c of candidates) {
    const lat = Number(c?.lat ?? c?.latitude ?? c?.coords?.lat ?? c?.coords?.latitude);
    const lng = Number(c?.lng ?? c?.longitude ?? c?.coords?.lng ?? c?.coords?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng, address: c.address || c.label || c.name || '' };
    }
  }
  return null;
};
