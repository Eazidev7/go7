import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';
import { PASSWORD_RESET_ACTION } from '../../utils/authHelpers';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Where to go after login
  const redirectTo = new URLSearchParams(location.search).get('redirect') || '/admin';

  // If already logged in as admin, skip straight to dashboard
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists() && snap.data().role === 'admin') {
            navigate(redirectTo, { replace: true });
            return;
          }
        } catch (_) {}
      }
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const handleForgotPassword = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your admin email above, then click Forgot password.');
      setInfo('');
      return;
    }
    setError('');
    setInfo('');
    setResetting(true);
    try {
      await sendPasswordResetEmail(getAuth(), trimmed, PASSWORD_RESET_ACTION);
      setInfo(`Password reset email sent to ${trimmed}. Check inbox and spam, then sign in with the new password.`);
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'No Firebase account found for this email. Use the exact email used when admin was created.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many reset attempts. Wait a few minutes and try again.',
      };
      setError(msgs[err.code] || 'Could not send reset email. Try /admin/setup instead.');
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const auth = getAuth();
      const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);

      // Verify admin role
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || snap.data().role !== 'admin') {
        await auth.signOut();
        setError('Access denied. This account does not have admin privileges.');
        setLoading(false);
        return;
      }

      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msgs = {
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      setError(msgs[err.code] || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 shadow-lg mb-4">
            <span className="text-white text-2xl font-black">G7</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Admin Portal</h1>
          <p className="text-gray-400 mt-1 text-sm">GO7 Control Panel — Authorised Access Only</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@go7.ng"
                required
                autoFocus
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {info && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
                <span className="mt-0.5">✅</span>
                <span>{info}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl transition text-sm tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Signing in…
                </span>
              ) : 'Sign In to Admin Panel'}
            </button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={resetting}
              className="text-sm text-red-600 hover:underline font-medium disabled:opacity-50"
            >
              {resetting ? 'Sending reset email…' : 'Forgot password?'}
            </button>
            <p className="text-xs text-gray-400">
              Don&apos;t know the admin email?{' '}
              <a href="/admin/setup" className="text-red-600 hover:underline font-medium">View on setup page</a>
            </p>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Not an admin?{' '}
            <a href="/" className="text-red-600 hover:underline font-medium">Go to App</a>
          </p>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          GO7 Delivery Platform · Admin Access
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
