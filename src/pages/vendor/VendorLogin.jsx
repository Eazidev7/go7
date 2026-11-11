import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { vendorDoc } from '../../lib/vendorRefs';

const VendorLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting vendor login for:', email);
      
      // Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Firebase Auth successful, UID:', user.uid);
      
      // Verify this user is a vendor by checking the vendors collection
      const vendorId = user.uid;
      const vendorSnapshot = await getDoc(vendorDoc(vendorId));
      
      console.log('📄 Vendor doc exists?', vendorSnapshot.exists());
      
      if (!vendorSnapshot.exists()) {
        // If no vendor profile exists, sign out and show error
        console.error('❌ No vendor document found in Firestore for UID:', vendorId);
        await auth.signOut();
        setError('Vendor profile not found. Your registration may be incomplete. Please try registering again with a different email or contact support at vendors@go7.ng');
        setLoading(false);
        return;
      }

      const vendorData = vendorSnapshot.data();
      console.log('✅ Vendor data loaded:', vendorData.businessName || vendorData.name);
      
      // Store vendor ID in local storage for persistence
      localStorage.setItem('vendorId', vendorId);
      
      // Navigate to vendor dashboard with vendor ID
      console.log('🚀 Redirecting to dashboard...');
      navigate(`/vendor/dashboard/${vendorId}`);
    } catch (error) {
      console.error('❌ Login error:', error);
      
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/user-disabled':
          setError('This account has been disabled.');
          break;
        case 'auth/user-not-found':
          setError('No account found with this email.');
          break;
        case 'auth/wrong-password':
          setError('Invalid password.');
          break;
        default:
          setError('Failed to login. Please try again.');
      }
      
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <Helmet>
        <title>Vendor Login | Go7 Marketplace</title>
      </Helmet>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <img
          className="mx-auto h-12 w-auto"
          src="/go7-logo.png"
          alt="Go7 Logo"
        />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Vendor Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to access your vendor dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-red-600 hover:text-red-500">
                  Forgot your password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  New to Go7 Marketplace?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/vendor/register')}
                className="text-sm font-medium text-red-600 hover:text-red-700 underline"
              >
                Register your business as a vendor →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorLogin;
