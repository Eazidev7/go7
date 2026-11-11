/**
 * ====================================================================
 * AGENT EARNINGS & WITHDRAWAL SYSTEM
 * ====================================================================
 * 
 * Business Logic:
 * - Agents earn ₦3,000 when a vendor goes live
 * - Agents earn ₦1,500 when vendor gets first order
 * - Earnings start as "pending" and move to "approved" by admin
 * - Withdrawals require minimum ₦5,000 available balance
 * 
 * Collections:
 * - agents: Agent profiles with balance tracking
 * - vendors: Vendor profiles linked to agents
 * - agentEarnings: Individual earning records
 * - withdrawals: Withdrawal request records
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize Firestore
const db = admin.firestore();

// ====================================================================
// CONSTANTS
// ====================================================================

// Excludes visually ambiguous characters (0/O, 1/I/L) so agents can read
// and retype codes accurately over phone/WhatsApp without transcription
// errors (unlike raw Firestore doc IDs, e.g. mixing up "I" and "l").
const AGENT_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateSafeAgentCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += AGENT_CODE_ALPHABET[Math.floor(Math.random() * AGENT_CODE_ALPHABET.length)];
  }
  return `GO7-${code}`;
}

async function generateUniqueAgentCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateSafeAgentCode();
    const existing = await db.collection('agents').where('agentCode', '==', code).limit(1).get();
    if (existing.empty) return code;
  }
  // Astronomically unlikely fallback
  return `GO7-${Date.now().toString(36).toUpperCase()}`;
}

const EARNINGS = {
  REGISTRATION: 3000,  // When vendor goes live
  ACTIVATION: 1500,    // When vendor gets first order
};

/** 1% of vendor food subtotal per delivered order */
const ORDER_ACTIVITY_RATE = 0.01;

const MINIMUM_WITHDRAWAL = 5000;

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

/**
 * Create a new agent earning record
 */
