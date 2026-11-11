import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getRiderApplication } from '../../services/riderAuthService';
import { isRiderApproved } from '../../utils/riderApproval';
import { Bike, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Swal from 'sweetalert2';

const RiderLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter both email and password',
        confirmButtonColor: '#E30613'
      });
      return;
    }

    try {
      setLoading(true);
      const cred = await login(email, password);

      const profile = cred?.user?.uid ? await getRiderApplication(cred.user.uid) : null;
      const destination = isRiderApproved(profile) ? '/rider/dashboard' : '/rider/register';

      Swal.fire({
        icon: 'success',
        title: 'Welcome Back!',
        text: isRiderApproved(profile)
          ? 'Redirecting to dashboard...'
          : 'Your application is still under review.',
        timer: 1500,
        showConfirmButton: false
      });

      setTimeout(() => {
        navigate(destination);
      }, 1500);
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: error.message || 'Invalid email or password',
        confirmButtonColor: '#E30613'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bike className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Go7 Rider</h1>
          <p className="text-red-100">Sign in to start delivering</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Rider Login</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rider@go7.com"
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-300 rounded-xl focus:border-red-500 focus:outline-none transition-colors"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>Email: <span className="font-mono text-gray-900">rider@go7.com</span></p>
              <p>Password: <span className="font-mono text-gray-900">rider123</span></p>
            </div>
          </div>

          {/* Links */}
          <div className="mt-6 text-center space-y-2">
            <a
              href="/forgot-password"
              className="text-sm text-red-600 hover:text-red-700 font-medium block"
            >
              Forgot Password?
            </a>
            <div className="text-sm text-gray-600">
              New rider?{' '}
              <a href="/rider/register" className="text-red-600 hover:text-red-700 font-medium">
                Complete your application
              </a>
            </div>
            <div className="text-sm text-gray-600">
              Not a rider?{' '}
              <a href="/" className="text-red-600 hover:text-red-700 font-medium">
                Go back home
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-red-100 text-sm mt-6">
          © 2025 Go7 Delivery. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RiderLogin;
