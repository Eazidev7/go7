import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';
import { normalizeVirtualAccount, ensureVirtualAccount } from '../firebase/services/paystackDVAService';
import { subscribeToUnifiedWalletBalance } from '../utils/walletBalance';
import Swal from 'sweetalert2';
import AddMoneyModal from './AddMoneyModal';
import './WalletSection.css';

/**
 * 💳 Professional Wallet Section for Profile Screen
 * Matches the reference design with Go7 branding
 */
export default function WalletSection() {
  const { user, userProfile } = useAuth();
  const [wallet, setWallet] = useState({});
  const [balance, setBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const functions = getFunctions();

  // Sync payments at most once per 24h per user (saves Paystack + function quota)
  useEffect(() => {
    if (!user?.uid) return;

    const lastSync = localStorage.getItem(`go7_wallet_sync_${user.uid}`);
    const dayMs = 24 * 60 * 60 * 1000;
    if (lastSync && Date.now() - Number(lastSync) < dayMs) return;

    const autoSyncPayments = async () => {
      try {
        setSyncing(true);
        const syncPayments = httpsCallable(functions, 'autoSyncPayments');
        const result = await syncPayments();
        localStorage.setItem(`go7_wallet_sync_${user.uid}`, String(Date.now()));
        
        if (result.data.success && result.data.creditedCount > 0) {
          console.log(`✅ Auto-synced ${result.data.creditedCount} payment(s)`);
          Swal.fire({
            icon: 'success',
            title: 'Payments Synced!',
            text: `${result.data.creditedCount} payment(s) have been credited to your wallet`,
            confirmButtonColor: '#e53935',
            timer: 3000
          });
        }
      } catch (error) {
        console.error('Auto-sync error:', error);
      } finally {
        setSyncing(false);
      }
    };

    autoSyncPayments();
  }, [user?.uid, functions]);

  // Real-time wallet listener
  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    const setupAccount = async () => {
      const account = await ensureVirtualAccount({ uid: user.uid });
      if (account) {
        setVirtualAccount(account);
      }
    };

    setupAccount();

    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        const normalized = normalizeVirtualAccount(snap.data().virtualAccount);
        if (normalized) {
          setVirtualAccount(normalized);
        }
      }
      setLoading(false);
    });

    const unsubBalance = subscribeToUnifiedWalletBalance(user.uid, setBalance);

    const unsubWallet = onSnapshot(doc(db, 'wallets', user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWallet(data);
        const normalized = normalizeVirtualAccount(data.virtualAccount);
        if (normalized) {
          setVirtualAccount(normalized);
        }
      }
    });

    return () => {
      unsubBalance();
      unsubWallet();
      unsubUser();
    };
  }, [user?.uid, user?.email, userProfile?.phone, userProfile?.phoneNumber]);

  // Create virtual account
  const handleCreateVirtualAccount = async () => {
    if (!user) return;

    setCreating(true);
    try {
      const createVirtualAccount = httpsCallable(functions, 'createUserVirtualAccount');
      
      // Ensure proper name formatting for Paystack DVA
      const fullName = user.displayName || user.email?.split('@')[0] || 'Go7';
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0] || 'Go7';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
      const formattedName = `${firstName} ${lastName}`;
      
      const phone =
        userProfile?.phone ||
        userProfile?.phoneNumber ||
        user.phoneNumber ||
        '+2348000000000';

      const result = await createVirtualAccount({
        uid: user.uid,
        email: user.email,
        phone,
        name: formattedName
      });

      if (result.data.success) {
        const normalized = normalizeVirtualAccount(result.data.data.virtualAccount);
        setVirtualAccount(normalized);
        Swal.fire({
          icon: 'success',
          title: 'Account Created!',
          text: 'Your virtual account is ready',
          confirmButtonColor: '#e53935'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#e53935'
      });
    } finally {
      setCreating(false);
    }
  };

  // Copy account number
  const copyAccountNumber = async () => {
    if (!virtualAccount?.account_number) {
      showWalletSectionToast('No account available', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(virtualAccount.account_number);
      showWalletSectionToast('Account copied!', 'success');
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
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: 'Account number copied to clipboard',
          timer: 1500,
          showConfirmButton: false
        });
      } catch (fallbackError) {
        Swal.fire({
          icon: 'error',
          title: 'Copy Failed',
          text: 'Failed to copy to clipboard',
          timer: 2000,
          showConfirmButton: false
        });
        console.error('Clipboard copy failed:', fallbackError);
      }
    }
  };

  // Compact modern toast for wallet section
  const showWalletSectionToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `wallet-section-toast ${type}`;
    toast.innerHTML = `
      <div class="ws-toast-inner">
        <span class="ws-toast-icon">${type === 'success' ? '✓' : '✕'}</span>
        <span class="ws-toast-text">${message}</span>
      </div>
    `;
    
    const styles = `
      .wallet-section-toast {
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        padding: 14px 20px;
        border-radius: 50px;
        backdrop-filter: blur(20px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        animation: wsToastBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        min-width: 200px;
      }
      .wallet-section-toast.success {
        background: linear-gradient(135deg, rgba(22, 163, 74, 0.95), rgba(21, 128, 61, 0.95));
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .wallet-section-toast.error {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.95));
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }
      .ws-toast-inner {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
      }
      .ws-toast-icon {
        width: 18px;
        height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        font-size: 12px;
        font-weight: bold;
      }
      @keyframes wsToastBounce {
        0% {
          opacity: 0;
          transform: translateX(-50%) translateY(-30px) scale(0.7);
        }
        60% {
          opacity: 1;
          transform: translateX(-50%) translateY(5px) scale(1.1);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
      }
    `;
    
    if (!document.querySelector('#ws-toast-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ws-toast-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'wsToastBounce 0.3s reverse';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  // Add money handler
  const handleAddMoney = () => {
    setShowAddMoneyModal(true);
  };

  if (loading) {
    return (
      <div className="wallet-section-loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="wallet-section-container">
      {/* Header Bar */}
      <div className="wallet-header-bar">
        <h2 className="wallet-title">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
            <line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          Wallet
        </h2>
        <button className="add-money-header-btn" onClick={handleAddMoney}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Money
        </button>
      </div>

      {/* Balance Card */}
      <div className="balance-card">
        <div className="balance-card-content">
          <p className="balance-label">Available Balance</p>
          <h1 className="balance-amount">₦{balance.toLocaleString()}</h1>
        </div>
        <div className="balance-arrow">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </div>

      {/* Virtual Account Section */}
      {virtualAccount ? (
        <div className="virtual-account-section">
          <p className="virtual-account-subtitle">Fund wallet with your virtual account number</p>
          <div className="virtual-account-card">
            <div className="new-badge">🟢 New</div>
            <div className="virtual-account-header">
              <h3 className="virtual-account-title">Paystack–Titan</h3>
            </div>
            <div className="account-number-row">
              <div className="account-number-display">
                <p className="account-label">Account Number</p>
                <h2 className="account-number">{virtualAccount.account_number}</h2>
                <p className="account-name">{virtualAccount.account_name}</p>
              </div>
              <button className="copy-btn" onClick={copyAccountNumber}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                Copy
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="virtual-account-section">
          <p className="virtual-account-subtitle">Get your dedicated virtual account number</p>
          <div className="virtual-account-card no-account">
            <div className="no-account-content">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <h3>No Virtual Account Yet</h3>
              <p>Create your virtual account to receive instant transfers</p>
              <button 
                className="create-account-btn" 
                onClick={handleCreateVirtualAccount}
                disabled={creating}
              >
                {creating ? (
                  <>
                    <div className="btn-spinner"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Create Virtual Account
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Cards Section */}
      <div className="manage-cards-section">
        <h3 className="manage-cards-title">Manage Cards</h3>
        <button className="add-card-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add new debit card
        </button>
        <p className="manage-cards-note">Saved cards will appear here</p>
      </div>

      {/* Add Money Modal */}
      <AddMoneyModal 
        isOpen={showAddMoneyModal}
        onClose={() => setShowAddMoneyModal(false)}
        virtualAccount={virtualAccount}
        userName={user?.displayName || user?.email?.split('@')[0]}
      />
    </div>
  );
}
