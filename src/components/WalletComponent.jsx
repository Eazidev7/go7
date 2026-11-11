import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import WalletWithdrawal from './WalletWithdrawal';
import TransactionHistory from './TransactionHistory';

/**
 * 💳 Go7 Wallet Component - Futuristic Red Theme
 * 
 * Real-time wallet with Paystack Dedicated Virtual Account (DVA)
 * - Modern red-themed design with neon effects
 * - Real-time balance updates with animations
 * - Copy account number functionality
 * - Mobile responsive layout
 */
export default function WalletComponent() {
  console.log('🚀 WalletComponent LOADED - Version: October 31, 2025 - 3:45 PM');
  
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [balance, setBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [error, setError] = useState(null);
  const [balanceChanged, setBalanceChanged] = useState(false);
  const [copied, setCopied] = useState(false);

  const functions = getFunctions();
  
  console.log('👤 Current user in WalletComponent:', user?.uid, user?.email);

  // 🔄 Real-time listener for user document (virtual account info)
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    console.log('📡 Setting up real-time wallet listener for:', user.uid);

    const userDocRef = doc(db, 'users', user.uid);
    
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log('👤 User data updated:', data);
          
          if (data.virtualAccount) {
            setVirtualAccount(data.virtualAccount);
            console.log('💳 Virtual account found:', data.virtualAccount);
          } else {
            console.log('⚠️ No virtual account yet');
          }
        } else {
          console.log('⚠️ User document not found');
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Listener error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // 🔄 Real-time listener for wallet balance with animation trigger
  useEffect(() => {
    if (!user?.uid) return;

    const walletDocRef = doc(db, 'wallets', user.uid);
    
    const unsubscribe = onSnapshot(
      walletDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const newBalance = data.balance || 0;
          
          // Trigger animation if balance changed
          if (balance !== newBalance && balance !== 0) {
            setBalanceChanged(true);
            setTimeout(() => setBalanceChanged(false), 500);
          }
          
          console.log('💰 Wallet balance updated:', newBalance);
          setBalance(newBalance);
        } else {
          console.log('⚠️ Wallet not initialized yet');
          setBalance(0);
        }
      },
      (error) => {
        console.error('❌ Wallet listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, balance]);

  // 🆕 Create virtual account for new users
  const handleCreateVirtualAccount = async () => {
    if (!user) {
      showWalletToast('Please login first', 'error');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      console.log('🏗️ Creating virtual account for:', user);

      const createVirtualAccount = httpsCallable(functions, 'createUserVirtualAccount');
      
      // Ensure proper name formatting for Paystack DVA
      const fullName = user.displayName || user.email?.split('@')[0] || 'Go7';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Go7';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
      const formattedName = `${firstName} ${lastName}`;
      
      const result = await createVirtualAccount({
        uid: user.uid,
        email: user.email,
        phone: user.phoneNumber || user.phone || '+2348000000000',
        name: formattedName
      });

      console.log('✅ Virtual account created:', result.data);
      
      // Store in local state (will also update via listener)
      if (result.data.success) {
        setVirtualAccount(result.data.data.virtualAccount);
        showWalletToast('Virtual account ready!', 'success');
      }

    } catch (error) {
      console.error('❌ Error creating virtual account:', error);
      setError(error.message);
      showWalletToast('Account creation failed', 'error');
    } finally {
      setCreating(false);
    }
  };

  // 📋 Copy account number to clipboard
  const copyAccountNumber = async () => {
    if (!virtualAccount?.account_number) {
      showWalletToast('No account available', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(virtualAccount.account_number);
      setCopied(true);
      showWalletToast('Account number copied!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = virtualAccount.account_number;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        showWalletToast('Account number copied!', 'success');
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        showWalletToast('Copy failed!', 'error');
        console.error('Clipboard copy failed:', fallbackError);
      }
    }
  };

  // Premium wallet success experience
  const showWalletToast = (message, type = 'success') => {
    // Create premium success overlay
    const overlay = document.createElement('div');
    overlay.className = `premium-wallet-success ${type}`;
    overlay.innerHTML = `
      <div class="success-backdrop"></div>
      <div class="success-container">
        <div class="success-icon-wrapper">
          <div class="success-icon">
            <div class="icon-inner">
              ${type === 'success' ? '💰' : '⚠️'}
            </div>
            <div class="success-ring"></div>
            <div class="success-ring-2"></div>
          </div>
        </div>
        <div class="success-content">
          <h3 class="success-title">${type === 'success' ? 'Payment Ready!' : 'Action Required'}</h3>
          <p class="success-message">${message}</p>
          <div class="success-checkmark">
            <div class="checkmark-circle"></div>
            <div class="checkmark-stem"></div>
            <div class="checkmark-kick"></div>
          </div>
        </div>
      </div>
    `;
    
    const styles = `
      .premium-wallet-success {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        animation: premiumFadeIn 0.5s ease-out;
      }
      .success-backdrop {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at center, rgba(224, 0, 27, 0.1), rgba(0, 0, 0, 0.3));
      }
      .success-container {
        background: linear-gradient(145deg, 
          rgba(255, 255, 255, 0.95) 0%,
          rgba(248, 250, 252, 0.95) 100%);
        padding: 40px;
        border-radius: 32px;
        box-shadow: 
          0 40px 100px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.8);
        text-align: center;
        position: relative;
        max-width: 380px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        animation: premiumSlideUp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1);
      }
      .success-icon-wrapper {
        position: relative;
        margin-bottom: 24px;
        display: flex;
        justify-content: center;
      }
      .success-icon {
        position: relative;
        width: 80px;
        height: 80px;
      }
      .icon-inner {
        width: 80px;
        height: 80px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #e50019, #b8001a);
        border-radius: 50%;
        font-size: 32px;
        color: white;
        position: relative;
        z-index: 3;
        animation: iconPop 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s both;
      }
      .success-ring {
        position: absolute;
        inset: -10px;
        border: 3px solid rgba(229, 0, 25, 0.3);
        border-radius: 50%;
        animation: ringPulse 2s ease-in-out infinite;
      }
      .success-ring-2 {
        position: absolute;
        inset: -20px;
        border: 2px solid rgba(229, 0, 25, 0.15);
        border-radius: 50%;
        animation: ringPulse 2s ease-in-out infinite 0.5s;
      }
      .success-content h3 {
        font-size: 24px;
        font-weight: 800;
        color: #1a1a1a;
        margin: 0 0 8px 0;
        letter-spacing: -0.02em;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .success-content p {
        font-size: 16px;
        color: #6b7280;
        margin: 0 0 24px 0;
        line-height: 1.5;
        font-weight: 500;
      }
      .success-checkmark {
        position: relative;
        width: 40px;
        height: 40px;
        margin: 0 auto;
      }
      .checkmark-circle {
        width: 40px;
        height: 40px;
        border: 3px solid #10b981;
        border-radius: 50%;
        animation: checkmarkCircle 0.6s ease-in-out 0.8s both;
      }
      .checkmark-stem {
        position: absolute;
        width: 3px;
        height: 12px;
        background: #10b981;
        left: 15px;
        top: 18px;
        transform: rotate(45deg);
        animation: checkmarkStem 0.3s ease-in-out 1.2s both;
      }
      .checkmark-kick {
        position: absolute;
        width: 8px;
        height: 3px;
        background: #10b981;
        left: 12px;
        top: 22px;
        transform: rotate(-45deg);
        animation: checkmarkKick 0.3s ease-in-out 1.4s both;
      }
      @keyframes premiumFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes premiumSlideUp {
        0% {
          opacity: 0;
          transform: translateY(60px) scale(0.8);
        }
        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes iconPop {
        0% { transform: scale(0) rotateZ(-180deg); }
        70% { transform: scale(1.1) rotateZ(-10deg); }
        100% { transform: scale(1) rotateZ(0deg); }
      }
      @keyframes ringPulse {
        0%, 100% { transform: scale(1); opacity: 0.3; }
        50% { transform: scale(1.1); opacity: 0.7; }
      }
      @keyframes checkmarkCircle {
        0% { stroke-dasharray: 0 150; }
        100% { stroke-dasharray: 150 150; }
      }
      @keyframes checkmarkStem {
        0% { height: 0; }
        100% { height: 12px; }
      }
      @keyframes checkmarkKick {
        0% { width: 0; }
        100% { width: 8px; }
      }
    `;
    
    if (!document.querySelector('#premium-wallet-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'premium-wallet-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(overlay);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 100, 30, 50]);
    }
    
    // Auto-dismiss after animation completes
    setTimeout(() => {
      overlay.style.animation = 'premiumFadeIn 0.4s reverse';
      setTimeout(() => overlay.remove(), 400);
    }, 2500);
  };

  // Add premium wallet copy button styles
  React.useEffect(() => {
    const premiumWalletStyles = `
      .premium-wallet-copy-btn {
        position: relative !important;
        overflow: hidden !important;
        transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
        transform-style: preserve-3d !important;
      }
      .premium-wallet-copy-btn:hover {
        transform: translateY(-6px) scale(1.03) !important;
        box-shadow: 
          0 25px 50px rgba(229, 0, 25, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.2) !important;
        background: linear-gradient(135deg, #ff1133, #e50019, #b8001a) !important;
      }
      .premium-wallet-copy-btn:active {
        transform: translateY(-3px) scale(0.99) !important;
        transition: all 0.1s ease !important;
      }
      .premium-wallet-copy-btn::before {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        background: linear-gradient(45deg, 
          transparent 20%, 
          rgba(255, 255, 255, 0.5) 40%,
          rgba(255, 255, 255, 0.8) 50%,
          rgba(255, 255, 255, 0.5) 60%,
          transparent 80%) !important;
        transform: translateX(-120%) skew(30deg) !important;
        transition: transform 0.8s ease !important;
        z-index: 1 !important;
      }
      .premium-wallet-copy-btn:hover::before {
        transform: translateX(220%) skew(30deg) !important;
      }
      .premium-wallet-copy-btn::after {
        content: '' !important;
        position: absolute !important;
        inset: 3px !important;
        border-radius: inherit !important;
        background: radial-gradient(circle at 30% 30%, 
          rgba(255, 255, 255, 0.2), 
          transparent 50%) !important;
        opacity: 0 !important;
        transition: all 0.4s ease !important;
        z-index: 1 !important;
      }
      .premium-wallet-copy-btn:active::after {
        opacity: 1 !important;
        animation: walletCopyPulse 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
      }
      .premium-wallet-copy-btn span {
        z-index: 10 !important;
        position: relative !important;
      }
      @keyframes walletCopyPulse {
        0% { 
          transform: scale(1); 
          opacity: 0.8;
          background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.3), transparent 40%);
        }
        50% { 
          transform: scale(1.05); 
          opacity: 1;
          background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.6), transparent 60%);
        }
        100% { 
          transform: scale(1); 
          opacity: 0;
          background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1), transparent 30%);
        }
      }
    `;
    
    if (!document.querySelector('#premium-wallet-copy-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'premium-wallet-copy-styles';
      styleSheet.textContent = premiumWalletStyles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 mb-4"></div>
          <p className="text-red-500 text-lg font-semibold tracking-wide">Loading Wallet...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center p-8 bg-gray-900 border border-red-600 rounded-2xl shadow-2xl shadow-red-600/50">
          <p className="text-red-500 text-xl font-bold">Please login to view your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black py-8 px-4 font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        
        .wallet-container {
          font-family: 'Orbitron', sans-serif;
        }
        
        .neon-glow {
          box-shadow: 0 0 20px rgba(229, 57, 53, 0.5),
                      0 0 40px rgba(229, 57, 53, 0.3),
                      0 0 60px rgba(229, 57, 53, 0.2);
        }
        
        .neon-text {
          text-shadow: 0 0 10px rgba(229, 57, 53, 0.8),
                       0 0 20px rgba(229, 57, 53, 0.6),
                       0 0 30px rgba(229, 57, 53, 0.4);
        }
        
        .balance-flash {
          animation: flash 0.5s ease-in-out;
        }
        
        @keyframes flash {
          0%, 100% { color: white; }
          50% { color: #00ff99; transform: scale(1.05); }
        }
        
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 0 30px rgba(229, 57, 53, 0.7),
                      0 0 60px rgba(229, 57, 53, 0.5);
        }
        
        .scan-line {
          position: relative;
          overflow: hidden;
        }
        
        .scan-line::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(
            to bottom,
            transparent 0%,
            rgba(229, 57, 53, 0.1) 50%,
            transparent 100%
          );
          animation: scan 3s linear infinite;
        }
        
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}</style>

      <div className="wallet-container max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black text-white neon-text mb-2">
            GO7 WALLET
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-transparent via-red-600 to-transparent mx-auto"></div>
        </div>

        {/* Main Wallet Card */}
        {virtualAccount ? (
          <div className="neon-glow hover-lift scan-line bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-red-600 rounded-3xl p-6 md:p-8 mb-6 relative overflow-hidden">
            {/* Live Indicator */}
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
              <span className="text-green-400 text-xs font-bold tracking-wider">LIVE</span>
            </div>

            {/* Balance Section */}
            <div className="mb-8 text-center md:text-left">
              <p className="text-gray-400 text-sm font-semibold tracking-widest uppercase mb-2">
                💰 Current Balance
              </p>
              <div className={`text-5xl md:text-6xl font-black text-white ${balanceChanged ? 'balance-flash' : ''}`}>
                ₦{balance.toLocaleString()}
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-red-600 to-transparent mb-6"></div>

            {/* Virtual Account Details */}
            <div className="space-y-4">
              {/* Bank Name */}
              <div className="bg-black/50 rounded-xl p-4 border border-red-900/30">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  🏦 Bank Name
                </p>
                <p className="text-white text-lg font-bold">
                  {virtualAccount.bank}
                </p>
              </div>

              {/* Account Number */}
              <div className="bg-black/50 rounded-xl p-4 border border-red-900/30">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  💳 Account Number
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-white text-2xl md:text-3xl font-black tracking-widest">
                    {virtualAccount.account_number}
                  </p>
                </div>
              </div>

              {/* Account Name */}
              <div className="bg-black/50 rounded-xl p-4 border border-red-900/30">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
                  👤 Account Name
                </p>
                <p className="text-white text-lg font-bold">
                  {virtualAccount.account_name}
                </p>
              </div>
            </div>

            {/* Premium Copy Button */}
            <button
              onClick={copyAccountNumber}
              className="premium-wallet-copy-btn w-full mt-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-lg py-4 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg shadow-red-600/50 relative overflow-hidden group"
            >
              <span className="relative z-10 flex items-center justify-center space-x-2">
                {copied ? (
                  <>
                    <span>✅</span>
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span>COPY ACCOUNT NUMBER</span>
                  </>
                )}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
            </button>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-red-950/30 rounded-xl border border-red-900/50">
              <p className="text-red-400 text-sm font-semibold mb-2 flex items-center">
                <span className="mr-2">💡</span>
                HOW TO FUND
              </p>
              <ol className="text-gray-300 text-xs space-y-1 pl-6">
                <li className="list-decimal">Transfer to the account number above</li>
                <li className="list-decimal">Your balance updates instantly</li>
                <li className="list-decimal">No manual refresh needed!</li>
              </ol>
            </div>
          </div>
          ) : (
          <div className="neon-glow bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-red-600 rounded-3xl p-8 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center mx-auto mb-6 neon-glow">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            
            <h3 className="text-2xl md:text-3xl font-black text-white neon-text mb-3">
              ACTIVATE WALLET
            </h3>
            <p className="text-gray-400 mb-6 text-sm md:text-base">
              Get your own virtual account number to fund your GO7 wallet instantly
            </p>
            
            {error && (
              <div className="mb-6 p-4 bg-red-950/50 border border-red-600 rounded-xl text-red-400 text-sm">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleCreateVirtualAccount}
              disabled={creating}
              className={`w-full bg-gradient-to-r from-red-600 to-red-700 text-white font-black text-lg py-4 rounded-xl transition-all duration-300 shadow-lg shadow-red-600/50 relative overflow-hidden group ${
                creating ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'
              }`}
            >
              {creating ? (
                <span className="flex items-center justify-center space-x-3">
                  <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>ACTIVATING...</span>
                </span>
              ) : (
                <span className="relative z-10">CREATE VIRTUAL ACCOUNT</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
            </button>
          </div>
        )}

        {/* Transaction History Section */}
        {virtualAccount && (
          <div className="mt-6">
            <TransactionHistory maxTransactions={15} />
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 p-5 bg-gradient-to-r from-red-950/30 via-black/50 to-red-950/30 rounded-2xl border border-red-900/30">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center border border-red-600/50">
                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-red-400 text-sm mb-1 tracking-wide">REAL-TIME SYNC</h4>
              <p className="text-gray-400 text-xs leading-relaxed">
                Your wallet balance updates automatically when funds are received. 
                No manual refresh required. Powered by Firebase real-time technology.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}