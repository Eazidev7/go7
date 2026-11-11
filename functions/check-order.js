const admin = require('./adminInit');
const db = admin.firestore();

async function checkOrder(id) {
  console.log(`\n========== ${id} ==========`);
  for (const col of ['bookings', 'orders', 'deliveryTracking', 'deliveries']) {
    const snap = await db.collection(col).doc(id).get();
    if (!snap.exists) {
      console.log(`${col}: NOT FOUND`);
      continue;
    }
    const d = snap.data();
    console.log(`\n${col}:`);
    console.log('  status:', d.status, '| orderStatus:', d.orderStatus, '| dispatch:', d.dispatchStatus);
    console.log('  riderId:', d.riderId);
    console.log('  pickup:', JSON.stringify(d.pickup || d.pickupCoords || null));
    console.log('  dropoff:', JSON.stringify(d.dropoff || d.dropoffCoords || null));
    console.log('  pickupAddress:', d.pickupAddress);
    console.log('  dropoffAddress:', d.dropoffAddress);
    console.log('  riderLocation:', JSON.stringify(d.riderLocation || d.currentLocation || null));
    console.log('  distance:', d.distance);
    console.log('  fare:', d.fare || d.deliveryFee);
  }

  const riderId = 'kf3Jcsou9fNQlyJHdNd9NA6oyef1';
  const rider = await db.collection('riders').doc(riderId).get();
  if (rider.exists) {
    const r = rider.data();
    console.log('\nrider profile:');
    console.log('  currentJobId:', r.currentJobId);
    console.log('  status:', r.status);
    console.log('  currentLocation:', JSON.stringify(r.currentLocation || { lat: r.lat, lng: r.lng }));
  }

  const rl = await db.collection('riderLocations').doc(riderId).get();
  if (rl.exists) {
    console.log('\nriderLocations:', JSON.stringify(rl.data()));
  } else {
    console.log('\nriderLocations: NOT FOUND');
  }
}

checkOrder('Go7-YG45QW1').catch(console.error);
