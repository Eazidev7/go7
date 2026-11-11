// One-off: Go7 delivery-bundle pricing tiers (per DAY, by meals/day).
// Admin-editable in Firestore: pricingSettings/bundleDelivery
const admin = require('firebase-admin');
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

(async () => {
  await db.collection('pricingSettings').doc('bundleDelivery').set({
    tiersKobo: { 1: 120000, 2: 200000, 3: 270000 }, // ₦1,200 / ₦2,000 / ₦2,700
    version: 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  console.log('pricingSettings/bundleDelivery written');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
