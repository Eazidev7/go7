import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, signInWithCustomToken } from 'firebase/auth';
import { PASSWORD_RESET_ACTION } from '../../utils/authHelpers';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';
// GO7 AUTH START - Import useAuth hook from correct path
import { useAuth } from '../../contexts/AuthContext';
import { validateReferralCode } from '../../firebase/services/referralService';
import { REFERRAL_STORAGE_KEY } from '../../pages/ReferralLanding';
import { formatPhoneNumber, isValidNigerianPhone } from '../../utils/phoneUtils';
import { ensureVirtualAccount } from '../../firebase/services/paystackDVAService';
// GO7 AUTH END
import { LogIn, UserPlus, X, Smartphone, Mail, User as UserIcon } from 'lucide-react';
import './AuthSheet.css';

// ── Friendly auth errors — never show raw "Firebase: Error (auth/…)" text ──
const AUTH_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/weak-password': 'Password is too weak — use at least 6 characters.',
  'auth/email-already-in-use': 'This email is already registered. Try logging in instead.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'No internet connection. Check your network and try again.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/operation-not-allowed': 'This sign-in method is not available. Try WhatsApp login.',
  'auth/popup-closed-by-user': 'Sign-in cancelled.',
  'auth/cancelled-popup-request': 'Sign-in cancelled.',
  'auth/popup-blocked': 'Please allow popups to sign in with Google.',
  'auth/account-exists-with-different-credential': 'This email already has an account with a different sign-in method.',
  'auth/requires-recent-login': 'Please log in again to continue.',
  'auth/invalid-custom-token': 'Sign-in failed. Please request a new code.',
  'auth/custom-token-mismatch': 'Sign-in failed. Please request a new code.',
  'functions/invalid-argument': 'Invalid code. Please try again.',
  'functions/not-found': 'No account found. Please sign up first.',
  'functions/already-exists': 'This phone number is already registered. Try logging in instead.',
  'functions/resource-exhausted': 'Too many attempts. Please try again later.',
  'functions/deadline-exceeded': 'That code has expired. Please request a new one.',
  'functions/permission-denied': 'Incorrect code. Please try again.',
  'functions/failed-precondition': 'Please request a new code and try again.',
  'functions/unauthenticated': 'Please sign in to continue.',
  'functions/unavailable': 'Service temporarily unavailable. Check your connection and try again.',
  'functions/internal': 'Something went wrong on our side. Please try again.',
};

function friendlyAuthError(error, fallback = 'Something went wrong. Please try again.') {
  const code = String(error?.code || '');
  const mapped = AUTH_ERROR_MESSAGES[code] || AUTH_ERROR_MESSAGES[`functions/${code}`];
  if (mapped) return mapped;
  const cleaned = String(error?.message || '')
    .replace(/^Firebase(Error)?:\s*/i, '')
    .replace(/\s*\((?:auth|functions)\/[\w-]+\)\.?/gi, '')
    .trim();
  if (cleaned && cleaned.length <= 140 && !/firebase|firestore|assertion|unexpected|internal error/i.test(cleaned)) {
    return cleaned;
  }
  return fallback;
}

