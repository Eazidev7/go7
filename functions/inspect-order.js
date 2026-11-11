const admin = require('./adminInit');
const db = admin.firestore();

async function inspect(id) {
  for (const col of ['bookings', 'orders', 'deliveryTracking']) {
    const snap = await db.collection(col).doc(id).get();
    if (!snap.exists) {
      console.log(`${col}/${id}: NOT FOUND`);
      continue;
    }
    const d = snap.data();
    console.log(`\n=== ${col}/${id} ===`);
    console.log(JSON.stringify({
      status: d.status,
      orderStatus: d.orderStatus,
      dispatchStatus: d.dispatchStatus,
      riderId: d.riderId,
      pickup: d.pickup,
      dropoff: d.dropoff,
      pickupCoords: d.pickupCoords,
      dropoffCoords: d.dropoffCoords,
      pickupAddress: d.pickupAddress,
      dropoffAddress: d.dropoffAddress,
      riderLocation: d.riderLocation,
      currentLocation: d.currentLocation,
    }, null, 2));
  }
}

inspect('Go7-YG45QW1').then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