async function createEarning(agentId, vendorId, type, amount, extra = {}) {
  try {
    const earningData = {
      agentId,
      vendorId,
      type,
      amount,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...extra,
    };

    const earningRef = await db.collection('agentEarnings').add(earningData);

    // Update agent's pending balance
    const agentRef = db.collection('agents').doc(agentId);
    await agentRef.update({
      pendingBalance: admin.firestore.FieldValue.increment(amount),
      totalEarnings: admin.firestore.FieldValue.increment(amount),
      lastEarningDate: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Created ${type} earning of ₦${amount} for agent ${agentId}`);
    return earningRef.id;
  } catch (error) {
    console.error('Error creating earning:', error);
    throw error;
  }
}

/**
 * Check if earning already exists to prevent duplicates
 */
async function earningExists(vendorId, type) {
  const snapshot = await db.collection('agentEarnings')
    .where('vendorId', '==', vendorId)
    .where('type', '==', type)
    .limit(1)
    .get();

  return !snapshot.empty;
}

/**
 * Credit agent for ongoing vendor order activity (1% of food subtotal).
 */
async function creditAgentOrderActivity(agentId, vendorId, orderId, foodSubtotal) {
  const amount = Math.round(Number(foodSubtotal) * ORDER_ACTIVITY_RATE);
  if (!agentId || amount <= 0) return null;

  const dup = await db.collection('agentEarnings')
    .where('vendorId', '==', vendorId)
    .where('orderId', '==', orderId)
    .where('type', '==', 'order_activity')
    .limit(1)
    .get();
  if (!dup.empty) return null;

  return createEarning(agentId, vendorId, 'order_activity', amount, {
    orderId,
    foodSubtotal: Math.round(foodSubtotal),
    commissionRate: ORDER_ACTIVITY_RATE,
  });
}

// ====================================================================
// CLOUD FUNCTIONS - AUTO TRIGGERS
// ====================================================================

/**
 * TRIGGER: When vendor goes live (isLive = true)
 * Creates ₦3,000 registration earning
 */
exports.onVendorGoLive = functions.firestore
  .document('vendors/{vendorId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const vendorId = context.params.vendorId;

    // Check if vendor just went live
    if (!before.isLive && after.isLive && after.agentId) {
      console.log(`🚀 Vendor ${vendorId} went live!`);

      // Check for duplicate earning
      const exists = await earningExists(vendorId, 'registration');
      if (exists) {
        console.log('⚠️ Registration earning already exists, skipping');
        return null;
      }

      try {
        await createEarning(
          after.agentId,
          vendorId,
          'registration',
          EARNINGS.REGISTRATION
        );

        // Send notification to agent (optional)
        await db.collection('notifications').add({
          userId: after.agentId,
          type: 'earning_pending',
          title: 'New Earning! 🎉',
          message: `You earned ₦${EARNINGS.REGISTRATION.toLocaleString()} for ${after.name || 'vendor'} registration`,
          amount: EARNINGS.REGISTRATION,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, amount: EARNINGS.REGISTRATION };
      } catch (error) {
        console.error('Error processing vendor live earning:', error);
        return { success: false, error: error.message };
      }
    }

    return null;
  });

/**
 * TRIGGER: When vendor gets first order (hasFirstOrder = true)
 * Creates ₦1,500 activation earning
 */
exports.onVendorFirstOrder = functions.firestore
  .document('vendors/{vendorId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const vendorId = context.params.vendorId;

    // Check if vendor just got first order
    if (!before.hasFirstOrder && after.hasFirstOrder && after.agentId) {
      console.log(`🎉 Vendor ${vendorId} got first order!`);

      // Check for duplicate earning
      const exists = await earningExists(vendorId, 'activation');
      if (exists) {
        console.log('⚠️ Activation earning already exists, skipping');
        return null;
      }

      // Verify vendor is live
      if (!after.isLive) {
        console.log('⚠️ Vendor not live yet, skipping activation earning');
        return null;
      }

      try {
        await createEarning(
          after.agentId,
          vendorId,
          'activation',
          EARNINGS.ACTIVATION
        );

        // Send notification to agent
        await db.collection('notifications').add({
          userId: after.agentId,
          type: 'earning_pending',
          title: 'Activation Bonus! 🎊',
          message: `You earned ₦${EARNINGS.ACTIVATION.toLocaleString()} for ${after.name || 'vendor'} first order`,
          amount: EARNINGS.ACTIVATION,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, amount: EARNINGS.ACTIVATION };
      } catch (error) {
        console.error('Error processing vendor activation earning:', error);
        return { success: false, error: error.message };
      }
    }

    return null;
  });

/**
 * TRIGGER: When vendor earnings are credited on an order — agent ongoing commission (1%)
 */
exports.onVendorOrderEarningsCredited = functions.firestore
  .document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const orderId = context.params.orderId;

    if (before.vendorEarningsCredited || !after.vendorEarningsCredited || !after.vendorId) {
      return null;
    }

    const vendorSnap = await db.collection('vendors').doc(after.vendorId).get();
    if (!vendorSnap.exists || !vendorSnap.data().agentId) {
      return null;
    }

    const gross = after.vendorFoodSubtotal
      || after.subtotal
      || 0;

    try {
      await creditAgentOrderActivity(
        vendorSnap.data().agentId,
        after.vendorId,
        orderId,
        gross
      );
    } catch (error) {
      console.error('onVendorOrderEarningsCredited:', error);
    }
    return null;
  });

// ====================================================================
// CALLABLE FUNCTIONS - API ENDPOINTS
// ====================================================================

/**
 * Create a new agent profile
 * POST /agent/create
 */
exports.createAgent = functions.https.onCall(async (data, context) => {
  try {
    // Validate required fields
    if (!data.name || !data.phone) {
      throw new functions.https.HttpsError('invalid-argument', 'Name and phone are required');
    }

    // Check if agent with phone already exists
    const existingAgent = await db.collection('agents')
      .where('phone', '==', data.phone)
      .limit(1)
      .get();

    if (!existingAgent.empty) {
      throw new functions.https.HttpsError('already-exists', 'Agent with this phone number already exists');
    }

    const agentData = {
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      bankName: data.bankName || null,
      accountNumber: data.accountNumber || null,
      accountName: data.accountName || null,
      agentCode: await generateUniqueAgentCode(),
      totalEarnings: 0,
      availableBalance: 0,
      pendingBalance: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };

    // Use provided uid as document ID if available, otherwise auto-generate
    let agentId;
    if (data.uid) {
      await db.collection('agents').doc(data.uid).set(agentData);
      agentId = data.uid;
    } else {
      const agentRef = await db.collection('agents').add(agentData);
      agentId = agentRef.id;
    }
    
    console.log(`✅ Created new agent: ${agentId}`);
    return { success: true, agentId: agentId };
  } catch (error) {
    console.error('Error creating agent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Create a new vendor profile
 * POST /vendor/create
 */
exports.createVendor = functions.https.onCall(async (data, context) => {
  try {
    // Validate required fields
    if (!data.name || !data.agentId) {
      throw new functions.https.HttpsError('invalid-argument', 'Name and agentId are required');
    }

    // Verify agent exists
    const agentDoc = await db.collection('agents').doc(data.agentId).get();
    if (!agentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Agent not found');
    }

    const vendorData = {
      name: data.name,
      location: data.location || null,
      agentId: data.agentId,
      isLive: data.isLive || false,
      hasFirstOrder: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };

    const vendorRef = await db.collection('vendors').add(vendorData);
    
    console.log(`✅ Created new vendor: ${vendorRef.id}`);
    return { success: true, vendorId: vendorRef.id };
  } catch (error) {
    console.error('Error creating vendor:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Approve an earning (Admin only)
 * POST /earning/approve
 */
exports.approveEarning = functions.https.onCall(async (data, context) => {
  try {
    // TODO: Add admin authentication check
    // if (!context.auth || !context.auth.token.admin) {
    //   throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    // }

    const { earningId } = data;
    if (!earningId) {
      throw new functions.https.HttpsError('invalid-argument', 'earningId is required');
    }

    // Get earning document
    const earningRef = db.collection('agentEarnings').doc(earningId);
    const earningDoc = await earningRef.get();

    if (!earningDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Earning not found');
    }

    const earning = earningDoc.data();

    if (earning.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Earning is not pending');
    }

    // Update earning status
    await earningRef.update({
      status: 'approved',
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: context.auth?.uid || 'admin'
    });

    // Move from pending to available balance
    const agentRef = db.collection('agents').doc(earning.agentId);
    await agentRef.update({
      pendingBalance: admin.firestore.FieldValue.increment(-earning.amount),
      availableBalance: admin.firestore.FieldValue.increment(earning.amount)
    });

    // Send notification to agent
    await db.collection('notifications').add({
      userId: earning.agentId,
      type: 'earning_approved',
      title: 'Earning Approved! ✅',
      message: `₦${earning.amount.toLocaleString()} has been approved and added to your available balance`,
      amount: earning.amount,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Approved earning ${earningId} for ₦${earning.amount}`);
    return { success: true, amount: earning.amount };
  } catch (error) {
    console.error('Error approving earning:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Request withdrawal (Agent)
 * POST /withdraw/request
 */
exports.requestWithdrawal = functions.https.onCall(async (data, context) => {
  try {
    const { agentId, amount } = data;

    // Validate inputs
    if (!agentId || !amount) {
      throw new functions.https.HttpsError('invalid-argument', 'agentId and amount are required');
    }

    if (amount < MINIMUM_WITHDRAWAL) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Minimum withdrawal is ₦${MINIMUM_WITHDRAWAL.toLocaleString()}`
      );
    }

    // Get agent document
    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Agent not found');
    }

    const agent = agentDoc.data();

    // Check if sufficient balance
    if (agent.availableBalance < amount) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Insufficient balance. Available: ₦${agent.availableBalance.toLocaleString()}`
      );
    }

    // Validate bank details
    if (!agent.bankName || !agent.accountNumber) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Please update your bank details before requesting withdrawal'
      );
    }

    // Create withdrawal request
    const withdrawalData = {
      agentId,
      amount,
      bankName: agent.bankName,
      accountNumber: agent.accountNumber,
      agentName: agent.name,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const withdrawalRef = await db.collection('withdrawals').add(withdrawalData);

    // Deduct from available balance
    await agentRef.update({
      availableBalance: admin.firestore.FieldValue.increment(-amount)
    });

    // Send notification
    await db.collection('notifications').add({
      userId: agentId,
      type: 'withdrawal_requested',
      title: 'Withdrawal Requested',
      message: `Your withdrawal request of ₦${amount.toLocaleString()} is being processed`,
      amount,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Withdrawal requested: ${withdrawalRef.id} for ₦${amount}`);
    return { success: true, withdrawalId: withdrawalRef.id };
  } catch (error) {
    console.error('Error requesting withdrawal:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Mark withdrawal as paid (Admin only)
 * POST /withdraw/mark-paid
 */
exports.markWithdrawalPaid = functions.https.onCall(async (data, context) => {
  try {
    // TODO: Add admin authentication check
    // if (!context.auth || !context.auth.token.admin) {
    //   throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    // }

    const { withdrawalId, reference } = data;
    if (!withdrawalId) {
      throw new functions.https.HttpsError('invalid-argument', 'withdrawalId is required');
    }

    // Get withdrawal document
    const withdrawalRef = db.collection('withdrawals').doc(withdrawalId);
    const withdrawalDoc = await withdrawalRef.get();

    if (!withdrawalDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Withdrawal not found');
    }

    const withdrawal = withdrawalDoc.data();

    if (withdrawal.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Withdrawal is not pending');
    }

    // Update withdrawal status
    await withdrawalRef.update({
      status: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      paidBy: context.auth?.uid || 'admin',
      reference: reference || null
    });

    // Send notification to agent
    await db.collection('notifications').add({
      userId: withdrawal.agentId,
      type: 'withdrawal_paid',
      title: 'Withdrawal Completed! 💰',
      message: `₦${withdrawal.amount.toLocaleString()} has been sent to your bank account`,
      amount: withdrawal.amount,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Marked withdrawal ${withdrawalId} as paid`);
    return { success: true };
  } catch (error) {
    console.error('Error marking withdrawal as paid:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get agent details with balance
 * GET /agent/:id
 */
exports.getAgent = functions.https.onCall(async (data, context) => {
  try {
    const { agentId } = data;
    if (!agentId) {
      throw new functions.https.HttpsError('invalid-argument', 'agentId is required');
    }

    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Agent not found');
    }

    let agentData = agentDoc.data();

    // Self-heal: agents created before agentCode existed get one lazily,
    // so every agent ends up with a short, typo-resistant shareable code.
    if (!agentData.agentCode) {
      const agentCode = await generateUniqueAgentCode();
      await agentRef.update({ agentCode });
      agentData = { ...agentData, agentCode };
    }

    return {
      success: true,
      agent: {
        id: agentDoc.id,
        ...agentData
      }
    };
  } catch (error) {
    console.error('Error getting agent:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get agent earnings history
 * GET /agent/:id/earnings
 */
exports.getAgentEarnings = functions.https.onCall(async (data, context) => {
  try {
    const { agentId, limit = 50 } = data;
    if (!agentId) {
      throw new functions.https.HttpsError('invalid-argument', 'agentId is required');
    }

    const snapshot = await db.collection('agentEarnings')
      .where('agentId', '==', agentId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const earnings = [];
    snapshot.forEach(doc => {
      earnings.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, earnings };
  } catch (error) {
    console.error('Error getting agent earnings:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get agent withdrawals history
 * GET /agent/:id/withdrawals
 */
exports.getAgentWithdrawals = functions.https.onCall(async (data, context) => {
  try {
    const { agentId, limit = 50 } = data;
    if (!agentId) {
      throw new functions.https.HttpsError('invalid-argument', 'agentId is required');
    }

    const snapshot = await db.collection('withdrawals')
      .where('agentId', '==', agentId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const withdrawals = [];
    snapshot.forEach(doc => {
      withdrawals.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return { success: true, withdrawals };
  } catch (error) {
    console.error('Error getting agent withdrawals:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Update agent bank details
 * POST /agent/update-bank
 */
exports.updateAgentBank = functions.https.onCall(async (data, context) => {
  try {
    const { agentId, bankName, accountNumber } = data;

    if (!agentId || !bankName || !accountNumber) {
      throw new functions.https.HttpsError('invalid-argument', 'agentId, bankName, and accountNumber are required');
    }

    const agentRef = db.collection('agents').doc(agentId);
    const agentDoc = await agentRef.get();

    if (!agentDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Agent not found');
    }

    await agentRef.update({
      bankName,
      accountNumber,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Updated bank details for agent ${agentId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating agent bank:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// ====================================================================
// ADMIN FUNCTIONS
// ====================================================================

/**
 * Get all pending earnings (Admin)
 */
exports.getPendingEarnings = functions.https.onCall(async (data, context) => {
  try {
    // TODO: Add admin authentication check

    const snapshot = await db.collection('agentEarnings')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const earnings = [];
    for (const doc of snapshot.docs) {
      const earning = doc.data();
      
      // Get agent and vendor details
      const agentDoc = await db.collection('agents').doc(earning.agentId).get();
      const vendorDoc = await db.collection('vendors').doc(earning.vendorId).get();

      earnings.push({
        id: doc.id,
        ...earning,
        agentName: agentDoc.exists ? agentDoc.data().name : 'Unknown',
        vendorName: vendorDoc.exists ? vendorDoc.data().name : 'Unknown'
      });
    }

    return { success: true, earnings };
  } catch (error) {
    console.error('Error getting pending earnings:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get all pending withdrawals (Admin)
 */
exports.getPendingWithdrawals = functions.https.onCall(async (data, context) => {
  try {
    // TODO: Add admin authentication check

    const snapshot = await db.collection('withdrawals')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const withdrawals = [];
    for (const doc of snapshot.docs) {
      const withdrawal = doc.data();
      
      // Get agent details
      const agentDoc = await db.collection('agents').doc(withdrawal.agentId).get();

      withdrawals.push({
        id: doc.id,
        ...withdrawal,
        agentName: agentDoc.exists ? agentDoc.data().name : 'Unknown'
      });
    }

    return { success: true, withdrawals };
  } catch (error) {
    console.error('Error getting pending withdrawals:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Public: verify agent ID during vendor registration (no auth required).
 */
/**
 * Look up an agent by phone number for the login flow.
 * Agents authenticate via phone OTP (no Firebase Auth session), so this
 * lookup can't be a direct client-side Firestore query — the `agents`
 * collection read rule requires isAuthenticated(). This callable does the
 * lookup server-side (Admin SDK) and returns only what's needed to start
 * an OTP flow (no balances/financials).
 */
exports.findAgentByPhone = functions.https.onCall(async (data) => {
  const rawPhone = String(data?.phone || '').trim();
  if (!rawPhone) {
    return { found: false, error: 'Phone number is required' };
  }

  try {
    const digits = rawPhone.replace(/\D/g, '');
    let normalized = digits;
    if (normalized.startsWith('234')) {
      normalized = '0' + normalized.substring(3);
    } else if (!normalized.startsWith('0')) {
      normalized = '0' + normalized;
    }

    const formats = new Set([
      normalized,
      normalized.substring(1),
      '234' + normalized.substring(1),
      '+234' + normalized.substring(1),
    ]);

    for (const phone of formats) {
      const snap = await db.collection('agents').where('phone', '==', phone).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const agent = doc.data();
        if (agent.status === 'inactive' || agent.status === 'suspended') {
          return { found: false, error: 'This agent account is not active' };
        }
        return { found: true, agentId: doc.id };
      }
    }

    return { found: false, error: 'No agent account found with this phone number. Please sign up first.' };
  } catch (error) {
    console.error('findAgentByPhone:', error);
    return { found: false, error: 'Could not look up agent. Please try again.' };
  }
});

exports.verifyAgentReferral = functions.https.onCall(async (data) => {
  const input = String(data?.agentId || '').trim();
  if (!input) {
    return { found: false, error: 'Agent ID is required' };
  }

  try {
    const byId = await db.collection('agents').doc(input).get();
    if (byId.exists) {
      const agent = byId.data();
      if (agent.status === 'inactive' || agent.status === 'suspended') {
        return { found: false, error: 'This agent account is not active' };
      }
      return {
        found: true,
        agentId: byId.id,
        agentName: agent.name || 'GO7 Agent',
      };
    }

    const codeSnap = await db.collection('agents')
      .where('agentCode', '==', input.toUpperCase())
      .limit(1)
      .get();
    if (!codeSnap.empty) {
      const doc = codeSnap.docs[0];
      const agent = doc.data();
      return {
        found: true,
        agentId: doc.id,
        agentName: agent.name || 'GO7 Agent',
      };
    }

    const digits = input.replace(/\D/g, '');
    if (digits.length >= 10) {
      const formats = [
        digits.startsWith('0') ? digits : `0${digits.slice(-10)}`,
        digits.startsWith('234') ? digits : `234${digits.replace(/^0/, '')}`,
        `+234${digits.replace(/^0/, '').slice(-10)}`,
      ];
      for (const phone of [...new Set(formats)]) {
        const phoneSnap = await db.collection('agents').where('phone', '==', phone).limit(1).get();
        if (!phoneSnap.empty) {
          const doc = phoneSnap.docs[0];
          return {
            found: true,
            agentId: doc.id,
            agentName: doc.data().name || 'GO7 Agent',
          };
        }
      }
    }

    return { found: false, error: 'Agent ID not found. Check with your GO7 agent.' };
  } catch (error) {
    console.error('verifyAgentReferral:', error);
    return { found: false, error: 'Could not verify agent ID' };
  }
});

module.exports = {
  onVendorGoLive: exports.onVendorGoLive,
  onVendorFirstOrder: exports.onVendorFirstOrder,
  onVendorOrderEarningsCredited: exports.onVendorOrderEarningsCredited,
  createAgent: exports.createAgent,
  createVendor: exports.createVendor,
  approveEarning: exports.approveEarning,
  requestWithdrawal: exports.requestWithdrawal,
  markWithdrawalPaid: exports.markWithdrawalPaid,
  getAgent: exports.getAgent,
  getAgentEarnings: exports.getAgentEarnings,
  getAgentWithdrawals: exports.getAgentWithdrawals,
  updateAgentBank: exports.updateAgentBank,
  getPendingEarnings: exports.getPendingEarnings,
  getPendingWithdrawals: exports.getPendingWithdrawals,
  creditAgentOrderActivity,
  verifyAgentReferral: exports.verifyAgentReferral,
  findAgentByPhone: exports.findAgentByPhone,
};
