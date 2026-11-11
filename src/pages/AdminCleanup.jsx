import React, { useState } from 'react';
import { signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import toast from 'react-hot-toast';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * 🧹 ADMIN CLEANUP PAGE
 * Helps clean up orphaned Firebase Auth users who don't have vendor profiles
 */
const AdminCleanup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleCleanup = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setLoading(true);
    setResult(null);
    const loadingToast = toast.loading('Checking account...');

    try {
      // Try to sign in to get the user
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const uid = user.uid;
      
      // Check if vendor profile exists
      const vendorDoc = await getDoc(doc(db, 'vendors', uid));
      
      if (vendorDoc.exists()) {
        const message = 'Vendor profile exists. This account should use the login page instead of registering again.';
        setResult({ success: false, message, type: 'warning' });
        toast.error(message, { id: loadingToast });
        return;
      }
      
      // Delete the orphaned auth user
      await deleteUser(user);
      
      const message = `✅ Successfully cleaned up orphaned auth user for: ${email}. They can now register again.`;
      setResult({ success: true, message, type: 'success' });
      toast.success('Cleanup successful!', { id: loadingToast });
      
      // Clear form
      setEmail('');
      setPassword('');
      
    } catch (error) {
      console.error('Cleanup error:', error);
      
      let message = 'Cleanup failed: ' + error.message;
      
      if (error.code === 'auth/user-not-found') {
        message = 'No auth user found for this email.';
      } else if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password provided.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'Invalid email address format.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      
      setResult({ success: false, message, type: 'error' });
      toast.error(message, { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-600" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Cleanup</h1>
          <p className="text-gray-600 mt-2">
            Clean up orphaned Firebase Auth users who failed vendor registration
          </p>
        </div>

        <form onSubmit={handleCleanup} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email to cleanup"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password to verify identity"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Cleaning...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Cleanup Orphaned Account
              </>
            )}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${
            result.type === 'success' ? 'bg-green-50 border-green-200' :
            result.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-3">
              {result.type === 'success' && <CheckCircle className="text-green-600 mt-0.5" size={20} />}
              {result.type === 'warning' && <AlertTriangle className="text-yellow-600 mt-0.5" size={20} />}
              {result.type === 'error' && <AlertTriangle className="text-red-600 mt-0.5" size={20} />}
              
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  result.type === 'success' ? 'text-green-800' :
                  result.type === 'warning' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">ℹ️ How this works:</h3>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Signs in with the provided credentials</li>
            <li>• Checks if a vendor profile exists in Firestore</li>
            <li>• If no profile exists, deletes the orphaned auth user</li>
            <li>• This allows the email to be used for registration again</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AdminCleanup;