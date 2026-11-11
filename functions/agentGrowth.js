/**
 * ====================================================================
 * COMMUNITY GROWTH ASSOCIATE (CGA) BACKEND
 * ====================================================================
 *
 * Additive layer on top of the existing agent system (agents/,
 * agentEarnings.js, vendorPayouts.js). Does NOT touch or duplicate
 * the legacy agentEarnings/withdrawals collections — those keep
 * working as-is. This file adds the 4 new collections requested:
 *
 *   - agentTransactions      (ledger; 7-day pending -> approved)
 *   - agentWithdrawals       (agent withdrawal requests)
 *   - agentDailyReports      (daily field reports)
 *   - agentPerformanceMonths (monthly 100-point scorecard)
 *
 * and extends existing docs additively:
 *   - agents/{agentId}: referralCode, walletBalance, totalEarned,
 *     totalWithdrawn, vendorsOnboarded, activeVendors, activeCustomers,
 *     monthlyScore, assignedZone, status (defaults only — never
 *     overwrites legacy fields like totalEarnings/availableBalance)
 *   - vendors/{vendorId}: agentGrowthStage1Paid/Stage2Paid/Stage3Paid,
 *     agentGrowthCompletedOrders (dedicated counter, independent of
 *     the legacy totalOrders counter which isn't reliably wired up)
 *   - users/{userId} (= "customers"): referredByAgentId,
 *     referralFirstOrderCompleted
 *   - orders/{orderId}: agentGrowthOrderCounted (idempotency guard)
 *
 * Reused signals (no new fields needed):
 *   - vendor.agentId / vendor.referredByAgentId (set at registration,
 *     see src/services/vendorAuthService.js)
 *   - vendor.isLive (== "approved")
 *   - vendor.totalProducts > 0 (== "products uploaded")
 */

const functions = require('firebase-functions/v1');
const admin = require('./adminInit');

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ====================================================================
// CONSTANTS
// ====================================================================

const VENDOR_STAGE_AMOUNTS = {
  approved_products_uploaded: 500,
  five_completed_orders: 1000,
  twenty_completed_orders: 1500,
};
const VENDOR_STAGE2_ORDER_THRESHOLD = 5;
const VENDOR_STAGE3_ORDER_THRESHOLD = 20;

const CUSTOMER_REFERRAL_BATCH_SIZE = 10;
const CUSTOMER_REFERRAL_BATCH_AMOUNT = 2000;

const PENDING_VERIFICATION_DAYS = 7;
const MIN_WITHDRAWAL = 5000;

// 100-point scorecard weights
const SCORE_MAX = {
  attendance: 20,
  vendorDevelopment: 40,
  customerGrowth: 30,
  brandRepresentation: 10,
};

const SUPPORT_TIERS = [
  { min: 90, max: 100, amount: 25000 },
  { min: 80, max: 89, amount: 20000 },
  { min: 70, max: 79, amount: 15000 },
];

const MONTHLY_KPI_BONUS = 5000;
const TOP_PERFORMER_BONUS = 10000;

// ====================================================================
// HELPERS
// ====================================================================

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

/**
 * Agents in this codebase authenticate via phone OTP + localStorage
 * (see src/pages/AgentLogin.jsx), NOT Firebase Auth — there is no
 * context.auth session for agent-facing calls. Matching the existing
 * convention (createAgent/getAgent/requestWithdrawal in
 * agentEarnings.js), agent-facing callables below accept an explicit
 * agentId and verify the doc exists rather than trusting context.auth.
 */
async function assertValidAgentId(agentId) {
  const id = String(agentId || '').trim();
  if (!id) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId is required');
  }
  const agentSnap = await db.collection('agents').doc(id).get();
  if (!agentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Agent not found');
  }
  return agentSnap;
}

