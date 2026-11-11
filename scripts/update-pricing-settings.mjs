/**
 * One-time script to update Firestore pricingSettings/current.
 * Run: npx tsx scripts/update-pricing-settings.mjs
 * Requires: GOOGLE_APPLICATION_CREDENTIALS env var or default Firebase auth.
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (serviceAccountPath) {
  initializeApp({
    credential: cert(serviceAccountPath),
  });
} else {
  initializeApp();
}

const db = getFirestore();

async function main() {
  const docRef = db.doc('pricingSettings/current');

  await docRef.set(
    {
      defaultRiderDeliveryShare: 0.5,
      go7BikeRiderDeliveryShare: 0.5,
      updatedAt: new Date(),
      updatedBy: 'admin-script',
      updatedReason: 'Rider payout changed to 50% / platform 50%',
    },
    { merge: true }
  );

  console.log('✅ pricingSettings/current updated: rider share = 0.5 (50%)');
}

main().catch((err) => {
  console.error('❌ Failed to update pricing settings:', err);
  process.exit(1);
});
