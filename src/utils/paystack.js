import { functions, db } from '../firebase/config.js';
import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import Swal from 'sweetalert2';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || null;

async function createVirtualAccount(userId, name, phone) {
  // Tries to call a Firebase Function (recommended). If unavailable, creates a placeholder doc in Firestore.
  try {
    if (functions) {
      const fn = httpsCallable(functions, 'createPaystackVirtualAccount');
      const res = await fn({ userId, name, phone });
      return res.data;
    }

    // Fallback: create a Firestore doc for later processing by backend
    const docRef = await addDoc(collection(db, 'virtualAccounts'), {
      userId,
      name,
      phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, status: 'pending' };
  } catch (error) {
    console.error('createVirtualAccount error', error);
    Swal.fire('Error', 'Could not create virtual account. Try again later.', 'error');
    return null;
  }
}

async function getWalletBalance(userId) {
  try {
    const q = query(collection(db, 'walletTransactions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    let balance = 0;
    snap.forEach((d) => {
      const tx = d.data();
      if (tx?.type === 'credit') balance += Number(tx.amount || 0);
      else if (tx?.type === 'debit') balance -= Number(tx.amount || 0);
    });
    return balance;
  } catch (error) {
    console.error('getWalletBalance error', error);
    return 0;
  }
}

function _openPaystackInline({ email, amount, reference, onSuccess, onClose }) {
  // amount in naira; Paystack expects kobo
  try {
    if (!window.PaystackPop || !PAYSTACK_PUBLIC_KEY) {
      console.warn('Paystack inline not available. Falling back to redirect.');
      // Create a simple fallback by opening Paystack pay page - this is a soft fallback
      const fallbackUrl = `https://paystack.com/pay/${reference || ''}`;
      window.open(fallbackUrl, '_blank');
      return;
    }

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email,
      amount: Math.round(Number(amount) * 100),
      ref: reference || Math.random().toString(36).substring(2, 11),
      onClose: function () {
        if (onClose) onClose();
      },
      callback: function (response) {
        if (onSuccess) onSuccess(response);
      },
    });

    handler.openIframe();
  } catch (error) {
    console.error('Paystack inline error', error);
    Swal.fire('Error', 'Payment could not be initiated.', 'error');
  }
}

async function addMoney({ userId, email, amount }) {
  // amount: number in Naira
  try {
    if (!userId) throw new Error('Missing userId');

    const ref = 'go7_' + Date.now();

    return new Promise((resolve, reject) => {
      _openPaystackInline({
        email,
        amount,
        reference: ref,
        onSuccess: async (res) => {
          try {
            // Record transaction in Firestore
            await addDoc(collection(db, 'walletTransactions'), {
              userId,
              amount: Number(amount),
              type: 'credit',
              status: 'success',
              description: 'Wallet Top-up',
              reference: res.reference || res.transaction || ref,
              channel: 'card',
              source: 'Paystack',
              paystackRef: res.reference || res.transaction || null,
              raw: res,
              timestamp: new Date().toISOString(),
            });
            Swal.fire('Success', 'Wallet credited successfully', 'success');
            resolve(res);
          } catch (err) {
            console.error('Error saving transaction after payment', err);
            Swal.fire('Error', 'Payment succeeded but we failed to save the transaction. Contact support.', 'error');
            reject(err);
          }
        },
        onClose: () => {
          Swal.fire('Info', 'Payment window closed', 'info');
          reject(new Error('Payment closed'));
        },
      });
    });
  } catch (error) {
    console.error('addMoney error', error);
    Swal.fire('Error', error.message || 'Unable to start payment', 'error');
    throw error;
  }
}

export { createVirtualAccount, getWalletBalance, addMoney };