function generateReferralCode(seed) {
  const clean = String(seed || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const suffix = clean.slice(0, 4) || Math.random().toString(36).slice(2, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `GO7-CGA-${suffix}${rand}`;
}

function computeSupportAmount(totalScore) {
  const tier = SUPPORT_TIERS.find((t) => totalScore >= t.min && totalScore <= t.max);
  return tier ? tier.amount : 0;
}

function clampScore(value, max) {
  const n = Number(value);
  if (isNaN(n)) return 0;
  return Math.max(0, Math.min(max, n));
}

/**
 * Ensure an agent doc has all Community Growth Associate fields,
 * without ever overwriting existing values (legacy or new).
 */
async function ensureAgentGrowthFields(agentId, agentRef, agentData) {
  const defaults = {};
  if (!agentData.referralCode) defaults.referralCode = generateReferralCode(agentData.fullName || agentData.name || agentId);
  if (typeof agentData.walletBalance !== 'number') defaults.walletBalance = 0;
  if (typeof agentData.totalEarned !== 'number') defaults.totalEarned = 0;
  if (typeof agentData.totalWithdrawn !== 'number') defaults.totalWithdrawn = 0;
  if (typeof agentData.vendorsOnboarded !== 'number') defaults.vendorsOnboarded = 0;
  if (typeof agentData.activeVendors !== 'number') defaults.activeVendors = 0;
  if (typeof agentData.activeCustomers !== 'number') defaults.activeCustomers = 0;
  if (typeof agentData.referredCompletedCustomersCount !== 'number') defaults.referredCompletedCustomersCount = 0;
  if (typeof agentData.customerReferralBatchesPaid !== 'number') defaults.customerReferralBatchesPaid = 0;
  if (typeof agentData.monthlyScore !== 'number') defaults.monthlyScore = 0;
  if (!agentData.assignedZone) defaults.assignedZone = null;
  if (!agentData.status) defaults.status = 'active';
  if (!agentData.createdAt) defaults.createdAt = FieldValue.serverTimestamp();
  defaults.updatedAt = FieldValue.serverTimestamp();

  if (Object.keys(defaults).length > 0) {
    await agentRef.set(defaults, { merge: true });
  }
  return { ...agentData, ...defaults };
}

/**
 * Create a pending agentTransactions ledger entry. Wallet is NOT
 * touched here — it only increases when the transaction is approved
 * (manually by admin, or automatically after the 7-day window).
 */
async function createAgentTransaction(agentId, type, amount, description, referenceId, extra = {}) {
  if (!agentId || !amount || amount <= 0) return null;

  // Idempotency: never create the same referenceId twice
  if (referenceId) {
    const dup = await db.collection('agentTransactions')
      .where('agentId', '==', agentId)
      .where('referenceId', '==', referenceId)
      .limit(1)
      .get();
    if (!dup.empty) return dup.docs[0].id;
  }

  const txRef = await db.collection('agentTransactions').add({
    agentId,
    type,
    amount,
    description: description || '',
    status: 'pending',
    referenceId: referenceId || null,
    createdAt: FieldValue.serverTimestamp(),
    approvedAt: null,
    ...extra,
  });

  await db.collection('notifications').add({
    userId: agentId,
    type: 'agent_transaction_pending',
    title: 'New Earning Pending Verification',
    message: `₦${amount.toLocaleString()} — ${description || type}. Approved automatically in ${PENDING_VERIFICATION_DAYS} days.`,
    amount,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log(`✅ agentTransactions/${txRef.id}: ₦${amount} (${type}) for agent ${agentId}`);
  return txRef.id;
}

/** Approve a pending agentTransactions doc: credit wallet + totalEarned. */
async function approveAgentTransactionInternal(transactionId, approvedBy) {
  const txRef = db.collection('agentTransactions').doc(transactionId);

  return db.runTransaction(async (t) => {
    const txSnap = await t.get(txRef);
    if (!txSnap.exists) throw new Error('Transaction not found');
    const tx = txSnap.data();
    if (tx.status !== 'pending') throw new Error(`Transaction is not pending (status: ${tx.status})`);

    const agentRef = db.collection('agents').doc(tx.agentId);
    const agentSnap = await t.get(agentRef);
    const agent = agentSnap.exists ? agentSnap.data() : {};

    t.update(txRef, {
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: approvedBy || 'system',
    });

    t.set(agentRef, {
      walletBalance: (agent.walletBalance || 0) + tx.amount,
      totalEarned: (agent.totalEarned || 0) + tx.amount,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { transactionId, amount: tx.amount, agentId: tx.agentId };
  });
}

/** Reject a pending agentTransactions doc. No wallet change. */
async function rejectAgentTransactionInternal(transactionId, rejectedBy, reason) {
  const txRef = db.collection('agentTransactions').doc(transactionId);
  const txSnap = await txRef.get();
  if (!txSnap.exists) throw new Error('Transaction not found');
  if (txSnap.data().status !== 'pending') throw new Error('Transaction is not pending');

  await txRef.update({
    status: 'rejected',
    rejectedAt: FieldValue.serverTimestamp(),
    rejectedBy: rejectedBy || 'admin',
    rejectionReason: reason || null,
  });
}

// ====================================================================
// AGENT PROFILE
// ====================================================================

/**
 * Idempotent create/upgrade of the calling user's agent profile with
 * Community Growth Associate fields. Safe to call on an existing
 * legacy agent doc — only fills in missing fields.
 */
exports.createCommunityGrowthAgent = functions.https.onCall(async (data, context) => {
  // If called right after Firebase Auth signup, prefer that uid; otherwise
  // accept an explicit agentId/uid (matches createAgent in agentEarnings.js,
  // since agents don't have a Firebase Auth session in this app).
  const uid = context.auth?.uid || String(data?.agentId || data?.uid || '').trim();
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId (or an authenticated session) is required');
  }

  const fullName = String(data?.fullName || '').trim();
  const phone = String(data?.phone || '').trim();
  const email = String(data?.email || '').trim();
  const assignedZone = data?.assignedZone || null;

  if (!fullName || !phone) {
    throw new functions.https.HttpsError('invalid-argument', 'fullName and phone are required');
  }

  const agentRef = db.collection('agents').doc(uid);
  const agentSnap = await agentRef.get();
  const existing = agentSnap.exists ? agentSnap.data() : {};

  await agentRef.set({
    uid,
    fullName: existing.fullName || fullName,
    phone: existing.phone || phone,
    email: existing.email || email || null,
    assignedZone: existing.assignedZone || assignedZone,
    ...(agentSnap.exists ? {} : { name: fullName, createdAt: FieldValue.serverTimestamp() }),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const fresh = (await agentRef.get()).data();
  await ensureAgentGrowthFields(uid, agentRef, fresh);

  return { success: true, agentId: uid };
});

// ====================================================================
// VENDOR COMMISSION — STAGED PAYOUTS
// ====================================================================

/**
 * Fires whenever a vendor doc changes. Checks all 3 commission stages
 * and pays whichever newly-crossed thresholds haven't been paid yet.
 * Each stage guarded by a dedicated *Paid boolean so it only ever pays once.
 */
exports.onVendorWriteForAgentGrowth = functions.firestore
  .document('vendors/{vendorId}')
  .onWrite(async (change, context) => {
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null;
    const vendorId = context.params.vendorId;

    const agentId = after.agentId || after.referredByAgentId;
    if (!agentId) return null;

    const before = change.before.exists ? change.before.data() : {};
    const vendorRef = change.after.ref;

    // Track vendor onboarding count once, the first time agentId appears.
    if (!before.agentId && !before.referredByAgentId) {
      const agentRef = db.collection('agents').doc(agentId);
      const agentSnap = await agentRef.get();
      if (agentSnap.exists) {
        await ensureAgentGrowthFields(agentId, agentRef, agentSnap.data());
        await agentRef.update({
          vendorsOnboarded: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // Track "active vendor" the first time it goes live.
    if (!before.isLive && after.isLive) {
      const agentRef = db.collection('agents').doc(agentId);
      const agentSnap = await agentRef.get();
      if (agentSnap.exists) {
        await agentRef.update({
          activeVendors: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    const isApproved = Boolean(after.isLive);
    const productsUploaded = Number(after.totalProducts || 0) > 0;
    const completedOrders = Number(after.agentGrowthCompletedOrders || 0);

    // Stage 1: approved + products uploaded
    if (isApproved && productsUploaded && !after.agentGrowthStage1Paid) {
      await vendorRef.set({ agentGrowthStage1Paid: true }, { merge: true });
      await createAgentTransaction(
        agentId,
        'vendor_commission_stage1',
        VENDOR_STAGE_AMOUNTS.approved_products_uploaded,
        `Vendor approved & products uploaded (${after.name || vendorId})`,
        `vendor-stage1-${vendorId}`,
        { vendorId }
      );
    }

    // Stage 2: 5 completed orders
    if (completedOrders >= VENDOR_STAGE2_ORDER_THRESHOLD && !after.agentGrowthStage2Paid) {
      await vendorRef.set({ agentGrowthStage2Paid: true }, { merge: true });
      await createAgentTransaction(
        agentId,
        'vendor_commission_stage2',
        VENDOR_STAGE_AMOUNTS.five_completed_orders,
        `Vendor reached ${VENDOR_STAGE2_ORDER_THRESHOLD} completed orders (${after.name || vendorId})`,
        `vendor-stage2-${vendorId}`,
        { vendorId }
      );
    }

    // Stage 3: 20 completed orders
    if (completedOrders >= VENDOR_STAGE3_ORDER_THRESHOLD && !after.agentGrowthStage3Paid) {
      await vendorRef.set({ agentGrowthStage3Paid: true }, { merge: true });
      await createAgentTransaction(
        agentId,
        'vendor_commission_stage3',
        VENDOR_STAGE_AMOUNTS.twenty_completed_orders,
        `Vendor reached ${VENDOR_STAGE3_ORDER_THRESHOLD} completed orders (${after.name || vendorId})`,
        `vendor-stage3-${vendorId}`,
        { vendorId }
      );
    }

    return null;
  });

/**
 * When a vendor's first product is created, flip vendor.totalProducts
 * up if it's still 0 so the stage-1 check above can fire. Products are
 * usually incremented elsewhere on create; this is a safety net.
 */
exports.onProductCreateForAgentGrowth = functions.firestore
  .document('products/{productId}')
  .onCreate(async (snap) => {
    const product = snap.data();
    const vendorId = product.vendorId;
    if (!vendorId) return null;

    const vendorRef = db.collection('vendors').doc(vendorId);
    const vendorSnap = await vendorRef.get();
    if (!vendorSnap.exists) return null;

    if (!Number(vendorSnap.data().totalProducts || 0)) {
      await vendorRef.set({
        totalProducts: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    return null;
  });

// ====================================================================
// ORDER COMPLETION — VENDOR ORDER COUNT + CUSTOMER REFERRAL PAYOUT
// ====================================================================

function isOrderComplete(order = {}) {
  const status = order.status || order.orderStatus || '';
  return ['delivered', 'completed'].includes(status);
}

exports.onOrderWriteForAgentGrowth = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    if (after.agentGrowthOrderCounted) return null;
    if (isOrderComplete(before) || !isOrderComplete(after)) return null;

    await change.after.ref.set({ agentGrowthOrderCounted: true }, { merge: true });

    // 1) Vendor completed-order counter (independent dedicated counter)
    const vendorId = after.vendorId;
    if (vendorId) {
      const vendorRef = db.collection('vendors').doc(vendorId);
      const vendorSnap = await vendorRef.get();
      if (vendorSnap.exists && (vendorSnap.data().agentId || vendorSnap.data().referredByAgentId)) {
        await vendorRef.set({
          agentGrowthCompletedOrders: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });
        // The onWrite trigger above will fire from this update and check stage 2/3.
      }
    }

    // 2) Customer referral — first completed order
    const customerId = after.userId || after.customerId;
    if (customerId) {
      const userRef = db.collection('users').doc(customerId);
      const userSnap = await userRef.get();
      if (userSnap.exists) {
        const user = userSnap.data();
        const agentId = user.referredByAgentId;
        if (agentId && !user.referralFirstOrderCompleted) {
          await userRef.set({
            referralFirstOrderCompleted: true,
            referralFirstOrderCompletedAt: FieldValue.serverTimestamp(),
          }, { merge: true });

          const agentRef = db.collection('agents').doc(agentId);
          const agentSnap = await agentRef.get();
          if (agentSnap.exists) {
            const agentData = await ensureAgentGrowthFields(agentId, agentRef, agentSnap.data());
            const newCount = (agentData.referredCompletedCustomersCount || 0) + 1;
            const previousBatches = agentData.customerReferralBatchesPaid || 0;
            const newBatches = Math.floor(newCount / CUSTOMER_REFERRAL_BATCH_SIZE);

            await agentRef.update({
              activeCustomers: FieldValue.increment(1),
              referredCompletedCustomersCount: FieldValue.increment(1),
              updatedAt: FieldValue.serverTimestamp(),
            });

            if (newBatches > previousBatches) {
              await agentRef.update({ customerReferralBatchesPaid: newBatches });
              await createAgentTransaction(
                agentId,
                'customer_referral_batch',
                CUSTOMER_REFERRAL_BATCH_AMOUNT,
                `${CUSTOMER_REFERRAL_BATCH_SIZE} referred customers completed their first order (batch ${newBatches})`,
                `customer-batch-${agentId}-${newBatches}`
              );
            }
          }
        }
      }
    }

    console.log(`agentGrowth: order ${orderId} processed for completion`);
    return null;
  });

// ====================================================================
// WITHDRAWALS
// ====================================================================

exports.requestAgentWithdrawal = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid || String(data?.agentId || '').trim();
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId (or an authenticated session) is required');
  }
  const amount = Number(data?.amount);
  const bankName = String(data?.bankName || '').trim();
  const accountNumber = String(data?.accountNumber || '').trim();
  const accountName = String(data?.accountName || '').trim();

  if (!amount || amount < MIN_WITHDRAWAL) {
    throw new functions.https.HttpsError('invalid-argument', `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}`);
  }
  if (!bankName || !accountNumber || !accountName) {
    throw new functions.https.HttpsError('invalid-argument', 'Bank name, account number and account name are required');
  }

  const agentRef = db.collection('agents').doc(uid);
  const agentSnap = await agentRef.get();
  if (!agentSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Agent profile not found');
  }
  const agent = agentSnap.data();
  const walletBalance = Number(agent.walletBalance || 0);

  if (walletBalance < amount) {
    throw new functions.https.HttpsError('failed-precondition', `Insufficient wallet balance. Available: ₦${walletBalance.toLocaleString()}`);
  }

  const withdrawalRef = await db.collection('agentWithdrawals').add({
    agentId: uid,
    agentName: agent.fullName || agent.name || null,
    amount,
    bankName,
    accountNumber,
    accountName,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    approvedAt: null,
    paidAt: null,
  });

  console.log(`✅ agentWithdrawals/${withdrawalRef.id}: ₦${amount} requested by agent ${uid}`);
  return { success: true, withdrawalId: withdrawalRef.id };
});

exports.approveAgentWithdrawal = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const withdrawalId = data?.withdrawalId;
  if (!withdrawalId) {
    throw new functions.https.HttpsError('invalid-argument', 'withdrawalId is required');
  }

  const withdrawalRef = db.collection('agentWithdrawals').doc(withdrawalId);

  const result = await db.runTransaction(async (t) => {
    const withdrawalSnap = await t.get(withdrawalRef);
    if (!withdrawalSnap.exists) throw new functions.https.HttpsError('not-found', 'Withdrawal not found');
    const withdrawal = withdrawalSnap.data();
    if (withdrawal.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Withdrawal is not pending');
    }

    const agentRef = db.collection('agents').doc(withdrawal.agentId);
    const agentSnap = await t.get(agentRef);
    if (!agentSnap.exists) throw new functions.https.HttpsError('not-found', 'Agent not found');
    const agent = agentSnap.data();
    const walletBalance = Number(agent.walletBalance || 0);

    if (walletBalance < withdrawal.amount) {
      throw new functions.https.HttpsError('failed-precondition', `Agent wallet balance (₦${walletBalance.toLocaleString()}) is less than withdrawal amount`);
    }

    t.update(withdrawalRef, {
      status: 'approved',
      approvedAt: FieldValue.serverTimestamp(),
      approvedBy: adminUid,
    });

    t.set(agentRef, {
      walletBalance: walletBalance - withdrawal.amount,
      totalWithdrawn: (agent.totalWithdrawn || 0) + withdrawal.amount,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    return { agentId: withdrawal.agentId, amount: withdrawal.amount };
  });

  await db.collection('notifications').add({
    userId: result.agentId,
    type: 'agent_withdrawal_approved',
    title: 'Withdrawal Approved ✅',
    message: `₦${result.amount.toLocaleString()} withdrawal approved and deducted from your wallet. Payout is being processed.`,
    amount: result.amount,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

exports.rejectAgentWithdrawal = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const withdrawalId = data?.withdrawalId;
  if (!withdrawalId) {
    throw new functions.https.HttpsError('invalid-argument', 'withdrawalId is required');
  }

  const withdrawalRef = db.collection('agentWithdrawals').doc(withdrawalId);
  const withdrawalSnap = await withdrawalRef.get();
  if (!withdrawalSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Withdrawal not found');
  }
  const withdrawal = withdrawalSnap.data();
  if (withdrawal.status !== 'pending') {
    throw new functions.https.HttpsError('failed-precondition', 'Withdrawal is not pending');
  }

  await withdrawalRef.update({
    status: 'rejected',
    rejectedAt: FieldValue.serverTimestamp(),
    rejectedBy: adminUid,
    rejectionReason: data?.reason || null,
  });

  await db.collection('notifications').add({
    userId: withdrawal.agentId,
    type: 'agent_withdrawal_rejected',
    title: 'Withdrawal Rejected',
    message: `Your withdrawal request of ₦${withdrawal.amount.toLocaleString()} was rejected.${data?.reason ? ` Reason: ${data.reason}` : ''}`,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
});

/** Admin: mark an already-approved withdrawal as actually paid out (bank transfer completed). */
exports.markAgentWithdrawalPaid = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const withdrawalId = data?.withdrawalId;
  if (!withdrawalId) {
    throw new functions.https.HttpsError('invalid-argument', 'withdrawalId is required');
  }

  const withdrawalRef = db.collection('agentWithdrawals').doc(withdrawalId);
  const withdrawalSnap = await withdrawalRef.get();
  if (!withdrawalSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Withdrawal not found');
  }
  if (withdrawalSnap.data().status !== 'approved') {
    throw new functions.https.HttpsError('failed-precondition', 'Withdrawal must be approved before marking as paid');
  }

  await withdrawalRef.update({
    status: 'paid',
    paidAt: FieldValue.serverTimestamp(),
    paidBy: adminUid,
    reference: data?.reference || null,
  });

  return { success: true };
});

// ====================================================================
// TRANSACTIONS — MANUAL ADMIN OVERRIDE + AUTO-APPROVAL
// ====================================================================

exports.approveAgentTransaction = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const transactionId = data?.transactionId;
  if (!transactionId) {
    throw new functions.https.HttpsError('invalid-argument', 'transactionId is required');
  }
  try {
    const result = await approveAgentTransactionInternal(transactionId, adminUid);
    return { success: true, ...result };
  } catch (error) {
    throw new functions.https.HttpsError('failed-precondition', error.message);
  }
});

exports.rejectAgentTransaction = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const transactionId = data?.transactionId;
  if (!transactionId) {
    throw new functions.https.HttpsError('invalid-argument', 'transactionId is required');
  }
  try {
    await rejectAgentTransactionInternal(transactionId, adminUid, data?.reason);
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('failed-precondition', error.message);
  }
});

/** Scheduled: auto-approve agentTransactions pending for >= 7 days. */
exports.autoApproveAgentTransactions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const cutoff = admin.firestore.Timestamp.fromMillis(Date.now() - PENDING_VERIFICATION_DAYS * 24 * 60 * 60 * 1000);

    const snapshot = await db.collection('agentTransactions')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', cutoff)
      .limit(200)
      .get();

    let approved = 0;
    let failed = 0;
    for (const doc of snapshot.docs) {
      try {
        await approveAgentTransactionInternal(doc.id, 'system-auto-approval');
        approved += 1;
      } catch (error) {
        failed += 1;
        console.error('autoApproveAgentTransactions: failed for', doc.id, error.message);
      }
    }

    console.log(`autoApproveAgentTransactions: approved=${approved} failed=${failed}`);
    return null;
  });

// ====================================================================
// DAILY REPORTS
// ====================================================================

exports.submitAgentDailyReport = functions.https.onCall(async (data, context) => {
  const uid = context.auth?.uid || String(data?.agentId || '').trim();
  if (!uid) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId (or an authenticated session) is required');
  }
  const date = String(data?.date || '').trim(); // expected format: YYYY-MM-DD
  if (!date) {
    throw new functions.https.HttpsError('invalid-argument', 'date is required (YYYY-MM-DD)');
  }
  await assertValidAgentId(uid);

  const reportId = `${uid}_${date}`;
  await db.collection('agentDailyReports').doc(reportId).set({
    agentId: uid,
    date,
    vendorsVisited: Number(data?.vendorsVisited || 0),
    customersEngaged: Number(data?.customersEngaged || 0),
    tasksCompleted: data?.tasksCompleted || null,
    checkIn: data?.checkIn || null,
    checkOut: data?.checkOut || null,
    notes: String(data?.notes || '').slice(0, 2000),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const existing = await db.collection('agentDailyReports').doc(reportId).get();
  if (!existing.data().createdAt) {
    await db.collection('agentDailyReports').doc(reportId).set({ createdAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  return { success: true, reportId };
});

// ====================================================================
// MONTHLY PERFORMANCE SCORECARD
// ====================================================================

/**
 * Admin: set/adjust an agent's monthly scorecard. Computes total score
 * (capped per category), determines monthly support tier, and creates
 * a pending agentTransactions entry for the support payment (only once
 * per month, guarded by supportTransactionCreated).
 */
exports.adjustAgentScorecard = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const agentId = data?.agentId;
  const month = String(data?.month || '').trim(); // expected format: YYYY-MM
  if (!agentId || !month) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId and month (YYYY-MM) are required');
  }

  const attendance = clampScore(data?.attendance, SCORE_MAX.attendance);
  const vendorDevelopment = clampScore(data?.vendorDevelopment, SCORE_MAX.vendorDevelopment);
  const customerGrowth = clampScore(data?.customerGrowth, SCORE_MAX.customerGrowth);
  const brandRepresentation = clampScore(data?.brandRepresentation, SCORE_MAX.brandRepresentation);

  const totalScore = attendance + vendorDevelopment + customerGrowth + brandRepresentation;
  const supportAmount = computeSupportAmount(totalScore);
  const flaggedForReview = totalScore < 70;

  const perfId = `${agentId}_${month}`;
  const perfRef = db.collection('agentPerformanceMonths').doc(perfId);
  const perfSnap = await perfRef.get();
  const existing = perfSnap.exists ? perfSnap.data() : {};

  await perfRef.set({
    agentId,
    month,
    scores: { attendance, vendorDevelopment, customerGrowth, brandRepresentation },
    totalScore,
    supportAmount,
    flaggedForReview,
    isTopPerformer: existing.isTopPerformer || false,
    adjustedBy: adminUid,
    note: data?.note || existing.note || null,
    createdAt: existing.createdAt || FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await db.collection('agents').doc(agentId).set({
    monthlyScore: totalScore,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  let transactionId = null;
  if (supportAmount > 0 && !existing.supportTransactionCreated) {
    transactionId = await createAgentTransaction(
      agentId,
      'monthly_performance_support',
      supportAmount,
      `Monthly performance support — ${month} (score: ${totalScore}/100)`,
      `monthly-support-${agentId}-${month}`
    );
    if (transactionId) {
      await perfRef.set({ supportTransactionCreated: true }, { merge: true });
    }
  }

  return { success: true, totalScore, supportAmount, flaggedForReview, transactionId };
});

/** Admin: award the ₦5,000 monthly KPI bonus (once per agent per month). */
exports.awardMonthlyKPIBonus = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const agentId = data?.agentId;
  const month = String(data?.month || '').trim();
  if (!agentId || !month) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId and month (YYYY-MM) are required');
  }

  const perfId = `${agentId}_${month}`;
  const perfRef = db.collection('agentPerformanceMonths').doc(perfId);
  const perfSnap = await perfRef.get();
  if (perfSnap.exists && perfSnap.data().kpiBonusPaid) {
    throw new functions.https.HttpsError('already-exists', 'KPI bonus already awarded for this month');
  }

  const transactionId = await createAgentTransaction(
    agentId,
    'monthly_kpi_bonus',
    MONTHLY_KPI_BONUS,
    `Monthly KPI bonus — ${month}`,
    `kpi-bonus-${agentId}-${month}`
  );

  await perfRef.set({
    agentId,
    month,
    kpiBonusPaid: true,
    updatedAt: FieldValue.serverTimestamp(),
    ...(perfSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });

  return { success: true, transactionId };
});

/** Admin: mark an agent as top performer for the month + ₦10,000 bonus. */
exports.markTopPerformer = functions.https.onCall(async (data, context) => {
  const adminUid = await assertAdmin(context);
  const agentId = data?.agentId;
  const month = String(data?.month || '').trim();
  if (!agentId || !month) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId and month (YYYY-MM) are required');
  }

  const perfId = `${agentId}_${month}`;
  const perfRef = db.collection('agentPerformanceMonths').doc(perfId);
  const perfSnap = await perfRef.get();
  if (perfSnap.exists && perfSnap.data().topPerformerBonusPaid) {
    throw new functions.https.HttpsError('already-exists', 'Top performer bonus already awarded for this month');
  }

  const transactionId = await createAgentTransaction(
    agentId,
    'top_performer_bonus',
    TOP_PERFORMER_BONUS,
    `Top performer bonus — ${month} (selected by admin)`,
    `top-performer-${agentId}-${month}`
  );

  await perfRef.set({
    agentId,
    month,
    isTopPerformer: true,
    topPerformerBonusPaid: true,
    selectedBy: adminUid,
    updatedAt: FieldValue.serverTimestamp(),
    ...(perfSnap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
  }, { merge: true });

  return { success: true, transactionId };
});

/** Admin: read-only monthly summary across all agents for a given month. */
exports.generateMonthlyPerformanceSummary = functions.https.onCall(async (data, context) => {
  await assertAdmin(context);
  const month = String(data?.month || '').trim();
  if (!month) {
    throw new functions.https.HttpsError('invalid-argument', 'month (YYYY-MM) is required');
  }

  const snapshot = await db.collection('agentPerformanceMonths')
    .where('month', '==', month)
    .get();

  const rows = [];
  for (const doc of snapshot.docs) {
    const perf = doc.data();
    const agentSnap = await db.collection('agents').doc(perf.agentId).get();
    const agent = agentSnap.exists ? agentSnap.data() : {};
    rows.push({
      agentId: perf.agentId,
      agentName: agent.fullName || agent.name || 'Unknown',
      totalScore: perf.totalScore || 0,
      supportAmount: perf.supportAmount || 0,
      flaggedForReview: Boolean(perf.flaggedForReview),
      isTopPerformer: Boolean(perf.isTopPerformer),
      kpiBonusPaid: Boolean(perf.kpiBonusPaid),
    });
  }

  rows.sort((a, b) => b.totalScore - a.totalScore);

  return { success: true, month, agents: rows };
});

// ====================================================================
// AGENT-FACING GETTERS
// (Agents have no Firebase Auth session in this app — see note in
// firestore.rules — so these read via the Admin SDK, mirroring
// getAgentEarnings/getAgentWithdrawals in agentEarnings.js.)
// ====================================================================

exports.getAgentTransactions = functions.https.onCall(async (data) => {
  const agentId = String(data?.agentId || '').trim();
  if (!agentId) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId is required');
  }
  const limit = Math.min(Number(data?.limit) || 50, 200);

  const snapshot = await db.collection('agentTransactions')
    .where('agentId', '==', agentId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return {
    success: true,
    transactions: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

exports.getAgentWithdrawalsCGA = functions.https.onCall(async (data) => {
  const agentId = String(data?.agentId || '').trim();
  if (!agentId) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId is required');
  }
  const limit = Math.min(Number(data?.limit) || 50, 200);

  const snapshot = await db.collection('agentWithdrawals')
    .where('agentId', '==', agentId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return {
    success: true,
    withdrawals: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

exports.getAgentDailyReports = functions.https.onCall(async (data) => {
  const agentId = String(data?.agentId || '').trim();
  if (!agentId) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId is required');
  }
  const limit = Math.min(Number(data?.limit) || 31, 200);

  const snapshot = await db.collection('agentDailyReports')
    .where('agentId', '==', agentId)
    .orderBy('date', 'desc')
    .limit(limit)
    .get();

  return {
    success: true,
    reports: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  };
});

exports.getAgentPerformanceMonth = functions.https.onCall(async (data) => {
  const agentId = String(data?.agentId || '').trim();
  const month = String(data?.month || '').trim();
  if (!agentId || !month) {
    throw new functions.https.HttpsError('invalid-argument', 'agentId and month (YYYY-MM) are required');
  }

  const perfId = `${agentId}_${month}`;
  const perfSnap = await db.collection('agentPerformanceMonths').doc(perfId).get();

  return {
    success: true,
    performance: perfSnap.exists ? { id: perfSnap.id, ...perfSnap.data() } : null,
  };
});
