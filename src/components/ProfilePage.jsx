import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
// GO7 AUTH START - Import new Firebase services
import { getWalletBalance, getTransactionHistory, formatCurrency } from '../firebase/services/walletService';
import { getReferralStats, generateReferralMessage } from '../firebase/services/referralService';
// GO7 AUTH END
import './ProfilePage.css';

// Import existing backend utilities (keeping for backward compatibility)
import { watchAuthState, updateProfilePhoto, signInWithGoogle } from '../utils/authHelpers.js';
import { getWalletBalance as getPaystackBalance, addMoney } from '../utils/paystack.js';
import { 
  saveWalletTransaction, 
  getRecentWalletTransactions,
  getRecentOrders,
  listAddresses,
  addAddress,
  editAddress,
  deleteAddress,
  createReferralRecord,
  findUserByReferralCode 
} from '../utils/firestoreProfile.js';

// HeroIcons imports (you can also use direct SVG or other icon libraries)
const ProfilePage = () => {
  const { currentUser, logout, userProfile, refreshUserProfile } = useAuthContext();
  const [userData, setUserData] = useState({
    name: 'Adekoya Oluwatobi',
    phone: '9963530000',
    paystackTag: 'GO7ADK2024',
    rating: 5.0,
    points: 8,
    walletBalance: 0,
    avatarUrl: null,
    referralCode: null
  });
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [walletTransactions, setWalletTransactions] = useState([]);
  // GO7 AUTH START - Add referral stats state
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalEarnings: 0,
    recentReferrals: [],
    referralCode: ''
  });
  // GO7 AUTH END
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false
  });
  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);

  // Fetch user data from Firebase with enhanced backend integration
  useEffect(() => {
    if (currentUser && userProfile) {
      // GO7 AUTH START - Enhanced data loading with new services
      const loadUserData = async () => {
        try {
          setLoading(true);
          
          // Update user data with profile information
          setUserData(prev => ({
            ...prev,
            name: userProfile.name || currentUser.displayName || prev.name,
            phone: userProfile.phone || prev.phone,
            paystackTag: userProfile.referralCode || prev.paystackTag,
            avatarUrl: currentUser.photoURL || prev.avatarUrl,
            referralCode: userProfile.referralCode || `GO7-${currentUser.uid.substring(0, 6).toUpperCase()}`,
            walletBalance: userProfile.walletBalance || 0
          }));
          
          // Load wallet data using new service
          setWalletLoading(true);
          try {
            const [balance, transactions] = await Promise.all([
              getWalletBalance(currentUser.uid),
              getTransactionHistory(currentUser.uid, 10)
            ]);
            
            setUserData(prev => ({ ...prev, walletBalance: balance }));
            setWalletTransactions(transactions);
          } catch (walletError) {
            console.error('Failed to load wallet data:', walletError);
          } finally {
            setWalletLoading(false);
          }
          
          // Load referral stats using new service
          try {
            const stats = await getReferralStats(currentUser.uid);
            setReferralStats(stats);
          } catch (referralError) {
            console.error('Failed to load referral stats:', referralError);
          }
          
          // Load recent orders (keeping existing logic)
          try {
            const recentOrders = await getRecentOrders(currentUser.uid, 3);
            setOrders(recentOrders);
          } catch (error) {
            console.error('Failed to load orders:', error);
          }
          
          // Load addresses (keeping existing logic)
          try {
            const userAddresses = await listAddresses(currentUser.uid);
            setAddresses(userAddresses);
          } catch (error) {
            console.error('Failed to load addresses:', error);
          }
          
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          setLoading(false);
        }
      };

      loadUserData();
      // GO7 AUTH END
    } else {
      // Use cached data from localStorage for guest users
      const cachedData = localStorage.getItem('go7-profile-cache');
      if (cachedData) {
        setUserData(prev => ({ ...prev, ...JSON.parse(cachedData) }));
      }
      setLoading(false);
    }
  }, [currentUser, userProfile]);

  // Add interactive copy button styles
  useEffect(() => {
    const copyButtonStyles = `
      .copy-interactive {
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
      }
      .copy-interactive:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(224, 0, 27, 0.15);
      }
      .copy-interactive:active {
        transform: translateY(0) scale(0.98);
      }
      .copy-interactive::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s;
      }
      .copy-interactive:hover::before {
        left: 100%;
      }
    `;
    
    if (!document.querySelector('#copy-interactive-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'copy-interactive-styles';
      styleSheet.textContent = copyButtonStyles;
      document.head.appendChild(styleSheet);
    }
  }, []);

  // Modern copy to clipboard functionality
  const copyToClipboard = async (text, label) => {
    // Check if text is valid
    if (!text || typeof text !== 'string') {
      showModernToast('Nothing to copy!', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showModernToast(`${label} copied!`, 'success');
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showModernToast(`${label} copied!`, 'success');
      } catch (fallbackErr) {
        showModernToast('Copy failed', 'error');
        console.error('Clipboard copy failed:', fallbackErr);
      }
    }
  };

  // Ultra-modern floating notification with haptic feedback
  const showModernToast = (message, type = 'success') => {
    // Create ripple effect at cursor position if available
    createRippleEffect(event);
    
    // Haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(type === 'success' ? [50] : [100, 50, 100]);
    }
    
    const notification = document.createElement('div');
    notification.className = `ultra-modern-notification ${type}`;
    notification.innerHTML = `
      <div class="notification-backdrop"></div>
      <div class="notification-content">
        <div class="notification-icon-container">
          <div class="notification-icon">
            ${type === 'success' ? '🎉' : type === 'error' ? '⚠️' : 'ℹ️'}
          </div>
          <div class="icon-glow"></div>
        </div>
        <div class="notification-text">
          <div class="notification-title">${type === 'success' ? 'Success!' : 'Notice'}</div>
          <div class="notification-message">${message}</div>
        </div>
        <div class="notification-progress"></div>
      </div>
    `;
    
    const styles = `
      .ultra-modern-notification {
        position: fixed;
        top: 60px;
        right: 24px;
        z-index: 999999;
        width: 360px;
        border-radius: 20px;
        overflow: hidden;
        backdrop-filter: blur(40px);
        -webkit-backdrop-filter: blur(40px);
        box-shadow: 0 25px 80px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'SF Pro Display', sans-serif;
        animation: ultraSlideIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        transform-origin: top right;
      }
      .ultra-modern-notification.success {
        background: linear-gradient(135deg, 
          rgba(224, 0, 27, 0.95) 0%, 
          rgba(180, 0, 22, 0.95) 50%, 
          rgba(224, 0, 27, 0.95) 100%);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      .ultra-modern-notification.error {
        background: linear-gradient(135deg, 
          rgba(239, 68, 68, 0.95) 0%, 
          rgba(220, 38, 38, 0.95) 50%, 
          rgba(239, 68, 68, 0.95) 100%);
        border: 1px solid rgba(255, 255, 255, 0.15);
      }
      .notification-backdrop {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 70% 30%, rgba(255, 255, 255, 0.1), transparent 70%);
        animation: backdropShimmer 3s ease-in-out infinite;
      }
      .notification-content {
        position: relative;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        color: white;
      }
      .notification-icon-container {
        position: relative;
        flex-shrink: 0;
      }
      .notification-icon {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        font-size: 22px;
        position: relative;
        z-index: 2;
        animation: iconPulse 2s ease-in-out infinite;
      }
      .icon-glow {
        position: absolute;
        inset: -8px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent 70%);
        animation: glowPulse 2s ease-in-out infinite;
      }
      .notification-text {
        flex: 1;
      }
      .notification-title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 4px;
        letter-spacing: -0.02em;
      }
      .notification-message {
        font-size: 14px;
        opacity: 0.9;
        font-weight: 500;
        line-height: 1.3;
      }
      .notification-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 0 0 20px 20px;
        animation: progressBar 4s linear forwards;
      }
      @keyframes ultraSlideIn {
        0% {
          opacity: 0;
          transform: translateX(100%) translateY(-20px) scale(0.8) rotate(5deg);
        }
        50% {
          opacity: 0.8;
          transform: translateX(-10px) translateY(0) scale(1.02) rotate(-1deg);
        }
        100% {
          opacity: 1;
          transform: translateX(0) translateY(0) scale(1) rotate(0deg);
        }
      }
      @keyframes ultraSlideOut {
        0% {
          opacity: 1;
          transform: translateX(0) scale(1) rotate(0deg);
        }
        100% {
          opacity: 0;
          transform: translateX(120%) scale(0.8) rotate(5deg);
        }
      }
      @keyframes backdropShimmer {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
      }
      @keyframes iconPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      @keyframes glowPulse {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50% { opacity: 0.8; transform: scale(1.1); }
      }
      @keyframes progressBar {
        0% { width: 100%; }
        100% { width: 0%; }
      }
      @media (max-width: 768px) {
        .ultra-modern-notification {
          right: 16px;
          left: 16px;
          width: auto;
          top: 20px;
        }
      }
    `;
    
    if (!document.querySelector('#ultra-modern-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'ultra-modern-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove with smooth exit animation
    setTimeout(() => {
      notification.style.animation = 'ultraSlideOut 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53) forwards';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 4000);
  };

  // Create ripple effect at click position
  const createRippleEffect = (event) => {
    if (!event || !event.target) return;
    
    const ripple = document.createElement('div');
    const rect = event.target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      animation: rippleEffect 0.6s ease-out;
      z-index: 1;
    `;
    
    const rippleKeyframes = `
      @keyframes rippleEffect {
        0% { transform: scale(0); opacity: 0.8; }
        100% { transform: scale(2); opacity: 0; }
      }
    `;
    
    if (!document.querySelector('#ripple-keyframes')) {
      const style = document.createElement('style');
      style.id = 'ripple-keyframes';
      style.textContent = rippleKeyframes;
      document.head.appendChild(style);
    }
    
    event.target.style.position = 'relative';
    event.target.style.overflow = 'hidden';
    event.target.appendChild(ripple);
    
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('go7-profile-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Toggle settings
  const toggleSetting = (setting) => {
    setSettings(prev => {
      const newSettings = { ...prev, [setting]: !prev[setting] };
      localStorage.setItem('go7-profile-settings', JSON.stringify(newSettings));
      
      // Apply theme changes immediately
      if (setting === 'darkMode') {
        document.documentElement.setAttribute('data-theme', newSettings.darkMode ? 'dark' : 'light');
      }
      
      showModernToast(`${setting === 'darkMode' ? 'Dark mode' : 'Notifications'} ${newSettings[setting] ? 'enabled' : 'disabled'}`, 'success');
      return newSettings;
    });
  };

  // Navigation handlers
  const navigateTo = (path) => {
    window.location.href = path;
  };

  // GO7 AUTH START - Enhanced referral sharing with stats
  const shareReferralCode = async () => {
    if (!userData.referralCode) {
      showModernToast('Referral code not available', 'error');
      return;
    }

    const referralMessage = generateReferralMessage(userData.referralCode, userData.name);
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Go7 - Fast Delivery Service',
          text: referralMessage,
          url: `https://go7.ng/signup?ref=${userData.referralCode}`
        });
      } else {
        await copyToClipboard(referralMessage, 'Referral message');
      }
    } catch (error) {
      console.error('Error sharing referral code:', error);
      await copyToClipboard(referralMessage, 'Referral message');
    }
  };

  const showReferralStats = async () => {
    if (!currentUser) {
      showModernToast('Please log in to view referral stats', 'error');
      return;
    }

    try {
      const stats = await getReferralStats(currentUser.uid);
      
      const recentReferralsHtml = stats.recentReferrals.length > 0 
        ? stats.recentReferrals.map(ref => 
            `<div style="text-align: left; padding: 8px; border-bottom: 1px solid #eee;">
              <strong>${ref.referredUserName}</strong><br>
              <small>₦${ref.bonusAmount} • ${new Date(ref.createdAt.toDate()).toLocaleDateString()}</small>
            </div>`
          ).join('')
        : '<p style="text-align: center; color: #666;">No referrals yet</p>';

      Swal.fire({
        title: 'Your Referral Stats',
        html: `
          <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="color: #e61e25; margin: 0;">₦${stats.totalEarnings.toLocaleString()}</h3>
            <p style="margin: 5px 0; color: #666;">Total Earnings</p>
            <p style="margin: 0;"><strong>${stats.totalReferrals}</strong> successful referrals</p>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Your Referral Code:</strong>
            <div style="background: #f5f5f5; padding: 10px; border-radius: 8px; margin: 5px 0; font-family: monospace; font-size: 18px; color: #e61e25;">
              ${stats.referralCode}
            </div>
          </div>
          <div>
            <strong>Recent Referrals:</strong>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px; margin-top: 10px;">
              ${recentReferralsHtml}
            </div>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Share My Code',
        cancelButtonText: 'Close',
        confirmButtonColor: '#e61e25'
      }).then((result) => {
        if (result.isConfirmed) {
          shareReferralCode();
        }
      });
    } catch (error) {
      console.error('Error loading referral stats:', error);
      showModernToast('Failed to load referral stats', 'error');
    }
  };
  // GO7 AUTH END

  // GO7 AUTH START - Add transaction history function
  const showTransactionHistory = async () => {
    if (!currentUser) {
      showModernToast('Please log in to view transaction history', 'error');
      return;
    }

    try {
      const transactions = await getTransactionHistory(currentUser.uid, 20);
      
      if (transactions.length === 0) {
        Swal.fire({
          title: 'Transaction History',
          html: '<p style="text-align: center; color: #666;">No transactions yet</p>',
          confirmButtonColor: '#e61e25'
        });
        return;
      }

      const transactionsHtml = transactions.map(tx => {
        const isCredit = tx.type === 'credit' || tx.type === 'referral_bonus';
        const date = new Date(tx.createdAt.toDate()).toLocaleDateString();
        const time = new Date(tx.createdAt.toDate()).toLocaleTimeString();
        
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
            <div style="text-align: left;">
              <div style="font-weight: bold; color: #333;">${tx.description}</div>
              <div style="font-size: 12px; color: #666;">${date} • ${time}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold; color: ${isCredit ? '#22c55e' : '#ef4444'};">
                ${isCredit ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))}
              </div>
              <div style="font-size: 12px; color: #666; text-transform: capitalize;">
                ${tx.type.replace('_', ' ')}
              </div>
            </div>
          </div>
        `;
      }).join('');

      Swal.fire({
        title: 'Transaction History',
        html: `
          <div style="text-align: center; margin-bottom: 15px;">
            <h4 style="color: #e61e25; margin: 0;">Current Balance: ${formatCurrency(userData.walletBalance)}</h4>
          </div>
          <div style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;">
            ${transactionsHtml}
          </div>
        `,
        confirmButtonColor: '#e61e25',
        width: '90%',
        maxWidth: '500px'
      });
    } catch (error) {
      console.error('Error loading transaction history:', error);
      showModernToast('Failed to load transaction history', 'error');
    }
  };
  // GO7 AUTH END

  // Handle add money with Paystack integration
  const handleAddMoney = async () => {
    if (!currentUser) {
      showModernToast('Please log in to add money to your wallet', 'error');
      return;
    }

    try {
      // Show input dialog for amount
      const { value: amount } = await Swal.fire({
        title: 'Add Money to Wallet',
        input: 'number',
        inputLabel: 'Amount (₦)',
        inputPlaceholder: 'Enter amount...',
        inputAttributes: {
          min: 100,
          max: 100000,
          step: 50
        },
        showCancelButton: true,
        confirmButtonText: 'Add Money',
        confirmButtonColor: '#E50914',
        inputValidator: (value) => {
          if (!value || value < 100) {
            return 'Please enter at least ₦100';
          }
          if (value > 100000) {
            return 'Maximum amount is ₦100,000';
          }
        }
      });

      if (amount) {
        await addMoney({
          amount: parseInt(amount),
          email: currentUser.email,
          userId: currentUser.uid,
          onSuccess: async (response) => {
            // Save successful transaction
            await saveWalletTransaction({
              userId: currentUser.uid,
              amount: parseInt(amount),
              type: 'credit',
              meta: {
                reference: response.reference,
                method: 'paystack',
                source: 'wallet_topup'
              }
            });
            
            // Refresh wallet balance
            const newBalance = await getWalletBalance(currentUser.uid);
            setUserData(prev => ({ ...prev, walletBalance: newBalance }));
            
            // Refresh transactions
            const transactions = await getRecentWalletTransactions(currentUser.uid, 5);
            setWalletTransactions(transactions);
            
            showModernToast(`₦${amount} added successfully!`, 'success');
          },
          onClose: () => {
            console.log('Payment popup closed');
          }
        });
      }
    } catch (error) {
      console.error('Add money error:', error);
      showModernToast('Failed to process payment. Please try again.', 'error');
    }
  };

  // Handle profile photo update
  const handlePhotoUpdate = async (event) => {
    const file = event.target.files[0];
    if (file && currentUser) {
      try {
        const photoURL = await updateProfilePhoto(currentUser.uid, file);
        setUserData(prev => ({ ...prev, avatarUrl: photoURL }));
        showModernToast('Photo updated!', 'success');
      } catch (error) {
        console.error('Photo update error:', error);
        showModernToast('Failed to update profile photo', 'error');
      }
    }
  };

  // Logout handler
  const handleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to logout?');
    if (!confirmLogout) return;
    
    try {
      await logout();
      showModernToast('Logged out successfully', 'success');
      navigateTo('/');
    } catch (error) {
      console.error('Logout error:', error);
      showModernToast('Logout failed. Please try again.', 'error');
    }
  };

  // Profile image upload handler
  const handleProfileImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handlePhotoUpdate;
    input.click();
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* HEADER SECTION */}
      <div className="profile-header">
        <div className="header-content">
          <div className="avatar-section">
            <div className="avatar-container">
              {userData.avatarUrl ? (
                <img src={userData.avatarUrl} alt="Profile" className="profile-avatar" />
              ) : (
                <div className="avatar-placeholder">
                  <svg className="avatar-icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
              )}
              <button className="edit-avatar-btn" onClick={handleProfileImageUpload}>
                <svg className="edit-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="user-info">
            <h1 className="user-name">{userData.name}</h1>
            <div className="phone-section copy-interactive" onClick={(e) => { window.event = e; copyToClipboard(userData.phone || '9963530000', 'Phone number'); }}>
              <svg className="phone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="phone-number">{userData.phone || '9963530000'}</span>
              <svg className="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="paystack-tag copy-interactive" onClick={(e) => { window.event = e; copyToClipboard(userData.paystackTag || 'GO7ADK2024', 'Paystack tag'); }}>
              <svg className="tag-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span>@{userData.paystackTag || 'GO7ADK2024'}</span>
              <svg className="copy-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 002 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="rating-points">
              <div className="rating">
                <span className="star">⭐</span>
                <span className="rating-value">{userData.rating}</span>
              </div>
              <div className="points">
                <span className="points-value">{userData.points} pts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PERSONAL SECTION */}
      <div className="profile-section">
        <div className="section-item" onClick={() => navigateTo('/profile/details')}>
          <div className="item-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="item-text">Profile Details</span>
          <svg className="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="section-item" onClick={() => navigateTo('/addresses')}>
          <div className="item-icon">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="item-text">Addresses</span>
          <svg className="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>

        <div className="promo-card">
          <div className="promo-content">
            <h3>Get Free Delivery for 30 Days!</h3>
            <p>You could've saved ₦10,000 last month</p>
          </div>
          <button className="promo-btn">Activate</button>
        </div>
      </div>

      {/* WALLET & REWARDS SECTION */}
      <div className="profile-section">
        <h2 className="section-title">Wallet & Rewards</h2>
        
        <div className="wallet-card">
          <div className="wallet-info">
            <span className="wallet-label">Wallet Balance</span>
            <span className="wallet-amount">
              {walletLoading ? (
                <span className="loading-text">Loading...</span>
              ) : (
                formatCurrency(userData.walletBalance)
              )}
            </span>
          </div>
          <div className="wallet-actions">
            <button 
              className="add-money-btn" 
              onClick={handleAddMoney}
              disabled={walletLoading || !currentUser}
            >
              Add Money
            </button>
            {/* GO7 AUTH START - Add transaction history button */}
            <button 
              className="transactions-btn" 
              onClick={showTransactionHistory}
              disabled={walletLoading || !currentUser}
            >
              History
            </button>
            {/* GO7 AUTH END */}
          </div>
        </div>

        <div className="rewards-grid">
          <div className="reward-item" onClick={showReferralStats}>
            <div className="reward-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="reward-content">
              <h4>Refer & Earn ₦500</h4>
              <p>Code: {userData.referralCode || 'Loading...'}</p>
              {/* GO7 AUTH START - Add referral stats */}
              <p>
                {referralStats.totalReferrals > 0 
                  ? `${referralStats.totalReferrals} referrals • ${formatCurrency(referralStats.totalEarnings)} earned`
                  : 'Share your referral code'
                }
              </p>
              {/* GO7 AUTH END */}
            </div>
            <button className="share-btn" onClick={(e) => { e.stopPropagation(); shareReferralCode(); }}>Share</button>
          </div>

          <div className="reward-item">
            <div className="reward-icon">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <div className="reward-content">
              <h4>Gift Cards</h4>
              <p>Redeem or buy gift cards</p>
            </div>
            <svg className="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* ORDERS SECTION */}
      <div className="profile-section">
        <div className="section-header">
          <h2 className="section-title">My Orders</h2>
          <button className="view-all-btn" onClick={() => navigateTo('/orders')}>
            View All
          </button>
        </div>

        <div className="orders-list">
          {loading ? (
            <div className="loading-orders">
              <div className="loading-spinner"></div>
              <p>Loading orders...</p>
            </div>
          ) : orders.length > 0 ? (
            orders.map((order) => (
              <div key={order.id} className="order-item">
                <div className="order-info">
                  <h4 className="vendor-name">{order.restaurantName || order.vendor}</h4>
                  <p className="order-date">{order.date || new Date(order.createdAt?.toDate?.() || order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="order-status">
                  <span className={`status-badge ${(order.status || 'pending').toLowerCase()}`}>
                    {order.status || 'Pending'}
                  </span>
                  <span className="order-amount">₦{order.price?.toLocaleString() || order.amount}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="no-orders">
              <p>No recent orders found</p>
              <button 
                className="order-now-btn" 
                onClick={() => navigateTo('/restaurants')}
              >
                Order Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* SUPPORT & INFO SECTION */}
      <div className="profile-section">
        <h2 className="section-title">Support & Information</h2>
        
        <div className="support-items">
          {[
            { label: 'How-Tos', icon: 'question-mark-circle' },
            { label: 'FAQs', icon: 'chat-bubble-bottom-center-text' },
            { label: 'Get Help', icon: 'phone' },
            { label: 'Legal', icon: 'document-text' }
          ].map((item) => (
            <div key={item.label} className="support-item">
              <div className="item-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.icon === 'question-mark-circle' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  )}
                  {item.icon === 'chat-bubble-bottom-center-text' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  )}
                  {item.icon === 'phone' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  )}
                  {item.icon === 'document-text' && (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  )}
                </svg>
              </div>
              <span className="item-text">{item.label}</span>
              <svg className="chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* SETTINGS SECTION */}
      <div className="profile-section">
        <h2 className="section-title">Settings</h2>
        
        <div className="settings-items">
          <div className="setting-item">
            <div className="setting-info">
              <div className="item-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.868 19.504c.266-.043.544-.198.852-.432A23.979 23.979 0 0112 17c2.281 0 4.402.472 6.28 1.072.358.234.636.389.852.432C19.64 18.638 20 18.90 20 19.5s-.36.862-.868.996c-.266.043-.544.198-.852.432A23.979 23.979 0 0112 22c-2.281 0-4.402-.472-6.28-1.072-.358-.234-.636-.389-.852-.432C4.36 20.362 4 20.10 4 19.5s.36-.862.868-.996zM4.868 15.504c.266-.043.544-.198.852-.432A23.979 23.979 0 0112 13c2.281 0 4.402.472 6.28 1.072.358.234.636.389.852.432C19.64 14.638 20 14.90 20 15.5s-.36.862-.868.996c-.266.043-.544.198-.852.432A23.979 23.979 0 0112 18c-2.281 0-4.402-.472-6.28-1.072-.358-.234-.636-.389-.852-.432C4.36 16.362 4 16.10 4 15.5s.36-.862.868-.996z" />
                </svg>
              </div>
              <span className="setting-text">Notifications</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.notifications}
                onChange={() => toggleSetting('notifications')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>

          <div className="setting-item">
            <div className="setting-info">
              <div className="item-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              </div>
              <span className="setting-text">Dark Mode</span>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={settings.darkMode}
                onChange={() => toggleSetting('darkMode')}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
      </div>

      {/* LOGOUT BUTTON */}
      <div className="logout-section">
        <button className="logout-btn" onClick={handleLogout}>
          <svg className="logout-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>

      {/* Bottom spacing for navigation */}
      <div className="bottom-spacing"></div>
    </div>
  );
};

export default ProfilePage;