/**
 * Clear all open rider jobs for a clean test slate.
 * Usage: node clear-rider-jobs.js [--dry-run]
 */
const admin = require('./adminInit');

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const TERMINAL = new Set([
  'delivered', 'cancelled', 'completed', 'failed', 'rejected', 'rated', 'expired',
]);

const JOB_COLLECTIONS = ['bookings', 'orders', 'deliveries'];

function rawStatus(data) {
  return String(data?.status || data?.orderStatus || data?.dispatchStatus || '').toLowerCase();
}

function isOpenJob(data) {
  const status = rawStatus(data);
  return status && !TERMINAL.has(status);
}

async function cancelOpenJobs(dryRun) {
  const now = FieldValue.serverTimestamp();
  const cancelPatch = {
    status: 'cancelled',
    orderStatus: 'cancelled',
    dispatchStatus: 'cancelled',
    cancelledAt: now,
    cancelledBy: 'admin-test-cleanup',
    cancelReason: 'Cleared for rider app testing',
    riderId: null,
    rider: null,
    updatedAt: now,
  };

  let cancelled = 0;

  for (const colName of JOB_COLLECTIONS) {
    const snap = await db.collection(colName).get();
    console.log(`\n${colName}: ${snap.size} total docs`);

    let batch = db.batch();
    let batchCount = 0;

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      if (!isOpenJob(data)) continue;

      console.log(`  cancel ${colName}/${docSnap.id} (${rawStatus(data)})`);
      if (!dryRun) {
        batch.update(docSnap.ref, cancelPatch);
        batchCount += 1;
        cancelled += 1;
        if (batchCount >= 400) {
          await batch.commit();
          batch = db.batch();
          batchCount = 0;
        }
      } else {
        cancelled += 1;
      }
    }

    if (!dryRun && batchCount > 0) await batch.commit();
  }

  return cancelled;
}

async function resetRiders(dryRun) {
  const snap = await db.collection('riders').get();
  let reset = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const needsReset =
      data.currentJobId ||
      data.currentOrder ||
      data.status === 'delivering' ||
      data.isAvailable === false;

    if (!needsReset) continue;

    console.log(`  reset rider ${docSnap.id} (${data.name || data.phone || 'unknown'})`);
    if (!dryRun) {
      batch.update(docSnap.ref, {
        currentJobId: null,
        currentOrder: null,
        status: data.verificationStatus === 'approved' ? 'active' : data.status || 'inactive',
        isAvailable: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      batchCount += 1;
      reset += 1;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } else {
      reset += 1;
    }
  }

  if (!dryRun && batchCount > 0) await batch.commit();
  return reset;
}

async function clearDeliveryTracking(dryRun) {
  const snap = await db.collection('deliveryTracking').get();
  let cleared = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const status = rawStatus(data);
    if (status && TERMINAL.has(status)) continue;

    console.log(`  clear tracking ${docSnap.id}`);
    if (!dryRun) {
      batch.set(
        docSnap.ref,
        {
          status: 'cancelled',
          orderStatus: 'cancelled',
          dispatchStatus: 'cancelled',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      batchCount += 1;
      cleared += 1;
      if (batchCount >= 400) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    } else {
      cleared += 1;
    }
  }

  if (!dryRun && batchCount > 0) await batch.commit();
  return cleared;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(dryRun ? 'DRY RUN' : 'LIVE — clearing open rider jobs');

  const cancelled = await cancelOpenJobs(dryRun);
  console.log(`\nOpen jobs ${dryRun ? 'would be ' : ''}cancelled: ${cancelled}`);

  console.log('\nResetting riders...');
  const ridersReset = await resetRiders(dryRun);
  console.log(`Riders ${dryRun ? 'would be ' : ''}reset: ${ridersReset}`);

  console.log('\nClearing deliveryTracking...');
  const tracking = await clearDeliveryTracking(dryRun);
  console.log(`Tracking ${dryRun ? 'would be ' : ''}updated: ${tracking}`);

  console.log('\nDone. Hard-refresh go7.ng/rider to start clean.');
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
