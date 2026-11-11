// GO7 AUTH START - Firebase Referral Service
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../config.js';
import { findUserByReferralCode, getUserProfile } from './userService.js';
import { creditWallet, TRANSACTION_TYPES } from './walletService.js';

/**
 * Referral bonus amount in Naira
 */
export const REFERRAL_BONUS_AMOUNT = 500;

/**
 * Process referral when a new user signs up with a referral code
 * @param {string} newUserId - New user's ID
 * @param {string} referralCode - Referral code provided during signup
 * @returns {Promise<Object>}
 */
export const processReferral = async (newUserId, referralCode) => {
  try {
    if (!referralCode || referralCode.trim() === '') {
      console.log('ℹ️ No referral code provided');
      return { success: false, message: 'No referral code provided' };
    }

    // Find the referrer by referral code
    const referrer = await findUserByReferralCode(referralCode.trim());
    if (!referrer) {
      console.log('❌ Invalid referral code:', referralCode);
      return { success: false, message: 'Invalid referral code' };
    }

    // Check if referrer is trying to refer themselves
    if (referrer.uid === newUserId) {
      console.log('❌ User cannot refer themselves');
      return { success: false, message: 'You cannot refer yourself' };
    }

    // Get new user's profile to check if already referred
    const newUserProfile = await getUserProfile(newUserId);
    if (newUserProfile?.referredBy) {
      console.log('❌ User already has a referrer');
      return { success: false, message: 'User already referred by someone else' };
    }

    // Create referral record
    const referralRecord = {
      referrerId: referrer.uid,
      referredId: newUserId,
      bonusAmount: REFERRAL_BONUS_AMOUNT,
      referralCode: referralCode.toUpperCase(),
      createdAt: new Date(),
      status: 'completed'
    };

    const docRef = await addDoc(collection(db, 'referrals'), referralRecord);

    // Credit ₦500 to referrer's wallet
    const creditResult = await creditWallet(
      referrer.uid,
      REFERRAL_BONUS_AMOUNT,
      `Referral bonus for inviting ${newUserProfile?.name || 'a new user'}`,
      {
        referralId: docRef.id,
        referredUserId: newUserId,
        referralCode: referralCode.toUpperCase()
      }
    );

    console.log(`✅ Referral processed successfully. ${referrer.name} earned ₦${REFERRAL_BONUS_AMOUNT}`);

    return {
      success: true,
      message: `₦${REFERRAL_BONUS_AMOUNT} credited to referrer`,
      referralRecord: { id: docRef.id, ...referralRecord },
      creditResult,
      referrerName: referrer.name,
      bonusAmount: REFERRAL_BONUS_AMOUNT
    };

  } catch (error) {
    console.error('❌ Error processing referral:', error);
    return { 
      success: false, 
      message: 'Failed to process referral',
      error: error.message 
    };
  }
};

/**
 * Get referrals made by a user (people they referred)
 * @param {string} userId - User ID
 * @returns {Promise<Array>}
 */
export const getUserReferrals = async (userId) => {
  try {
    const q = query(
      collection(db, 'referrals'),
      where('referrerId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const referrals = [];

    for (const docSnapshot of querySnapshot.docs) {
      const referralData = { id: docSnapshot.id, ...docSnapshot.data() };
      
      // Get referred user's profile for display
      try {
        const referredUser = await getUserProfile(referralData.referredId);
        referralData.referredUserName = referredUser?.name || 'Unknown User';
        referralData.referredUserEmail = referredUser?.email || '';
      } catch (error) {
        console.warn('Could not fetch referred user profile:', error);
        referralData.referredUserName = 'Unknown User';
      }

      referrals.push(referralData);
    }

    console.log(`✅ Fetched ${referrals.length} referrals for user ${userId}`);
    return referrals;
  } catch (error) {
    console.error('❌ Error fetching user referrals:', error);
    throw error;
  }
};

/**
 * Get referral statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>}
 */
export const getReferralStats = async (userId) => {
  try {
    const referrals = await getUserReferrals(userId);
    
    const stats = {
      totalReferrals: referrals.length,
      totalEarnings: referrals.length * REFERRAL_BONUS_AMOUNT,
      recentReferrals: referrals.slice(0, 5), // Last 5 referrals
      referralCode: null
    };

    // Get user's referral code
    const userProfile = await getUserProfile(userId);
    stats.referralCode = userProfile?.referralCode || '';

    console.log(`✅ Referral stats for user ${userId}:`, stats);
    return stats;
  } catch (error) {
    console.error('❌ Error fetching referral stats:', error);
    throw error;
  }
};

/**
 * Validate referral code format
 * @param {string} referralCode - Referral code to validate
 * @returns {Object}
 */
export const validateReferralCode = (referralCode) => {
  if (!referralCode || typeof referralCode !== 'string') {
    return { valid: false, message: 'Referral code is required' };
  }

  const cleanCode = referralCode.trim().toUpperCase();
  
  if (cleanCode.length !== 6) {
    return { valid: false, message: 'Referral code must be 6 characters long' };
  }

  if (!cleanCode.startsWith('GO7')) {
    return { valid: false, message: 'Invalid referral code format' };
  }

  return { valid: true, code: cleanCode };
};

/**
 * Generate referral share message
 * @param {string} referralCode - User's referral code
 * @param {string} userName - User's name
 * @returns {string}
 */
export const generateReferralMessage = (referralCode, userName = '') => {
  const baseMessage = `🎉 Join Go7 and get fast deliveries!`;
  const referralMessage = `Use my referral code: ${referralCode}`;
  const bonusMessage = `Both of us earn ₦${REFERRAL_BONUS_AMOUNT} when you sign up! 🚚💨`;
  
  return `${baseMessage}\n\n${referralMessage}\n\n${bonusMessage}`;
};
// GO7 AUTH END