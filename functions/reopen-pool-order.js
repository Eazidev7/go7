/**
 * Re-open an expired pool order for rider accept testing.
 * Usage: node reopen-pool-order.js Go7-Z5GFHF3
 */
const admin = require('./adminInit');
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const orderId = process.argv[2] || 'Go7-Z5GFHF3';
const riderId = process.argv[3] || 'kf3Jcsou9fNQlyJHdNd9NA6oyef1';

async function main() {
  const booking = await db.collection('bookings').doc(orderId).get();
  if (!booking.exists) {
    console.error('Booking not found:', orderId);
    process.exit(1);
  }

  const d = booking.data();
  const pickup = d.pickup || { lat: d.pickupCoords?.lat, lng: d.pickupCoords?.lng };
  const dropoff = d.dropoff || { lat: d.dropoffCoords?.lat, lng: d.dropoffCoords?.lng };

  const poolPatch = {
    status: 'searching_rider',
    orderStatus: 'searching_rider',
    dispatchStatus: 'searching_rider',
    riderId: FieldValue.delete(),
    rider: FieldValue.delete(),
    updatedAt: FieldValue.serverTimestamp(),
    riderPoolExpiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 60 * 60 * 1000),
  };

  for (const col of ['bookings', 'orders']) {
    await db.collection(col).doc(orderId).set(poolPatch, { merge: true });
    console.log(`Reopened ${col}/${orderId} → searching_rider`);
  }

  await db.collection('deliveryTracking').doc(orderId).set(
    {
      orderId,
      status: 'searching_rider',
      orderStatus: 'searching_rider',
      dispatchStatus: 'searching_rider',
      pickup,
      dropoff,
      pickupAddress: d.pickupAddress || pickup?.address,
      dropoffAddress: d.dropoffAddress || dropoff?.address,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Seeded deliveryTracking/${orderId}`);

  await db.collection('riders').doc(riderId).set(
    {
      currentJobId: null,
      currentOrder: null,
      status: 'active',
      isAvailable: true,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Cleared rider ${riderId} active job — ready to accept ${orderId}`);
  console.log('\nRider: go online → open job → verify map route → Accept Job');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
