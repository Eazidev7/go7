// GO7 AUTH START - Firebase User Service
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../config.js';

/**
 * Generate a unique 6-character referral code
 * @returns {string} Unique referral code
 */
export const generateReferralCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GO7';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Generate avatar URL using DiceBear API
 * @param {string} seed - Seed for avatar generation (uid or name)
 * @returns {string} Avatar URL
 */
const generateAvatarUrl = (seed) => {
  return `https://api.dicebear.com/6.x/thumbs/svg?seed=${encodeURIComponent(seed)}`;
};

/**
 * Create a new user profile in Firestore
 * @param {string} uid - Firebase Auth UID
 * @param {Object} userData - User data object
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, userData) => {
  try {
    const referralCode = generateReferralCode();
    
    // Generate avatar URL using uid as seed
    const avatarUrl = userData.avatarUrl || generateAvatarUrl(uid);
    
    const userProfile = {
      uid,
      name: userData.name || '',
      displayName: userData.name || userData.displayName || '',
      email: userData.email || '',
      phone: userData.phone || '',
      phoneNumber: userData.phone || userData.phoneNumber || '',
      avatarUrl,
      walletBalance: 0,
      referralCode,
      referredBy: userData.referredBy || null,
      emailVerified: userData.emailVerified || false,
      phoneVerified: userData.phoneVerified || false,
      role: userData.role || 'customer',
      accountStatus: userData.accountStatus || 'active',
      profileCompleted: true, // Mark profile as completed after signup
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await setDoc(doc(db, 'users', uid), userProfile);
    console.log('✅ User profile created successfully with name:', userProfile.name, 'and phone:', userProfile.phoneNumber);
    return userProfile;
  } catch (error) {
    console.error('❌ Error creating user profile:', error);
    throw error;
  }
};

/**
 * Get user profile by UID
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object|null>}
 */
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param {string} uid - Firebase Auth UID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (uid, updates) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: new Date()
    });
    console.log('✅ User profile updated successfully');
  } catch (error) {
    console.error('❌ Error updating user profile:', error);
    throw error;
  }
};

/**
 * Find user by referral code
 * @param {string} referralCode - Referral code to search for
 * @returns {Promise<Object|null>}
 */
export const findUserByReferralCode = async (referralCode) => {
  try {
    const q = query(
      collection(db, 'users'), 
      where('referralCode', '==', referralCode.toUpperCase())
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error finding user by referral code:', error);
    throw error;
  }
};

/**
 * Update user's wallet balance
 * @param {string} uid - Firebase Auth UID
 * @param {number} newBalance - New wallet balance
 * @returns {Promise<void>}
 */
export const updateWalletBalance = async (uid, newBalance) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      walletBalance: newBalance,
      updatedAt: new Date()
    });
    console.log('✅ Wallet balance updated successfully');
  } catch (error) {
    console.error('❌ Error updating wallet balance:', error);
    throw error;
  }
};
// GO7 AUTH END