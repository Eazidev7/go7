import React, { useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { PASSWORD_RESET_ACTION } from '../../utils/authHelpers';
import { auth } from '../../firebase/config';
import toast from 'react-hot-toast';

/**
 * Change password while logged in (requires current password).
 * Forgot flow sends Firebase reset email.
 */
export default function VendorPasswordForm({ accountEmail = '' }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    const email = user?.email || accountEmail;

    if (!user || !email) {
      toast.error('Sign in again to change your password.');
      return;
    }
    if (form.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (!form.currentPassword) {
      toast.error('Enter your current password.');
      return;
    }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(email, form.currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully.');
    } catch (error) {
      const code = error?.code || '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect.');
      } else if (code === 'auth/weak-password') {
        toast.error('Password is too weak. Use at least 6 characters.');
      } else if (code === 'auth/requires-recent-login') {
        toast.error('For security, log out and log in again, then retry.');
      } else {
        toast.error('Could not update password. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = (auth.currentUser?.email || accountEmail || '').trim();
    if (!email) {
      toast.error('No email on this account.');
      return;
    }
    setSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email, PASSWORD_RESET_ACTION);
      toast.success(`Password reset email sent to ${email}`);
    } catch (error) {
      toast.error(error?.message || 'Could not send reset email.');
    } finally {
      setSendingReset(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Account password</h3>
      <p className="text-sm text-gray-600 mb-4">
        Change your login password. You will stay signed in on this device.
      </p>
      <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            autoComplete="current-password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            autoComplete="new-password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            autoComplete="new-password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="submit"
            disabled={saving}
            className="bg-red-500 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? 'Updating…' : 'Update password'}
          </button>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={sendingReset}
            className="text-sm text-red-600 font-semibold hover:text-red-700"
          >
            {sendingReset ? 'Sending…' : 'Email me a reset link instead'}
          </button>
        </div>
      </form>
    </div>
  );
}
