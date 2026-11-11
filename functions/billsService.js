/**
 * SME API (smeapi.com.ng) integration — airtime + data bundle purchases,
 * paid for from the customer's GO7 wallet.
 *
 * Docs: https://www.smeapi.com.ng/apidocumentation.html
 */
const functions = require('firebase-functions/v1');
const admin = require('./adminInit');
const axios = require('axios');
const { applyMarkup, loadBillsPricing } = require('./billsPricing');

const db = admin.firestore();

const SMEAPI_KEY = functions.config().smeapi?.key;
const SMEAPI_BASE = 'https://smeapi.com.ng/api';

// Convention shared by this vendor's platform (confirmed against sample payloads).
const NETWORK_IDS = { MTN: 1, AIRTEL: 2, GLO: 3, '9MOBILE': 4 };

/** Short in-memory cache so we don't hit SME dataplans on every purchase. */
let plansCache = { at: 0, plans: [] };
const PLANS_CACHE_MS = 5 * 60 * 1000;

/** SME catalog still returns these Airtel IDs but purchase fails with "invalid". */
const BLOCKED_DATA_PLAN_IDS = new Set([73, 76, 77]);

async function resolveDataPlan(client, dataPlanId) {
  if (BLOCKED_DATA_PLAN_IDS.has(Number(dataPlanId))) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'That data plan is temporarily unavailable. Please pick another plan.'
    );
  }
  const now = Date.now();
  if (!plansCache.plans.length || now - plansCache.at > PLANS_CACHE_MS) {
    const res = await client.get('/dataplans/');
    const plans = Array.isArray(res.data?.data) ? res.data.data : [];
    plansCache = { at: now, plans };
  }
  const plan = plansCache.plans.find((p) => Number(p.id) === Number(dataPlanId));
  if (!plan) {
    throw new functions.https.HttpsError('not-found', 'That data plan is no longer available. Please pick another.');
  }
  const cost = Number(plan.price || plan.user_price);
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new functions.https.HttpsError('failed-precondition', 'Data plan price is unavailable right now');
  }
  return { plan, cost };
}

function getClient() {
  const apiKey = SMEAPI_KEY;
  if (!apiKey) return null;
  return axios.create({
    baseURL: SMEAPI_BASE,
    timeout: 20000,
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeNetwork(input) {
  const key = String(input || '').trim().toUpperCase();
  if (NETWORK_IDS[key]) return NETWORK_IDS[key];
  const asNum = Number(input);
  if (Number.isFinite(asNum) && asNum > 0) return asNum;
  return null;
}

function isValidNgPhone(phone) {
  return /^0\d{10}$/.test(String(phone || '').trim());
}

function makeRef(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

/**
 * SME (and similar VTU APIs) return mixed success shapes:
 *   { status: "success", Status: "successful" }
 *   { status: "true" } / { status: true }
 * Older code only accepted "true", which falsely failed real deliveries and refunded.
 */
function isVendorPurchaseSuccess(vendorResult) {
  if (!vendorResult || typeof vendorResult !== 'object') return false;

  const raw = [
    vendorResult.status,
    vendorResult.Status,
    vendorResult.STATUS,
    vendorResult.code,
  ]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v).trim().toLowerCase());

  const ok = new Set(['true', '1', 'success', 'successful', 'ok', 'delivered', 'completed']);
  if (raw.some((v) => ok.has(v))) return true;

  // Nested payload sometimes embeds status in api_response JSON string
  const apiResponse = vendorResult.api_response;
  if (typeof apiResponse === 'string') {
    const lower = apiResponse.toLowerCase();
    if (
      lower.includes('"status":"success"') ||
      lower.includes('"status": "success"') ||
      lower.includes('activation was successful') ||
      lower.includes('successfully sent') ||
      lower.includes('successfully delivered')
    ) {
      return true;
    }
  }

  return false;
}

function extractVendorErrorMessage(vendorResult, fallback = 'Purchase failed and was refunded to your wallet') {
  if (!vendorResult || typeof vendorResult !== 'object') return fallback;
  const candidates = [
    vendorResult.api_response,
    vendorResult.message,
    vendorResult.msg,
    vendorResult.error,
    vendorResult.detail,
    vendorResult.Error,
    vendorResult.Message,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      // api_response sometimes embeds a JSON string
      const trimmed = c.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed?.message) return clarifyProviderWalletMessage(String(parsed.message));
        } catch {
          /* use raw */
        }
      }
      return clarifyProviderWalletMessage(
        trimmed.length > 220 ? `${trimmed.slice(0, 217)}…` : trimmed
      );
    }
  }
  // Some SME fail bodies only set status/Status with no message
  const statusBits = [vendorResult.status, vendorResult.Status]
    .filter((v) => v !== undefined && v !== null)
    .map((v) => String(v).trim())
    .filter(Boolean);
  if (statusBits.length && !isVendorPurchaseSuccess(vendorResult)) {
    return `Network provider declined (${statusBits.join('/')}). Your GO7 wallet was refunded.`;
  }
  return fallback;
}

