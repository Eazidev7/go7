import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import useAutoSetupWallet from '../hooks/useAutoSetupWallet';

/**
 * 🔐 Wallet Auto-Setup Wrapper
 * 
 * Automatically sets up virtual accounts for authenticated users
 * Place this component near the root of your app (inside AuthProvider)
 */
export default function WalletAutoSetup({ children }) {
  console.log('🔐 WalletAutoSetup wrapper rendered - Version: October 31, 2025 - 3:45 PM');
  
  const { user } = useAuth();
  console.log('👤 User in WalletAutoSetup:', user?.uid, user?.email);
  
  const { isSettingUp, hasVirtualAccount } = useAutoSetupWallet(user);
  
  console.log('📊 WalletAutoSetup state:', { isSettingUp, hasVirtualAccount });

  // Show a subtle indicator when setting up wallet for new users
  if (isSettingUp) {
    return (
      <>
        <div className="fixed top-4 right-4 z-50 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-pulse">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">Setting up your wallet...</span>
        </div>
        {children}
      </>
    );
  }

  return children;
}