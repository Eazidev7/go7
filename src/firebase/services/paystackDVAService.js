/**
 * GO7 Paystack DVA (Dedicated Virtual Account) Service
 * 
 * Handles Paystack Dedicated Virtual Account creation and wallet funding
 * Integrates with Firebase Functions backend for secure DVA creation
 */

import { httpsCallable } from 'firebase/functions';
import { functions, db, auth } from '../config.js';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { pickWalletBalance } from '../../utils/walletBalance';
import {
  formatPhoneNumber,
  formatPhoneForPaystack,
  getPhoneFromUserData,
  isValidNigerianPhone,
} from '../../utils/phoneUtils';

/** Normalize Firestore / Paystack virtual account shape for UI */
export function normalizeVirtualAccount(va) {
  if (!va) return null;
  const accountNumber = va.account_number || va.accountNumber || '';
  const accountName = va.account_name || va.accountName || '';
  const bank = va.bank || va.bank_name || 'Titan Paystack';
  if (!accountNumber) return null;
  return {
    bank,
    account_number: accountNumber,
    account_name: accountName,
    accountNumber,
    accountName,
  };
}

async function readVirtualAccountFromUser(uid) {
  const userSnap = await getDoc(doc(db, 'users', uid));
  if (!userSnap.exists()) return null;
  return normalizeVirtualAccount(userSnap.data().virtualAccount);
}

async function resolveContactForDva(uid, overrides = {}) {
  const userSnap = await getDoc(doc(db, 'users', uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const authUser = auth.currentUser;

  let email = String(overrides.email || userData.email || authUser?.email || '').trim();
  let phone = overrides.phone
    ? formatPhoneNumber(overrides.phone)
    : getPhoneFromUserData(userData);

  if (!phone && authUser?.uid === uid && authUser.phoneNumber) {
    const authPhone = formatPhoneNumber(authUser.phoneNumber);
    phone = isValidNigerianPhone(authPhone) ? authPhone : '';
  }

  if (phone && !isValidNigerianPhone(phone)) {
    phone = '';
  }
  let name = String(
    overrides.name ||
    userData.name ||
    userData.displayName ||
    authUser?.displayName ||
    ''
  ).trim();

  if (!email && authUser?.uid === uid) {
    email = authUser.email || '';
  }

  // Paystack requires an email — stable fallback for phone-first accounts
  if (!email && phone) {
    email = `${uid}@go7.wallet`;
  }

  return { email, phone, name, userData };
}

/**
 * Load existing DVA or create one when profile has phone + email
 */
export async function ensureVirtualAccount({ uid, email, phone, name } = {}) {
  if (!uid) return null;

  let account = await getUserVirtualAccount(uid);
  if (account) return account;

  const contact = await resolveContactForDva(uid, { email, phone, name });

  if (!contact.phone) {
    console.log('ℹ️ Cannot create DVA yet — missing phone on profile', { uid, hasEmail: !!contact.email });
    return null;
  }

  if (!contact.email) {
    console.log('ℹ️ Cannot create DVA yet — missing email', { uid, hasPhone: !!contact.phone });
    return null;
  }

  const displayName = contact.name || contact.email.split('@')[0] || 'Go7 User';
  const paystackPhone = formatPhoneForPaystack(contact.phone);
  if (!paystackPhone) {
    console.log('ℹ️ Cannot create DVA yet — invalid phone format', { uid, phone: contact.phone });
    return null;
  }

  try {
    const result = await createUserVirtualAccount(uid, contact.email, paystackPhone, displayName);
    if (result?.success) {
      return normalizeVirtualAccount(result.data?.virtualAccount);
    }
  } catch (error) {
    console.error('❌ ensureVirtualAccount failed:', error);
  }

  return null;
}

/**
 * Create Paystack Dedicated Virtual Account for user
 * Each user gets their own virtual account number for wallet funding
 * 
 * @param {string} uid - User ID
 * @param {string} email - User email
 * @param {string} phone - User phone number  
 * @param {string} name - User full name
 * @returns {Promise<Object>} Virtual account details
 */
export const createUserVirtualAccount = async (uid, email, phone, name) => {
  try {
    if (!functions) {
      throw new Error('Firebase Functions is not initialized');
    }

    console.log('🏦 Creating Paystack DVA for user:', { uid, email, phone, name });
    
    const createVirtualAccount = httpsCallable(functions, 'createUserVirtualAccount');
    
    const result = await createVirtualAccount({
      uid,
      email,
      phone,
      name
    });
    
    console.log('✅ Virtual account created:', result.data);
    
    return result.data;
  } catch (error) {
    console.error('❌ Error creating virtual account:', error);
    throw error;
  }
};

/**
 * Get user's virtual account details from Firestore
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} Virtual account details or null
 */
export const getUserVirtualAccount = async (uid) => {
  try {
    const normalized = await readVirtualAccountFromUser(uid);
    if (normalized) {
      const userSnap = await getDoc(doc(db, 'users', uid));
      return {
        ...normalized,
        paystackId: userSnap.data()?.paystackId || null,
      };
    }

    // Fallback: some older records only store DVA on wallets/{uid}
    const walletSnap = await getDoc(doc(db, 'wallets', uid));
    if (walletSnap.exists()) {
      return normalizeVirtualAccount(walletSnap.data().virtualAccount);
    }

    return null;
  } catch (error) {
    console.error('❌ Error getting virtual account:', error);
    throw error;
  }
};

/**
 * Listen to wallet balance changes in real-time
 * Automatically updates when user funds wallet via virtual account
 * 
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function to receive balance updates
 * @returns {Function} Unsubscribe function
 */
export const subscribeToWalletBalance = (uid, callback) => {
  if (!uid || typeof callback !== 'function') {
    return () => {};
  }
  if (!db) {
    console.warn('subscribeToWalletBalance: Firestore not initialized');
    return () => {};
  }

  try {
    const walletRef = doc(db, 'wallets', uid);
    const userRef = doc(db, 'users', uid);

    let walletData = null;
    let userData = null;
    let virtualAccount = null;
    let lastPublishedKey = null;

    const publish = async () => {
      if (!virtualAccount) {
        virtualAccount = normalizeVirtualAccount(walletData?.virtualAccount);
      }
      if (!virtualAccount) {
        virtualAccount = await readVirtualAccountFromUser(uid);
      }

      const balance = pickWalletBalance(walletData, userData);
      const vaKey = virtualAccount?.accountNumber || '';
      const publishKey = `${balance}|${vaKey}`;

      // Skip duplicate publishes (wallet + user snapshots fire together)
      if (publishKey === lastPublishedKey) {
        return;
      }
      lastPublishedKey = publishKey;

      callback({
        balance,
        virtualAccount,
        phone: getPhoneFromUserData(userData),
        walletBalance: balance,
        lastUpdated: walletData?.updatedAt || userData?.updatedAt || null,
      });
    };

    const unsubWallet = onSnapshot(walletRef, async (walletDoc) => {
      walletData = walletDoc.exists() ? walletDoc.data() : null;
      if (walletData?.virtualAccount) {
        virtualAccount = normalizeVirtualAccount(walletData.virtualAccount);
      }
      await publish();
    }, (error) => {
      console.error('❌ Error listening to wallet:', error);
    });

    const unsubUser = onSnapshot(userRef, async (userDoc) => {
      userData = userDoc.exists() ? userDoc.data() : null;
      if (!virtualAccount && userData?.virtualAccount) {
        virtualAccount = normalizeVirtualAccount(userData.virtualAccount);
      }
      await publish();
    }, (error) => {
      console.error('❌ Error listening to user wallet:', error);
    });

    return () => {
      unsubWallet();
      unsubUser();
    };
  } catch (error) {
    console.error('❌ Error setting up wallet subscription:', error);
    throw error;
  }
};

/**
 * Get wallet balance from Firestore
 * 
 * @param {string} uid - User ID
 * @returns {Promise<number>} Current wallet balance
 */
export const getWalletBalance = async (uid) => {
  try {
    const walletRef = doc(db, 'wallets', uid);
    const userRef = doc(db, 'users', uid);
    const [walletSnap, userSnap] = await Promise.all([getDoc(walletRef), getDoc(userRef)]);
    return pickWalletBalance(
      walletSnap.exists() ? walletSnap.data() : null,
      userSnap.exists() ? userSnap.data() : null
    );
  } catch (error) {
    console.error('❌ Error getting wallet balance:', error);
    throw error;
  }
};

/**
 * Get user transaction history
 * 
 * @param {string} uid - User ID
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} Array of transactions
 */
export const getTransactionHistory = async (uid, limit = 50) => {
  try {
    const { collection, query, orderBy, limit: limitQuery, getDocs } = await import('firebase/firestore');
    
    // Query transactions from wallet subcollection
    const q = query(
      collection(db, 'wallets', uid, 'transactions'),
      orderBy('createdAt', 'desc'),
      limitQuery(limit)
    );
    
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()
    }));
    
    return transactions;
  } catch (error) {
    console.error('❌ Error getting transaction history:', error);
    throw error;
  }
};

