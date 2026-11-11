// GO7 vendor wallet — earnings ledger, 8% launch commission on food subtotal

import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { db } from "../config/firebase";
import {
  VENDOR_COMMISSION_RATE,
  VENDOR_COMMISSION_PERCENT,
  VENDOR_MIN_WITHDRAWAL,
} from "../constants/vendorCommission";

export { VENDOR_COMMISSION_RATE, VENDOR_COMMISSION_PERCENT, VENDOR_MIN_WITHDRAWAL };

/** Default wallet fields for new vendor documents */
export const getDefaultVendorWalletFields = () => ({
  totalEarnings: 0,
  availableBalance: 0,
  pendingPayout: 0,
  totalPaidOut: 0,
  commissionRate: VENDOR_COMMISSION_RATE,
  walletInitialized: true,
});

/**
 * Food subtotal only — commission does not apply to delivery or service fees.
 */
export const getOrderFoodSubtotal = (order = {}) => {
  if (typeof order.subtotal === "number" && order.subtotal > 0) {
    return Math.round(order.subtotal);
  }
  if (typeof order.itemsTotal === "number" && order.itemsTotal > 0) {
    return Math.round(order.itemsTotal);
  }
  if (Array.isArray(order.items) && order.items.length > 0) {
    const sum = order.items.reduce(
      (acc, item) => acc + (Number(item.itemTotal ?? item.total ?? item.price * item.quantity) || 0),
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
};

export const calculateVendorEarnings = (foodSubtotal, commissionRate = VENDOR_COMMISSION_RATE) => {
  const gross = Math.round(foodSubtotal);
  const commission = Math.round(gross * commissionRate);
  const vendorEarnings = gross - commission;
  return { gross, commission, vendorEarnings, commissionRate };
};

const isOrderComplete = (order = {}) => {
  const status = order.status || order.orderStatus || "";
  return ["delivered", "completed"].includes(status);
};

/**
 * Credit vendor wallet when an order is delivered/completed. Idempotent per orderId.
 */
export const creditVendorOrderEarnings = async (orderId, orderData = {}) => {
  if (!orderId) return { skipped: true, reason: "missing_order_id" };

  const vendorId = orderData.vendorId;
  if (!vendorId) return { skipped: true, reason: "missing_vendor_id" };

  if (orderData.vendorEarningsCredited) {
    return { skipped: true, reason: "already_credited" };
  }

  if (!isOrderComplete(orderData)) {
    return { skipped: true, reason: "order_not_complete" };
  }

  const foodSubtotal = getOrderFoodSubtotal(orderData);
  if (foodSubtotal <= 0) {
    return { skipped: true, reason: "zero_subtotal" };
  }

  const rate = orderData.commissionRate ?? VENDOR_COMMISSION_RATE;
  const { gross, commission, vendorEarnings } = calculateVendorEarnings(foodSubtotal, rate);
  const orderLabel = orderData.orderNumber || orderData.orderId || orderId;

  const vendorRef = doc(db, "vendors", vendorId);
  const orderRef = doc(db, "orders", orderId);

  let credited = false;

  try {
    await runTransaction(db, async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      const order = orderSnap.exists() ? orderSnap.data() : orderData;

      if (order.vendorEarningsCredited) {
        throw new Error("ALREADY_CREDITED");
      }

      const vendorSnap = await transaction.get(vendorRef);
      if (!vendorSnap.exists()) {
        throw new Error("VENDOR_NOT_FOUND");
      }

    const vendor = vendorSnap.data();
    const defaults = getDefaultVendorWalletFields();
    const priorOrderCount = vendor.totalOrders ?? 0;

    transaction.update(vendorRef, {
      totalEarnings: (vendor.totalEarnings ?? defaults.totalEarnings) + vendorEarnings,
      availableBalance:
        (vendor.availableBalance ?? vendor.pendingBalance ?? defaults.availableBalance) + vendorEarnings,
      totalOrders: priorOrderCount + 1,
      ...(priorOrderCount === 0
        ? { hasFirstOrder: true, firstOrderAt: serverTimestamp() }
        : {}),
      commissionRate: rate,
        lastEarningDate: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (orderSnap.exists()) {
        transaction.update(orderRef, {
          vendorEarningsCredited: true,
          vendorEarningsAmount: vendorEarnings,
          vendorCommissionAmount: commission,
          vendorCommissionRate: rate,
          vendorFoodSubtotal: gross,
          vendorEarningsCreditedAt: serverTimestamp(),
        });
      }
    });
    credited = true;
  } catch (err) {
    if (err.message === "ALREADY_CREDITED") {
      return { skipped: true, reason: "already_credited" };
    }
    throw err;
  }

  if (!credited) {
    return { skipped: true, reason: "not_credited" };
  }

  await addDoc(collection(db, "vendorTransactions"), {
    vendorId,
    orderId,
    type: "credit",
    amount: vendorEarnings,
    grossAmount: gross,
    commissionAmount: commission,
    commissionRate: rate,
    netAmount: vendorEarnings,
    orderNumber: orderLabel,
    description: `Order ${orderLabel} — Gross ₦${gross.toLocaleString()} · Go7 fee (${VENDOR_COMMISSION_PERCENT}%) ₦${commission.toLocaleString()}`,
    status: "available",
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  console.log(`✅ Vendor ${vendorId} credited ₦${vendorEarnings} (order ${orderId})`);
  return { success: true, vendorEarnings, commission, gross };
};

/**
 * @deprecated Use creditVendorOrderEarnings — kept for compatibility
 */
export const updateVendorEarnings = async (vendorId, orderTotal, orderId, commissionRate = VENDOR_COMMISSION_RATE) => {
  return creditVendorOrderEarnings(orderId, {
    vendorId,
    subtotal: orderTotal,
    status: "delivered",
    commissionRate,
  });
};

const generatePayoutReference = (vendorId) => {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `GO7-PAY-${vendorId.slice(0, 6)}-${Date.now()}-${suffix}`;
};

/**
 * Request withdrawal — creates payoutRequests row; Cloud Function auto-sends via Paystack.
 */
export const requestVendorWithdrawal = async (vendorId, amount) => {
  return requestWithdrawal(vendorId, amount);
};

export const requestWithdrawal = async (vendorId, amount) => {
  const payoutAmount = Math.round(Number(amount));
  if (!payoutAmount || payoutAmount <= 0) {
    throw new Error("Please enter a valid withdrawal amount");
  }
  if (payoutAmount < VENDOR_MIN_WITHDRAWAL) {
    throw new Error(`Minimum withdrawal amount is ₦${VENDOR_MIN_WITHDRAWAL.toLocaleString()}`);
  }

  const vendorRef = doc(db, "vendors", vendorId);
  const vendorSnap = await getDoc(vendorRef);
  if (!vendorSnap.exists()) {
    throw new Error("Vendor not found");
  }

  const vendor = vendorSnap.data();
  const available =
    vendor.availableBalance ?? vendor.pendingBalance ?? 0;

  if (payoutAmount > available) {
    throw new Error(`Insufficient balance. Available: ₦${available.toLocaleString()}`);
  }

  const bank = vendor.bankDetails;
  if (!bank?.accountNumber || !bank?.bankName || !bank?.accountName) {
    throw new Error("Bank details not configured. Please update your profile.");
  }

  const reference = generatePayoutReference(vendorId);
  const vendorName =
    vendor.businessName || vendor.name || vendor.shopName || "Vendor";

  const payoutRef = await addDoc(collection(db, "payoutRequests"), {
    vendorId,
    vendorName,
    amount: payoutAmount,
    currency: "NGN",
    status: "pending",
    bankDetails: {
      accountName: bank.accountName,
      accountNumber: bank.accountNumber,
      bankName: bank.bankName,
      bankCode: bank.bankCode || null,
    },
    reference,
    requestedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    note: "Instant Paystack transfer",
  });

  await updateDoc(vendorRef, {
    availableBalance: available - payoutAmount,
    pendingPayout: (vendor.pendingPayout ?? 0) + payoutAmount,
    lastWithdrawalRequestAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "vendorTransactions"), {
    vendorId,
    payoutRequestId: payoutRef.id,
    type: "debit",
    amount: payoutAmount,
    description: `Withdrawal request — Ref ${reference} (Go7 ${VENDOR_COMMISSION_PERCENT}% commission applies to food sales, not this payout)`,
    status: "pending",
    reference,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  return reference;
};

export const getVendorWallet = async (vendorId) => {
  const vendorRef = doc(db, "vendors", vendorId);
  const vendorSnap = await getDoc(vendorRef);
  if (!vendorSnap.exists()) {
    throw new Error("Vendor not found");
  }

  const vendor = vendorSnap.data();
  const available = vendor.availableBalance ?? vendor.pendingBalance ?? 0;

  return {
    totalEarnings: vendor.totalEarnings ?? 0,
    availableBalance: available,
    pendingBalance: available,
    pendingPayout: vendor.pendingPayout ?? 0,
    totalPaidOut: vendor.totalPaidOut ?? vendor.withdrawnBalance ?? 0,
    withdrawnBalance: vendor.totalPaidOut ?? vendor.withdrawnBalance ?? 0,
    totalOrders: vendor.totalOrders ?? 0,
    commissionRate: vendor.commissionRate ?? VENDOR_COMMISSION_RATE,
    bankDetails: vendor.bankDetails ?? null,
    lastEarningDate: vendor.lastEarningDate ?? null,
    lastWithdrawalDate: vendor.lastWithdrawalDate ?? null,
    lastWithdrawalAmount: vendor.lastWithdrawalAmount ?? 0,
  };
};

export const updateVendorBankDetails = async (vendorId, bankDetails) => {
  const vendorRef = doc(db, "vendors", vendorId);
  await updateDoc(vendorRef, {
    bankDetails: {
      accountNumber: bankDetails.accountNumber,
      bankName: bankDetails.bankName,
      accountName: bankDetails.accountName,
      bankCode: bankDetails.bankCode || null,
      updatedAt: serverTimestamp(),
    },
    paystackRecipientCode: null,
    updatedAt: serverTimestamp(),
  });
  return { success: true };
};
