import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * 🔍 Simple Wallet Debug Component - No Firebase Functions
 */
export default function SimpleWalletDebug() {
  const { user } = useAuth();

  const copyUserId = async () => {
    if (!user?.uid) {
      showSimpleToast('No user ID available', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(user.uid);
      showSimpleToast('User ID copied!');
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

  // Simple toast system
  const showSimpleToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      padding: 14px 20px;
      border-radius: 25px;
      background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)'};
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      animation: simpleToastFade 0.3s ease;
    `;
    toast.textContent = `${type === 'success' ? '✓' : '✕'} ${message}`;
    
    const keyframes = `
      @keyframes simpleToastFade {
        from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    
    if (!document.querySelector('#simple-toast-keyframes')) {
      const style = document.createElement('style');
      style.id = 'simple-toast-keyframes';
      style.textContent = keyframes;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2200);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">🔍 Simple Wallet Debug</h2>
      
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
              <code className="bg-gray-100 px-2 py-1 rounded ml-2 text-sm font-mono">
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
            <div className="text-sm text-green-600 mt-2">
              ✅ Route is working! This means your React app is running correctly.
            </div>
          </div>
        ) : (
          <div className="text-red-600">❌ Not logged in - Please login to see your User ID</div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">🚀 Next Steps</h3>
        <ol className="text-sm space-y-2 text-gray-700">
          <li>1. <strong>Login</strong> to your account to see your User ID</li>
          <li>2. <strong>Copy your User ID</strong> using the button above</li>
          <li>3. <strong>Update Paystack Dashboard</strong> webhook URL to paystackWebhookV2</li>
          <li>4. <strong>Test webhook</strong> with your actual User ID</li>
          <li>5. <strong>Make a real payment</strong> to test wallet update</li>
        </ol>
      </div>

      {/* Test Info */}
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
        <p className="text-sm text-green-700">
          🎉 <strong>Success!</strong> If you can see this page, your React routing is working correctly.
          The 404 error was likely a caching issue or temporary server problem.
        </p>
      </div>
    </div>
  );
}