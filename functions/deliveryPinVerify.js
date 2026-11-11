const functions = require('firebase-functions');
const admin = require('./adminInit');

/**
 * Server-side delivery PIN verification.
 *
 * The customer's delivery PIN lives in deliverySecrets/{orderId} — a doc that
 * only the order owner and admin can read (see firestore.rules). Riders verify
 * through this callable so the PIN is never shipped to a rider's client.
 * Legacy orders still carry pin fields on public docs — those are read here as
 * a fallback so in-flight deliveries keep working.
 */
exports.verifyDeliveryPin = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }

  const jobId = String(data?.jobId || data?.orderId || '').trim();
  const pin = String(data?.pin || '').trim();
  if (!jobId || !/^\d{4,8}$/.test(pin)) {
    throw new functions.https.HttpsError('invalid-argument', 'jobId and numeric pin are required');
  }

  const firestore = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  // Rate limit: 12 attempts per job per rider — enough for typos, blocks brute force.
  const rlRef = firestore.collection('rate_limits').doc(`pinver_${jobId}_${uid}`);
  const rlSnap = await rlRef.get();
  const attempts = rlSnap.exists ? Number(rlSnap.data()?.count || 0) : 0;
  if (attempts >= 12) {
    throw new functions.https.HttpsError('resource-exhausted', 'Too many PIN attempts. Contact support.');
  }
  await rlRef.set({ count: attempts + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });

  // Load the job and confirm the caller is its assigned rider.
  let jobData = null;
  for (const colName of ['deliveries', 'bookings', 'orders']) {
    const snap = await firestore.collection(colName).doc(jobId).get();
    if (snap.exists) { jobData = snap.data() || {}; break; }
  }
  if (!jobData) {
    throw new functions.https.HttpsError('not-found', 'Delivery not found');
  }
  const assignedRiderId = jobData.riderId || jobData.rider?.id || jobData.assignedRider?.id || null;
  if (assignedRiderId !== uid) {
    throw new functions.https.HttpsError('permission-denied', 'You are not the assigned rider');
  }

  // Expected PIN: private secrets doc first, legacy public fields as fallback.
  let expected = null;
  const secretSnap = await firestore.collection('deliverySecrets').doc(jobId).get();
  if (secretSnap.exists) expected = secretSnap.data()?.pin || null;
  if (!expected) {
    expected = jobData.deliveryPin || jobData.deliveryPIN || jobData.customerPIN || null;
    if (!expected) {
      for (const colName of ['bookings', 'orders', 'deliveries']) {
        const snap = await firestore.collection(colName).doc(jobId).get();
        if (!snap.exists) continue;
        const d = snap.data() || {};
        expected = d.deliveryPin || d.deliveryPIN || d.customerPIN || d.otp || null;
        if (expected) break;
      }
    }
  }
  if (!expected) {
    throw new functions.https.HttpsError('failed-precondition', 'This delivery has no PIN');
  }

  if (String(expected) !== pin) {
    return { ok: false, error: 'incorrect-pin' };
  }

  const now = FieldValue.serverTimestamp();
  const patch = {
    deliveryPINVerified: true,
    deliveryPINVerifiedAt: now,
    deliveryPINVerifiedBy: uid,
    updatedAt: now,
  };
  await Promise.all([
    firestore.collection('deliveries').doc(jobId).set(patch, { merge: true }).catch(() => {}),
    firestore.collection('bookings').doc(jobId).set(patch, { merge: true }).catch(() => {}),
    firestore.collection('orders').doc(jobId).set(patch, { merge: true }).catch(() => {}),
    firestore.collection('deliveryTracking').doc(jobId).set({ ...patch, orderId: jobId }, { merge: true }).catch(() => {}),
  ]);

  console.log(`🔐 [verifyDeliveryPin] ${jobId} verified by rider ${uid}`);
  return { ok: true };
});

/**
 * Owner-only PIN fetch/create — replaces the old client-side generateVerificationCode
 * that wrote PINs into publicly readable order docs. Returns the pin to the
 * authenticated order owner (or admin); creates a secret if the order has none.
 */
exports.ensureDeliveryPin = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid;
  if (!uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required');
  }

  const jobId = String(data?.jobId || data?.orderId || '').trim();
  if (!jobId) {
    throw new functions.https.HttpsError('invalid-argument', 'jobId is required');
  }

  const firestore = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  // Load the order doc (orders first — every order type lands there).
  let jobData = null;
  for (const colName of ['orders', 'bookings', 'deliveries']) {
    const snap = await firestore.collection(colName).doc(jobId).get();
    if (snap.exists) { jobData = { ...snap.data(), _col: colName }; break; }
  }
  if (!jobData) {
    throw new functions.https.HttpsError('not-found', 'Order not found');
  }

  const ownerId = jobData.userId || jobData.customerId || jobData.customer?.uid || null;
  const callerSnap = await firestore.collection('users').doc(uid).get();
  const isAdmin = callerSnap.exists && ['admin', 'superadmin', 'support'].includes(String(callerSnap.data()?.role || '').toLowerCase());
  if (ownerId !== uid && !isAdmin) {
    throw new functions.https.HttpsError('permission-denied', 'Only the order owner can view the delivery PIN');
  }

  // Existing secret?
  const secretRef = firestore.collection('deliverySecrets').doc(jobId);
  const secretSnap = await secretRef.get();
  if (secretSnap.exists && secretSnap.data()?.pin) {
    return { ok: true, pin: String(secretSnap.data().pin) };
  }

  // Migrate a legacy public pin into the secrets store.
  let pin = jobData.deliveryPin || jobData.deliveryPIN || jobData.customerPIN || jobData.otp || null;
  if (!pin) {
    for (const colName of ['bookings', 'orders', 'deliveries']) {
      const snap = await firestore.collection(colName).doc(jobId).get();
      if (!snap.exists) continue;
      const d = snap.data() || {};
      pin = d.deliveryPin || d.deliveryPIN || d.customerPIN || d.otp || null;
      if (pin) break;
    }
  }
  if (!pin) {
    pin = String(Math.floor(100000 + Math.random() * 900000));
  }

  const now = FieldValue.serverTimestamp();
  await secretRef.set({
    pin: String(pin),
    customerId: ownerId || uid,
    orderId: jobId,
    createdAt: now,
  }, { merge: true });

  // Flag the public docs that a PIN is required (rider app shows the PIN step).
  const flag = { requiresDeliveryPin: true, updatedAt: now };
  await Promise.all([
    firestore.collection('orders').doc(jobId).set(flag, { merge: true }).catch(() => {}),
    firestore.collection('bookings').doc(jobId).set(flag, { merge: true }).catch(() => {}),
    firestore.collection('deliveries').doc(jobId).set(flag, { merge: true }).catch(() => {}),
  ]);

  return { ok: true, pin: String(pin) };
});
