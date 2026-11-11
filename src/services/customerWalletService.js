import { 
  collection, 
  doc, 
  addDoc, 
  onSnapshot, 
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../firebase/config.js';
import { pickWalletBalance } from '../utils/walletBalance';

/**
 * Customer Wallet Service for GO7 Secure Wallet System
 * Provides secure wallet operations through Cloud Functions
 */

// Cloud Function references
const debitWalletForDelivery = httpsCallable(functions, 'debitWalletForDelivery');
const refundWalletForFailedPayment = httpsCallable(functions, 'refundWalletForFailedPayment');
const adminWalletAdjustment = httpsCallable(functions, 'adminWalletAdjustment');
const getWalletInfo = httpsCallable(functions, 'getWalletInfo');

/**
 * Get customer wallet information (balance and recent transactions)
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} Wallet information
 */
export async function getCustomerWalletInfo(customerId) {
  try {
    const result = await getWalletInfo({ customerId });
    return result.data;
  } catch (error) {
    console.error('Error getting wallet info:', error);
    throw new Error(error.message || 'Failed to get wallet information');
  }
}

/**
 * Subscribe to real-time wallet balance updates
 * @param {string} customerId - Customer ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToWalletBalance(customerId, callback) {
  const walletRef = doc(db, 'wallets', customerId);
  const userRef = doc(db, 'users', customerId);

  let walletData = null;
  let userData = null;

  const publish = () => {
    callback({
      balance: pickWalletBalance(walletData, userData),
      lastUpdated: walletData?.lastUpdated?.toDate?.() || userData?.updatedAt?.toDate?.() || null,
    });
  };

  const unsubWallet = onSnapshot(walletRef, (snap) => {
    walletData = snap.exists() ? snap.data() : null;
    publish();
  }, () => publish());

  const unsubUser = onSnapshot(userRef, (snap) => {
    userData = snap.exists() ? snap.data() : null;
    publish();
  }, () => publish());

  return () => {
    unsubWallet();
    unsubUser();
  };
}

/**
 * Subscribe to real-time transaction updates
 * @param {string} customerId - Customer ID
 * @param {Function} callback - Callback function to handle updates
 * @param {number} limitCount - Number of transactions to fetch (default: 20)
 * @returns {Function} Unsubscribe function
 */
export function subscribeToTransactions(customerId, callback, limitCount = 20) {
  const transactionsQuery = query(
    collection(db, 'customers', customerId, 'transactions'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  
  return onSnapshot(transactionsQuery, (snapshot) => {
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    callback(transactions);
  }, (error) => {
    console.error('Error subscribing to transactions:', error);
    callback({ error: error.message });
  });
}

/**
 * Create a top-up request (for initiating Paystack payment)
 * @param {string} customerId - Customer ID
 * @param {number} amount - Amount to top up (in Naira)
 * @param {string} email - Customer email for Paystack
 * @param {string} phone - Customer phone number
 * @returns {Promise<Object>} Top-up request data
 */
export async function createTopUpRequest(customerId, amount, email, phone) {
  try {
    // Generate unique reference
    const reference = `topup_${customerId}_${Date.now()}`;
    
    const topUpRequest = {
      customerId: customerId,
      amount: amount,
      email: email,
      phone: phone,
      reference: reference,
      status: 'pending',
      createdAt: serverTimestamp(),
      metadata: {
        source: 'wallet_topup',
        customerId: customerId
      }
    };

    const docRef = await addDoc(collection(db, 'topUpRequests'), topUpRequest);
    
    return {
      id: docRef.id,
      reference: reference,
      amount: amount,
      email: email
    };

  } catch (error) {
    console.error('Error creating top-up request:', error);
    throw new Error('Failed to create top-up request');
  }
}

/**
 * Pay for delivery using wallet balance
 * @param {string} customerId - Customer ID
 * @param {string} deliveryId - Delivery ID
 * @param {number} fee - Delivery fee
 * @param {string} description - Payment description
 * @returns {Promise<Object>} Payment result
 */
export async function payForDeliveryWithWallet(customerId, deliveryId, fee, description) {
  try {
    const result = await debitWalletForDelivery({
      customerId,
      deliveryId,
      fee: Math.round(Number(fee)),
      description
    });

    return result.data;

  } catch (error) {
    console.error('Error paying for delivery with wallet:', error);

    const code = String(error.code || '');
    const message = String(error.message || '');

    // httpsCallable prefixes codes as "functions/failed-precondition"
    if (code.includes('unauthenticated') || /auth token was rejected|incorrect "aud"/i.test(message)) {
      throw new Error('Session expired. Please sign out and sign in again, then retry wallet payment.');
    }
    if (code.includes('failed-precondition') || /insufficient/i.test(message)) {
      throw new Error(
        message.includes('Available:')
          ? message.replace(/^Firebase:\s*/i, '').replace(/\s*\([^)]*\)\.?\s*$/, '')
          : 'Insufficient wallet balance'
      );
    }
    if (code.includes('already-exists')) {
      throw new Error('Delivery has already been paid for');
    }
    if (code.includes('permission-denied')) {
      throw new Error('Access denied');
    }
    throw new Error(message || 'Payment failed');
  }
}

/**
 * Refund a wallet debit when booking/order creation fails after payment.
 */
export async function refundWalletPayment(customerId, deliveryId, reason = 'Booking failed after wallet payment') {
  try {
    const result = await refundWalletForFailedPayment({
      customerId,
      deliveryId,
      reason,
    });
    return result.data;
  } catch (error) {
    console.error('Error refunding wallet payment:', error);
    throw new Error(error.message || 'Wallet refund failed');
  }
}

/**
 * Check if wallet has sufficient balance for a payment
 * @param {number} currentBalance - Current wallet balance
 * @param {number} requiredAmount - Required amount
 * @returns {boolean} Whether balance is sufficient
 */
export function hasSufficientBalance(currentBalance, requiredAmount) {
  return currentBalance >= requiredAmount;
}

/**
 * Format currency amount for display
 * @param {number} amount - Amount in Naira
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN'
  }).format(amount);
}

/**
 * Format transaction date for display
 * @param {Date} date - Transaction date
 * @returns {string} Formatted date string
 */
export function formatTransactionDate(date) {
  if (!date) return 'Unknown';
  
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Get transaction type styling
 * @param {string} type - Transaction type ('credit' or 'debit')
 * @returns {Object} Styling object
 */
export function getTransactionStyling(type) {
  if (type === 'credit') {
    return {
      color: 'success',
      icon: '↗️',
      prefix: '+',
      bgColor: 'success.50',
      textColor: 'success.600'
    };
  } else {
    return {
      color: 'error',
      icon: '↘️',
      prefix: '-',
      bgColor: 'error.50',
      textColor: 'error.600'
    };
  }
}

/**
 * Validate transaction amount
 * @param {number} amount - Amount to validate
 * @param {number} minAmount - Minimum allowed amount (default: 1)
 * @param {number} maxAmount - Maximum allowed amount (default: 1000000)
 * @returns {Object} Validation result
 */
export function validateAmount(amount, minAmount = 1, maxAmount = 1000000) {
  if (!amount || isNaN(amount)) {
    return { valid: false, error: 'Amount must be a valid number' };
  }

  if (amount < minAmount) {
    return { valid: false, error: `Amount must be at least ₦${minAmount}` };
  }

  if (amount > maxAmount) {
    return { valid: false, error: `Amount cannot exceed ₦${maxAmount.toLocaleString()}` };
  }

  return { valid: true };
}

/**
 * Admin functions (only for admin users)
 */

/**
 * Admin: Manually adjust customer wallet
 * @param {string} customerId - Customer ID
 * @param {number} amount - Amount to credit/debit
 * @param {string} type - 'credit' or 'debit'
 * @param {string} reason - Reason for adjustment
 * @param {string} adminNote - Additional admin note
 * @returns {Promise<Object>} Adjustment result
 */
export async function adminAdjustWallet(customerId, amount, type, reason, adminNote = '') {
  try {
    const result = await adminWalletAdjustment({
      customerId,
      amount,
      type,
      reason,
      adminNote
    });

    return result.data;

  } catch (error) {
    console.error('Error in admin wallet adjustment:', error);
    
    if (error.code === 'permission-denied') {
      throw new Error('Admin access required');
    } else if (error.code === 'failed-precondition') {
      throw new Error('Insufficient balance for debit operation');
    } else {
      throw new Error(error.message || 'Adjustment failed');
    }
  }
}

/**
 * Get wallet statistics for admin dashboard
 * @param {Array} customers - Array of customer wallet data
 * @returns {Object} Wallet statistics
 */
export function getWalletStatistics(customers) {
  if (!customers || customers.length === 0) {
    return {
      totalCustomers: 0,
      totalBalance: 0,
      averageBalance: 0,
      activeWallets: 0,
      zeroBalanceWallets: 0
    };
  }

  const totalBalance = customers.reduce((sum, customer) => sum + (customer.balance || 0), 0);
  const activeWallets = customers.filter(customer => (customer.balance || 0) > 0).length;
  const zeroBalanceWallets = customers.filter(customer => (customer.balance || 0) === 0).length;

  return {
    totalCustomers: customers.length,
    totalBalance,
    averageBalance: totalBalance / customers.length,
    activeWallets,
    zeroBalanceWallets
  };
}