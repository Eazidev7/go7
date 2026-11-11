/**
 * One-time Admin Setup Page
 * Creates the first admin account. Locked out once an admin already exists.
 * Route: /admin/setup  (remove this route from App.jsx after first use)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { PASSWORD_RESET_ACTION } from '../../utils/authHelpers';
import { doc, setDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

const AdminSetup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [done, setDone] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState('');

  // Check if an admin already exists — lock the page if so
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setAdminExists(true);
          // Grab the first admin's email if stored
          const data = snap.docs[0].data();
          const foundEmail = data.email || '';
          setAdminEmail(foundEmail);
          setResetEmail(foundEmail);
        }
      } catch (_) {}
      setChecking(false);
    })();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const auth = getAuth();
      let uid;

      try {
        // Try creating a new account
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        uid = user.uid;
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          // Account exists — sign in and elevate to admin
          const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
          uid = user.uid;
        } else {
          throw err;
        }
      }

      // Write admin role to Firestore
      await setDoc(doc(db, 'users', uid), {
        email: email.trim(),
        role: 'admin',
        createdAt: serverTimestamp(),
        displayName: 'Admin',
      }, { merge: true });

      setDone(true);
    } catch (err) {
      const msgs = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak (min 6 characters).',
        'auth/wrong-password': 'Existing account found but password is wrong.',
        'auth/network-request-failed': 'Network error — check your internet connection.',
      };
      setError(msgs[err.code] || err.message);
    } finally {
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

  if (adminExists && !done) {
    const handleReset = async () => {
      const target = (resetEmail || adminEmail).trim();
      if (!target) { setError('Enter the admin email address below.'); return; }
      try {
        await sendPasswordResetEmail(getAuth(), target, PASSWORD_RESET_ACTION);
        setResetSent(true);
        setError('');
      } catch (err) {
        setError('Failed to send reset email: ' + err.message);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-6v2m0 10a9 9 0 100-18 9 9 0 000 18z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Account Already Exists</h1>
          {adminEmail && (
            <p className="text-sm text-gray-500 mb-1">
              Admin email on file: <span className="font-semibold text-gray-800">{adminEmail}</span>
            </p>
          )}
          <p className="text-xs text-gray-400 mb-4">Forgot the password? Send a reset link to the admin email.</p>

          {!resetSent && (
            <div className="mb-4 text-left">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Admin email</label>
              <input
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="admin@go7.ng"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {resetSent ? (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-4">
              ✅ Reset email sent to <strong>{resetEmail || adminEmail}</strong>. Check your inbox and spam, then log in with the new password.
            </div>
          ) : (
            <button onClick={handleReset}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition text-sm mb-3">
              Send Password Reset Email
            </button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-3">
              {error}
            </div>
          )}

          <button onClick={() => navigate('/admin/login')}
            className="w-full py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition text-sm">
            Go to Admin Login
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Admin Account Created!</h1>
          <p className="text-gray-500 text-sm mb-1">Email: <span className="font-medium text-gray-800">{email}</span></p>
          <p className="text-gray-400 text-xs mb-6">You can now log in with these credentials.</p>
          <button onClick={() => navigate('/admin/login')}
            className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition text-sm">
            Go to Admin Login →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-950 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600 shadow-lg mb-4">
            <span className="text-white text-2xl font-black">G7</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Admin Setup</h1>
          <p className="text-gray-400 mt-1 text-sm">Create your GO7 admin account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@go7.ng" required autoFocus
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters" required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat password" required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm" />
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                <span className="mt-0.5">⚠️</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold rounded-xl transition text-sm tracking-wide mt-2">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  Creating account…
                </span>
              ) : 'Create Admin Account'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            This page is only accessible once. It locks after the admin is created.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
