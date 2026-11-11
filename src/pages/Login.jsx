import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { sendResetEmail } from '../utils/authHelpers.js';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CustomerLoginWithOTP from '../components/CustomerLoginWithOTP';

function Login() {
  const [useModernLogin, setUseModernLogin] = useState(true); // Toggle between modern OTP and classic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get redirect path from URL query params
  const searchParams = new URLSearchParams(location.search);
  const redirectPath = searchParams.get('redirect') || '/';
  
  // Check if user is already logged in
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      
      // If user is logged in and there's a redirect path, navigate there
      if (user && redirectPath) {
        navigate(redirectPath, { replace: true });
      }
    });
    
    return () => unsubscribe();
  }, [navigate, redirectPath]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const auth = getAuth();
      await signInWithEmailAndPassword(auth, email, password);
      
      // Navigate to redirect path after successful login
      navigate(redirectPath, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      
      // Show user-friendly error message
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await sendResetEmail(email);
      setResetEmailSent(true);
    } catch (error) {
      console.error('Password reset error:', error);
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Modern OTP Login (default for customers)
  if (useModernLogin) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <CustomerLoginWithOTP onSwitchToSignup={() => navigate('/signup')} />
        
        {/* Toggle to classic login */}
        <div className="text-center pb-8">
          <button
            onClick={() => setUseModernLogin(false)}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Use classic email login instead
          </button>
        </div>
      </div>
    );
  }
  
  // 
  // If user is already logged in, show a message instead of the form
  if (user) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Already Logged In</h2>
              <p className="mt-2 text-gray-600">
                You're already signed in as {user.email}.
              </p>
            </div>
            
            <div className="flex flex-col space-y-4">
              <button
                onClick={() => navigate('/')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Home
              </button>
              
              <button
                onClick={() => {
                  const auth = getAuth();
                  auth.signOut().then(() => {
                    setUser(null);
                  });
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            {redirectPath.includes('admin') && (
              <p className="mt-2 text-center text-sm text-gray-600">
                Admin access required
              </p>
            )}
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          {resetEmailSent && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
              Password reset email sent! Check your inbox and follow the instructions.
            </div>
          )}
          
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">Email address</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
              >
                Forgot your password?
              </button>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
          </form>
          
          {/* Switch to Modern Login */}
          <div className="mt-6 text-center border-t pt-6">
            <button
              onClick={() => setUseModernLogin(true)}
              className="text-sm text-red-600 hover:text-red-800 font-semibold"
            >
              ← Use Modern Login (Phone + WhatsApp OTP)
            </button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default Login;
