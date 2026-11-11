const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

function sanitizeBooking(data, docId) {
  return {
    id: docId,
    bookingId: data.bookingId || data.jobId || data.id || docId,
    status: data.status || 'pending',
    paymentStatus: data.paymentStatus || null,
    paymentMethod: data.paymentMethod || null,
    fare: data.fare ?? data.finalFare ?? data.estimatedFare ?? null,
    pickup: data.pickup || null,
    dropoff: data.dropoff || null,
    sender: data.sender || null,
    recipient: data.recipient || null,
    packageDetails: data.packageDetails || null,
    deliveryMode: data.deliveryMode || null,
    riderId: data.riderId || data.assignedRider?.id || null,
    createdAt: data.createdAt || null,
    timestamp: data.timestamp || null,
  };
}

/**
 * Public booking lookup for customer tracking (no auth required).
 */
exports.lookupBookingForTracking = functions.https.onCall(async (data) => {
  const raw = String(data?.trackingId || '').trim();
  if (!raw) {
    throw new functions.https.HttpsError('invalid-argument', 'Tracking ID is required');
  }

  const candidates = [...new Set([raw, raw.toUpperCase(), raw.toLowerCase()])];

  for (const id of candidates) {
    const direct = await db.collection('bookings').doc(id).get();
    if (direct.exists) {
      return {
        found: true,
        docId: direct.id,
        booking: sanitizeBooking(direct.data(), direct.id),
      };
    }
  }

  for (const field of ['bookingId', 'jobId', 'id']) {
    for (const id of candidates) {
      const snap = await db.collection('bookings').where(field, '==', id).limit(1).get();
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        const canonicalId = data.bookingId || data.jobId || data.id || docSnap.id;

        // Mirror to bookings/{bookingCode} so direct tracking URLs work
        if (canonicalId && canonicalId !== docSnap.id) {
          await db.collection('bookings').doc(canonicalId).set(
            { ...data, bookingId: canonicalId, id: canonicalId, jobId: canonicalId },
            { merge: true }
          );
          await db.collection('orders').doc(canonicalId).set(
            { ...data, bookingId: canonicalId, id: canonicalId, jobId: canonicalId, status: data.status || 'pending' },
            { merge: true }
          );
        }

        return {
          found: true,
          docId: canonicalId || docSnap.id,
          booking: sanitizeBooking(data, docSnap.id),
        };
      }
    }
  }

  return { found: false, docId: null, booking: null };
});
