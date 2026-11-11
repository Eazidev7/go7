import React, { useState } from 'react';
import { fixOrphanedAccount } from '../utils/directAccountFixer';
import toast from 'react-hot-toast';

/**
 * Admin utility page to fix orphaned vendor accounts
 * Works directly without Cloud Functions
 */
export default function VendorAccountCleanup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFixByEmail = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    if (!password.trim()) {
      toast.error('Please enter the password');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const fixResult = await fixOrphanedAccount(email, password);
      setResult(fixResult);
      
      if (fixResult.status === 'fixed') {
        toast.success('Account fixed! User can now register again.');
      } else if (fixResult.status === 'complete') {
        toast.success('Account is complete. Redirecting...');
        if (fixResult.vendorId) {
          setTimeout(() => {
            window.location.href = `/vendor/dashboard/${fixResult.vendorId}`;
          }, 1500);
        }
      } else if (fixResult.status === 'no_account') {
        toast.info('No account found. Email is available.');
      } else if (fixResult.status === 'wrong_password') {
        toast.error('Incorrect password.');
      } else if (fixResult.status === 'partial_fix') {
        toast.warning('Account signed out. Try different email.');
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCleanupAll = async (deleteOrphaned) => {
    if (!window.confirm(`Are you sure you want to ${deleteOrphaned ? 'DELETE' : 'SCAN'} orphaned accounts?`)) {
      return;
    }

    setLoading(true);
    setCleanupResult(null);

    try {
      const result = await cleanupOrphanedAccounts(deleteOrphaned);
      setCleanupResult(result);
      
      if (deleteOrphaned && result.deleted > 0) {
        toast.success(`Deleted ${result.deleted} orphaned accounts`);
      } else if (result.orphaned > 0) {
        toast.info(`Found ${result.orphaned} orphaned accounts`);
      } else {
        toast.success('No orphaned accounts found');
      }
    } catch (error) {
      toast.error('Error: ' + error.message);
      setCleanupResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            🔧 Vendor Account Cleanup Utility
          </h1>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Admin Tool:</strong> Use this to fix accounts where Firebase Auth exists but Firestore vendor document is missing.
                </p>
              </div>
            </div>
          </div>

          {/* Fix by Email */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Fix Specific Account</h2>
            <form onSubmit={handleFixByEmail} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="vendor@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  placeholder="Enter account password"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 text-white px-6 py-3 rounded-md font-semibold hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Checking...' : 'Check & Fix Account'}
              </button>
            </form>

            {result && (
              <div className={`mt-4 p-4 rounded-md ${
                result.status === 'fixed' ? 'bg-green-50 border border-green-200' :
                result.status === 'complete' ? 'bg-blue-50 border border-blue-200' :
                result.status === 'no_account' ? 'bg-gray-50 border border-gray-200' :
                result.status === 'wrong_password' ? 'bg-red-50 border border-red-200' :
                result.status === 'partial_fix' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-red-50 border border-red-200'
              }`}>
                <h3 className="font-semibold mb-2">Result:</h3>
                <p className="text-sm"><strong>Status:</strong> {result.status}</p>
                <p className="text-sm"><strong>Message:</strong> {result.message}</p>
                {result.vendorId && <p className="text-sm"><strong>Vendor ID:</strong> {result.vendorId}</p>}
                {result.action && <p className="text-sm"><strong>Action:</strong> {result.action}</p>}
                {result.error && <p className="text-sm text-red-600"><strong>Error:</strong> {result.error}</p>}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="border-t pt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">How to Use</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-2 text-sm">
              <p><strong>Step 1:</strong> Enter the problematic email address</p>
              <p><strong>Step 2:</strong> Enter the password they used when registering</p>
              <p><strong>Step 3:</strong> Click "Check & Fix Account"</p>
              <p className="text-blue-700 mt-3"><strong>✅ Fixed:</strong> Orphaned auth deleted, user can register again</p>
              <p className="text-blue-700"><strong>✅ Complete:</strong> Account is fine, redirects to dashboard</p>
              <p className="text-blue-700"><strong>ℹ️ No Account:</strong> Email is available for registration</p>
              <p className="text-red-700"><strong>❌ Wrong Password:</strong> Password incorrect, try again</p>
            </div>
          </div>

          {/* Manual Alternative */}
          <div className="border-t pt-8 mt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Fix (Firebase Console)</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2 text-sm">
              <p>1. Go to <a href="https://console.firebase.google.com/project/go7-delivery/authentication/users" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebase Authentication</a></p>
              <p>2. Find user by email</p>
              <p>3. Click 3-dot menu → Delete account</p>
              <p>4. User can now register again</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
