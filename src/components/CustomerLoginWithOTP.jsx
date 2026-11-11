import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, signInWithCustomToken } from 'firebase/auth';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';
import { formatPhoneNumber, isValidNigerianPhone } from '../utils/phoneUtils';
import toast from 'react-hot-toast';
import { Phone, Mail, Lock, Eye, EyeOff, Loader, ArrowLeft } from 'lucide-react';

/**
 * 🔐 Customer Login with Optional WhatsApp OTP
 * 
 * Two login methods:
 * 1. Phone + OTP (WhatsApp) - More secure, passwordless
 * 2. Email + Password - Traditional method
 */
export default function CustomerLoginWithOTP({ onSwitchToSignup }) {
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'email'
  const [step, setStep] = useState(1); // 1: enter credentials, 2: verify OTP (phone login only)
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: ''
  });
  const [otp, setOtp] = useState('');
  const [tempUserId, setTempUserId] = useState(null);
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [otpSendError, setOtpSendError] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/';

  // Format phone number
  const normalizePhone = (phone) => formatPhoneNumber(phone);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Method 1: Phone + OTP Login via Cloud Function
  // (client Firestore list queries on /users are blocked when logged out)
  const handlePhoneLogin = async (e) => {
    e.preventDefault();

    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    if (!isValidNigerianPhone(formData.phone)) {
      toast.error('Please enter a valid Nigerian phone number');
      return;
    }

    setLoading(true);
    setOtpSendError('');
    const loadingToast = toast.loading('Sending OTP to WhatsApp...');

    try {
      const formattedPhone = normalizePhone(formData.phone);
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
      setOtp('');
      setStep(2);

      toast.success('📱 OTP sent to your WhatsApp!', { id: loadingToast });
    } catch (error) {
      console.error('❌ Phone login error:', error);
      let message = error.message || 'Failed to send OTP';
      if (error.code === 'functions/not-found') {
        message = 'No account found with this phone number. Please sign up first.';
      } else if (error.code === 'functions/failed-precondition') {
        message = 'WhatsApp OTP is temporarily unavailable. Try email login.';
      } else if (error.code === 'functions/internal') {
        message = 'Could not send WhatsApp OTP. Please try again.';
      }
      setOtpSendError(message);
      toast.error(message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and complete phone login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (loading) return;

    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

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

      // Sign in with custom token
      const auth = getAuth();
      await signInWithCustomToken(auth, result.data.customToken);

      toast.success('✅ Login successful!', { id: loadingToast });
      
      // Redirect to homepage or dashboard
      setTimeout(() => navigate(redirectTo), 500);

    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      
      let errorMessage = error.message;
      if (error.code === 'functions/not-found') {
        errorMessage = 'No account found with this phone number';
      } else if (error.code === 'functions/deadline-exceeded') {
        errorMessage = 'OTP has expired. Please request a new code.';
      } else if (error.code === 'functions/invalid-argument' || error.code === 'functions/permission-denied') {
        errorMessage = 'Invalid OTP code';
      } else if (error.code === 'functions/failed-precondition') {
        errorMessage = error.message || 'Please request a new WhatsApp code and try again.';
      }
      
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Method 2: Email + Password Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Logging in...');

    try {
      const auth = getAuth();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );

      // Update last login
      await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastLoginAt: serverTimestamp(),
        lastLoginMethod: 'email_password'
      });

      toast.success('✅ Login successful!', { id: loadingToast });
      
      // Redirect to homepage or dashboard
      setTimeout(() => navigate(redirectTo), 500);

    } catch (error) {
      console.error('❌ Email login error:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid credentials. Please check your email and password.';
      }
      
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
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
      toast.success('📱 OTP resent to your WhatsApp!', { id: loadingToast });
    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      toast.error(error.message || 'Failed to resend OTP', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 text-white">
          <h2 className="text-3xl font-bold text-center">Welcome Back</h2>
          <p className="text-center text-red-100 mt-2">Sign in to your GO7 account</p>
        </div>

        <div className="p-8">
          {/* Login Method Toggle */}
          {step === 1 && (
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                  loginMethod === 'phone'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Phone className="inline w-4 h-4 mr-2" />
                Phone + OTP
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2 px-4 rounded-md font-semibold transition-all ${
                  loginMethod === 'email'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="inline w-4 h-4 mr-2" />
                Email + Password
              </button>
            </div>
          )}

          {/* Phone Login Form */}
          {loginMethod === 'phone' && step === 1 && (
            <form onSubmit={handlePhoneLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Phone className="inline w-4 h-4 mr-1" />
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="08012345678"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-2" size={20} />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </button>
            </form>
          )}

          {/* OTP Verification (Phone Login) */}
          {loginMethod === 'phone' && step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setOtp('');
                  setOtpSendError('');
                  setTempUserId(null);
                  setVerifiedPhone('');
                }}
                className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change phone number
              </button>

              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-red-900">Enter your WhatsApp code</p>
                <p className="text-sm text-red-800 mt-1">
                  Sent to <strong>{verifiedPhone || formData.phone}</strong>
                </p>
              </div>

              {otpSendError && (
                <div className="bg-amber-50 border border-amber-300 text-amber-900 rounded-lg p-3 text-sm">
                  {otpSendError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  6-Digit OTP *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  className="w-full px-4 py-4 border-2 border-red-300 rounded-lg focus:border-red-500 focus:outline-none text-center text-3xl font-bold tracking-[0.5em]"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-2" size={20} />
                    Verifying...
                  </>
                ) : (
                  'Verify & Login'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full text-red-600 hover:text-red-800 font-semibold py-2 disabled:opacity-50"
              >
                Didn't receive OTP? Resend
              </button>
            </form>
          )}

          {/* Email Login Form */}
          {loginMethod === 'email' && (
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Mail className="inline w-4 h-4 mr-1" />
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:outline-none pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm text-red-600 hover:text-red-800 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-bold hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin mr-2" size={20} />
                    Logging in...
                  </>
                ) : (
                  'Login'
                )}
              </button>
            </form>
          )}

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignup}
                className="text-red-600 hover:text-red-800 font-semibold"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
