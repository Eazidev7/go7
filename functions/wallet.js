const functions = require('firebase-functions/v1');
const { defineString } = require('firebase-functions/params');
const admin = require('./adminInit');
const { FieldValue } = require('firebase-admin/firestore');
const axios = require('axios');
const crypto = require('crypto');

const db = admin.firestore();

// Paystack configuration
const PAYSTACK_SECRET_KEY = defineString('PAYSTACK_SECRET_KEY');
// Optional alternate; Paystack signs with the secret key — we try both.
const PAYSTACK_WEBHOOK_SECRET = defineString('PAYSTACK_WEBHOOK_SECRET', { default: '' });

function paystackSecrets() {
  return [PAYSTACK_SECRET_KEY.value(), PAYSTACK_WEBHOOK_SECRET.value()]
    .map((s) => String(s || '').trim())
    .filter(Boolean);
}

function verifyPaystackSignature(req) {
  const signature = req.headers['x-paystack-signature'];
  if (!signature) return false;
  const payload = JSON.stringify(req.body);
  return paystackSecrets().some((secret) => {
    const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return hash === signature;
  });
}

async function findUserIdForTopup({ metadata, customer, channel, authorization, dedicatedAccount }) {
  let customerId =
    metadata?.customerId ||
    metadata?.userId ||
    metadata?.uid ||
    metadata?.['User ID'] ||
    null;

  if (customerId && customerId !== 'guest' && customerId !== 'unknown') {
    return customerId;
  }
  customerId = null;

  const accountNumber =
    dedicatedAccount?.account_number ||
    metadata?.receiver_account_number ||
    authorization?.receiver_bank_account_number ||
    null;

  if (accountNumber) {
    const byAccount = await db
      .collection('users')
      .where('virtualAccount.account_number', '==', String(accountNumber))
      .limit(1)
      .get();
    if (!byAccount.empty) return byAccount.docs[0].id;
  }

  const customerCode = customer?.customer_code;
  if (customerCode) {
    const byCode = await db
      .collection('users')
      .where('paystackId', '==', customerCode)
      .limit(1)
      .get();
    if (!byCode.empty) return byCode.docs[0].id;
  }

  const email = customer?.email;
  if (email) {
    const byEmail = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!byEmail.empty) return byEmail.docs[0].id;
  }

  // dedicated_nuban without account on metadata — already tried above
  if (channel === 'dedicated_nuban' && !accountNumber) {
    console.warn('DVA charge.success missing receiver account number');
  }

  return null;
}

