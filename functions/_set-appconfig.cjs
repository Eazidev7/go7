// One-off: create appConfig/mobile for the in-app version gate.
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

(async () => {
  await db.collection('appConfig').doc('mobile').set({
    minimumVersionCode: 11,      // hard-block anything older than v11
    latestVersionCode: 12,       // soft-prompt v11 users to update
    softUpdateEnabled: true,
    updateMessage: '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('appConfig/mobile written');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
