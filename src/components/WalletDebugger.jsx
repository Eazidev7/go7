import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * 🔍 Wallet Debug Component
 * 
 * This component helps debug wallet balance issues by:
 * 1. Showing your actual Firebase User ID
 * 2. Fetching current wallet balance from Firestore  
 * 3. Testing wallet functions
 */
export default function WalletDebugger() {
  const { user } = useAuth();
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const functions = getFunctions();
  const getWalletDetails = httpsCallable(functions, 'getWalletDetails');

  const checkWallet = async () => {
    if (!user) {
      setError('Please log in first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Checking wallet for user:', user.uid);
      const result = await getWalletDetails();
      console.log('💰 Wallet data:', result.data);
      setWalletData(result.data);
    } catch (err) {
      console.error('❌ Wallet check error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      checkWallet();
    }
  }, [user]);

  const copyUserId = async () => {
    if (!user?.uid) {
      showDebugToast('No user ID available', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(user.uid);
      showDebugToast('User ID copied!', 'success');
    } catch (error) {
      try {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = user.uid;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('User ID copied to clipboard!');
      } catch (fallbackError) {
        alert('Failed to copy user ID');
        console.error('Copy failed:', fallbackError);
      }
    }
  };

  // Debug toast system
  const showDebugToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `debug-toast ${type}`;
    toast.innerHTML = `
      <div class="debug-toast-content">
        <span class="debug-icon">${type === 'success' ? '🔧' : '⚠️'}</span>
        <span>${message}</span>
      </div>
    `;
    
    const styles = `
      .debug-toast {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 10000;
        padding: 12px 18px;
        border-radius: 12px;
        backdrop-filter: blur(15px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        font-family: 'Courier New', monospace;
        font-size: 13px;
        font-weight: 600;
        animation: debugSlide 0.3s ease;
        min-width: 200px;
      }
      .debug-toast.success {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(37, 99, 235, 0.9));
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .debug-toast.error {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.9));
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.3);
      }
      .debug-toast-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .debug-icon {
        font-size: 16px;
      }
      @keyframes debugSlide {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    
    if (!document.querySelector('#debug-toast-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'debug-toast-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🔍 Wallet Debugger</h2>
      
      {/* User Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">User Information</h3>
        {user ? (
          <div className="space-y-2">
            <div>
              <strong>Email:</strong> {user.email}
            </div>
            <div>
              <strong>User ID:</strong> 
              <code className="bg-gray-100 px-2 py-1 rounded ml-2 text-sm">
                {user.uid}
              </code>
              <button 
                onClick={copyUserId}
                className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
              >
                Copy
              </button>
            </div>
            <div className="text-sm text-blue-600 mt-2">
              💡 Use this User ID in your webhook test files
            </div>
          </div>
        ) : (
          <div className="text-red-600">❌ Not logged in</div>
        )}
      </div>

      {/* Wallet Balance */}
      <div className="mb-6 p-4 bg-green-50 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-green-800">Wallet Balance</h3>
          <button 
            onClick={checkWallet}
            disabled={loading || !user}
            className={`px-4 py-2 rounded text-white ${
              loading || !user 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {loading ? '🔄 Checking...' : '🔍 Check Balance'}
          </button>
        </div>

        {error && (
          <div className="text-red-600 mb-3">❌ {error}</div>
        )}

        {walletData && (
          <div className="space-y-2">
            <div className="text-2xl font-bold text-green-600">
              ₦{walletData.balance?.toLocaleString() || '0'}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Last Top-up:</strong> ₦{walletData.lastTopupAmount || '0'}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Last Reference:</strong> {walletData.lastTopupReference || 'None'}
            </div>
            <div className="text-sm text-gray-600">
              <strong>Last Top-up Date:</strong> {
                walletData.lastTopupAt 
                  ? new Date(walletData.lastTopupAt).toLocaleString()
                  : 'Never'
              }
            </div>
            <div className="text-sm text-gray-600">
              <strong>Wallet Exists:</strong> {walletData.exists ? '✅ Yes' : '❌ No'}
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      {walletData?.recentTransactions && walletData.recentTransactions.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Recent Transactions</h3>
          <div className="space-y-2">
            {walletData.recentTransactions.slice(0, 5).map((tx, index) => (
              <div key={tx.id} className="p-2 bg-white rounded border">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">₦{tx.amount?.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Unknown date'}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Ref: {tx.reference || 'No reference'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">🚀 Testing Instructions</h3>
        <ol className="text-sm space-y-2 text-gray-700">
          <li>1. <strong>Copy your User ID</strong> from above</li>
          <li>2. <strong>Edit test-real-webhook.cjs</strong> and replace "YOUR_ACTUAL_USER_ID" with your User ID</li>
          <li>3. <strong>Run:</strong> <code className="bg-gray-200 px-1 rounded">node test-real-webhook.cjs</code></li>
          <li>4. <strong>Check if balance updates</strong> using the "Check Balance" button</li>
          <li>5. <strong>Make a real payment</strong> in the app and check balance again</li>
        </ol>
      </div>
    </div>
  );
}