/** SME agent-wallet errors sound like the customer's GO7 balance — reword them. */
function clarifyProviderWalletMessage(msg) {
  if (/insufficient balance/i.test(msg) && /fund your wallet/i.test(msg)) {
    return 'Data provider is temporarily out of stock. Your GO7 wallet was refunded — please try again shortly.';
  }
  if (/insufficient balance/i.test(msg)) {
    return 'Data provider could not complete this purchase. Your GO7 wallet was refunded.';
  }
  if (/Data Plan ID is invalid|invalid plan/i.test(msg)) {
    return 'This data plan is unavailable right now. Your GO7 wallet was refunded — please pick another plan.';
  }
  return msg;
}

/**
 * SME may return HTTP 400 with a JSON body { status: "fail", api_response: "..." }.
 * Axios throws on that — treat the body as a normal vendor result so we don't
 * mislabel it as "could not reach provider".
 */
async function invokeVendor(callVendor) {
  try {
    return await callVendor();
  } catch (err) {
    const data = err?.response?.data;
    if (data && typeof data === 'object') {
      return data;
    }
    throw err;
  }
}

/**
 * Runs the wallet debit + records a pending bill-payment transaction atomically,
 * then calls the vendor API. On vendor failure, refunds the wallet automatically.
 */
async function debitWalletAndCall({ uid, amount, kind, meta, callVendor }) {
  const walletRef = db.collection('wallets').doc(uid);
  const userRef = db.collection('users').doc(uid);
  const billRef = db.collection('billPayments').doc();

  let previousBalance = 0;
  let newBalance = 0;

  await db.runTransaction(async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const userDoc = await transaction.get(userRef);

    const walletsBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    const legacyBalance = userDoc.exists ? Number(userDoc.data().walletBalance) || 0 : 0;
    previousBalance = Math.max(walletsBalance, legacyBalance);

    if (previousBalance < amount) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Insufficient wallet balance. Available: ₦${previousBalance.toLocaleString('en-NG')}, Required: ₦${amount.toLocaleString('en-NG')}`
      );
    }

    newBalance = previousBalance - amount;

    transaction.set(walletRef, {
      balance: newBalance,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(userRef, {
      walletBalance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(walletRef.collection('transactions').doc(billRef.id), {
      type: 'debit',
      amount,
      description: meta.description,
      previousBalance,
      newBalance,
      category: kind === 'airtime' ? 'airtime' : 'data',
      status: 'completed',
      kind,
      source: 'bill_payment',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { source: 'bill_payment', kind, ...meta },
    });

    transaction.set(billRef, {
      uid,
      kind,
      amount,
      status: 'pending',
      ...meta,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  try {
    const vendorResult = await invokeVendor(callVendor);
    const success = isVendorPurchaseSuccess(vendorResult);

    await billRef.update({
      status: success ? 'successful' : 'failed',
      vendorResponse: vendorResult,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    if (!success) {
      const reason = extractVendorErrorMessage(vendorResult);
      await refundWallet({ uid, amount, billId: billRef.id, reason });
      throw new functions.https.HttpsError('aborted', reason);
    }

    let balanceAfter = newBalance;
    let cashbackNaira = 0;
    if (kind === 'airtime') {
      const cashback = Math.round(Number(meta.cashbackNaira) || 0);
      if (cashback > 0) {
        try {
          const credited = await creditAirtimeCashback({
            uid,
            amount: cashback,
            billId: billRef.id,
          });
          if (credited) {
            cashbackNaira = credited.cashback;
            balanceAfter = credited.newBalance;
          }
        } catch (cashbackErr) {
          console.error('Airtime cashback failed (purchase already delivered):', cashbackErr?.message || cashbackErr);
        }
      }
    }

    return {
      success: true,
      transactionId: billRef.id,
      newBalance: balanceAfter,
      cashbackNaira,
      vendor: vendorResult,
    };
  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;

    await billRef.update({
      status: 'failed',
      error: err.message,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    await refundWallet({ uid, amount, billId: billRef.id, reason: err.message || 'Provider request failed' });
    throw new functions.https.HttpsError('internal', 'Could not reach the bill payment provider. Your wallet has been refunded.');
  }
}

async function refundWallet({ uid, amount, billId, reason }) {
  const walletRef = db.collection('wallets').doc(uid);
  const userRef = db.collection('users').doc(uid);

  await db.runTransaction(async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const currentBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    const refundedBalance = currentBalance + amount;

    transaction.set(walletRef, {
      balance: refundedBalance,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(userRef, {
      walletBalance: refundedBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(walletRef.collection('transactions').doc(`refund_${billId}`), {
      type: 'credit',
      amount,
      description: `Refund: ${reason}`,
      previousBalance: currentBalance,
      newBalance: refundedBalance,
      category: 'refund',
      status: 'completed',
      source: 'bill_payment_refund',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { source: 'bill_payment_refund', billId, reason },
    });
  });
}

/** Credit flat airtime cashback after a successful vendor delivery. */
async function creditAirtimeCashback({ uid, amount, billId }) {
  const cashback = Math.round(Number(amount) || 0);
  if (!Number.isFinite(cashback) || cashback <= 0) return null;

  const walletRef = db.collection('wallets').doc(uid);
  const userRef = db.collection('users').doc(uid);
  let newBalance = 0;

  await db.runTransaction(async (transaction) => {
    const walletDoc = await transaction.get(walletRef);
    const currentBalance = walletDoc.exists ? Number(walletDoc.data().balance) || 0 : 0;
    newBalance = currentBalance + cashback;

    transaction.set(walletRef, {
      balance: newBalance,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(userRef, {
      walletBalance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    transaction.set(walletRef.collection('transactions').doc(`cashback_${billId}`), {
      type: 'credit',
      amount: cashback,
      description: `Airtime cashback ₦${cashback.toLocaleString('en-NG')}`,
      previousBalance: currentBalance,
      newBalance,
      category: 'cashback',
      status: 'completed',
      source: 'airtime_cashback',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { source: 'airtime_cashback', billId, amount: cashback },
    });

    transaction.set(db.collection('billPayments').doc(billId), {
      cashbackNaira: cashback,
      cashbackAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  return { cashback, newBalance };
}

/**
 * Internal bot-safe airtime purchase (same logic as the callable below).
 */
async function purchaseAirtimeInternal(data, uid) {
  const client = getClient();
  if (!client) {
    throw new functions.https.HttpsError('failed-precondition', 'Bill payments are temporarily unavailable');
  }

  const { network, phone } = data;
  const faceAmount = Math.round(Number(data.amount));
  const networkId = normalizeNetwork(network);

  if (!networkId || !isValidNgPhone(phone) || !Number.isFinite(faceAmount) || faceAmount < 50) {
    throw new functions.https.HttpsError('invalid-argument', 'Please provide a valid network, phone number and amount (min ₦50)');
  }

  const pricing = await loadBillsPricing(db);
  const { cost, sellPrice, margin } = applyMarkup(faceAmount, 'airtime', pricing);
  const cashbackNaira = Math.max(0, Math.round(Number(pricing.airtimeCashbackNaira) || 0));
  const ref = makeRef('GO7AIR');

  return debitWalletAndCall({
    uid,
    amount: sellPrice,
    kind: 'airtime',
    meta: {
      network: String(network),
      networkId,
      phone,
      ref,
      faceAmount: cost,
      cost,
      sellPrice,
      margin,
      cashbackNaira,
      description: `${String(network).toUpperCase()} airtime for ${phone}`,
    },
    callVendor: async () => {
      const res = await client.post('/airtime/', {
        network: networkId,
        amount: cost,
        phone,
        ref,
        ported_number: 'false',
      });
      return res.data;
    },
  });
}

/**
 * Callable: purchase airtime for any Nigerian network, debited from GO7 wallet.
 */
exports.purchaseAirtime = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  return purchaseAirtimeInternal(data, context.auth.uid);
});

exports.purchaseAirtimeInternal = purchaseAirtimeInternal;

/**
 * Internal bot-safe data-bundle purchase (same logic as the callable below).
 */
async function purchaseDataBundleInternal(data, uid) {
  const client = getClient();
  if (!client) {
    throw new functions.https.HttpsError('failed-precondition', 'Bill payments are temporarily unavailable');
  }

  const { network, phone } = data;
  const dataPlan = Number(data.dataPlan);
  const networkId = normalizeNetwork(network);

  if (!networkId || !isValidNgPhone(phone) || !Number.isFinite(dataPlan) || dataPlan <= 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Please provide a valid network, phone number and data plan');
  }

  const { plan, cost } = await resolveDataPlan(client, dataPlan);
  const planNetworkId = normalizeNetwork(plan.network);
  if (planNetworkId && planNetworkId !== networkId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Selected data plan does not match the chosen network. Please pick the plan again.'
    );
  }

  const pricing = await loadBillsPricing(db);
  const priced = applyMarkup(cost, 'data', pricing, { planId: dataPlan });
  const ref = makeRef('GO7DATA');
  const isAwoof = /awoof/i.test(String(plan.name || ''));
  const planLabel = isAwoof
    ? `${String(plan.name).replace(/\s*\(?\s*awoof\)?\s*/gi, ' ').replace(/[()]+/g, ' ').replace(/\s+/g, ' ').trim()} Awoof data`
    : String(plan.name).trim();

  const ported =
    data.portedNumber === true ||
    data.ported_number === true ||
    String(data.portedNumber || data.ported_number || '').toLowerCase() === 'true'
      ? 'true'
      : 'false';

  return debitWalletAndCall({
    uid,
    amount: priced.sellPrice,
    kind: 'data',
    meta: {
      network: String(network),
      networkId,
      phone,
      dataPlan,
      planName: plan.name,
      planDays: plan.days,
      planType: plan.type,
      portedNumber: ported,
      ref,
      cost: priced.cost,
      sellPrice: priced.sellPrice,
      margin: priced.margin,
      isHero: priced.isHero || isAwoof,
      markupPercent: priced.markupPercent,
      description: `${String(network).toUpperCase()} ${planLabel} (${plan.days}) for ${phone}`,
    },
    callVendor: async () => {
      const payload = {
        network: networkId,
        data_plan: dataPlan,
        phone: String(phone).trim(),
        ref,
        ported_number: ported,
      };
      const res = await client.post('/data/', payload);
      return res.data;
    },
  });
}

/**
 * Callable: purchase a data bundle, debited from GO7 wallet.
 * `dataPlan` must be an id from GET https://smeapi.com.ng/api/dataplans/
 */
exports.purchaseDataBundle = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  return purchaseDataBundleInternal(data, context.auth.uid);
});

exports.purchaseDataBundleInternal = purchaseDataBundleInternal;
