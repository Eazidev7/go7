/**
 * List recent bookings/orders and their status
 */
const admin = require('./adminInit');
const db = admin.firestore();

async function listCollection(colName, limit = 20) {
  const snap = await db.collection(colName).orderBy('updatedAt', 'desc').limit(limit).get().catch(async () => {
    return db.collection(colName).limit(limit).get();
  });

  console.log(`\n=== ${colName} (showing up to ${limit}) ===`);
  if (snap.empty) {
    console.log('  (empty)');
    return;
  }

  for (const doc of snap.docs) {
    const d = doc.data();
    const status = d.status || d.orderStatus || d.dispatchStatus || '?';
    const rider = d.riderId || d.rider?.name || '-';
    const reason = d.cancelReason || '';
    const updated = d.updatedAt?.toDate?.() || d.cancelledAt?.toDate?.() || d.createdAt || '';
    console.log(`  ${doc.id}`);
    console.log(`    status: ${status} | rider: ${rider}`);
    if (reason) console.log(`    cancelReason: ${reason}`);
    if (d.cancelledBy) console.log(`    cancelledBy: ${d.cancelledBy}`);
    if (updated) console.log(`    updated: ${updated}`);
  }
}

async function main() {
  const riderUid = 'kf3Jcsou9fNQlyJHdNd9NA6oyef1';
  console.log('Recent orders for GO7 project');
  console.log('Rider (Adekoya Tobi):', riderUid);

  await listCollection('bookings', 15);
  await listCollection('orders', 15);

  console.log('\n=== Cancelled by test cleanup ===');
  for (const col of ['bookings', 'orders', 'deliveries']) {
    const snap = await db.collection(col).where('cancelledBy', '==', 'admin-test-cleanup').get();
    for (const doc of snap.docs) {
      const d = doc.data();
      console.log(`  ${col}/${doc.id} — ${d.status} — ${d.cancelReason || ''}`);
    }
  }

  console.log('\n=== Rider active assignment ===');
  const rider = await db.collection('riders').doc(riderUid).get();
  if (rider.exists) {
    const r = rider.data();
    console.log(`  currentJobId: ${r.currentJobId || 'none'}`);
    console.log(`  status: ${r.status}`);
    console.log(`  isAvailable: ${r.isAvailable}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
