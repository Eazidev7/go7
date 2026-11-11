/**
 * Profile API Service
 * Uses Firestore + Firebase Auth (no local Express server required)
 */

import { auth, db } from '../firebase/config.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { formatPhoneNumber } from '../utils/phoneUtils';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  level: number;
  coins: number;
  points: number;
  referralCode: string;
  paystackAccountNumber?: string;
  walletBalance: number;
  createdAt: string;
}

export interface WalletData {
  balance: number;
  totalAdded: number;
  totalSpent: number;
  currency: string;
  recentTransactions: Transaction[];
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  category: 'order' | 'topup' | 'refund' | 'reward';
  amount: number;
  balance: number;
  description: string;
  reference?: string;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

function requireUser() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be logged in to update your profile');
  }
  return user;
}

function mapUserDocToProfile(uid: string, data: Record<string, unknown> = {}): UserProfile {
  const authUser = auth.currentUser;
  return {
    id: uid,
    name: String(data.name || data.displayName || authUser?.displayName || 'Go7 User'),
    email: String(data.email || authUser?.email || ''),
    phone: String(data.phone || data.phoneNumber || ''),
    avatar: String(data.avatarUrl || data.avatar || authUser?.photoURL || ''),
    level: Number(data.level || 1),
    coins: Number(data.coins || 0),
    points: Number(data.go7Points || data.points || data.loyaltyPoints || 0),
    referralCode: String(data.referralCode || ''),
    paystackAccountNumber: String(
      (data.virtualAccount as { account_number?: string })?.account_number || ''
    ),
    walletBalance: Number(data.walletBalance || 0),
    createdAt: String(data.createdAt || new Date().toISOString()),
  };
}

// ============================================================================
// Profile API Methods
// ============================================================================

export const profileAPI = {
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    const user = requireUser();
    const userSnap = await getDoc(doc(db, 'users', user.uid));
    const data = userSnap.exists() ? userSnap.data() : {};
    return {
      success: true,
      data: mapUserDocToProfile(user.uid, data),
    };
  },

  async updateProfile(data: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    const user = requireUser();
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    const existing = userSnap.exists() ? userSnap.data() : {};

    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name?.trim()) {
      updates.name = data.name.trim();
      updates.displayName = data.name.trim();
    }

    if (data.email?.trim()) {
      updates.email = data.email.trim();
    }

    if (data.phone?.trim()) {
      const formattedPhone = formatPhoneNumber(data.phone);
      updates.phone = formattedPhone;
      updates.phoneNumber = formattedPhone;
    }

    if (data.avatar?.trim()) {
      updates.avatarUrl = data.avatar.trim();
      updates.avatar = data.avatar.trim();
    }

    await setDoc(userRef, updates, { merge: true });

    if (updates.displayName && typeof updates.displayName === 'string') {
      await updateAuthProfile(user, { displayName: updates.displayName });
    }

    if (updates.avatarUrl && typeof updates.avatarUrl === 'string') {
      await updateAuthProfile(user, { photoURL: updates.avatarUrl });
    }

    const merged = { ...existing, ...updates };
    return {
      success: true,
      data: mapUserDocToProfile(user.uid, merged),
      message: 'Profile updated successfully',
    };
  },

  async updateAvatar(avatarUrl: string): Promise<ApiResponse<UserProfile>> {
    return profileAPI.updateProfile({ avatar: avatarUrl });
  },

  async uploadAvatarImage(_file: File): Promise<ApiResponse<{ avatarUrl: string }>> {
    throw new Error('Avatar upload is not configured. Choose an avatar from the selector instead.');
  },

  async getWallet(): Promise<ApiResponse<WalletData>> {
    const user = requireUser();
    const walletSnap = await getDoc(doc(db, 'wallets', user.uid));
    const balance = walletSnap.exists() ? Number(walletSnap.data().balance || 0) : 0;

    return {
      success: true,
      data: {
        balance,
        totalAdded: 0,
        totalSpent: 0,
        currency: 'NGN',
        recentTransactions: [],
      },
    };
  },

  async getRecentTransactions(_limit = 3): Promise<ApiResponse<Transaction[]>> {
    return { success: true, data: [] };
  },

  async getAllTransactions(_page = 1, _limit = 20): Promise<ApiResponse<{
    transactions: Transaction[];
    total: number;
    page: number;
    pages: number;
  }>> {
    return {
      success: true,
      data: { transactions: [], total: 0, page: 1, pages: 1 },
    };
  },

  async logout(): Promise<ApiResponse<null>> {
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return { success: true, data: null };
  },

  async deleteAccount(): Promise<ApiResponse<null>> {
    throw new Error('Account deletion is not available from the app yet.');
  },
};

export default profileAPI;
