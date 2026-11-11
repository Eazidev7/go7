import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';
import { sendOTP, verifyOTP } from '../services/otpService';
import toast from 'react-hot-toast';
import { User, Phone, Mail, Lock, Eye, EyeOff, Loader } from 'lucide-react';

/**
 * 🔐 Customer Signup with WhatsApp OTP Verification
 * 
 * Complete signup flow:
 * 1. User enters phone, name, email, password
 * 2. WhatsApp OTP sent via Infobip
 * 3. User verifies OTP
 * 4. Firebase Auth creates account
 * 5. Auto-creates wallet (Paystack DVA)
 */
export default function CustomerSignupWithOTP({ onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    phone: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [step, setStep] = useState(1); // 1: enter details, 2: verify OTP
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tempUserId, setTempUserId] = useState(null);
  
  const navigate = useNavigate();

  // Format phone number
  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('234')) {
      cleaned = '0' + cleaned.substring(3);
    }
    if (!cleaned.startsWith('0')) {
      cleaned = '0' + cleaned;
    }
    return cleaned;
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form
  const validateForm = () => {
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return false;
    }

    if (!formData.fullName.trim()) {
      toast.error('Full name is required');
      return false;
    }

    if (!formData.email.trim()) {
      toast.error('Email is required');
      return false;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return false;
    }

    return true;
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    const loadingToast = toast.loading('Sending WhatsApp OTP...');

    try {
      const auth = getAuth();
      
      // Create Firebase Auth account first
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      
      const userId = userCredential.user.uid;
      setTempUserId(userId);

      // Update display name
      await updateProfile(userCredential.user, {
        displayName: formData.fullName.trim()
      });

      // Format and send OTP
      const formattedPhone = formatPhoneNumber(formData.phone);
      const result = await sendOTP(userId, formattedPhone, 'customer_signup_verification');

      if (result.success) {
        toast.success('📱 OTP sent to your WhatsApp!', { id: loadingToast });
        setStep(2);
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }

    } catch (error) {
      console.error('❌ Send OTP error:', error);
      
      let errorMessage = error.message;
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Try logging in instead.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password must be at least 6 characters.';
      }
      
      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and complete signup
  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Verifying OTP...');

    try {
      const auth = getAuth();
      const userId = tempUserId || auth.currentUser?.uid;

      if (!userId) {
        throw new Error('User session expired. Please try again.');
      }

      // Verify OTP
      const result = await verifyOTP(userId, otp);

      if (!result.success) {
        throw new Error(result.message || 'Invalid OTP');
      }

      // Create customer profile in Firestore
      const formattedPhone = formatPhoneNumber(formData.phone);
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: formData.email.trim(),
        displayName: formData.fullName.trim(),
        phoneNumber: formattedPhone,
        phoneVerified: true,
        role: 'customer',
        accountStatus: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Wallet fields
        walletBalance: 0,
        walletStatus: 'pending_dva_creation',
        notificationPreferences: {
          whatsapp: true,
          email: true,
          push: true
        }
      });

      // Auto-create Paystack DVA (virtual account)
      try {
        const functions = getFunctions();
        const createDVA = httpsCallable(functions, 'createUserDedicatedVirtualAccount');
        await createDVA({ userId });
        console.log('✅ Virtual account creation initiated');
      } catch (walletError) {
        console.warn('⚠️ Virtual account creation will be attempted later:', walletError);
      }

      toast.success('🎉 Account created successfully!', { id: loadingToast });
      
      // Redirect to home or wallet
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      toast.error(error.message || 'OTP verification failed', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setLoading(true);
    const loadingToast = toast.loading('Resending OTP...');

    try {
      const auth = getAuth();
      const userId = tempUserId || auth.currentUser?.uid;

      if (!userId) {
        throw new Error('Session expired. Please start over.');
      }

      const formattedPhone = formatPhoneNumber(formData.phone);
      const result = await sendOTP(userId, formattedPhone, 'customer_signup_verification');

      if (result.success) {
        toast.success('📱 OTP resent to your WhatsApp!', { id: loadingToast });
      } else {
        throw new Error(result.message);
      }

    } catch (error) {
      console.error('❌ Resend OTP error:', error);
      toast.error(error.message || 'Failed to resend OTP', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">🎉 Join GO7</h1>
          <p className="text-blue-100">Sign up with WhatsApp verification</p>
        </div>

        <div className="p-8">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className={`flex items-center ${step === 1 ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 1 ? 'bg-blue-600' : 'bg-green-600'} text-white font-bold`}>
                {step === 1 ? '1' : '✓'}
              </div>
              <span className="ml-2 font-semibold">Details</span>
            </div>
            
            <div className={`mx-4 h-1 w-12 ${step === 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            
            <div className={`flex items-center ${step === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 2 ? 'bg-blue-600' : 'bg-gray-300'} text-white font-bold`}>
                2
              </div>
              <span className="ml-2 font-semibold">Verify</span>
            </div>
          </div>

          {/* Step 1: Enter Details */}
          {step === 1 && (
            <form onSubmit={handleSendOTP} className="space-y-4">
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
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  Full Name *
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

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
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
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
                    placeholder="Minimum 6 characters"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin w-5 h-5 mr-2" />
                    Sending OTP...
                  </>
                ) : (
                  '📱 Send WhatsApp OTP'
                )}
              </button>
            </form>
          )}

          {/* Step 2: Verify OTP */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
                <p className="text-sm text-blue-800">
                  📱 We've sent a 6-digit OTP to your WhatsApp: <strong>{formData.phone}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP Code *
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="000000"
                  maxLength="6"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none text-center text-2xl font-bold tracking-widest"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin w-5 h-5 mr-2" />
                    Verifying...
                  </>
                ) : (
                  '✅ Verify & Create Account'
                )}
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="w-full text-blue-600 hover:text-blue-800 font-semibold py-2 disabled:opacity-50"
              >
                Didn't receive OTP? Resend
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={loading}
                className="w-full text-gray-600 hover:text-gray-800 font-semibold py-2 disabled:opacity-50"
              >
                ← Change phone number
              </button>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-blue-600 hover:text-blue-800 font-semibold"
              >
                Log In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
