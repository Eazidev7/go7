/**
 * Reset an order back to enroute_pickup + seed tracking coords for navigation test
 * Usage: node fix-order-navigation.js Go7-YG45QW1
 */
const admin = require('./adminInit');
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const orderId = process.argv[2] || 'Go7-YG45QW1';

async function main() {
  const booking = await db.collection('bookings').doc(orderId).get();
  if (!booking.exists) {
    console.error('Booking not found:', orderId);
    process.exit(1);
  }
  const d = booking.data();
  const pickup = d.pickup || { lat: d.pickupCoords?.lat, lng: d.pickupCoords?.lng };
  const dropoff = d.dropoff || { lat: d.dropoffCoords?.lat, lng: d.dropoffCoords?.lng };
  const riderId = d.riderId;

  const patch = {
    status: 'enroute_pickup',
    orderStatus: 'enroute_pickup',
    dispatchStatus: 'enroute_pickup',
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const col of ['bookings', 'orders']) {
    await db.collection(col).doc(orderId).set(patch, { merge: true });
    console.log(`Updated ${col}/${orderId} → enroute_pickup`);
  }

  await db.collection('deliveryTracking').doc(orderId).set(
    {
      orderId,
      riderId: riderId || null,
      status: 'enroute_pickup',
      orderStatus: 'enroute_pickup',
      dispatchStatus: 'enroute_pickup',
      pickup,
      dropoff,
      pickupAddress: d.pickupAddress || pickup?.address,
      dropoffAddress: d.dropoffAddress || dropoff?.address,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log(`Seeded deliveryTracking/${orderId} with pickup/dropoff coords`);

  if (riderId) {
    await db.collection('riders').doc(riderId).set(
      {
        currentJobId: orderId,
        currentOrder: orderId,
        status: 'delivering',
        isAvailable: false,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`Rider ${riderId} linked to ${orderId}`);
  }

  console.log('\nDone. Rider app: tap "Active delivery" → should open navigation to pickup.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