const AuthSheet = ({ mode = 'signup', onClose, onSuccess }) => {
  // GO7 AUTH START - Use enhanced auth context
  const { login, register, resendVerificationEmail, loginWithGoogle } = useAuth();
  // GO7 AUTH END
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    // GO7 AUTH START - Add name, phone, and referral code fields
    name: '',
    phone: '',
    // Prefill from a /r/{code} landing (stored referral code); server validates.
    referralCode: (() => {
      try { return localStorage.getItem(REFERRAL_STORAGE_KEY) || sessionStorage.getItem(REFERRAL_STORAGE_KEY) || ''; }
      catch (_) { return ''; }
    })()
    // GO7 AUTH END
  });
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState(mode);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // GO7 AUTH START - Add referral and phone validation state
  const [referralValidation, setReferralValidation] = useState({ valid: null, message: '' });
  const [phoneValidation, setPhoneValidation] = useState({ valid: null, message: '' });
  // GO7 AUTH END
  
  // OTP Login States (kept for future Blaze; UI hidden)
  const [loginStep, setLoginStep] = useState(1); // 1: phone input, 2: OTP verification
  const [otp, setOtp] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [otpSentTime, setOtpSentTime] = useState(null);
  const [loginMethod, setLoginMethod] = useState('phone'); // phone OTP via WhatsApp; email also available
  
  // OTP Signup States  
  const [signupStep, setSignupStep] = useState(1); // 1: form input, 2: OTP verification
  const [signupOtp, setSignupOtp] = useState('');
  const [signupOtpSentTime, setSignupOtpSentTime] = useState(null);
  const [tempSignupData, setTempSignupData] = useState(null);
  const [otpSendError, setOtpSendError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const otpInputRef = useRef(null);
  const signupOtpInputRef = useRef(null);

  useEffect(() => {
    if (loginStep === 2 && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [loginStep]);

  useEffect(() => {
    if (signupStep === 2 && signupOtpInputRef.current) {
      signupOtpInputRef.current.focus();
    }
  }, [signupStep]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // GO7 AUTH START - Validate referral code on change
    if (name === 'referralCode' && value.trim() !== '') {
      const validation = validateReferralCode(value);
      setReferralValidation(validation);
    } else if (name === 'referralCode' && value.trim() === '') {
      setReferralValidation({ valid: null, message: '' });
    }

    // Validate phone number on change
    if (name === 'phone' && value.trim() !== '') {
      const cleaned = value.replace(/\D/g, '');
      let validation = { valid: false, message: 'Enter a valid Nigerian phone number' };
      
      if (cleaned.length >= 10) {
        if (cleaned.startsWith('0') && cleaned.length === 11) {
          validation = { valid: true, message: '✓ Valid phone number' };
        } else if (cleaned.startsWith('234') && cleaned.length === 13) {
          validation = { valid: true, message: '✓ Valid phone number' };
        } else if (cleaned.length === 10) {
          validation = { valid: true, message: '✓ Valid phone number' };
        }
      }
      setPhoneValidation(validation);
    } else if (name === 'phone' && value.trim() === '') {
      setPhoneValidation({ valid: null, message: '' });
    }
    // GO7 AUTH END
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Format phone number
  const normalizePhone = (phone) => formatPhoneNumber(phone);

  // Handle Phone OTP Login - Step 1: Send OTP via Cloud Function
  // (client Firestore list queries on /users are blocked when logged out)
  const handlePhoneLogin = async (e) => {
    e.preventDefault();

    if (!formData.phone.trim()) {
      const msg = 'Please enter your phone number';
      setLoginError(msg);
      toast.error(msg);
      return;
    }

    if (!isValidNigerianPhone(formData.phone)) {
      const msg = 'Please enter a valid Nigerian phone number';
      setLoginError(msg);
      toast.error(msg);
      return;
    }

    if (otpSending) return;
    const formattedPhone = normalizePhone(formData.phone);
    const loadingToast = toast.loading('Sending OTP to WhatsApp...');

    // Optimistic: show the code box immediately — the WhatsApp send completes
    // in the background, so the user isn't stuck on a spinner for seconds.
    setLoginError('');
    setOtpSendError('');
    setTempUserId(null);
    setVerifiedPhone(formattedPhone);
    setFormData((prev) => ({ ...prev, phone: formattedPhone }));
    setOtp('');
    setLoginStep(2);
    setOtpSending(true);

    try {
      const functions = getFunctions();
      const requestLoginOTP = httpsCallable(functions, 'requestLoginOTP');
      const result = await requestLoginOTP({
        phoneNumber: formattedPhone,
        purpose: 'customer_login',
      });

      if (!result.data?.success) {
        throw new Error(result.data?.message || 'Failed to send OTP');
      }

      const userId = result.data.userId;
      const firebasePhone = result.data.phone || formattedPhone;

      setTempUserId(userId);
      setVerifiedPhone(firebasePhone);
      setFormData((prev) => ({ ...prev, phone: firebasePhone }));
      setOtpSentTime(Date.now());

      toast.success('✅ OTP sent to your WhatsApp!', { id: loadingToast });
    } catch (error) {
      console.error('❌ Phone login error:', error);
      const message = friendlyAuthError(error, 'Could not send WhatsApp OTP. Please try again.');
      setOtpSendError(message);
      toast.error(message, { id: loadingToast });
    } finally {
      setOtpSending(false);
    }
  };

  // Handle Phone OTP Login - Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    if (loading || otpSending) return;

    setLoading(true);
    const loadingToast = toast.loading('Verifying OTP...');

    try {
      const formattedPhone = verifiedPhone || normalizePhone(formData.phone);

      // Call Cloud Function to verify OTP and get custom token
      const functions = getFunctions();
      const loginWithPhoneOTP = httpsCallable(functions, 'loginWithPhoneOTP');
      
      const result = await loginWithPhoneOTP({
        phoneNumber: formattedPhone,
        code: otp,
        userId: tempUserId || undefined,
      });

      if (!result.data.success) {
        throw new Error(result.data.message || 'Login failed');
      }

      // Sign in with custom token (iOS Safari may need a single retry)
      const authInstance = getAuth();
      try {
        await signInWithCustomToken(authInstance, result.data.customToken);
      } catch (signInError) {
        console.warn('⚠️ First custom-token sign-in failed, retrying once:', signInError?.message);
        await new Promise((r) => setTimeout(r, 400));
        await signInWithCustomToken(authInstance, result.data.customToken);
      }

      try {
        await ensureVirtualAccount({
          uid: authInstance.currentUser?.uid,
          phone: verifiedPhone || formattedPhone,
        });
      } catch (dvaError) {
        console.warn('⚠️ DVA setup after login skipped:', dvaError?.message);
      }

      toast.success('✅ Login successful!', { id: loadingToast });
      
      // Call onSuccess callback
      onSuccess && onSuccess(result.data.user);

    } catch (error) {
      console.error('❌ Verify OTP error:', error);

      let errorMessage;
      if (
        error.code === 'auth/invalid-custom-token' ||
        error.code === 'auth/custom-token-mismatch' ||
        /custom.token|audience|aud|project/i.test(String(error.message || ''))
      ) {
        errorMessage = 'Sign-in token mismatch. Please request a new WhatsApp code and try again.';
      } else if (/indexeddb|offline|network|internal-error|storage/i.test(String(error.message || ''))) {
        errorMessage = 'Sign-in failed on this browser. Try Safari (not Private), or use email login.';
      } else {
        errorMessage = friendlyAuthError(error, 'Login failed. Please try again.');
      }

      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
  const handleResendOTP = async () => {
    if (otpSending) return;
    const now = Date.now();
    const timeSinceLastSend = now - (otpSentTime || 0);
    
    if (timeSinceLastSend < 60000) {
      const remainingSeconds = Math.ceil((60000 - timeSinceLastSend) / 1000);
      toast.error(`Please wait ${remainingSeconds} seconds before resending`);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Resending OTP...');

    try {
      const formattedPhone = verifiedPhone || normalizePhone(formData.phone);
      const functions = getFunctions();
      const requestLoginOTP = httpsCallable(functions, 'requestLoginOTP');
      const result = await requestLoginOTP({
        phoneNumber: formattedPhone,
        purpose: 'customer_login',
      });

      if (!result.data?.success) {
        throw new Error(result.data?.message || 'Failed to resend OTP');
      }

      if (result.data.userId) setTempUserId(result.data.userId);
      if (result.data.phone) setVerifiedPhone(result.data.phone);
      setOtpSendError('');
      setOtpSentTime(Date.now());
      toast.success('✅ OTP resent to your WhatsApp!', { id: loadingToast });

    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      const message = friendlyAuthError(error, 'Failed to resend OTP. Please try again.');
      setOtpSendError(message);
      toast.error(message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Handle Email/Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Logging in...');

    try {
      const result = await login(formData.email, formData.password);
      
      toast.success('Welcome back!', { id: loadingToast });
      onSuccess && onSuccess(result.user);

    } catch (error) {
      console.error('Email login error:', error);
      const message = error.code === 'auth/email-not-verified'
        ? (error.message || 'Please verify your email before signing in. Check your inbox.')
        : friendlyAuthError(error, 'Login failed. Please try again.');
      toast.error(message, { id: loadingToast, duration: 6000 });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    const loadingToast = toast.loading('Opening Google sign-in...');

    try {
      await loginWithGoogle();

      toast.success('Welcome! 👋', { id: loadingToast });
      onSuccess && onSuccess();

    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      const message = friendlyAuthError(error, 'Google sign-in failed. Please try again.');
      toast.error(message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle Signup Step 1: Send OTP via Cloud Function
  // (client Firestore list queries on /users are blocked when logged out)
  const handleSendSignupOTP = async (e) => {
    e.preventDefault();

    if (otpSending) return;
    const formattedPhone = normalizePhone(formData.phone);
    const loadingToast = toast.loading('Sending OTP to WhatsApp...');

    // Optimistic: show the code box immediately — the WhatsApp send completes
    // in the background, so the user isn't stuck on a spinner for seconds.
    setTempSignupData({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formattedPhone,
      referralCode: formData.referralCode
    });
    setTempUserId(null);
    setSignupOtp('');
    setOtpSendError('');
    setSignupStep(2);
    setOtpSending(true);

    try {
      const functions = getFunctions();
      const requestSignupOTP = httpsCallable(functions, 'requestSignupOTP');
      const result = await requestSignupOTP({
        phoneNumber: formattedPhone,
        purpose: 'customer_signup_verification',
      });

      if (!result.data?.success) {
        throw new Error(result.data?.message || 'Failed to send OTP');
      }

      const tempId = result.data.userId;
      const phone = result.data.phone || formattedPhone;

      setTempUserId(tempId);
      setTempSignupData((prev) => ({ ...prev, phone }));
      setSignupOtpSentTime(Date.now());

      toast.success('✅ OTP sent to your WhatsApp!', { id: loadingToast });
    } catch (error) {
      console.error('❌ Signup OTP error:', error);
      const message = friendlyAuthError(error, 'Could not send WhatsApp OTP. Please try again.');
      setOtpSendError(message);
      toast.error(message, { id: loadingToast });
    } finally {
      setOtpSending(false);
    }
  };

  // Handle Signup Step 2: Verify OTP and Create Account
  const handleVerifySignupOTP = async (e) => {
    e.preventDefault();

    if (loading || otpSending) return;

    if (!signupOtp || signupOtp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    const phone = tempSignupData?.phone || normalizePhone(formData.phone);
    const otpUserId = tempUserId || (phone ? `signup_${phone}` : null);

    if (!otpUserId && !phone) {
      toast.error('Signup session lost. Please start again.');
      setSignupStep(1);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Verifying OTP and creating account...');

    try {
      const functions = getFunctions();
      const verifyPhoneOTP = httpsCallable(functions, 'verifyPhoneOTP');
      
      const verifyResult = await verifyPhoneOTP({
        userId: otpUserId,
        phoneNumber: phone,
        code: String(signupOtp).trim(),
      });

      if (!verifyResult.data.success) {
        throw new Error(verifyResult.data.message || 'OTP verification failed');
      }

      // OTP verified! Now create the account (phone marked verified)
      const result = await register(
        tempSignupData.email, 
        tempSignupData.password, 
        tempSignupData.name,
        tempSignupData.referralCode,
        tempSignupData.phone || phone,
        { phoneVerified: true }
      );

      const walletReady = result?.virtualAccount || result?.dvaCreated;
      if (result.referralBonus?.success) {
        toast.success(
          `Account created${walletReady ? ' with wallet ready' : ''}! ${result.referralBonus.referrerName} earned ₦${result.referralBonus.bonusAmount} for referring you!`,
          { id: loadingToast, duration: 6000 }
        );
      } else {
        toast.success(
          walletReady
            ? 'Account created — phone verified and wallet ready!'
            : 'Account created — phone verified!',
          { id: loadingToast, duration: 5000 }
        );
      }

      setSignupStep(1);
      setSignupOtp('');
      setTempUserId(null);
      setTempSignupData(null);
      onSuccess && onSuccess(result.user);

    } catch (error) {
      console.error('❌ Verify signup OTP error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email is already registered. Try logging in instead.', { id: loadingToast });
        setSignupStep(1);
      } else {
        toast.error(friendlyAuthError(error, 'Verification failed. Please try again.'), { id: loadingToast });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend Signup OTP
  const handleResendSignupOTP = async () => {
    if (otpSending) return;
    if (signupOtpSentTime && Date.now() - signupOtpSentTime < 60000) {
      const remaining = Math.ceil((60000 - (Date.now() - signupOtpSentTime)) / 1000);
      toast.error(`Please wait ${remaining} seconds before requesting a new code`);
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Resending OTP...');

    try {
      const functions = getFunctions();
      const requestSignupOTP = httpsCallable(functions, 'requestSignupOTP');
      const result = await requestSignupOTP({
        phoneNumber: tempSignupData.phone,
        userId: tempUserId || undefined,
        purpose: 'customer_signup_verification',
      });

      if (!result.data?.success) {
        throw new Error(result.data?.message || 'Failed to resend OTP');
      }

      if (result.data.userId) setTempUserId(result.data.userId);
      setOtpSendError('');
      setSignupOtpSentTime(Date.now());
      setSignupOtp('');

      toast.success('✅ New OTP sent to your WhatsApp!', { id: loadingToast });

    } catch (error) {
      console.error('❌ Resend signup OTP error:', error);
      const message = friendlyAuthError(error, 'Failed to resend OTP. Please try again.');
      setOtpSendError(message);
      toast.error(message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    
    // LOGIN MODE — phone OTP, email + password
    if (currentMode === 'login') {
      if (loginMethod === 'phone') {
        if (loginStep === 1) {
          handlePhoneLogin(e);
        } else {
          handleVerifyOTP(e);
        }
        return;
      }
      handleEmailLogin(e);
      return;
    }

    // SIGNUP MODE — validate details, then WhatsApp OTP before creating account
    if (signupStep === 2) {
      handleVerifySignupOTP(e);
      return;
    }

    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!formData.phone.trim()) {
      toast.error('Phone number is required to create your wallet account');
      return;
    }

    if (!isValidNigerianPhone(formData.phone)) {
      toast.error('Please enter a valid Nigerian phone number (e.g. 08012345678)');
      return;
    }
      
    if (formData.referralCode.trim() !== '' && referralValidation.valid === false) {
      toast.error(referralValidation.message || 'Invalid referral code');
      return;
    }

    // Send WhatsApp OTP first — account is created only after verify
    await handleSendSignupOTP(e);
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error('Please enter your email address first');
      return;
    }

    if (!isValidEmail(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      await sendPasswordResetEmail(getAuth(), formData.email, PASSWORD_RESET_ACTION);
      toast.success('Password reset email sent! Check your inbox.');
      setShowForgotPassword(false);
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error(friendlyAuthError(error, 'Failed to send password reset email. Please try again.'));
    }
  };

  const switchMode = () => {
    setCurrentMode(currentMode === 'login' ? 'signup' : 'login');
    setFormData({ 
      email: '', 
      password: '', 
      confirmPassword: '',
      // GO7 AUTH START - Reset additional fields
      name: '',
      phone: '',
      referralCode: ''
      // GO7 AUTH END
    });
    setShowForgotPassword(false);
    // GO7 AUTH START - Reset referral validation
    setReferralValidation({ valid: null, message: '' });
    setPhoneValidation({ valid: null, message: '' });
    // GO7 AUTH END
    // Reset OTP login state
    setLoginStep(1);
    setOtp('');
    setTempUserId(null);
    setVerifiedPhone('');
    setLoginMethod('email');
    setSignupStep(1);
    setSignupOtp('');
    setSignupOtpSentTime(null);
    setTempSignupData(null);
    setOtpSendError('');
    setOtpSending(false);
  };

  return createPortal(
    <div className="auth-sheet-overlay" onClick={onClose} role="presentation">
      <div
        className="auth-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="go7-auth-sheet-title"
      >
        {/* Header with Icon and Gradient */}
        <div className="auth-sheet-header">
          <div className="header-content">
            <div className={`header-icon ${currentMode === 'login' ? 'login-icon' : 'signup-icon'}`}>
              {currentMode === 'login' ? (
                <LogIn className="w-6 h-6" />
              ) : (
                <UserPlus className="w-6 h-6" />
              )}
            </div>
            <div>
              <h2 id="go7-auth-sheet-title">
                {currentMode === 'login' ? 'Welcome Back! 👋' : 'Join Go7 Today! 🚀'}
              </h2>
              <p className="header-subtitle">
                {currentMode === 'login' 
                  ? 'Sign in with phone OTP or email' 
                  : 'Create an account — verify your phone via WhatsApp'}
              </p>
            </div>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleAuth}>
          {/* LOGIN MODE — phone OTP / email method toggle */}
          {currentMode === 'login' && loginStep === 1 && (
            <div className="login-method-toggle">
              <button
                type="button"
                className={`method-btn ${loginMethod === 'phone' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('phone');
                  setFormData({ ...formData, email: '', password: '' });
                  setLoginStep(1);
                }}
              >
                <div className="method-icon">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="method-text">
                  <span className="method-title">Phone + OTP</span>
                  <span className="method-subtitle">via WhatsApp</span>
                </div>
                {loginMethod === 'phone' && (
                  <div className="checkmark">✓</div>
                )}
              </button>
              <button
                type="button"
                className={`method-btn ${loginMethod === 'email' ? 'active' : ''}`}
                onClick={() => {
                  setLoginMethod('email');
                  setFormData({ ...formData, phone: '' });
                  setLoginStep(1);
                }}
              >
                <div className="method-icon">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="method-text">
                  <span className="method-title">Email + Password</span>
                  <span className="method-subtitle">Traditional login</span>
                </div>
                {loginMethod === 'email' && (
                  <div className="checkmark">✓</div>
                )}
              </button>
            </div>
          )}

          {/* GOOGLE SIGN-IN BUTTON */}
          {currentMode === 'login' && loginStep === 1 && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="google-signin-btn"
                disabled={loading}
              >
                <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
              
              <div className="auth-divider">
                <span>OR</span>
              </div>
            </>
          )}

          {/* LOGIN MODE - Phone OTP Method */}
          {currentMode === 'login' && loginMethod === 'phone' && loginStep === 1 && (
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="08012345678"
                required
                className={phoneValidation.valid === false ? 'error' : phoneValidation.valid === true ? 'success' : ''}
              />
              {phoneValidation.message && (
                <div className={`validation-message ${phoneValidation.valid ? 'success' : 'error'}`}>
                  {phoneValidation.message}
                </div>
              )}
              <small className="field-hint" style={{ color: '#666', fontSize: '13px', marginTop: '8px', display: 'block' }}>
                We'll send a 6-digit OTP to your WhatsApp
              </small>
              {loginError && (
                <div className="otp-error-banner" role="alert" style={{ marginTop: 12 }}>
                  {loginError}
                </div>
              )}
            </div>
          )}

          {/* LOGIN MODE - OTP Verification Step */}
          {currentMode === 'login' && loginMethod === 'phone' && loginStep === 2 && (
            <div className="otp-step-panel">
              <div className="otp-step-banner">
                <p className="otp-step-title">Enter your WhatsApp code</p>
                <p className="otp-step-subtitle">
                  {otpSending
                    ? <>Sending code to <strong>{verifiedPhone || normalizePhone(formData.phone)}</strong>…</>
                    : <>Code sent to <strong>{verifiedPhone || normalizePhone(formData.phone)}</strong></>}
                </p>
              </div>

              {otpSendError && (
                <div className="otp-error-banner" role="alert">
                  {otpSendError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="otp">6-Digit OTP</label>
                <input
                  ref={otpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  id="otp"
                  name="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  className="otp-input-large"
                />
                <small className="field-hint">
                  Open WhatsApp and enter the 6-digit code
                </small>
              </div>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading || otpSending}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  fontWeight: '500'
                }}
              >
                Resend OTP
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginStep(1);
                  setOtp('');
                  setTempUserId(null);
                  setVerifiedPhone('');
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#666',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Change Phone Number
              </button>
            </div>
          )}

          {/* LOGIN MODE - Email + Password Method */}
          {currentMode === 'login' && loginMethod === 'email' && (
            <>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  minLength="6"
                />
              </div>

              {/* Forgot Password Link */}
              {!showForgotPassword && (
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </button>
              )}

              {showForgotPassword && (
                <div className="forgot-password-section">
                  <p>Enter your email to receive a password reset link:</p>
                  <button
                    type="button"
                    className="reset-password-btn"
                    onClick={handleForgotPassword}
                  >
                    Send Reset Email
                  </button>
                  <button
                    type="button"
                    className="cancel-reset-btn"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          )}

          {/* SIGNUP MODE - Step 1: account details */}
          {currentMode === 'signup' && signupStep === 1 && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="08012345678"
                  required
                  className={phoneValidation.valid === false ? 'error' : phoneValidation.valid === true ? 'success' : ''}
                />
                {phoneValidation.message && (
                  <div className={`validation-message ${phoneValidation.valid ? 'success' : 'error'}`}>
                    {phoneValidation.message}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your password"
                  required
                  minLength="6"
                />
              </div>

              <div className="form-group">
                <label htmlFor="referralCode">Referral Code (Optional)</label>
                <input
                  type="text"
                  id="referralCode"
                  name="referralCode"
                  value={formData.referralCode}
                  onChange={handleInputChange}
                  placeholder="Enter referral code (GO7XXX)"
                  className={referralValidation.valid === false ? 'error' : referralValidation.valid === true ? 'success' : ''}
                />
                {referralValidation.message && (
                  <div className={`validation-message ${referralValidation.valid ? 'success' : 'error'}`}>
                    {referralValidation.valid ? '✅' : '❌'} {referralValidation.message}
                  </div>
                )}
                <small className="field-hint">
                  Got a referral code? Both you and your friend earn ₦500! 🎉
                </small>
              </div>
            </>
          )}

          {/* SIGNUP MODE - Step 2: WhatsApp OTP verification */}
          {currentMode === 'signup' && signupStep === 2 && (
            <div className="otp-step-panel">
              <div className="otp-step-banner">
                <p className="otp-step-title">Verify your phone number</p>
                <p className="otp-step-subtitle">
                  {otpSending
                    ? <>Sending code to <strong>{tempSignupData?.phone || normalizePhone(formData.phone)}</strong>…</>
                    : <>Code sent to <strong>{tempSignupData?.phone || normalizePhone(formData.phone)}</strong></>}
                </p>
              </div>

              {otpSendError && (
                <div className="otp-error-banner" role="alert">
                  {otpSendError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="signup-otp">6-Digit OTP</label>
                <input
                  ref={signupOtpInputRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  id="signup-otp"
                  name="signupOtp"
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  required
                  className="otp-input-large"
                />
                <small className="field-hint">
                  Open WhatsApp and enter the 6-digit code
                </small>
              </div>

              <button
                type="button"
                onClick={handleResendSignupOTP}
                disabled={loading || otpSending}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#dc2626',
                  border: '1px solid #dc2626',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginBottom: '12px',
                  fontWeight: '500'
                }}
              >
                Resend OTP
              </button>

              <button
                type="button"
                onClick={() => {
                  setSignupStep(1);
                  setSignupOtp('');
                  setTempUserId(null);
                  setTempSignupData(null);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: 'transparent',
                  color: '#666',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                ← Edit account details
              </button>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="auth-buttons">
            <button
              type="submit"
              className="auth-btn primary"
              disabled={loading || otpSending}
            >
              {loading ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  {currentMode === 'login' && loginMethod === 'phone' && loginStep === 1 && 'Send WhatsApp OTP'}
                  {currentMode === 'login' && loginMethod === 'phone' && loginStep === 2 && 'Verify & Log In'}
                  {currentMode === 'login' && loginMethod === 'email' && 'Log In'}
                  {currentMode === 'signup' && signupStep === 1 && 'Continue — Verify Phone'}
                  {currentMode === 'signup' && signupStep === 2 && 'Verify OTP & Create Account'}
                </>
              )}
            </button>

            <button
              type="button"
              className="auth-btn secondary"
              onClick={switchMode}
              disabled={loading}
            >
              {currentMode === 'login' ? 'Create Account' : 'Log In'}
            </button>
          </div>
        </form>

        {/* Terms */}
        {currentMode === 'signup' && (
          <p className="terms-text">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
            We will send a WhatsApp OTP to verify your phone before creating your account.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AuthSheet;