/**
 * GO7 Paystack Wallet Integration Service
 * 
 * Handles wallet funding via Paystack payment gateway
 * Connected to Firestore users/{uid}.walletBalance
 */

import { doc, updateDoc, increment, collection, addDoc, serverTimestamp, getDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../config';

// Paystack Public Key - Replace with your actual key
const PAYSTACK_PUBLIC_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || 'pk_test_your_key_here';

interface PaystackResponse {
  status: boolean;
  message: string;
  data?: any;
}

/**
 * Initialize Paystack payment for wallet funding
 * Opens Paystack payment popup
 */
export const initializeWalletFunding = async (
  amount: number,
  email: string,
  uid: string,
  onSuccess?: (reference: string) => void,
  onClose?: () => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Load Paystack inline script if not already loaded
      if (!(window as any).PaystackPop) {
        const script = document.createElement('script');
        script.src = 'https://js.paystack.co/v1/inline.js';
        script.async = true;
        document.body.appendChild(script);
        
        script.onload = () => {
          openPaystackPopup(amount, email, uid, onSuccess, onClose, resolve, reject);
        };
      } else {
        openPaystackPopup(amount, email, uid, onSuccess, onClose, resolve, reject);
      }
    } catch (error) {
      console.error('Error initializing Paystack:', error);
      reject(error);
    }
  });
};

/**
 * Open Paystack payment popup
 */
const openPaystackPopup = (
  amount: number,
  email: string,
  uid: string,
  onSuccess?: (reference: string) => void,
  onClose?: () => void,
  resolve?: any,
  reject?: any
) => {
  const handler = (window as any).PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email,
    amount: amount * 100, // Paystack accepts amount in kobo (NGN)
    currency: 'NGN',
    ref: `wallet_${uid}_${Date.now()}`, // Generate unique reference
    metadata: {
      custom_fields: [
        {
          display_name: 'Purpose',
          variable_name: 'purpose',
          value: 'Wallet Funding'
        },
        {
          display_name: 'User ID',
          variable_name: 'user_id',
          value: uid
        }
      ]
    },
    callback: async (response: PaystackResponse) => {
      console.log('✅ Payment successful:', response);
      
      // Verify payment and update wallet
      try {
        await verifyPaymentAndUpdateWallet(response.reference, uid, amount);
        
        if (onSuccess) {
          onSuccess(response.reference);
        }
        
        if (resolve) {
          resolve(response);
        }
      } catch (error) {
        console.error('Error updating wallet:', error);
        if (reject) {
          reject(error);
        }
      }
    },
    onClose: () => {
      console.log('Payment popup closed');
      if (onClose) {
        onClose();
      }
    }
  });

  handler.openIframe();
};

/**
 * Verify Paystack payment and update user wallet
 * This should ideally be done on the backend for security
 */
export const verifyPaymentAndUpdateWallet = async (
  reference: string,
  uid: string,
  amount: number
): Promise<void> => {
  try {
    console.log('🔍 Verifying payment:', reference);
    
    // In production, verify payment on backend
    // For now, we'll trust the frontend callback
    
    // Update user wallet balance
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      walletBalance: increment(amount),
      updatedAt: serverTimestamp()
    });
    
    // Record transaction
    await addDoc(collection(db, 'transactions'), {
      userId: uid,
      type: 'credit',
      amount,
      reference,
      source: 'paystack',
      status: 'completed',
      description: 'Wallet funding via Paystack',
      createdAt: serverTimestamp()
    });
    
    console.log('✅ Wallet updated successfully');
  } catch (error) {
    console.error('❌ Error verifying payment and updating wallet:', error);
    throw error;
  }
};

/**
 * Deduct amount from user wallet
 * Used during checkout
 */
export const deductFromWallet = async (
  uid: string,
  amount: number,
  orderId: string,
  description: string = 'Order payment'
): Promise<void> => {
  try {
    // Update user wallet balance
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      walletBalance: increment(-amount),
      updatedAt: serverTimestamp()
    });
    
    // Record transaction
    await addDoc(collection(db, 'transactions'), {
      userId: uid,
      type: 'debit',
      amount,
      orderId,
      status: 'completed',
      description,
      createdAt: serverTimestamp()
    });
    
    console.log('✅ Amount deducted from wallet');
  } catch (error) {
    console.error('❌ Error deducting from wallet:', error);
    throw error;
  }
};

/**
 * Get user wallet balance from Firestore
 */
export const getWalletBalance = async (uid: string): Promise<number> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data().walletBalance || 0;
    }
    
    return 0;
  } catch (error) {
    console.error('❌ Error getting wallet balance:', error);
    throw error;
  }
};

/**
 * Get user transaction history
 */
export const getTransactionHistory = async (uid: string, limit: number = 50): Promise<any[]> => {
  try {
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limit)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('❌ Error getting transaction history:', error);
    throw error;
  }
};

export default {
  initializeWalletFunding,
  verifyPaymentAndUpdateWallet,
  deductFromWallet,
  getWalletBalance,
  getTransactionHistory
};
