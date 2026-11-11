import { getFunctions, httpsCallable } from 'firebase/functions';
import toast from 'react-hot-toast';

/**
 * 🏗️ Auto-create Virtual Account After Signup
 * 
 * Call this function after successful Firebase Auth signup
 * to automatically set up the user's Paystack DVA
 */
export const setupUserWalletAfterSignup = async (user) => {
  try {
    console.log('🏗️ Setting up wallet for new user:', user.uid);
    
    const functions = getFunctions();
    const createVirtualAccount = httpsCallable(functions, 'createUserVirtualAccount');
    
    // Extract user details and ensure proper name formatting
    const fullName = user.displayName || user.email?.split('@')[0] || 'Go7';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Go7';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
    const formattedName = `${firstName} ${lastName}`;
    
    const userData = {
      uid: user.uid,
      email: user.email,
      phone: user.phoneNumber || '+2348000000000', // Default if not provided
      name: formattedName
    };
    
    console.log('📝 Creating virtual account with data:', userData);
    
    const result = await createVirtualAccount(userData);
    
    if (result.data.success) {
      console.log('✅ Virtual account created:', result.data);
      toast.success('Welcome! Your wallet is ready to use!');
      return result.data;
    } else {
      throw new Error('Failed to create virtual account');
    }
    
  } catch (error) {
    console.error('❌ Error setting up wallet:', error);
    toast.error('Could not create wallet. Please try again later.');
    throw error;
  }
};

/**
 * 📱 Phone OTP Signup with Auto Wallet Setup
 * 
 * Complete signup flow with automatic virtual account creation
 */
export const signupWithPhoneAndCreateWallet = async (phoneNumber, verificationCode, recaptchaVerifier) => {
  try {
    const { getAuth, signInWithPhoneNumber } = await import('firebase/auth');
    const auth = getAuth();
    
    // Step 1: Send OTP
    console.log('📱 Sending OTP to:', phoneNumber);
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier
    );
    
    // Step 2: Verify OTP
    console.log('🔐 Verifying OTP...');
    const userCredential = await confirmationResult.confirm(verificationCode);
    const user = userCredential.user;
    
    console.log('✅ Phone auth successful:', user.uid);
    
    // Step 3: Auto-create virtual account
    await setupUserWalletAfterSignup(user);
    
    return user;
    
  } catch (error) {
    console.error('❌ Signup error:', error);
    
    if (error.code === 'auth/invalid-verification-code') {
      toast.error('Invalid verification code');
    } else if (error.code === 'auth/too-many-requests') {
      toast.error('Too many attempts. Please try again later.');
    } else {
      toast.error('Signup failed. Please try again.');
    }
    
    throw error;
  }
};

/**
 * 📧 Email Signup with Auto Wallet Setup
 * 
 * Alternative signup method with email/password
 */
export const signupWithEmailAndCreateWallet = async (email, password, displayName) => {
  try {
    const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
    const auth = getAuth();
    
    // Step 1: Create account
    console.log('📧 Creating account for:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Step 2: Update profile
    if (displayName) {
      await updateProfile(user, { displayName });
      console.log('👤 Profile updated with name:', displayName);
    }
    
    console.log('✅ Email signup successful:', user.uid);
    
    // Step 3: Auto-create virtual account
    await setupUserWalletAfterSignup(user);
    
    return user;
    
  } catch (error) {
    console.error('❌ Email signup error:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      toast.error('Email already in use');
    } else if (error.code === 'auth/weak-password') {
      toast.error('Password is too weak');
    } else {
      toast.error('Signup failed. Please try again.');
    }
    
    throw error;
  }
};

/**
 * 🔍 Check if User Has Virtual Account
 * 
 * Helper to check if user's wallet is set up
 */
export const checkUserHasVirtualAccount = async (userId) => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../firebase/config');
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        hasAccount: !!data.virtualAccount,
        virtualAccount: data.virtualAccount || null,
        paystackId: data.paystackId || null
      };
    }
    
    return { hasAccount: false };
    
  } catch (error) {
    console.error('❌ Error checking virtual account:', error);
    return { hasAccount: false };
  }
};

export default {
  setupUserWalletAfterSignup,
  signupWithPhoneAndCreateWallet,
  signupWithEmailAndCreateWallet,
  checkUserHasVirtualAccount
};