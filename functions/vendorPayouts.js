/**
 * Vendor payout processing — Paystack Transfer + wallet backfill
 */
const functions = require('firebase-functions/v1');
const { defineString } = require('firebase-functions/params');
const admin = require('./adminInit');
const fetch = require('node-fetch');

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const VENDOR_COMMISSION_RATE = 0.08;
const VENDOR_COMMISSION_PERCENT = 8;

let banksCache = null;
let banksCacheAt = 0;

function getPaystackSecret() {
  return (
    defineString('PAYSTACK_SECRET').value() ||
    defineString('PAYSTACK_SECRET_KEY').value() ||
    functions.config().paystack?.secret ||
    process.env.PAYSTACK_SECRET_KEY ||
    ''
  );
}

async function paystackRequest(path, options = {}) {
  const secret = getPaystackSecret();
  if (!secret) {
    throw new Error('Paystack secret key not configured');
  }

  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const body = await response.json();
  if (!response.ok || body.status === false) {
    throw new Error(body.message || `Paystack error (${response.status})`);
  }
  return body;
}

async function loadNigerianBanks() {
  if (banksCache && Date.now() - banksCacheAt < 6 * 60 * 60 * 1000) {
    return banksCache;
  }
  const body = await paystackRequest('/bank?country=nigeria&perPage=100');
  banksCache = body.data || [];
  banksCacheAt = Date.now();
  return banksCache;
}

async function resolveBankCode(bankName, explicitCode) {
  if (explicitCode && String(explicitCode).trim()) {
    return String(explicitCode).trim();
  }
  if (!bankName) return null;

  const banks = await loadNigerianBanks();
  const normalized = bankName.toLowerCase().replace(/bank/gi, '').trim();

  const exact = banks.find((b) => b.name.toLowerCase() === bankName.toLowerCase());
  if (exact) return exact.code;

  const partial = banks.find((b) => {
    const bn = b.name.toLowerCase();
    return bn.includes(normalized) || normalized.includes(bn.replace(/bank/gi, '').trim());
  });
  return partial?.code || null;
}

async function getOrCreateRecipient(vendorId, vendor, bank) {
  if (vendor.paystackRecipientCode) {
    return vendor.paystackRecipientCode;
  }

  const bankCode = await resolveBankCode(bank.bankName, bank.bankCode);
  if (!bankCode) {
    throw new Error(`Could not resolve bank code for "${bank.bankName}". Add bankCode in vendor profile.`);
  }

  const body = await paystackRequest('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: bank.accountName,
      account_number: String(bank.accountNumber).trim(),
      bank_code: bankCode,
      currency: 'NGN',
      metadata: { vendorId },
    }),
  });

  const recipientCode = body.data.recipient_code;
  await db.collection('vendors').doc(vendorId).set(
    {
      paystackRecipientCode: recipientCode,
      'bankDetails.bankCode': bankCode,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return recipientCode;
}

function getOrderFoodSubtotal(order = {}) {
  if (typeof order.subtotal === 'number' && order.subtotal > 0) {
    return Math.round(order.subtotal);
  }
  if (typeof order.itemsTotal === 'number' && order.itemsTotal > 0) {
    return Math.round(order.itemsTotal);
  }
  if (Array.isArray(order.items) && order.items.length > 0) {
    const sum = order.items.reduce(
      (acc, item) => acc + (Number(item.itemTotal ?? item.total ?? (item.price * item.quantity)) || 0),
      0
    );
    if (sum > 0) return Math.round(sum);
  }
  const total = Number(order.total ?? order.totalAmount ?? 0);
  const deliveryFee = Number(order.deliveryFee ?? 0);
  if (total > 0 && deliveryFee > 0 && total > deliveryFee) {
    return Math.round(total - deliveryFee);
  }
  return Math.round(total) || 0;
}

function isOrderComplete(order = {}) {
  const status = order.status || order.orderStatus || '';
  return ['delivered', 'completed'].includes(status);
}

async function assertAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in.');
  }
  const adminDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }
  return context.auth.uid;
}