/**
 * Check if user has a virtual account
 * 
 * @param {string} uid - User ID
 * @returns {Promise<boolean>} True if user has virtual account
 */
export const hasVirtualAccount = async (uid) => {
  try {
    const account = await getUserVirtualAccount(uid);
    return account !== null;
  } catch (error) {
    console.error('❌ Error checking virtual account:', error);
    return false;
  }
};

/**
 * Initialize user wallet and virtual account after signup
 * Should be called after successful user registration
 * 
 * @param {Object} user - User object from Firebase Auth
 * @param {string} phone - User phone number
 * @returns {Promise<Object>} Virtual account details
 */
export const initializeUserWallet = async (user, phone) => {
  try {
    // Check if user already has virtual account
    const existingAccount = await getUserVirtualAccount(user.uid);
    
    if (existingAccount) {
      console.log('✅ User already has virtual account:', existingAccount);
      return existingAccount;
    }
    
    // Create new virtual account
    const name = user.displayName || user.email.split('@')[0];
    const result = await createUserVirtualAccount(
      user.uid,
      user.email,
      phone,
      name
    );
    
    return result.data;
  } catch (error) {
    console.error('❌ Error initializing user wallet:', error);
    throw error;
  }
};

export default {
  normalizeVirtualAccount,
  ensureVirtualAccount,
  createUserVirtualAccount,
  getUserVirtualAccount,
  subscribeToWalletBalance,
  getWalletBalance,
  getTransactionHistory,
  hasVirtualAccount,
  initializeUserWallet
};