async function creditWalletFromPaystack({
  customerId,
  amountInNaira,
  reference,
  description,
  event,
  rawData,
  extraMeta = {},
}) {
  let credited = false;
  let newBalance = 0;

  await db.runTransaction(async (transaction) => {
    const walletRef = db.collection('wallets').doc(customerId);
    const userRef = db.collection('users').doc(customerId);
    const transactionRef = walletRef.collection('transactions').doc(String(reference));
    const webhookTxRef = db.collection('webhook_transactions').doc(String(reference));

    const [existingTransaction, existingWebhook, walletDoc, userDoc] = await Promise.all([
      transaction.get(transactionRef),
      transaction.get(webhookTxRef),
      transaction.get(walletRef),
      transaction.get(userRef),
    ]);

    if (existingTransaction.exists || existingWebhook.exists) {
      console.log(`Payment ${reference} already processed`);
      return;
    }

    const walletsBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    const legacyBalance = userDoc.exists ? Number(userDoc.data().walletBalance) || 0 : 0;
    const currentBalance = Math.max(walletsBalance, legacyBalance);
    newBalance = currentBalance + amountInNaira;

    transaction.set(
      walletRef,
      {
        balance: newBalance,
        lastTopupAmount: amountInNaira,
        lastTopupReference: reference,
        lastTopupAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      userRef,
      {
        walletBalance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(transactionRef, {
      type: 'credit',
      category: 'topup',
      status: 'completed',
      amount: amountInNaira,
      description,
      paymentReference: reference,
      previousBalance: currentBalance,
      newBalance,
      createdAt: FieldValue.serverTimestamp(),
      metadata: { source: 'paystack', event, ...extraMeta },
    });

    transaction.set(webhookTxRef, {
      reference,
      customerId,
      amount: amountInNaira,
      event,
      status: 'processed',
      processedAt: FieldValue.serverTimestamp(),
    });

    transaction.set(db.collection('webhookLogs').doc(), {
      event,
      reference,
      customerId,
      amount: amountInNaira,
      status: 'processed',
      timestamp: FieldValue.serverTimestamp(),
      webhookData: rawData || null,
    });

    credited = true;
  });

  return { credited, newBalance };
}

/**
 * Paystack webhook — wallet top-ups (card + DVA bank transfer).
 * URL: https://us-central1-go7-app-209e4.cloudfunctions.net/verifyPaymentAndCreditWallet
 */
exports.verifyPaymentAndCreditWallet = functions.https.onRequest(async (req, res) => {
  console.log('Paystack webhook hit', {
    method: req.method,
    event: req.body?.event,
    hasSignature: Boolean(req.headers['x-paystack-signature']),
  });

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    if (!verifyPaystackSignature(req)) {
      console.error('Invalid webhook signature (tried secret key + webhook secret)');
      await db.collection('webhookLogs').add({
        event: req.body?.event || 'unknown',
        status: 'invalid_signature',
        timestamp: FieldValue.serverTimestamp(),
      });
      return res.status(400).send('Invalid signature');
    }

    const { event, data } = req.body || {};

    // --- Card / bank charge.success ---
    if (event === 'charge.success') {
      const reference = data?.reference;
      if (!reference) {
        return res.status(400).send('Missing reference');
      }

      const verificationResponse = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}` } }
      );
      const verificationData = verificationResponse.data?.data;
      if (!verificationData || verificationData.status !== 'success') {
        console.error(`Payment verification failed for reference: ${reference}`);
        return res.status(400).send('Payment verification failed');
      }

      const paymentType = verificationData.metadata?.paymentType;
      if (paymentType === 'service_payment') {
        // Authoritative order-payment marker: verify the reference, check the
        // amount covers the order total, and mark the doc paid server-side.
        // Client-side writes are treated as hints only — this webhook is the
        // source of truth, so rules can freeze paymentStatus client-side.
        const orderId = verificationData.metadata?.orderId;
        const orderCollection = verificationData.metadata?.orderCollection || 'orders';
        const PAID_COLLECTIONS = new Set(['orders', 'gobuyOrders', 'gobuy_orders', 'bookings', 'deliveries', 'mealBundles']);
        if (!orderId || !PAID_COLLECTIONS.has(orderCollection)) {
          console.log(`Service payment without order target: ${reference}`);
          return res.status(200).send('Service payment ignored');
        }
        try {
          const orderRef = db.collection(orderCollection).doc(orderId);
          const orderSnap = await orderRef.get();
          if (!orderSnap.exists) {
            console.error(`[webhook] order not found: ${orderCollection}/${orderId}`);
            return res.status(400).send('Order not found');
          }
          const order = orderSnap.data();
          const paidKobo = Math.round(Number(verificationData.amount || 0));
          const totalKobo = Math.round(Number(order.totalKobo ?? order.grandTotalKobo ?? ((order.grandTotal ?? order.total ?? 0) * 100)) || 0);
          if (totalKobo > 0 && paidKobo < totalKobo) {
            console.error(`[webhook] UNDERPAID ${reference}: ${paidKobo} < ${totalKobo} on ${orderCollection}/${orderId}`);
            await db.collection('paymentAnomalies').add({
              reference, orderId, orderCollection, paidKobo, totalKobo,
              reason: 'underpaid', timestamp: FieldValue.serverTimestamp(),
            });
            return res.status(400).send('Underpaid — not marking order');
          }
          const update = {
            paymentStatus: 'paid',
            paymentReference: reference,
            paymentRef: reference,
            paidAmountKobo: paidKobo,
            paidAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            paymentVerifiedBy: 'paystackWebhookV2',
          };
          // mealBundles uses status:'pending_payment' → flip to 'paid' too.
          if (orderCollection === 'mealBundles' && order.status === 'pending_payment') update.status = 'paid';
          await orderRef.update(update);
          console.log(`[webhook] ${orderCollection}/${orderId} marked paid via ${reference} (₦${paidKobo / 100})`);
        } catch (e) {
          console.error(`[webhook] order mark failed for ${orderCollection}/${orderId}:`, e);
          return res.status(500).send('Order update failed');
        }
        return res.status(200).send('Order marked paid');
      }

      const customerId = await findUserIdForTopup({
        metadata: verificationData.metadata || {},
        customer: verificationData.customer || data?.customer,
        channel: verificationData.channel,
        authorization: verificationData.authorization,
        dedicatedAccount: null,
      });

      if (!customerId) {
        console.error(`Customer ID not found for reference: ${reference}`);
        await db.collection('failed_transactions').doc(String(reference)).set({
          reference,
          amount: (verificationData.amount || 0) / 100,
          email: verificationData.customer?.email || null,
          reason: 'User not found',
          event,
          timestamp: FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.status(400).send('Customer ID missing');
      }

      const amountInNaira = Number(verificationData.amount) / 100;
      const result = await creditWalletFromPaystack({
        customerId,
        amountInNaira,
        reference,
        description: 'Wallet top-up via Paystack',
        event,
        rawData: data,
        extraMeta: {
          channel: verificationData.channel || null,
          paystackStatus: verificationData.status,
        },
      });

      console.log(`charge.success credited=${result.credited} ₦${amountInNaira} → ${customerId}`);
      return res.status(200).send('Payment processed successfully');
    }

    // --- Dedicated Virtual Account bank transfer ---
    if (event === 'dedicatedaccount.received_credit') {
      const amountInNaira = Number(data?.amount || 0) / 100;
      const reference =
        data?.session_id ||
        data?.reference ||
        data?.id ||
        `DVA-${Date.now()}`;
      const dedicatedAccount = data?.dedicated_account || {};

      const customerId = await findUserIdForTopup({
        metadata: data?.metadata || {},
        customer: data?.customer,
        channel: 'dedicated_nuban',
        authorization: null,
        dedicatedAccount,
      });

      if (!customerId) {
        console.error('DVA credit: user not found', {
          customerCode: data?.customer?.customer_code,
          account: dedicatedAccount?.account_number,
        });
        await db.collection('failed_transactions').doc(String(reference)).set({
          reference,
          amount: amountInNaira,
          reason: 'DVA user not found',
          event,
          customerCode: data?.customer?.customer_code || null,
          accountNumber: dedicatedAccount?.account_number || null,
          timestamp: FieldValue.serverTimestamp(),
        }, { merge: true });
        return res.status(404).send('User not found');
      }

      if (!(amountInNaira > 0)) {
        return res.status(400).send('Invalid amount');
      }

      const result = await creditWalletFromPaystack({
        customerId,
        amountInNaira,
        reference: String(reference),
        description: `Bank transfer to ${dedicatedAccount.account_number || 'virtual account'}`,
        event,
        rawData: data,
        extraMeta: {
          method: 'dva_transfer',
          accountNumber: dedicatedAccount.account_number || null,
        },
      });

      console.log(`DVA credited=${result.credited} ₦${amountInNaira} → ${customerId}`);
      return res.status(200).send('DVA credit processed');
    }

    console.log(`Ignoring event: ${event}`);
    return res.status(200).send('Event ignored');
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    await db.collection('webhookLogs').add({
      event: req.body?.event || 'unknown',
      status: 'error',
      error: error.message,
      timestamp: FieldValue.serverTimestamp(),
      rawBody: req.body || null,
    }).catch(() => {});
    return res.status(500).send('Internal server error');
  }
});

/**
 * Debit Customer Wallet for Delivery Payment
 * Callable Cloud Function
 */
exports.debitWalletForDelivery = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { customerId, deliveryId, description } = data;
    const fee = Math.round(Number(data.fee));

    // Verify that the authenticated user is the customer
    if (context.auth.uid !== customerId) {
      throw new functions.https.HttpsError('permission-denied', 'User can only debit their own wallet');
    }

    // Validate input
    if (!customerId || !deliveryId || !Number.isFinite(fee) || fee <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid input parameters');
    }

    let result = null;

    // Use Firestore transaction for atomic operation
    await db.runTransaction(async (transaction) => {
      const walletRef = db.collection('wallets').doc(customerId);
      const userRef = db.collection('users').doc(customerId);
      // Deterministic id — safe inside a transaction (collection queries are not)
      const paymentRef = walletRef.collection('transactions').doc(`delivery_${String(deliveryId)}`);

      const paymentDoc = await transaction.get(paymentRef);
      if (paymentDoc.exists) {
        throw new functions.https.HttpsError('already-exists', 'Delivery has already been paid for');
      }

      const walletDoc = await transaction.get(walletRef);
      const userDoc = await transaction.get(userRef);

      const walletsBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
      const legacyBalance = userDoc.exists ? Number(userDoc.data().walletBalance) || 0 : 0;
      // Spendable = max of canonical + legacy (UI uses the same Math.max)
      let currentBalance = Math.max(walletsBalance, legacyBalance);

      if (!walletDoc.exists) {
        transaction.set(walletRef, {
          balance: currentBalance,
          virtualAccount: userDoc.exists ? userDoc.data()?.virtualAccount || null : null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else if (currentBalance !== walletsBalance) {
        // Promote legacy funds into wallets/{uid} before debit
        transaction.update(walletRef, {
          balance: currentBalance,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      if (currentBalance < fee) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Insufficient wallet balance. Available: ₦${currentBalance.toLocaleString('en-NG')}, Required: ₦${fee.toLocaleString('en-NG')}`
        );
      }

      const newBalance = currentBalance - fee;

      transaction.set(
        walletRef,
        {
          balance: newBalance,
          lastUpdated: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Keep users.walletBalance mirrored so Profile/Checkout Math.max stays correct
      transaction.set(
        userRef,
        {
          walletBalance: newBalance,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      transaction.set(paymentRef, {
        type: 'debit',
        amount: fee,
        description: description || `Payment for delivery ${deliveryId}`,
        deliveryId: deliveryId,
        previousBalance: currentBalance,
        newBalance: newBalance,
        createdAt: FieldValue.serverTimestamp(),
        metadata: {
          source: 'delivery_payment',
          authUserId: context.auth.uid,
          walletsBalance,
          legacyBalance,
        },
      });

      result = {
        success: true,
        previousBalance: currentBalance,
        newBalance,
        amountCharged: fee,
        transactionId: paymentRef.id,
      };
    });

    return result;
  } catch (error) {
    console.error('Error debiting wallet:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to process payment');
  }
});

/**
 * Refund a wallet debit when booking/order creation fails after payment.
 * Only the authenticated owner can refund their own delivery_* debit once.
 */
exports.refundWalletForFailedPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const customerId = data?.customerId;
  const deliveryId = data?.deliveryId;
  const reason = String(data?.reason || 'Booking failed after wallet payment').slice(0, 200);

  if (!customerId || !deliveryId) {
    throw new functions.https.HttpsError('invalid-argument', 'customerId and deliveryId are required');
  }
  if (context.auth.uid !== customerId) {
    throw new functions.https.HttpsError('permission-denied', 'User can only refund their own wallet');
  }

  const walletRef = db.collection('wallets').doc(customerId);
  const userRef = db.collection('users').doc(customerId);
  const paymentRef = walletRef.collection('transactions').doc(`delivery_${String(deliveryId)}`);
  const refundRef = walletRef.collection('transactions').doc(`refund_delivery_${String(deliveryId)}`);

  let result = null;

  await db.runTransaction(async (transaction) => {
    const [paymentDoc, refundDoc, walletDoc, userDoc] = await Promise.all([
      transaction.get(paymentRef),
      transaction.get(refundRef),
      transaction.get(walletRef),
      transaction.get(userRef),
    ]);

    if (refundDoc.exists) {
      result = { success: true, alreadyRefunded: true, newBalance: refundDoc.data()?.newBalance || 0 };
      return;
    }

    if (!paymentDoc.exists || paymentDoc.data()?.type !== 'debit') {
      throw new functions.https.HttpsError(
        'not-found',
        'No wallet payment found to refund for this booking'
      );
    }

    const amount = Math.round(Number(paymentDoc.data().amount) || 0);
    if (!(amount > 0)) {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid payment amount');
    }

    const walletsBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    const legacyBalance = userDoc.exists ? Number(userDoc.data().walletBalance) || 0 : 0;
    const currentBalance = Math.max(walletsBalance, legacyBalance);
    const newBalance = currentBalance + amount;

    transaction.set(
      walletRef,
      {
        balance: newBalance,
        lastUpdated: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(
      userRef,
      {
        walletBalance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    transaction.set(refundRef, {
      type: 'credit',
      category: 'refund',
      amount,
      description: `Refund: ${reason}`,
      deliveryId: String(deliveryId),
      previousBalance: currentBalance,
      newBalance,
      createdAt: FieldValue.serverTimestamp(),
      metadata: {
        source: 'failed_booking_refund',
        originalPaymentId: paymentRef.id,
        authUserId: context.auth.uid,
      },
    });

    result = { success: true, alreadyRefunded: false, amount, newBalance };
  });

  console.log('Wallet refund for failed payment:', { customerId, deliveryId, ...result });
  return result;
});

/**
 * Admin Manual Wallet Adjustment
 * Callable Cloud Function (Admin Only)
 */
exports.adminWalletAdjustment = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication and admin role
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    // Check if user is admin
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { customerId, amount, type, reason, adminNote } = data;

    // Validate input
    if (!customerId || !amount || !type || !reason) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
    }

    if (type !== 'credit' && type !== 'debit') {
      throw new functions.https.HttpsError('invalid-argument', 'Type must be credit or debit');
    }

    if (amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Amount must be positive');
    }

    let result = null;

    // Use Firestore transaction for atomic operation
    await db.runTransaction(async (transaction) => {
      // Get current wallet balance
      const walletRef = db.collection('wallets').doc(customerId);
      const walletDoc = await transaction.get(walletRef);

      let currentBalance = 0;
      if (walletDoc.exists) {
        currentBalance = walletDoc.data().balance || 0;
      }

      // Calculate new balance
      let newBalance;
      if (type === 'credit') {
        newBalance = currentBalance + amount;
      } else {
        // For debit, check if balance is sufficient
        if (currentBalance < amount) {
          throw new functions.https.HttpsError('failed-precondition', 'Insufficient wallet balance for debit');
        }
        newBalance = currentBalance - amount;
      }

      // Update wallet balance
      transaction.set(walletRef, {
        balance: newBalance,
        lastUpdated: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Keep the legacy users.walletBalance mirror in sync (see note in
      // debitWalletForDelivery above about why this matters).
      const adjUserRef = db.collection('users').doc(customerId);
      transaction.set(adjUserRef, {
        walletBalance: newBalance,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      // Create transaction record
      const transactionRef = db
        .collection('wallets')
        .doc(customerId)
        .collection('transactions')
        .doc();

      transaction.set(transactionRef, {
        type: type,
        amount: amount,
        description: `Admin ${type}: ${reason}`,
        previousBalance: currentBalance,
        newBalance: newBalance,
        createdAt: FieldValue.serverTimestamp(),
        metadata: {
          source: 'admin_adjustment',
          adminUserId: context.auth.uid,
          adminNote: adminNote || '',
          reason: reason,
        },
      });

      // Log admin action for audit trail
      const adminActionRef = db.collection('adminActions').doc();
      transaction.set(adminActionRef, {
        action: 'wallet_adjustment',
        adminUserId: context.auth.uid,
        targetCustomerId: customerId,
        details: {
          type: type,
          amount: amount,
          reason: reason,
          adminNote: adminNote || '',
          previousBalance: currentBalance,
          newBalance: newBalance,
        },
        timestamp: FieldValue.serverTimestamp(),
      });

      result = {
        success: true,
        newBalance: newBalance,
        transactionId: transactionRef.id,
        message: `Wallet ${type} successful`,
      };
    });

    console.log(`Admin ${context.auth.uid} performed ${type} of ${amount} NGN for customer ${customerId}`);
    return result;

  } catch (error) {
    console.error('Error in admin wallet adjustment:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Internal server error');
  }
});

/**
 * Get Customer Wallet Information
 * Callable Cloud Function
 */
exports.getWalletInfo = functions.https.onCall(async (data, context) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { customerId } = data;

    // Verify that the authenticated user is the customer or an admin
    const authUserDoc = await db.collection('users').doc(context.auth.uid).get();
    const isAdmin = authUserDoc.exists && authUserDoc.data().role === 'admin';

    if (context.auth.uid !== customerId && !isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied');
    }

    // Get wallet balance
    const walletRef = db.collection('wallets').doc(customerId);
    const userRef = db.collection('users').doc(customerId);
    const walletDoc = await walletRef.get();
    const userDoc = await userRef.get();

    const walletsBalance = walletDoc.exists ? walletDoc.data().balance || 0 : 0;
    const legacyBalance = userDoc.exists ? userDoc.data().walletBalance || 0 : 0;
    const balance = Math.max(walletsBalance, legacyBalance);
    const lastUpdated = walletDoc.exists ? walletDoc.data().lastUpdated : null;

    // Get recent transactions
    const transactionsQuery = await db
      .collection('wallets')
      .doc(customerId)
      .collection('transactions')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const transactions = transactionsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
    }));

    return {
      balance: balance,
      lastUpdated: lastUpdated?.toDate(),
      transactions: transactions,
    };

  } catch (error) {
    console.error('Error getting wallet info:', error);
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError('internal', 'Internal server error');
  }
});
/**
 * Safety net: ANY wallet-paid order/booking that flips to 'cancelled' gets its
 * wallet refunded automatically — covers admin cancels, rider cancels and any
 * client path that skips refundWalletForFailedPayment. Idempotent: the
 * refund_delivery_<id> transaction doc is the dedupe key.
 */
