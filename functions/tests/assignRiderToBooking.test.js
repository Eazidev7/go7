/**
 * Regression test — assignment write-set consistency.
 *
 * Bug fixed: admin/manual assignment paths used to write ONLY
 * {status:'assigned', riderId, assignedAt} on orders/bookings, leaving
 * deliveries, deliveryTracking and rider_locations missing/stale. Customer
 * live tracking then broke (missing docs) and the rider app job list
 * (deliveries/{id}) never saw the job.
 *
 * This test asserts assignRiderToBooking writes ALL six surfaces in one call.
 * Run: node --test tests/assignRiderToBooking.test.js  (from functions/)
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { assignRiderToBooking } = require('../bookDeliveryOrder');

/** Minimal Firestore mock — captures every batch.set target+payload. */
function makeDb() {
  const writes = []; // { coll, id, data, opts }
  const ref = (coll, id) => ({ __coll: coll, __id: id });
  const db = {
    writes,
    collection(name) {
      return { doc: (id) => ref(name, id) };
    },
    batch() {
      const ops = [];
      return {
        set(refArg, data, opts) { ops.push({ ref: refArg, data, opts }); },
        async commit() { for (const op of ops) writes.push({ coll: op.ref.__coll, id: op.ref.__id, data: op.data, opts: op.opts }); },
      };
    },
  };
  return db;
}

const rider = {
  id: 'R1',
  name: 'Test Rider',
  phone: '08000000000',
  vehicleType: 'MOTORCYCLE',
  vehicleOwnership: 'RIDER_OWNED',
  latitude: 7.15,
  longitude: 3.35,
  distance: 2.4,
};

test('assignRiderToBooking writes bookings + orders + deliveries + rider + tracking docs', async () => {
  const db = makeDb();
  const res = await assignRiderToBooking('B1', rider, { db });
  assert.equal(res.assigned, true);

  const find = (coll, id) => db.writes.find(w => w.coll === coll && w.id === id);

  const booking = find('bookings', 'B1');
  const order = find('orders', 'B1');
  const delivery = find('deliveries', 'B1');
  const riderDoc = find('riders', 'R1');
  const tracking = find('deliveryTracking', 'B1');
  const riderLoc = find('rider_locations', 'B1');

  for (const [name, w] of Object.entries({ booking, order, delivery, riderDoc, tracking, riderLoc })) {
    assert.ok(w, `missing write to ${name}`);
  }

  assert.equal(booking.data.status, 'assigned');
  assert.equal(booking.data.dispatchStatus, 'assigned');
  assert.equal(booking.data.riderId, 'R1');
  assert.equal(order.data.status, 'assigned');
  assert.equal(order.data.riderId, 'R1');

  // The rider app's job list reads deliveries/{bookingId} — must carry riderId.
  assert.equal(delivery.data.status, 'assigned');
  assert.equal(delivery.data.riderId, 'R1');

  // Rider marked busy on the job.
  assert.equal(riderDoc.data.status, 'busy');
  assert.equal(riderDoc.data.currentOrder, 'B1');

  // Tracking seeds — customer page + rider GPS mirror both subscribe here.
  assert.equal(tracking.data.riderId, 'R1');
  assert.deepEqual(tracking.data.currentLocation, { lat: 7.15, lng: 3.35 });
  assert.equal(riderLoc.data.riderId, 'R1');
  assert.equal(riderLoc.data.status, 'assigned');
  assert.equal(typeof riderLoc.data.timestamp, 'number');
});

test('assignRiderToBooking releases the previous rider when reassigning', async () => {
  const db = makeDb();
  await assignRiderToBooking('B2', rider, { db, releasePreviousRiderId: 'OLD1' });

  const released = db.writes.find(w => w.coll === 'riders' && w.id === 'OLD1');
  assert.ok(released, 'previous rider doc not released');
  assert.equal(released.data.status, 'available');
  assert.equal(released.data.available, true);
});

test('assignRiderToBooking still writes tracking when economics recompute skipped', async () => {
  // No orderPayload → no pricing recompute; docs must still all land.
  const db = makeDb();
  await assignRiderToBooking('B3', rider, { db, orderPayload: null });
  assert.ok(db.writes.find(w => w.coll === 'deliveryTracking' && w.id === 'B3'));
  assert.ok(db.writes.find(w => w.coll === 'rider_locations' && w.id === 'B3'));
});
