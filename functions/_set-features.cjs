// One-off: create appConfig/features — rollout flags. mealPlansEnabled stays
// false until testing + approval; flip to true in console when ready.
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

(async () => {
  await db.collection('appConfig').doc('features').set({
    mealPlansEnabled: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('appConfig/features written (mealPlansEnabled=false)');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