async function refundWalletPaidCancellation(colName, docId, after) {
  const customerId = after.userId || after.customerId || after.uid;
  if (!customerId) return null;
  const method = String(after.paymentMethod || '').toLowerCase();
  if (method !== 'wallet') return null;
  const alreadyPaid = String(after.paymentStatus || '').toLowerCase();
  if (!['paid', 'success', 'successful'].includes(alreadyPaid)) return null;
  if (after.walletRefunded) return null;

  const walletRef = db.collection('wallets').doc(customerId);
  const userRef = db.collection('users').doc(customerId);
  const paymentRef = walletRef.collection('transactions').doc(`delivery_${String(docId)}`);
  const refundRef = walletRef.collection('transactions').doc(`refund_delivery_${String(docId)}`);

  const result = await db.runTransaction(async (tx) => {
    const [refundDoc, paymentDoc, walletDoc, userDoc] = await Promise.all([
      tx.get(refundRef),
      tx.get(paymentRef),
      tx.get(walletRef),
      tx.get(userRef),
    ]);
    if (refundDoc.exists) return { alreadyRefunded: true };
    const paidAmount = Number(after.grandTotal || after.total || after.totalAmount) || 0;
    const amount = paymentDoc.exists && Number(paymentDoc.data().amount) > 0
      ? Number(paymentDoc.data().amount)
      : paidAmount;
    if (!(amount > 0)) return { skipped: 'no-amount' };

    const currentBalance = Math.max(
      walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0,
      userDoc.exists ? Number(userDoc.data().walletBalance) || 0 : 0
    );
    const newBalance = currentBalance + amount;
    tx.set(walletRef, { balance: newBalance, lastUpdated: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(userRef, { walletBalance: newBalance, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    tx.set(refundRef, {
      type: 'credit',
      category: 'refund',
      amount,
      description: `Refund: cancelled order ${docId}`,
      deliveryId: String(docId),
      previousBalance: currentBalance,
      newBalance,
      createdAt: FieldValue.serverTimestamp(),
      metadata: { source: 'auto_cancel_refund', collection: colName },
    });
    return { refunded: amount, newBalance };
  });

  if (result && result.refunded) {
    console.log(`[autoRefund] ${colName}/${docId} → +₦${result.refunded} to ${customerId}`);
    try {
      await db.doc(`${colName}/${docId}`).update({ walletRefunded: true, refundedAt: FieldValue.serverTimestamp() });
    } catch (e) {
      console.warn('[autoRefund] flag write failed:', e.message);
    }
  }
  return result;
}

exports.onWalletPaidCancel = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const cancelledNow = before.status !== 'cancelled' && after.status === 'cancelled';
    if (!cancelledNow) return null;
    try {
      return await refundWalletPaidCancellation('orders', context.params.orderId, after);
    } catch (e) {
      console.error('[autoRefund] orders failed:', e.message);
      return null;
    }
  });

exports.onWalletPaidBookingCancel = functions.firestore
  .document('bookings/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const cancelledNow = before.status !== 'cancelled' && after.status === 'cancelled';
    if (!cancelledNow) return null;
    try {
      return await refundWalletPaidCancellation('bookings', context.params.orderId, after);
    } catch (e) {
      console.error('[autoRefund] bookings failed:', e.message);
      return null;
    }
  });
