/**
 * Credit a customer wallet (admin / project owner).
 * Usage: node scripts/fund-user-wallet.mjs [userId] [amountNaira]
 */
import admin from 'firebase-admin';

const userId = process.argv[2] || 'aXOuD9NzauRS5bf9Ue5YoJSSGsE2';
const amount = Number(process.argv[3] || 10000);

if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Amount must be a positive number (Naira)');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'go7-delivery' });
}

const db = admin.firestore();

async function fundWallet() {
  const walletRef = db.collection('wallets').doc(userId);
  const userRef = db.collection('users').doc(userId);

  let newBalance = amount;

  await db.runTransaction(async (tx) => {
    const [walletSnap, userSnap] = await Promise.all([tx.get(walletRef), tx.get(userRef)]);

    const currentWallet = walletSnap.exists ? Number(walletSnap.data()?.balance || 0) : 0;
    const legacyBalance = userSnap.exists ? Number(userSnap.data()?.walletBalance || 0) : 0;
    const currentBalance = Math.max(currentWallet, legacyBalance);
    newBalance = currentBalance + amount;

    tx.set(
      walletRef,
      {
        balance: newBalance,
        currency: 'NGN',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        fundedBy: 'admin_script',
      },
      { merge: true }
    );

    tx.set(
      userRef,
      {
        walletBalance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const txRef = walletRef.collection('transactions').doc();
    tx.set(txRef, {
      type: 'credit',
      amount,
      description: 'Admin wallet top-up for delivery testing',
      previousBalance: currentBalance,
      newBalance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { source: 'admin_script', reason: 'delivery_test_funding' },
    });
  });

  console.log(`Funded wallet for ${userId}`);
  console.log(`Credited: NGN ${amount.toLocaleString()}`);
  console.log(`New balance: NGN ${newBalance.toLocaleString()}`);
}

fundWallet().catch((err) => {
  console.error('Failed to fund wallet:', err.message || err);
  process.exit(1);
});
