// GO7 AUTH START - Firebase Wallet & Transaction Service
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db } from '../config.js';
import { updateWalletBalance, getUserProfile } from './userService.js';

/**
 * Transaction types
 */
export const TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  REFERRAL_BONUS: 'referral_bonus',
  ORDER_PAYMENT: 'order_payment',
  WALLET_TOPUP: 'wallet_topup'
};

/**
 * Create a new transaction record
 * @param {string} userId - User ID
 * @param {string} type - Transaction type (credit/debit)
 * @param {number} amount - Transaction amount
 * @param {string} description - Transaction description
 * @param {Object} metadata - Additional transaction data
 * @returns {Promise<Object>}
 */
export const createTransaction = async (userId, type, amount, description, metadata = {}) => {
  try {
    const transaction = {
      userId,
      type,
      amount: Number(amount),
      description,
      metadata,
      createdAt: new Date(),
      status: 'completed'
    };

    const docRef = await addDoc(collection(db, 'transactions'), transaction);
    console.log('✅ Transaction created successfully:', docRef.id);
    
    return { id: docRef.id, ...transaction };
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    throw error;
  }
};

/**
 * Credit money to user's wallet
 * @param {string} userId - User ID
 * @param {number} amount - Amount to credit
 * @param {string} description - Transaction description
 * @param {Object} metadata - Additional transaction data
 * @returns {Promise<Object>}
 */
export const creditWallet = async (userId, amount, description, metadata = {}) => {
  try {
    // Get current user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Calculate new balance
    const newBalance = (userProfile.walletBalance || 0) + Number(amount);

    // Update wallet balance
    await updateWalletBalance(userId, newBalance);

    // Create transaction record
    const transaction = await createTransaction(
      userId, 
      TRANSACTION_TYPES.CREDIT, 
      amount, 
      description, 
      metadata
    );

    console.log(`✅ Credited ₦${amount} to user ${userId}. New balance: ₦${newBalance}`);
    
    return {
      transaction,
      newBalance,
      creditedAmount: Number(amount)
    };
  } catch (error) {
    console.error('❌ Error crediting wallet:', error);
    throw error;
  }
};

/**
 * Debit money from user's wallet
 * @param {string} userId - User ID
 * @param {number} amount - Amount to debit
 * @param {string} description - Transaction description
 * @param {Object} metadata - Additional transaction data
 * @returns {Promise<Object>}
 */
export const debitWallet = async (userId, amount, description, metadata = {}) => {
  try {
    // Get current user profile
    const userProfile = await getUserProfile(userId);
    if (!userProfile) {
      throw new Error('User profile not found');
    }

    // Check if user has sufficient balance
    const currentBalance = userProfile.walletBalance || 0;
    if (currentBalance < Number(amount)) {
      throw new Error('Insufficient wallet balance');
    }

    // Calculate new balance
    const newBalance = currentBalance - Number(amount);

    // Update wallet balance
    await updateWalletBalance(userId, newBalance);

    // Create transaction record
    const transaction = await createTransaction(
      userId, 
      TRANSACTION_TYPES.DEBIT, 
      amount, 
      description, 
      metadata
    );

    console.log(`✅ Debited ₦${amount} from user ${userId}. New balance: ₦${newBalance}`);
    
    return {
      transaction,
      newBalance,
      debitedAmount: Number(amount)
    };
  } catch (error) {
    console.error('❌ Error debiting wallet:', error);
    throw error;
  }
};

/**
 * Get user's transaction history
 * @param {string} userId - User ID
 * @param {number} limitCount - Number of transactions to fetch (default: 50)
 * @returns {Promise<Array>}
 */
export const getTransactionHistory = async (userId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const transactions = [];
    
    querySnapshot.forEach((doc) => {
      transactions.push({ id: doc.id, ...doc.data() });
    });

    console.log(`✅ Fetched ${transactions.length} transactions for user ${userId}`);
    return transactions;
  } catch (error) {
    console.error('❌ Error fetching transaction history:', error);
    throw error;
  }
};

/**
 * Format currency amount for display
 * @param {number} amount - Amount to format
 * @returns {string}
 */
export const formatCurrency = (amount) => {
  return `₦${Number(amount).toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Get wallet balance for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>}
 */
export const getWalletBalance = async (userId) => {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.walletBalance || 0;
  } catch (error) {
    console.error('❌ Error fetching wallet balance:', error);
    throw error;
  }
};
// GO7 AUTH END