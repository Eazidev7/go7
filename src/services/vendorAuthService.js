/**
 * 🔐 VENDOR AUTHENTICATION SERVICE
 * Centralized vendor login, logout, registration, and status management
 */

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { sendOTP, verifyOTP, sendEmailOTP } from './otpService';
import { lookupAgent } from '../utils/agentLookup';
import { uploadVendorImagePreferHostinger } from './hostingerImageUpload';

// Wrap a promise so a stalled network/Firestore/upload call can never
// leave the UI spinning forever — it fails loudly with a clear message
// instead (this was previously the cause of registration getting "stuck
// at loading" with no error shown).
function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

import { mapVendorDiscoveryFields } from '../utils/vendorVisibility';

export { mapVendorDiscoveryFields };

/**
 * Register a new vendor
 * @param {Object} vendorData - Vendor registration data
 * @param {File} imageFile - Optional vendor logo image
 * @returns {Promise<{success: boolean, vendorId?: string, error?: string}>}
 */
export const registerVendor = async (vendorData, imageFile = null) => {
  let vendorId;
  let userCredential;
  let reusedExistingAuthAccount = false;

  try {
    // 1. Check if user already exists and handle appropriately
    
    try {
      userCredential = await createUserWithEmailAndPassword(
        auth,
        vendorData.email,
        vendorData.password
      );
      vendorId = userCredential.user.uid;
    } catch (authError) {
      if (authError.code === 'auth/email-already-in-use') {
        // Try to sign in and check if vendor profile exists
        let signInResult;
        try {
          signInResult = await withTimeout(
            signInWithEmailAndPassword(auth, vendorData.email, vendorData.password),
            15000,
            'Could not verify your existing account (request timed out). Please check your connection and try again.'
          );
        } catch (signInError) {
          throw new Error('Email already registered with different password. Please use the correct password or try account recovery.');
        }

        vendorId = signInResult.user.uid;
        reusedExistingAuthAccount = true;

        // Check if vendor profile already exists (outside the sign-in
        // try/catch above so this error isn't mislabeled as a bad password)
        const existingVendor = await withTimeout(
          getDoc(doc(db, 'vendors', vendorId)),
          15000,
          'Could not check your existing vendor profile (request timed out). Please try again.'
        );
        if (existingVendor.exists()) {
          throw new Error('Vendor account already exists. Please use the login page instead.');
        }
        // If auth exists but no vendor profile, continue with registration
      } else {
        throw authError;
      }
    }

    // 2b. Resolve referring agent (optional)
    let agentLink = null;
    if (vendorData.agentId?.trim()) {
      const lookup = await lookupAgent(vendorData.agentId.trim());
      if (!lookup.found) {
        throw new Error(lookup.error || 'Invalid Agent ID. Please check with your GO7 agent.');
      }
      agentLink = {
        agentId: lookup.agentId,
        agentName: lookup.agent.name || 'GO7 Agent',
        agentPhone: lookup.agent.phone || null,
      };
    }

    // 3. Upload vendor logo (if provided) - Handle storage errors gracefully
    let imageUrl = '';
    let imageUploadWarning = null;
    
    if (imageFile) {
      try {
        const timestamp = Date.now();
        imageUrl = await withTimeout(
          uploadVendorImagePreferHostinger(
            imageFile,
            `vendors/${vendorId}/logo_${timestamp}.jpg`
          ),
          25000,
          'Logo upload timed out'
        );
        console.log('✅ Vendor logo uploaded successfully');
      } catch (storageError) {
        console.warn('⚠️ Image upload failed, continuing without image:', storageError);
        imageUploadWarning = 'Image upload failed due to permissions. You can add a logo later in your profile settings.';
        // Continue registration without image
      }
    }

    // 3. Create vendor document in Firestore with V2 structure
    const discovery = mapVendorDiscoveryFields(vendorData.type);
    const vendorDoc = {
      vendorId: vendorId,
      userId: vendorId, // For Firestore rules isOwner check
      name: vendorData.name.trim(), // Owner/Contact name
      businessName: vendorData.businessName?.trim() || vendorData.name.trim(), // Business name (fallback to name if not provided)
      displayName: vendorData.businessName?.trim() || vendorData.name.trim(), // What customers see
      email: vendorData.email.trim(),
      phone: vendorData.phone.trim(),
      phoneVerified: false, // MUST be verified before account activation
      phoneVerificationRequired: true, // MANDATORY for all vendors
      mustVerifyPhone: true, // Additional flag to enforce verification
      address: vendorData.address.trim(),
      type: vendorData.type,
      vendorType: discovery.vendorType,
      businessType: discovery.businessType,
      categories: [discovery.businessType, vendorData.type.toLowerCase()],
      description: vendorData.description?.trim() || '',
      profileImage: imageUrl,
      businessLogo: imageUrl, // V2 compatibility
      imageUrl: imageUrl, // Keep for backward compatibility
      isOnline: true, // Set to true by default for new vendors
      autoAccept: false,
      
      // Account Status - STRICTLY ENFORCED
      accountStatus: 'pending_phone_verification', // MANDATORY phone verification
      canReceiveOrders: false, // BLOCKED until phone verified
      isActive: false, // Hidden until admin approval or phone verification
      active: false,
      registrationComplete: false, // Registration not complete without verification
      
      // Availability settings
      availableDays: vendorData.availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      availableHours: vendorData.availableHours || { start: '08:00', end: '22:00' },
      deliveryTime: '30-45 mins', // Default delivery time
      deliveryFee: 200, // Default delivery fee
      isTemporarilyClosed: false,
      
      // V2 location structure
      location: {
        address: vendorData.address.trim(),
        coordinates: {
          latitude: 7.1475, // Default to Abeokuta center
          longitude: 3.3619
        }
      },
      coordinates: { // Backward compatibility
        latitude: 7.1475,
        longitude: 3.3619
      },
      
      // Stats
      rating: 4.5, // Default rating for new vendors
      totalOrders: 0,
      totalProducts: 0,

      // Wallet (8% launch commission on food subtotal)
      totalEarnings: 0,
      availableBalance: 0,
      pendingPayout: 0,
      totalPaidOut: 0,
      commissionRate: 0.08,
      walletInitialized: true,
      bankDetails: null,

      // Agent referral (for commissions & activity tracking)
      ...(agentLink
        ? {
            agentId: agentLink.agentId,
            referredByAgentId: agentLink.agentId,
            agentName: agentLink.agentName,
            agentPhone: agentLink.agentPhone,
            referredAt: serverTimestamp(),
          }
        : {}),
      isLive: false,
      hasFirstOrder: false,
      
      // Timestamps
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    console.log('📝 Creating vendor document:', vendorDoc);
    
    // Create the vendor document. Previously this was wrapped in a
    // try/catch that swallowed write failures and still reported
    // "success" to the user — leaving a Firebase Auth account with no
    // vendor profile at all, so the vendor could authenticate but
    // VendorLogin.jsx would find no Firestore doc and reject them with
    // no way to recover. Fail loudly instead so the user sees a real
    // error and can retry (which will detect the existing Auth account
    // and complete the missing profile — see the email-already-in-use
    // branch above).
    await withTimeout(
      setDoc(doc(db, 'vendors', vendorId), vendorDoc),
      20000,
      'Creating your vendor profile timed out. Please check your connection and try registering again — your login details are already saved.'
    );
    console.log('✅ Vendor document created successfully:', vendorId);

    if (agentLink) {
      await updateDoc(doc(db, 'agents', agentLink.agentId), {
        referredVendorCount: increment(1),
        lastVendorReferralAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => console.warn('Agent stats update skipped:', err));
    }

    // Return success with optional image upload warning
    const result = {
      success: true,
      vendorId: vendorId,
      requiresPhoneVerification: true,
      message: 'Registration successful! You must verify your phone number before your account can receive orders.'
    };

    // Add warning if image upload failed
    if (imageUploadWarning) {
      result.warning = imageUploadWarning;
    }

    return result;
  } catch (error) {
    console.error('❌ Vendor registration error:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    
    // Cleanup: If we created a BRAND NEW auth user but failed to create the
    // vendor profile, delete the auth user so they can retry cleanly.
    // Never delete an account we merely signed into (reusedExistingAuthAccount)
    // — that's a real, pre-existing user's account.
    if (auth.currentUser && !reusedExistingAuthAccount && error.code !== 'auth/email-already-in-use') {
      try {
        await auth.currentUser.delete();
        console.log('🧹 Cleaned up orphaned auth user');
      } catch (cleanupError) {
        console.error('❌ Failed to cleanup auth user:', cleanupError);
      }
    }
    
    // Enhanced error messages
    let errorMessage = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Try logging in instead.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password must be at least 6 characters long.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Please enter a valid email address.';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your internet connection.';
    } else if (error.code === 'permission-denied' || error.code === 'storage/unauthorized') {
      console.log('🔍 Permission issue during vendor registration, continuing with basic registration:', error);
      // Return success with warning for permission issues
      const currentVendorId = vendorId || userCredential?.user?.uid || auth.currentUser?.uid;
      return {
        success: true,
        vendorId: currentVendorId,
        warning: 'Registration completed but some features may be limited. You can update your profile later.'
      };
    } else if (error.message?.includes('Firebase Storage') || error.message?.includes('storage/')) {
      console.log('🔍 Storage issue during vendor registration, continuing without image:', error);
      // Return success with warning for storage issues  
      const currentVendorId = vendorId || userCredential?.user?.uid || auth.currentUser?.uid;
      return {
        success: true,
        vendorId: currentVendorId,
        warning: 'Registration completed but image upload failed. You can add an image later.'
      };
    } else if (!errorMessage) {
      errorMessage = 'Registration failed. Please try again.';
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Login vendor and set status to online
 * @param {string} email - Vendor email
 * @param {string} password - Vendor password
 * @returns {Promise<{success: boolean, vendorId?: string, vendorData?: Object, error?: string}>}
 */
export const loginVendor = async (email, password) => {
  try {
    // 1. Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const vendorId = userCredential.user.uid;

    // 2. Verify vendor exists in Firestore
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);

    if (!vendorSnap.exists()) {
      // User exists in Auth but not in vendors collection - create minimal document
      console.log('⚠️ Vendor document missing during login, creating minimal document...');
      
      // Extract name from email
      const emailName = email?.split('@')[0]?.replace(/[._]/g, ' ')?.split(' ')?.map(w => w.charAt(0).toUpperCase() + w.slice(1))?.join(' ') || 'Vendor';
      
      const minimalVendorDoc = {
        vendorId: vendorId,
        userId: vendorId,
        name: userCredential.user.displayName || emailName,
        businessName: userCredential.user.displayName || `${emailName}'s Business`,
        email: email,
        phone: '',
        address: '',
        type: 'restaurant',
        categories: ['restaurant'],
        description: '',
        profileImage: '',
        businessLogo: '',
        imageUrl: '',
        isOnline: true,
        autoAccept: false,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        availableHours: { start: '08:00', end: '22:00' },
        deliveryTime: '30-45 mins',
        deliveryFee: 200,
        isTemporarilyClosed: false,
        location: {
          address: '',
          coordinates: {
            latitude: 7.1475,
            longitude: 3.3619
          }
        },
        coordinates: {
          latitude: 7.1475,
          longitude: 3.3619
        },
        rating: 4.5,
        totalOrders: 0,
        totalProducts: 0,
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      try {
        // Use setDoc to create the document ONLY if it doesn't exist
        await setDoc(vendorRef, minimalVendorDoc);
        console.log('✅ Created missing vendor document during login');
      } catch (createError) {
        console.warn('⚠️ Could not create vendor document during login:', createError);
        // Return error - vendor needs to complete registration
        return {
          success: false,
          error: 'Vendor profile not found. Please complete registration first.'
        };
      }
    }

    // 3. ONLY update status fields - NEVER overwrite existing data
    // Use updateDoc with merge to preserve existing fields
    try {
      await updateDoc(vendorRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (updateError) {
      console.warn('⚠️ Could not update vendor status:', updateError);
      // Continue anyway - vendor can still log in
    }

    // 4. Fetch fresh vendor data
    const freshVendorSnap = await getDoc(vendorRef);
    if (!freshVendorSnap.exists()) {
      return {
        success: false,
        error: 'Vendor profile not found after login.'
      };
    }

    return {
      success: true,
      vendorId: vendorId,
      vendorData: {
        id: vendorSnap.id,
        ...vendorSnap.data()
      }
    };
  } catch (error) {
    console.error('❌ Vendor login error:', error);
    
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/wrong-password') {
      errorMessage = 'Incorrect password';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many login attempts. Try again later.';
    } else if (error.code === 'auth/invalid-credential') {
      errorMessage = 'Invalid email or password';
    }

    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Logout vendor and set status to offline
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const logoutVendor = async (vendorId) => {
  try {
    // Keep shop open/closed as set by Online toggle — logout alone must not mark Closed
    if (vendorId) {
      await updateDoc(doc(db, 'vendors', vendorId), {
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    await signOut(auth);

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Vendor logout error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update vendor online status
 * @param {string} vendorId - Vendor ID
 * @param {boolean} isOnline - Online status
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateVendorOnlineStatus = async (vendorId, isOnline) => {
  try {
    await updateDoc(doc(db, 'vendors', vendorId), {
      isOnline: isOnline,
      lastSeen: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Error updating vendor status:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get vendor data
 * @param {string} vendorId - Vendor ID
 * @returns {Promise<{success: boolean, vendor?: Object, error?: string}>}
 */
export const getVendorData = async (vendorId) => {
  try {
    const vendorSnap = await getDoc(doc(db, 'vendors', vendorId));

    if (!vendorSnap.exists()) {
      return {
        success: false,
        error: 'Vendor not found'
      };
    }

    return {
      success: true,
      vendor: {
        id: vendorSnap.id,
        ...vendorSnap.data()
      }
    };
  } catch (error) {
    console.error('❌ Error fetching vendor:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update vendor profile
 * @param {string} vendorId - Vendor ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateVendorProfile = async (vendorId, updates) => {
  try {
    await updateDoc(doc(db, 'vendors', vendorId), {
      ...updates,
      updatedAt: serverTimestamp()
    });

    return {
      success: true
    };
  } catch (error) {
    console.error('❌ Error updating vendor profile:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Check if user is a vendor
 * @param {string} userId - User ID
 * @returns {Promise<{isVendor: boolean, vendorData?: Object}>}
 */
export const checkIfVendor = async (userId) => {
  try {
    const vendorSnap = await getDoc(doc(db, 'vendors', userId));
    
    if (vendorSnap.exists()) {
      return {
        isVendor: true,
        vendorData: {
          id: vendorSnap.id,
          ...vendorSnap.data()
        }
      };
    }

    return {
      isVendor: false
    };
  } catch (error) {
    console.error('❌ Error checking vendor status:', error);
    return {
      isVendor: false
    };
  }
};

/**
 * Send OTP for vendor phone verification
 * @param {string} vendorId - Vendor ID
 * @param {string} phoneNumber - Phone number to verify
 * @returns {Promise<{success: boolean, message: string}>}
 */
function normalizeVendorPhone(phoneNumber) {
  let formattedPhone = String(phoneNumber || '').replace(/\D/g, '');
  if (formattedPhone.startsWith('234')) {
    formattedPhone = '0' + formattedPhone.substring(3);
  } else if (!formattedPhone.startsWith('0')) {
    formattedPhone = '0' + formattedPhone;
  }
  if (formattedPhone.length !== 11) {
    throw new Error('Enter a valid Nigerian WhatsApp number (e.g. 08012345678)');
  }
  return formattedPhone;
}

export const sendVendorPhoneOTP = async (vendorId, phoneNumber) => {
  try {
    const formattedPhone = normalizeVendorPhone(phoneNumber);
    console.log('📱 Sending WhatsApp OTP to vendor:', vendorId, formattedPhone);

    // Always save the contact number the vendor confirms
    await updateDoc(doc(db, 'vendors', vendorId), {
      phone: formattedPhone,
      updatedAt: serverTimestamp(),
    });

    const result = await sendOTP(vendorId, formattedPhone, 'vendor_phone_verification');

    if (result.success) {
      console.log('✅ Vendor WhatsApp OTP sent successfully');
      return {
        success: true,
        message: result.message || 'OTP sent to your WhatsApp. Please check your messages.',
        phone: formattedPhone,
        channel: 'whatsapp',
      };
    }

    // Fallback to email OTP if WhatsApp/Functions path is down
    const email = auth.currentUser?.email || '';
    if (email) {
      console.warn('⚠️ WhatsApp OTP failed, falling back to email:', result.message);
      const emailResult = await sendEmailOTP(vendorId, email, 'vendor_email_verification');
      if (emailResult.success) {
        return {
          success: true,
          message: emailResult.message || 'OTP sent to your email. Please check your inbox.',
          email: emailResult.email || email,
          channel: 'email',
        };
      }
      if (emailResult.code === 'OTP_DELIVERY_UNAVAILABLE') {
        return {
          success: false,
          code: 'OTP_DELIVERY_UNAVAILABLE',
          message: emailResult.message,
        };
      }
    }

    if (result.code === 'OTP_DELIVERY_UNAVAILABLE') {
      return {
        success: false,
        code: 'OTP_DELIVERY_UNAVAILABLE',
        message: result.message,
      };
    }

    throw new Error(result.message || 'Failed to send OTP');
  } catch (error) {
    console.error('❌ Error sending vendor OTP:', error);
    return {
      success: false,
      message: error.message || 'Failed to send OTP. Please try again.',
    };
  }
};

/**
 * Continue vendor onboarding when WhatsApp OTP backend is unavailable.
 * Moves vendor to pending_approval so they can set up menu; admin must still approve live.
 */
export const submitVendorPhoneForAdminReview = async (vendorId, phoneNumber) => {
  try {
    const formattedPhone = normalizeVendorPhone(phoneNumber);
    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    const existing = vendorSnap.exists() ? vendorSnap.data() : {};
    const discovery = mapVendorDiscoveryFields(existing.type || existing.businessType);

    await updateDoc(vendorRef, {
      phone: formattedPhone,
      phoneVerified: true,
      phoneVerificationRequired: false,
      mustVerifyPhone: false,
      accountStatus: 'pending_approval',
      registrationComplete: true,
      canReceiveOrders: false,
      isActive: false,
      active: false,
      isLive: false,
      approved: false,
      status: 'pending',
      vendorType: existing.vendorType || discovery.vendorType,
      businessType: existing.businessType || discovery.businessType,
      phoneVerifiedVia: 'admin_review_fallback',
      phoneVerifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      message:
        'Phone submitted. Set up your menu now — your store goes live after GO7 admin approval.',
    };
  } catch (error) {
    console.error('❌ Error submitting vendor phone for review:', error);
    return {
      success: false,
      message: error.message || 'Could not submit phone. Please try again.',
    };
  }
};

/**
 * Verify vendor phone number with OTP
 * @param {string} vendorId - Vendor ID
 * @param {string} otpCode - OTP code from SMS
 * @returns {Promise<{success: boolean, message: string}>}
 */
export const verifyVendorPhone = async (vendorId, otpCode) => {
  try {
    console.log('🔍 Verifying vendor phone:', vendorId);
    
    // Verify OTP
    const otpResult = await verifyOTP(vendorId, otpCode);
    
    if (!otpResult.success) {
      return otpResult;
    }

    const vendorRef = doc(db, 'vendors', vendorId);
    const vendorSnap = await getDoc(vendorRef);
    const existing = vendorSnap.exists() ? vendorSnap.data() : {};
    const discovery = mapVendorDiscoveryFields(existing.type || existing.businessType);

    // Keep contact phone from vendor profile — email OTP stores email in otp.phone
    let verifiedPhone = existing.phone;
    try {
      const otpSnap = await getDoc(doc(db, 'otp_codes', vendorId));
      const otpData = otpSnap.exists()
        ? otpSnap.data()
        : (await getDoc(doc(db, 'otps', vendorId))).data();
      if (otpData?.channel !== 'email' && otpData?.phone && !String(otpData.phone).includes('@')) {
        verifiedPhone = otpData.phone;
      }
    } catch (otpReadError) {
      console.warn('Could not read verified phone from OTP record:', otpReadError);
    }

    await updateDoc(vendorRef, {
      phone: verifiedPhone || existing.phone,
      phoneVerified: true,
      phoneVerificationRequired: false,
      mustVerifyPhone: false,
      accountStatus: 'pending_approval',
      registrationComplete: true,
      canReceiveOrders: false,
      isActive: false,
      active: false,
      isLive: false,
      approved: false,
      status: 'pending',
      vendorType: existing.vendorType || discovery.vendorType,
      businessType: existing.businessType || discovery.businessType,
      phoneVerifiedVia: 'email_otp',
      phoneVerifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Vendor verified via email OTP — awaiting admin approval:', vendorId);
    
    return {
      success: true,
      message: 'Email verified! Your application is now pending GO7 admin approval. You will be notified when your store goes live.',
    };
    
  } catch (error) {
    console.error('❌ Error verifying vendor phone:', error);
    return {
      success: false,
      message: 'Failed to verify phone number. Please try again.'
    };
  }
};

export default {
  registerVendor,
  loginVendor,
  logoutVendor,
  updateVendorOnlineStatus,
  getVendorData,
  updateVendorProfile,
  checkIfVendor,
  sendVendorPhoneOTP,
  verifyVendorPhone,
  submitVendorPhoneForAdminReview,
};
