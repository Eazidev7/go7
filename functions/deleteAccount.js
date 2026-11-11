/**
 * Customer account deletion (Play Store / GDPR).
 * Soft-deletes profile PII, disables Auth user, removes push tokens.
 * Order/payment history is retained anonymized for compliance.
 */
const functions = require('firebase-functions/v1');
const admin = require('./adminInit');

const db = admin.firestore();

async function scrubUserDoc(uid) {
  const userRef = db.collection('users').doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) return;

  await userRef.set(
    {
      name: 'Deleted User',
      displayName: 'Deleted User',
      email: null,
      phone: null,
      phoneNumber: null,
      photoURL: null,
      fcmToken: null,
      fcmTokens: admin.firestore.FieldValue.delete(),
      virtualAccount: null,
      paystackId: null,
      savedAddresses: [],
      activeAddress: null,
      location: null,
      address: null,
      locationName: null,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      accountStatus: 'deleted',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

exports.deleteMyAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required to delete your account');
  }

  const uid = context.auth.uid;
  const confirm = String(data?.confirm || '').trim().toUpperCase();
  if (confirm !== 'DELETE') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Type DELETE to confirm account deletion'
    );
  }

  try {
    await scrubUserDoc(uid);

    const walletRef = db.collection('wallets').doc(uid);
    const walletSnap = await walletRef.get();
    if (walletSnap.exists) {
      await walletRef.set(
        {
          balance: 0,
          accountStatus: 'deleted',
          deletedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await db.collection('accountDeletions').doc(uid).set({
      uid,
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'deleteMyAccount',
    });

    try {
      await admin.auth().deleteUser(uid);
    } catch (err) {
      // If delete fails (e.g. already gone), disable instead
      console.warn('auth.deleteUser failed, disabling:', err.message);
      await admin.auth().updateUser(uid, { disabled: true });
    }

    return { success: true, message: 'Your account has been deleted' };
  } catch (err) {
    console.error('deleteMyAccount failed:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err.message || 'Could not delete account');
  }
});
