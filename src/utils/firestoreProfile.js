import { db, auth } from '../firebase/config.js';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import Swal from 'sweetalert2';

// Wallet transactions
async function saveWalletTransaction({ userId, amount, type = 'credit', meta = {} }) {
  try {
    const payload = {
      userId,
      amount: Number(amount),
      type,
      status: 'success',
      description: type === 'credit' ? 'Wallet Top-up' : 'Payment',
      reference: meta.reference || `tx_${Date.now()}`,
      channel: meta.channel || 'card',
      source: meta.source || 'Paystack',
      meta,
      timestamp: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'walletTransactions'), payload);
    return { id: ref.id, ...payload };
  } catch (error) {
    console.error('saveWalletTransaction error', error);
    Swal.fire('Error', 'Could not save wallet transaction.', 'error');
    throw error;
  }
}

async function getRecentWalletTransactions(userId, limitCount = 10) {
  try {
    const q = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    return rows;
  } catch (error) {
    console.error('getRecentWalletTransactions error', error);
    return [];
  }
}

// Referrals
async function createReferralRecord({ inviterId, inviteeId, code, amountInviter = 500, amountInvitee = 200 }) {
  try {
    const record = {
      inviterId,
      inviteeId,
      code,
      amountInviter,
      amountInvitee,
      timestamp: new Date().toISOString(),
    };
    const ref = await addDoc(collection(db, 'referrals'), record);

    // credit inviter and invitee
    await saveWalletTransaction({ userId: inviterId, amount: amountInviter, type: 'credit', meta: { referralId: ref.id } });
    await saveWalletTransaction({ userId: inviteeId, amount: amountInvitee, type: 'credit', meta: { referralId: ref.id } });

    return { id: ref.id, ...record };
  } catch (error) {
    console.error('createReferralRecord error', error);
    Swal.fire('Error', 'Could not record referral.', 'error');
    throw error;
  }
}

async function findUserByReferralCode(code) {
  try {
    const q = query(collection(db, 'users'), where('referralCode', '==', code), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { id: docSnap.id, ...docSnap.data() };
  } catch (error) {
    console.error('findUserByReferralCode error', error);
    return null;
  }
}

// Orders
async function getRecentOrders(userId, limitCount = 3) {
  try {
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    return rows;
  } catch (error) {
    console.error('getRecentOrders error', error);
    return [];
  }
}

// Addresses
async function addAddress({ userId, label, address, lat = null, lng = null, isDefault = false, ...extras }) {
  try {
    const payload = { userId, label, address, lat, lng, isDefault, ...extras, createdAt: new Date().toISOString() };
    const ref = await addDoc(collection(db, 'addresses'), payload);
    if (isDefault) {
      // unset other defaults
      const q = query(collection(db, 'addresses'), where('userId', '==', userId), where('isDefault', '==', true));
      const snap = await getDocs(q);
      const batchUpdates = [];
      snap.forEach((d) => {
        if (d.id !== ref.id) batchUpdates.push(updateDoc(doc(db, 'addresses', d.id), { isDefault: false }));
      });
      await Promise.all(batchUpdates);
    }
    return { id: ref.id, ...payload };
  } catch (error) {
    console.error('addAddress error', error);
    Swal.fire('Error', 'Could not add address.', 'error');
    throw error;
  }
}

async function editAddress({ addressId, updates }) {
  try {
    await updateDoc(doc(db, 'addresses', addressId), updates);
    return true;
  } catch (error) {
    console.error('editAddress error', error);
    Swal.fire('Error', 'Could not edit address.', 'error');
    throw error;
  }
}

async function deleteAddress(addressId) {
  try {
    await deleteDoc(doc(db, 'addresses', addressId));
    return true;
  } catch (error) {
    console.error('deleteAddress error', error);
    Swal.fire('Error', 'Could not delete address.', 'error');
    throw error;
  }
}

async function listAddresses(userId) {
  try {
    // Simplified query without orderBy to avoid index requirement
    const q = query(collection(db, 'addresses'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
    // Sort in memory instead
    rows.sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA; // desc
    });
    return rows;
  } catch (error) {
    console.error('listAddresses error', error);
    return [];
  }
}

export {
  saveWalletTransaction,
  getRecentWalletTransactions,
  createReferralRecord,
  findUserByReferralCode,
  getRecentOrders,
  addAddress,
  editAddress,
  deleteAddress,
  listAddresses,
};