async function creditVendorOrderEarningsServer(orderId, orderData) {
  const vendorId = orderData.vendorId;
  if (!vendorId || orderData.vendorEarningsCredited || !isOrderComplete(orderData)) {
    return { skipped: true };
  }

  const gross = getOrderFoodSubtotal(orderData);
  if (gross <= 0) return { skipped: true, reason: 'zero_subtotal' };

  const commission = Math.round(gross * VENDOR_COMMISSION_RATE);
  const vendorEarnings = gross - commission;
  const orderLabel = orderData.orderNumber || orderData.orderId || orderId;

  const vendorRef = db.collection('vendors').doc(vendorId);
  const orderRef = db.collection('orders').doc(orderId);

  await db.runTransaction(async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    const order = orderSnap.exists ? orderSnap.data() : orderData;
    if (order.vendorEarningsCredited) return;

    const vendorSnap = await transaction.get(vendorRef);
    if (!vendorSnap.exists) throw new Error('VENDOR_NOT_FOUND');

    const vendor = vendorSnap.data();
    const priorOrderCount = vendor.totalOrders || 0;
    transaction.update(vendorRef, {
      totalEarnings: (vendor.totalEarnings || 0) + vendorEarnings,
      availableBalance: (vendor.availableBalance || vendor.pendingBalance || 0) + vendorEarnings,
      totalOrders: priorOrderCount + 1,
      ...(priorOrderCount === 0
        ? { hasFirstOrder: true, firstOrderAt: FieldValue.serverTimestamp() }
        : {}),
      commissionRate: VENDOR_COMMISSION_RATE,
      walletInitialized: true,
      lastEarningDate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (orderSnap.exists) {
      transaction.update(orderRef, {
        vendorEarningsCredited: true,
        vendorEarningsAmount: vendorEarnings,
        vendorCommissionAmount: commission,
        vendorCommissionRate: VENDOR_COMMISSION_RATE,
        vendorFoodSubtotal: gross,
        vendorEarningsCreditedAt: FieldValue.serverTimestamp(),
      });
    }
  });

  await db.collection('vendorTransactions').add({
    vendorId,
    orderId,
    type: 'credit',
    amount: vendorEarnings,
    grossAmount: gross,
    commissionAmount: commission,
    commissionRate: VENDOR_COMMISSION_RATE,
    netAmount: vendorEarnings,
    orderNumber: orderLabel,
    description: `Order ${orderLabel} — Gross ₦${gross.toLocaleString()} · Go7 fee (${VENDOR_COMMISSION_PERCENT}%) ₦${commission.toLocaleString()}`,
    status: 'available',
    source: 'backfill',
    timestamp: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, vendorEarnings, commission, gross };
}

async function refundVendorPayoutBalance(vendorId, amount) {
  const vendorRef = db.collection('vendors').doc(vendorId);
  await db.runTransaction(async (transaction) => {
    const vendorSnap = await transaction.get(vendorRef);
    if (!vendorSnap.exists) return;
    const vendor = vendorSnap.data();
    transaction.update(vendorRef, {
      availableBalance: (vendor.availableBalance || 0) + amount,
      pendingPayout: Math.max(0, (vendor.pendingPayout || vendor.pendingPayouts || 0) - amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function notifyVendorPayout(vendorId, { type, title, message, amount, payoutId, reference }) {
  try {
    await db.collection('notifications').add({
      userId: vendorId,
      type,
      title,
      message,
      amount: amount || null,
      payoutRequestId: payoutId || null,
      reference: reference || null,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Vendor payout notification failed:', err.message);
  }
}

async function finalizeVendorPayoutSuccess(vendorId, amount, payoutId, transferData) {
  const vendorRef = db.collection('vendors').doc(vendorId);
  await db.runTransaction(async (transaction) => {
    const vendorSnap = await transaction.get(vendorRef);
    if (!vendorSnap.exists) return;
    const vendor = vendorSnap.data();
    transaction.update(vendorRef, {
      pendingPayout: Math.max(0, (vendor.pendingPayout || vendor.pendingPayouts || 0) - amount),
      totalPaidOut: (vendor.totalPaidOut || vendor.totalPayouts || vendor.withdrawnBalance || 0) + amount,
      lastPayoutProcessed: FieldValue.serverTimestamp(),
      lastWithdrawalDate: FieldValue.serverTimestamp(),
      lastWithdrawalAmount: amount,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const txSnap = await db
    .collection('vendorTransactions')
    .where('payoutRequestId', '==', payoutId)
    .limit(1)
    .get();

  if (!txSnap.empty) {
    await txSnap.docs[0].ref.update({
      status: 'paid',
      paystackTransferCode: transferData.transfer_code || null,
      paystackReference: transferData.reference || null,
      paidAt: FieldValue.serverTimestamp(),
    });
  }

  await notifyVendorPayout(vendorId, {
    type: 'vendor_payout_paid',
    title: 'Payout sent! ✅',
    message: `₦${Number(amount).toLocaleString()} has been sent to your bank account.`,
    amount,
    payoutId,
    reference: transferData.reference || transferData.transfer_code || null,
  });
}

/**
 * Process a single payout request via Paystack Transfer API.
 */
async function processPayoutRequest(payoutId, { manual = false, adminUid = null } = {}) {
  const payoutRef = db.collection('payoutRequests').doc(payoutId);
  const payoutSnap = await payoutRef.get();
  if (!payoutSnap.exists) {
    throw new Error('Payout request not found');
  }

  const payout = payoutSnap.data();
  if (!manual && payout.transferAttempted) {
    return { skipped: true, reason: 'already_attempted' };
  }
  if (!['pending', 'failed', 'processing'].includes(payout.status)) {
    return { skipped: true, reason: `status_${payout.status}` };
  }

  // Claim payout atomically to avoid duplicate transfers
  const claimed = await db.runTransaction(async (transaction) => {
    const fresh = await transaction.get(payoutRef);
    if (!fresh.exists) return false;
    const current = fresh.data();
    if (!['pending', 'failed', 'processing'].includes(current.status)) return false;
    if (current.status === 'processing' && !manual) return false;
    transaction.update(payoutRef, {
      status: 'processing',
      transferAttempted: true,
      processingAt: FieldValue.serverTimestamp(),
      processedBy: adminUid || current.processedBy || 'system',
    });
    return true;
  });

  if (!claimed) {
    return { skipped: true, reason: 'already_processing' };
  }

  const { vendorId, amount, reference, bankDetails } = payout;
  if (!vendorId || !amount) {
    throw new Error('Invalid payout request data');
  }

  const vendorRef = db.collection('vendors').doc(vendorId);
  const vendorSnap = await vendorRef.get();
  if (!vendorSnap.exists) {
    throw new Error('Vendor not found');
  }
  const vendor = vendorSnap.data();
  const bank = bankDetails || vendor.bankDetails;
  if (!bank?.accountNumber || !bank?.bankName || !bank?.accountName) {
    throw new Error('Vendor bank details incomplete');
  }

  // Retry after failure — reserve balance again
  if (payout.status === 'failed' && manual) {
    const available = vendor.availableBalance || 0;
    if (available < amount) {
      throw new Error(`Vendor only has ₦${available.toLocaleString()} available for retry`);
    }
    await vendorRef.update({
      availableBalance: available - amount,
      pendingPayout: (vendor.pendingPayout || vendor.pendingPayouts || 0) + amount,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  try {
    const recipientCode = await getOrCreateRecipient(vendorId, vendor, bank);
    const transferReference = reference || `GO7-PAY-${payoutId}`;

    const transferBody = await paystackRequest('/transfer', {
      method: 'POST',
      body: JSON.stringify({
        source: 'balance',
        amount: Math.round(amount * 100),
        recipient: recipientCode,
        reason: `Go7 vendor payout ${transferReference}`,
        reference: transferReference,
      }),
    });

    const transfer = transferBody.data;

    await payoutRef.update({
      status: transfer.status === 'success' ? 'paid' : 'processing',
      paystackTransferCode: transfer.transfer_code || transfer.code || null,
      paystackReference: transfer.reference || transferReference,
      paystackStatus: transfer.status || 'pending',
      processedAt: FieldValue.serverTimestamp(),
      adminNotes: manual ? 'Processed by admin via Paystack' : 'Auto Paystack transfer initiated',
    });

    if (transfer.status !== 'success') {
      await notifyVendorPayout(vendorId, {
        type: 'vendor_payout_processing',
        title: 'Sending to your bank…',
        message: `₦${Number(amount).toLocaleString()} is on its way. Usually arrives in 1–5 minutes.`,
        amount,
        payoutId,
        reference: transfer.reference || transferReference,
      });
    }

    if (transfer.status === 'success') {
      await finalizeVendorPayoutSuccess(vendorId, amount, payoutId, transfer);
    }

    return {
      success: true,
      status: transfer.status,
      transferCode: transfer.transfer_code || transfer.code,
      reference: transfer.reference || transferReference,
    };
  } catch (error) {
    console.error('Vendor payout transfer failed:', payoutId, error.message);

    await payoutRef.update({
      status: 'failed',
      failureReason: error.message,
      failedAt: FieldValue.serverTimestamp(),
    });

    await refundVendorPayoutBalance(vendorId, amount);

    await notifyVendorPayout(vendorId, {
      type: 'vendor_payout_failed',
      title: 'Payout failed',
      message: `We couldn't send ₦${Number(amount).toLocaleString()}. Your balance has been restored. ${error.message}`,
      amount,
      payoutId,
      reference: payout.reference || null,
    });

    const txSnap = await db
      .collection('vendorTransactions')
      .where('payoutRequestId', '==', payoutId)
      .limit(1)
      .get();
    if (!txSnap.empty) {
      await txSnap.docs[0].ref.update({
        status: 'failed',
        failureReason: error.message,
      });
    }

    throw error;
  }
}

/** Auto-process new vendor withdrawal requests */
exports.onVendorPayoutRequestCreated = functions.firestore
  .document('payoutRequests/{payoutId}')
  .onCreate(async (snap, context) => {
    const data = snap.data();
    if (data.status !== 'pending') return null;

    try {
      await processPayoutRequest(context.params.payoutId, { manual: false });
      console.log('✅ Auto vendor payout processed:', context.params.payoutId);
    } catch (error) {
      console.error('❌ Auto vendor payout failed:', context.params.payoutId, error.message);
    }
    return null;
  });

/** Admin: retry or manually trigger Paystack transfer */
exports.processVendorPayout = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const payoutId = data?.payoutId;
  if (!payoutId) {
    throw new functions.https.HttpsError('invalid-argument', 'payoutId is required');
  }

  try {
    const result = await processPayoutRequest(payoutId, { manual: true, adminUid });
    return result;
  } catch (error) {
    throw new functions.https.HttpsError('failed-precondition', error.message || 'Transfer failed');
  }
});

/** Admin: mark payout paid when transfer was done outside the app */
exports.markVendorPayoutPaid = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const payoutId = data?.payoutId;
  const transferReference = (data?.transferReference || '').trim();

  if (!payoutId) {
    throw new functions.https.HttpsError('invalid-argument', 'payoutId is required');
  }

  const payoutRef = db.collection('payoutRequests').doc(payoutId);
  const payoutSnap = await payoutRef.get();
  if (!payoutSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Payout request not found');
  }

  const payout = payoutSnap.data();
  if (!['pending', 'failed', 'processing'].includes(payout.status)) {
    throw new functions.https.HttpsError('failed-precondition', `Cannot mark ${payout.status} as paid`);
  }

  await payoutRef.update({
    status: 'paid',
    paystackReference: transferReference || payout.reference,
    processedAt: FieldValue.serverTimestamp(),
    processedBy: adminUid,
    adminNotes: data?.note || 'Marked paid manually by admin',
  });

  await finalizeVendorPayoutSuccess(payout.vendorId, payout.amount, payoutId, {
    reference: transferReference || payout.reference,
  });

  return { success: true };
});

/** Admin: backfill wallet fields + credit historical delivered orders */
exports.backfillVendorWallets = functions
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    await assertAdmin(context);

    const vendorIdFilter = data?.vendorId || null;
    const dryRun = Boolean(data?.dryRun);

    const vendorsSnap = vendorIdFilter
      ? [await db.collection('vendors').doc(vendorIdFilter).get()]
      : (await db.collection('vendors').get()).docs;

    let vendorsInitialized = 0;
    let ordersCredited = 0;
    let ordersSkipped = 0;
    const errors = [];

    for (const vendorDoc of vendorsSnap) {
      if (!vendorDoc.exists) continue;
      const vendorId = vendorDoc.id;
      const vendor = vendorDoc.data();

      if (!vendor.walletInitialized) {
        if (!dryRun) {
          await vendorDoc.ref.set(
            {
              totalEarnings: vendor.totalEarnings || 0,
              availableBalance: vendor.availableBalance || vendor.pendingBalance || 0,
              pendingPayout: vendor.pendingPayout || vendor.pendingPayouts || 0,
              totalPaidOut: vendor.totalPaidOut || vendor.totalPayouts || vendor.withdrawnBalance || 0,
              commissionRate: VENDOR_COMMISSION_RATE,
              walletInitialized: true,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
        vendorsInitialized += 1;
      }

      const ordersSnap = await db.collection('orders').where('vendorId', '==', vendorId).get();
      for (const orderDoc of ordersSnap.docs) {
        const order = orderDoc.data();
        if (!isOrderComplete(order) || order.vendorEarningsCredited) {
          ordersSkipped += 1;
          continue;
        }
        try {
          if (!dryRun) {
            await creditVendorOrderEarningsServer(orderDoc.id, order);
          }
          ordersCredited += 1;
        } catch (err) {
          errors.push({ orderId: orderDoc.id, vendorId, error: err.message });
        }
      }
    }

    return {
      success: true,
      dryRun,
      vendorsInitialized,
      ordersCredited,
      ordersSkipped,
      errors: errors.slice(0, 20),
      errorCount: errors.length,
    };
  });

/** Paystack transfer webhook — finalize payout status */
exports.onPaystackTransferUpdate = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const event = req.body?.event;
    const transfer = req.body?.data;
    const reference = transfer?.reference;

    if (!reference || !['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(event)) {
      res.status(200).json({ received: true });
      return;
    }

    const payoutSnap = await db
      .collection('payoutRequests')
      .where('reference', '==', reference)
      .limit(1)
      .get();

    if (payoutSnap.empty) {
      res.status(200).json({ received: true, matched: false });
      return;
    }

    const payoutDoc = payoutSnap.docs[0];
    const payout = payoutDoc.data();

    if (event === 'transfer.success') {
      await payoutDoc.ref.update({
        status: 'paid',
        paystackStatus: 'success',
        processedAt: FieldValue.serverTimestamp(),
      });
      await finalizeVendorPayoutSuccess(payout.vendorId, payout.amount, payoutDoc.id, transfer);
    } else {
      await payoutDoc.ref.update({
        status: 'failed',
        paystackStatus: event.replace('transfer.', ''),
        failureReason: transfer?.reason || event,
        failedAt: FieldValue.serverTimestamp(),
      });
      if (payout.status !== 'failed') {
        await refundVendorPayoutBalance(payout.vendorId, payout.amount);
      }
    }

    res.status(200).json({ received: true, matched: true });
  } catch (error) {
    console.error('Transfer webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports.processPayoutRequest = processPayoutRequest;
module.exports.creditVendorOrderEarningsServer = creditVendorOrderEarningsServer;
module.exports.VENDOR_COMMISSION_RATE = VENDOR_COMMISSION_RATE;
module.exports.getOrderFoodSubtotal = getOrderFoodSubtotal;
