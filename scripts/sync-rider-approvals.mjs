/**
 * One-time / maintenance: sync rider approval flags across riders + users collections.
 * Run: node scripts/sync-rider-approvals.mjs
 * Optional: node scripts/sync-rider-approvals.mjs <riderUid>
 */
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'go7-delivery' });
}

const db = admin.firestore();

const APPROVAL_PATCH = {
  status: 'active',
  approved: true,
  verificationStatus: 'approved',
  applicationStatus: 'approved',
  reuploadEnabled: false,
};

function isApproved(data = {}) {
  return (
    data.approved === true ||
    data.riderApproved === true ||
    data.applicationStatus === 'approved' ||
    data.verificationStatus === 'approved'
  );
}

async function syncRider(uid) {
  const riderRef = db.collection('riders').doc(uid);
  const userRef = db.collection('users').doc(uid);
  const [riderSnap, userSnap] = await Promise.all([riderRef.get(), userRef.get()]);

  if (!riderSnap.exists && !userSnap.exists) {
    console.log('skip', uid, '(no rider or user doc)');
    return;
  }

  const rider = riderSnap.exists ? riderSnap.data() : {};
  const user = userSnap.exists ? userSnap.data() : {};
  const shouldBeApproved = isApproved(rider) || isApproved(user);

  if (!shouldBeApproved) {
    console.log('skip', uid, '(not approved in either doc)');
    return;
  }

  const batch = db.batch();
  batch.set(riderRef, { ...APPROVAL_PATCH, uid, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  batch.set(
    userRef,
    {
      role: 'rider',
      riderApproved: true,
      applicationStatus: 'approved',
      verificationStatus: 'approved',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
  console.log('synced', uid, rider.name || rider.fullName || user.name || user.displayName || '');
}

const targetUid = process.argv[2];

if (targetUid) {
  await syncRider(targetUid);
} else {
  const riders = await db.collection('riders').get();
  for (const docSnap of riders.docs) {
    await syncRider(docSnap.id);
  }
}

console.log('Done.');
