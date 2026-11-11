import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
// GO7 AUTH START - Import Firebase services
import { createUserProfile, getUserProfile } from '../firebase/services/userService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeUserWallet, ensureVirtualAccount } from '../firebase/services/paystackDVAService';
import { logFirebaseStatus } from '../utils/firebaseTest';
// GO7 AUTH END

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // GO7 AUTH START - Add user profile and phone prompt state
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  // GO7 AUTH END

  useEffect(() => {
    // Log Firebase status on initialization
    logFirebaseStatus();

    if (!auth) {
      console.warn('⚠️ Auth not initialized — continuing as guest');
      setLoading(false);
      return undefined;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // GO7 AUTH START - Load user profile and check for missing phone
        setProfileLoading(true);
        try {
          let profile = await getUserProfile(user.uid);
          if (profile) {
            profile = {
              ...profile,
              phone: profile.phone || profile.phoneNumber || user.phoneNumber || '',
            };
          }
          setUserProfile(profile);
          
          // Check if user is a vendor (vendors have phone in vendors collection, not users)
          let isVendor = false;
          try {
            const vendorDocRef = doc(db, 'vendors', user.uid);
            const vendorSnapshot = await getDoc(vendorDocRef);
            isVendor = vendorSnapshot.exists();
            console.log('🔍 Vendor check:', { userId: user.uid, isVendor });
          } catch (vendorError) {
            console.error('Error checking vendor status:', vendorError);
          }
          
          // Only show phone prompt for regular users without phone, not vendors
          if (!isVendor && (!profile?.phone || profile.phone.trim() === '')) {
            setShowPhonePrompt(true);
            console.log('📱 Showing phone prompt for regular user');
          } else {
            setShowPhonePrompt(false);
            console.log('✅ No phone prompt needed:', { isVendor, hasPhone: !!profile?.phone });
          }
          
          // Store user session with profile data
          localStorage.setItem('go7_user_session', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            timestamp: Date.now(),
            hasProfile: !!profile
          }));
          
          console.log('🔐 Auth state changed: Signed in with profile loaded');
        } catch (error) {
          console.error('❌ Error loading user profile:', error);
          setUserProfile(null);
        }
        setProfileLoading(false);
        // GO7 AUTH END
        
        // Clear guest mode if user logs in
        localStorage.removeItem('go7_guest_mode');
      } else {
        // Clear user session and profile when signed out
        localStorage.removeItem('go7_user_session');
        setUserProfile(null);
        setShowPhonePrompt(false);
        console.log('🔐 Auth state changed: Signed out');
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const syncEmailVerifiedFlag = async (firebaseUser) => {
    if (!firebaseUser?.uid || !firebaseUser.emailVerified) return;
    try {
      await setDoc(
        doc(db, 'users', firebaseUser.uid),
        { emailVerified: true, updatedAt: new Date().toISOString() },
        { merge: true }
      );
      setUserProfile((prev) => (prev ? { ...prev, emailVerified: true } : prev));
    } catch (e) {
      console.warn('Could not sync emailVerified flag:', e?.message || e);
    }
  };

  const resendVerificationEmail = async (firebaseUser = null) => {
    const target = firebaseUser || auth?.currentUser;
    if (!target) {
      throw new Error('Sign in first to resend the verification email.');
    }
    if (target.emailVerified) {
      return { success: true, alreadyVerified: true };
    }
    await sendEmailVerification(target, {
      url: window.location.origin + '/profile',
      handleCodeInApp: false,
    });
    return { success: true };
  };

  const login = async (email, password) => {
    try {
      // Check if Firebase auth is initialized
      if (!auth) {
        throw new Error('Firebase authentication is not properly configured. Please check your environment variables.');
      }
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      await result.user.reload();

      if (!result.user.emailVerified) {
        // Grandfather: accounts already verified by phone before email-only mode
        let phoneVerifiedLegacy = false;
        try {
          const snap = await getDoc(doc(db, 'users', result.user.uid));
          phoneVerifiedLegacy = !!snap.data()?.phoneVerified;
        } catch (_) {
          /* ignore */
        }

        if (!phoneVerifiedLegacy) {
          try {
            await sendEmailVerification(result.user, {
              url: window.location.origin + '/profile',
              handleCodeInApp: false,
            });
          } catch (_) {
            /* ignore */
          }
          await signOut(auth);
          const err = new Error(
            'Please verify your email before signing in. We sent a verification link to your inbox.'
          );
          err.code = 'auth/email-not-verified';
          throw err;
        }
      }

      await syncEmailVerifiedFlag(result.user);
      console.log('✅ Login successful');
      return result;
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Enhanced error handling for common issues
      if (error.message?.includes('Firebase authentication is not properly configured')) {
        // Firebase config issue
        throw new Error('Authentication service is not configured. Please contact support.');
      } else if (error.code === 'auth/configuration-not-found') {
        throw new Error('Authentication service configuration error. Please try again later.');
      } else if (error.code === 'auth/api-key-not-valid') {
        throw new Error('Authentication service error. Please contact support.');
      }
      
      throw error;
    }
  };

  const register = async (email, password, displayName, referralCode = '', phoneNumber = '', options = {}) => {
    try {
      // Check if Firebase auth is initialized
      if (!auth) {
        throw new Error('Firebase authentication is not properly configured. Please check your environment variables.');
      }

      const phoneAlreadyVerified = options?.phoneVerified === true;
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Send email verification (still useful; phone OTP may already verify identity)
      try {
        await sendEmailVerification(result.user, {
          url: window.location.origin + '/profile',
          handleCodeInApp: false
        });
        console.log('✅ Verification email sent to:', email);
      } catch (emailError) {
        console.error('⚠️ Failed to send verification email:', emailError);
        // Don't fail registration if email sending fails
      }
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(result.user, {
          displayName: displayName
        });
      }
      
      // GO7 AUTH START - Create user profile with phone and process referral
      try {
        const { formatPhoneNumber } = await import('../utils/phoneUtils');
        const normalizedPhone = phoneNumber ? formatPhoneNumber(phoneNumber) : '';
        const userData = {
          name: displayName || '',
          email: email,
          phone: normalizedPhone,
          phoneNumber: normalizedPhone,
          referredBy: referralCode.trim() || null,
          emailVerified: false,
          phoneVerified: phoneAlreadyVerified
        };
        
        const profile = await createUserProfile(result.user.uid, userData);
        setUserProfile(profile);
        
        // Create Paystack DVA immediately while the signup session is still authenticated.
        // Failure must never block account creation — WalletAutoSetup retries on next login.
        let virtualAccount = null;
        let dvaCreated = false;
        if (normalizedPhone) {
          try {
            console.log('🏦 Creating Paystack DVA for new user...');
            virtualAccount = await ensureVirtualAccount({
              uid: result.user.uid,
              email,
              phone: normalizedPhone,
              name: displayName || '',
            });
            if (!virtualAccount) {
              const initResult = await initializeUserWallet(result.user, normalizedPhone);
              virtualAccount = initResult?.data?.virtualAccount
                || initResult?.virtualAccount
                || null;
            }
            dvaCreated = Boolean(virtualAccount);
            console.log(dvaCreated ? '✅ Paystack DVA created successfully' : '⚠️ DVA not created yet');
          } catch (dvaError) {
            console.error('⚠️ Failed to create Paystack DVA:', dvaError);
          }
        }
        
        // Referral attribution is server-authoritative (Growth Engine):
        // the callable records attribution once; rewards are issued only by
        // backend qualification on the customer's first completed order.
        if (referralCode && referralCode.trim() !== '') {
          try {
            const registerAttribution = httpsCallable(getFunctions(), 'registerReferralAttribution');
            const res = await registerAttribution({
              code: referralCode.trim(),
              source: 'LINK',
              metadata: { landingSource: 'signup' },
            });
            if (res?.data?.status === 'REGISTERED') {
              console.log('✅ Referral attribution registered:', res.data);
              return {
                ...result,
                referralBonus: { success: true, attribution: res.data },
                profile,
                virtualAccount,
                dvaCreated,
              };
            }
            console.warn('⚠️ Referral attribution:', res?.data?.status, res?.data?.reason || '');
          } catch (attrError) {
            // Never block signup on attribution failure.
            console.warn('⚠️ Referral attribution failed (non-blocking):', attrError?.message || attrError);
          }
        }
        
        return { ...result, profile, virtualAccount, dvaCreated };
      } catch (profileError) {
        console.error('❌ Error creating user profile:', profileError);
        // Don't fail registration if profile creation fails
      }
      // GO7 AUTH END
      
      console.log('✅ Registration successful');
      return result;
    } catch (error) {
      console.error('❌ Registration error:', error);
      
      // Enhanced error handling for registration
      if (error.message?.includes('Firebase authentication is not properly configured')) {
        throw new Error('Authentication service is not configured. Please contact support.');
      } else if (error.code === 'auth/configuration-not-found') {
        throw new Error('Authentication service configuration error. Please try again later.');
      } else if (error.code === 'auth/api-key-not-valid') {
        throw new Error('Authentication service error. Please contact support.');
      }
      
      throw error;
    }
  };

  // GO7 AUTH START - Google sign-in: popup, then ensure a user profile exists
  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase authentication is not properly configured. Please check your environment variables.');
    }
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const gUser = result.user;

    try {
      const existing = await getUserProfile(gUser.uid);
      if (!existing) {
        const profile = await createUserProfile(gUser.uid, {
          name: gUser.displayName || '',
          email: gUser.email || '',
          phone: '',
          phoneNumber: '',
          emailVerified: !!gUser.emailVerified,
          phoneVerified: false,
          authProvider: 'google',
        });
        setUserProfile(profile);
      } else {
        setUserProfile(existing);
      }
    } catch (profileError) {
      console.error('⚠️ Google sign-in profile setup failed (non-blocking):', profileError);
    }

    console.log('✅ Google sign-in successful');
    return result;
  };
  // GO7 AUTH END

  const clearClientSessionKeys = () => {
    try {
      localStorage.removeItem('go7_user_session');
      localStorage.removeItem('go7_guest_mode');
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    } catch (_) {
      /* ignore */
    }
  };

  const logout = async () => {
    // Clear local session first so UI cannot bounce back from stale keys
    clearClientSessionKeys();
    setUser(null);
    setUserProfile(null);
    setShowPhonePrompt(false);

    try {
      if (!auth) {
        console.warn('⚠️ Logout: auth unavailable; local session cleared');
        return;
      }
      await Promise.race([
        signOut(auth),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Logout timed out')), 8000)
        ),
      ]);
      setUser(null);
      setUserProfile(null);
      console.log('✅ Logout successful');
      if (auth.currentUser) {
        throw new Error('Still signed in after logout');
      }
    } catch (error) {
      console.error('❌ Logout error:', error);
      clearClientSessionKeys();
      setUser(null);
      setUserProfile(null);
      // Last attempt — do not leave a live Firebase session
      try {
        if (auth?.currentUser) await signOut(auth);
      } catch (_) {
        /* ignore */
      }
      if (auth?.currentUser) throw error;
    }
  };

  const updateUserProfile = async (updates) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, updates);
        console.log('✅ Profile updated');
      }
    } catch (error) {
      console.error('❌ Profile update error:', error);
      throw error;
    }
  };

  // Guest mode helpers
  const setGuestMode = (enabled = true) => {
    if (enabled) {
      localStorage.setItem('go7_guest_mode', 'true');
    } else {
      localStorage.removeItem('go7_guest_mode');
    }
  };

  const isGuestMode = () => {
    return localStorage.getItem('go7_guest_mode') === 'true';
  };

  // Check if user has a stored session
  const hasStoredSession = () => {
    const session = localStorage.getItem('go7_user_session');
    if (!session) return false;
    
    try {
      const parsedSession = JSON.parse(session);
      // Check if session is less than 30 days old
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      return parsedSession.timestamp > thirtyDaysAgo;
    } catch {
      return false;
    }
  };

  // GO7 AUTH START - Add profile refresh and phone update functions
  const refreshUserProfile = async () => {
    if (user) {
      setProfileLoading(true);
      try {
        let profile = await getUserProfile(user.uid);
        if (profile) {
          profile = {
            ...profile,
            phone: profile.phone || profile.phoneNumber || user.phoneNumber || '',
          };
        }
        setUserProfile(profile);
        
        // Check if phone is still missing after refresh
        const phone = profile?.phone || profile?.phoneNumber || '';
        if (!phone || phone.trim() === '') {
          setShowPhonePrompt(true);
        } else {
          setShowPhonePrompt(false);
        }
        
        return profile;
      } catch (error) {
        console.error('❌ Error refreshing user profile:', error);
        throw error;
      } finally {
        setProfileLoading(false);
      }
    }
    return null;
  };

  const updateUserPhone = async (phoneNumber) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      // First, try to update in Firestore
      const userRef = doc(db, 'users', user.uid);
      
      try {
        // Check if user document exists
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          await setDoc(userRef, {
            phone: phoneNumber,
            phoneNumber: phoneNumber,
            phoneVerified: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else {
          // Create new document with phone
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            name: user.displayName || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            phone: phoneNumber,
            phoneNumber: phoneNumber,
            phoneVerified: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        console.log('✅ Phone number saved to Firestore');

        try {
          await ensureVirtualAccount({ uid: user.uid, phone: phoneNumber });
        } catch (dvaError) {
          console.warn('⚠️ DVA setup after phone save failed:', dvaError?.message);
        }
      } catch (firestoreError) {
        console.warn('⚠️ Firestore update failed (permission issue), saving to localStorage:', firestoreError.message);
        
        // Fallback: Save to localStorage
        const userProfileData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          phone: phoneNumber,
          updatedAt: new Date().toISOString()
        };
        
        localStorage.setItem(`go7_user_${user.uid}`, JSON.stringify(userProfileData));
        console.log('✅ Phone number saved to localStorage as fallback');
      }

      // Update local state
      setUserProfile(prev => ({
        ...prev,
        phone: phoneNumber
      }));
      
      setShowPhonePrompt(false);
      
      console.log('✅ Phone number updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating phone number:', error);
      throw error;
    }
  };
  // GO7 AUTH END

  const value = {
    user,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    updateUserProfile,
    setGuestMode,
    isGuestMode,
    hasStoredSession,
    // GO7 AUTH START - Add profile-related values
    userProfile,
    profileLoading,
    refreshUserProfile,
    showPhonePrompt,
    updateUserPhone,
    resendVerificationEmail,
    syncEmailVerifiedFlag,
    isEmailVerified: !!user?.emailVerified,
    // GO7 AUTH END
    // Convenience properties
    currentUser: user,
    isLoggedIn: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Backward compatibility export
export const useAuthContext = useAuth;

export default AuthContext;