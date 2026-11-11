/**
 * Unified wallet balance — merges wallets/{uid}.balance and users/{uid}.walletBalance
 */

import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';

export function pickWalletBalance(walletData, userData) {
  const walletsBalance = Number(walletData?.balance || 0);
  const legacyBalance = Number(userData?.walletBalance || 0);
  return Math.max(walletsBalance, legacyBalance);
}

/**
 * Live wallet balance from both canonical + legacy fields
 */
export function subscribeToUnifiedWalletBalance(uid, callback) {
  if (!uid) {
    callback(0);
    return () => {};
  }

  let walletData = null;
  let userData = null;

  const publish = () => {
    callback(pickWalletBalance(walletData, userData));
  };

  const unsubWallet = onSnapshot(
    doc(db, 'wallets', uid),
    (snap) => {
      walletData = snap.exists() ? snap.data() : null;
      publish();
    },
    () => publish()
  );

  const unsubUser = onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      userData = snap.exists() ? snap.data() : null;
      publish();
    },
    () => publish()
  );

  return () => {
    unsubWallet();
    unsubUser();
  };
}
