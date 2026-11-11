import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';
import { signupWithPhoneAndCreateWallet, signupWithEmailAndCreateWallet } from '../utils/walletSetup';
import toast from 'react-hot-toast';

/**
 * 🔐 Signup Component with Auto Wallet Creation
 * 
 * Complete signup flow:
 * 1. User enters phone/email and verifies
 * 2. Firebase Auth creates account
 * 3. Automatically creates Paystack DVA
 * 4. Redirects to wallet page
 */
export default function SignupWithWallet() {
  const [method, setMethod] = useState('phone'); // 'phone' or 'email'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1); // 1: enter details, 2: verify OTP
  const [loading, setLoading] = useState(false);
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
  
  const navigate = useNavigate();

  // Initialize reCAPTCHA for phone auth
  const setupRecaptcha = () => {
    const auth = getAuth();
    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {
        console.log('✅ reCAPTCHA verified');
      }
    });
    setRecaptchaVerifier(verifier);
    return verifier;
  };

  // Handle phone signup
  const handlePhoneSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (step === 1) {
        // Step 1: Send OTP
        const verifier = setupRecaptcha();
        const { signInWithPhoneNumber } = await import('firebase/auth');
        const auth = getAuth();
        
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        window.confirmationResult = confirmationResult;
        
        toast.success('OTP sent to your phone!');
        setStep(2);
      } else {
        // Step 2: Verify OTP and create wallet
        const user = await window.confirmationResult.confirm(verificationCode);
        
        // Auto-create virtual account
        const { setupUserWalletAfterSignup } = await import('../utils/walletSetup');
        await setupUserWalletAfterSignup(user.user);
        
        toast.success('Account created! Redirecting to wallet...');
        navigate('/wallet');
      }
    } catch (error) {
      console.error('❌ Phone signup error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle email signup
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signupWithEmailAndCreateWallet(email, password, displayName);
      
      toast.success('Account created! Redirecting to wallet...');
      navigate('/wallet');
      
    } catch (error) {
      console.error('❌ Email signup error:', error);
      // Error already handled in utility function
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Join Go7</h1>
          <p className="text-blue-100">Sign up and get your wallet instantly!</p>
        </div>

        <div className="p-6">
          {/* Method Toggle */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setMethod('phone')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                method === 'phone'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📱 Phone
            </button>
            <button
              onClick={() => setMethod('email')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                method === 'email'
                  ? 'bg-white shadow text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              📧 Email
            </button>
          </div>

          {/* Phone Signup Form */}
          {method === 'phone' && (
            <form onSubmit={handlePhoneSignup} className="space-y-4">
              {step === 1 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+234 800 000 0000"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +234)</p>
                  </div>
                  
                  <div id="recaptcha-container"></div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Sending OTP...' : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      maxLength={6}
                    />
                  </div>
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                  >
                    {loading ? 'Creating Account & Wallet...' : 'Verify & Create Account'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full text-sm text-blue-600 hover:text-blue-800"
                  >
                    ← Change phone number
                  </button>
                </>
              )}
            </form>
          )}

          {/* Email Signup Form */}
          {method === 'email' && (
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Creating Account & Wallet...' : 'Create Account'}
              </button>
            </form>
          )}

          {/* Benefits */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
            <h4 className="font-semibold text-green-900 text-sm mb-2">🎉 What You Get:</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>✅ Personal virtual account number</li>
              <li>✅ Instant wallet top-ups</li>
              <li>✅ Real-time balance updates</li>
              <li>✅ Secure Paystack integration</li>
            </ul>
          </div>

          {/* Login Link */}
          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}