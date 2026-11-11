// Profile utility functions for Go7

/**
 * Generate a unique referral code
 * @param {string} email - User's email
 * @returns {string} - Unique referral code
 */
export const generateReferralCode = (email) => {
  const prefix = 'GO7';
  const emailHash = email.split('@')[0].substring(0, 3).toUpperCase();
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${emailHash}${randomSuffix}`;
};

/**
 * Generate DiceBear avatar URL
 * @param {string} seed - Seed for avatar generation (usually email)
 * @param {string} style - DiceBear style (default: bottts)
 * @returns {string} - Avatar URL
 */
export const generateAvatarUrl = (seed, style = 'bottts') => {
  const encodedSeed = encodeURIComponent(seed || 'default');
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedSeed}`;
};

/**
 * Create initial user profile data
 * @param {Object} user - Firebase user object
 * @returns {Object} - Initial profile data
 */
export const createInitialProfile = (user, userData = null) => {
  // Priority: userData.displayName > userData.name > user.displayName > email prefix > 'Go7 User'
  const name = userData?.displayName || userData?.name || user.displayName || user.email?.split('@')[0] || 'Go7 User';
  const referralCode = generateReferralCode(user.email);
  const avatar = generateAvatarUrl(user.email);
  
  return {
    name,
    displayName: name,
    email: user.email,
    phoneNumber: userData?.phoneNumber || userData?.phone || '',
    phone: userData?.phoneNumber || userData?.phone || '',
    avatar,
    walletBalance: 0,
    referralCode,
    referrals: [],
    addresses: [],
    totalReferrals: 0,
    totalEarnings: 0,
    joinDate: new Date().toISOString(),
    memberSince: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    verified: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

/**
 * Process referral bonus
 * @param {string} referrerCode - Referral code of the person who referred
 * @param {string} newUserUid - UID of the new user
 * @param {string} referrerUid - UID of the referrer
 * @returns {Object} - Referral processing result
 */
export const processReferralBonus = async (referrerCode, newUserUid, referrerUid) => {
  const bonusAmount = 500;
  
  try {
    // TODO: Add Firestore transactions here
    // This would be implemented with actual Firebase functions
    console.log('🎁 Processing referral bonus:', {
      referrerCode,
      newUserUid,
      referrerUid,
      bonusAmount
    });
    
    return {
      success: true,
      bonusAmount,
      message: `Both users receive ₦${bonusAmount} bonus!`
    };
  } catch (error) {
    console.error('❌ Referral bonus processing failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Generate referral message for sharing
 * @param {string} referralCode - User's referral code
 * @param {string} userName - User's name
 * @returns {string} - Formatted referral message
 */
export const generateReferralMessage = (referralCode, userName = 'Your friend') => {
  return `🍕 ${userName} invited you to GO7! 

Use referral code: ${referralCode} 

📱 Download GO7 and get ₦500 bonus when you sign up!
Fast food delivery in Abeokuta 🚗💨

Download: https://go7.ng/download`;
};

/**
 * Validate and format phone number
 * @param {string} phone - Phone number input
 * @returns {Object} - Validation result
 */
export const validatePhoneNumber = (phone) => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Nigerian phone number validation
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return {
      valid: true,
      formatted: `+234 ${digitsOnly.substring(1, 4)} ${digitsOnly.substring(4, 7)} ${digitsOnly.substring(7)}`,
      international: `+234${digitsOnly.substring(1)}`
    };
  } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0')) {
    return {
      valid: true,
      formatted: `+234 ${digitsOnly.substring(0, 3)} ${digitsOnly.substring(3, 6)} ${digitsOnly.substring(6)}`,
      international: `+234${digitsOnly}`
    };
  }
  
  return {
    valid: false,
    error: 'Please enter a valid Nigerian phone number'
  };
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export const formatCurrency = (amount) => {
  return `₦${Number(amount).toLocaleString()}`;
};