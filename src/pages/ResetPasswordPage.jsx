import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAuth, verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { toast } from 'react-toastify';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [invalid, setInvalid] = useState(false);

  const oobCode = searchParams.get('oobCode');
  const mode = searchParams.get('mode');

  useEffect(() => {
    if (mode !== 'resetPassword' || !oobCode) {
      setInvalid(true);
      return;
    }
    verifyPasswordResetCode(getAuth(), oobCode)
      .then((em) => setEmail(em))
      .catch(() => setInvalid(true));
  }, [mode, oobCode]);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }
    setBusy(true);
    try {
      await confirmPasswordReset(getAuth(), oobCode, password);
      setDone(true);
    } catch (err) {
      const msg = err?.code === 'auth/expired-action-code' || err?.code === 'auth/invalid-action-code'
        ? 'This reset link has expired or was already used. Request a new one.'
        : (err?.message || 'Could not reset password.');
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            <span className="text-red-600">Go7</span> — Reset Password
          </h1>
        </div>

        {invalid && (
          <div className="text-center">
            <p className="text-gray-600 mb-4">This reset link is invalid or has expired.</p>
            <button onClick={() => navigate('/')} className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold">
              Back to Go7
            </button>
          </div>
        )}

        {done && (
          <div className="text-center">
            <p className="text-green-700 font-medium mb-4">Password updated! You can now sign in with your new password.</p>
            <button onClick={() => navigate('/')} className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold">
              Sign in
            </button>
          </div>
        )}

        {!invalid && !done && email && (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-gray-600">Set a new password for <strong>{email}</strong></p>
            <input
              type="password" required minLength={6} placeholder="New password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <input
              type="password" required minLength={6} placeholder="Confirm new password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button type="submit" disabled={busy}
              className="w-full bg-red-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
              {busy ? 'Updating…' : 'Set new password'}
            </button>
          </form>
        )}

        {!invalid && !done && !email && (
          <p className="text-center text-gray-500">Verifying your reset link…</p>
        )}
      </div>
    </div>
  );
}
