/**
 * 🔐 VENDOR LOGIN PAGE
 * Allow registered vendors to log into GO7 platform
 * Sets vendor online status and redirects to dashboard
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { PASSWORD_RESET_ACTION } from '../utils/authHelpers';
import { doc, updateDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { Store, Mail, Lock, ArrowLeft, Loader, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email.trim() || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading('Logging in...');

    try {
      // 1. Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const vendorId = userCredential.user.uid;

      // 2. Verify vendor exists in Firestore
      const vendorRef = doc(db, 'vendors', vendorId);
      const vendorSnap = await getDoc(vendorRef);

      if (!vendorSnap.exists()) {
        console.error('❌ Vendor document not found');
        toast.error('Vendor profile not found. Please complete registration first.', { id: loadingToast });
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 3. ONLY update status fields - NEVER overwrite existing data
      try {
        await updateDoc(vendorRef, {
          isOnline: true,
          lastSeen: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.warn('⚠️ Could not update vendor status:', updateError);
        // Continue anyway
      }

      // 4. Check phone verification status
      const vendorData = vendorSnap.data();
      const needsPhoneVerification = (
        !vendorData.phoneVerified ||
        vendorData.accountStatus === 'pending_phone_verification' ||
        !vendorData.registrationComplete
      );

      // 5. Store vendor session in localStorage for persistence
      localStorage.setItem('go7_vendor_session', JSON.stringify({
        vendorId: vendorId,
        email: formData.email,
        businessName: vendorData.businessName || vendorData.name,
        phoneVerified: vendorData.phoneVerified || false,
        needsVerification: needsPhoneVerification,
        timestamp: Date.now()
      }));
      
      console.log('✅ Vendor session stored:', vendorId, { needsPhoneVerification });

      if (needsPhoneVerification) {
        toast.success('📱 Login successful! Please verify your phone number to activate your account.', { 
          id: loadingToast, 
          duration: 4000 
        });
      } else {
        toast.success('✅ Login successful! Welcome back!', { id: loadingToast });
      }

      // 6. Redirect to vendor dashboard (full app entry after lite vendor shell)
      setTimeout(() => {
        // Use /vendor/dashboard (no id) so Hostinger SPA fallback always hits.
        // Dashboard then routes to /vendor/dashboard/:uid from auth.
        const target = '/vendor/dashboard';
        if (window.__GO7_VENDOR_ENTRY__) {
          window.location.assign(target);
        } else {
          navigate(`/vendor/dashboard/${vendorId}`);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address. Please register first.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage =
          'Too many login attempts. Wait 20–30 minutes, or try mobile data / another Wi‑Fi, then try again.';
      }

      toast.error(errorMessage, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={() => (window.__GO7_VENDOR_ENTRY__ ? window.location.assign('/') : navigate('/'))}
          className="flex items-center space-x-2 text-gray-600 hover:text-red-500 mb-6 transition"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500 rounded-full mb-4">
              <Store size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Login</h1>
            <p className="text-gray-600">Welcome back! Log in to manage your store</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="vendor@example.com"
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-red-500 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </label>
              <button
                type="button"
                className="text-sm text-red-500 hover:text-red-600 font-semibold"
                onClick={async () => {
                  const email = formData.email.trim();
                  if (!email) {
                    toast.error('Enter your email above first.');
                    return;
                  }
                  const loadingToast = toast.loading('Sending reset email…');
                  try {
                    await sendPasswordResetEmail(auth, email, PASSWORD_RESET_ACTION);
                    toast.success('Check your inbox for a password reset link.', { id: loadingToast });
                  } catch (error) {
                    toast.error(error?.message || 'Could not send reset email.', { id: loadingToast });
                  }
                }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-lg transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <Store size={20} />
                  <span>Login to Dashboard</span>
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have a vendor account?{' '}
              <button
                type="button"
                onClick={() => (window.__GO7_VENDOR_ENTRY__ ? window.location.assign('/vendor/register') : navigate('/vendor/register'))}
                className="text-red-500 hover:text-red-600 font-semibold"
              >
                Register here
              </button>
            </p>
          </div>

          {/* Demo Login for Development */}
          {import.meta.env.MODE === 'development' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800 font-semibold mb-2">🧪 Demo Credentials (Development)</p>
              <div className="text-xs text-blue-700 space-y-1">
                <p><strong>Email:</strong> demo.vendor@go7.com</p>
                <p><strong>Password:</strong> demo123456</p>
                <p><strong>Phone:</strong> +2348012345678 (needs verification)</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    email: 'demo.vendor@go7.com',
                    password: 'demo123456'
                  });
                }}
                className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Use Demo Credentials
              </button>
            </div>
          )}
        </div>

        {/* Benefits Footer */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 text-center">Why GO7 Vendors Love Us</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900">Real-time Order Management</h4>
                <p className="text-sm text-gray-600">Accept, reject, and track orders instantly</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900">Fast & Secure Payouts</h4>
                <p className="text-sm text-gray-600">Get paid quickly with multiple payment options</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-green-500 mt-1">✓</span>
              <div>
                <h4 className="font-semibold text-gray-900">Grow Your Business</h4>
                <p className="text-sm text-gray-600">Reach thousands of customers in your area</p>
              </div>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@go7.com" className="text-red-500 hover:text-red-600 font-semibold">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
