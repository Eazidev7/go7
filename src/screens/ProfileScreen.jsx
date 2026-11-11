import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';
import AuthSheet from '../components/auth/AuthSheet';
import AddPhoneModal from '../components/AddPhoneModal';
import BottomNav from '../components/BottomNav';
import WalletSection from '../components/WalletSection';
import './ProfileScreen.css';
import '../styles/modern-notifications.css';

// Firebase imports
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, onSnapshot, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

// Memory leak prevention
import { useFirebaseListeners } from '../utils/listenerManager.js';
import { normalizeVirtualAccount, getUserVirtualAccount } from '../firebase/services/paystackDVAService';

// Profile utilities
const generateReferralCode = (uid) => {
  return `GO7${uid.slice(0, 6).toUpperCase()}`;
};

const generateAvatarUrl = (uid) => {
  return `https://api.dicebear.com/6.x/thumbs/svg?seed=${uid}`;
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

const validatePhoneNumber = (phone) => {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Nigerian phone number validation
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    return { valid: true, formatted: cleaned };
  } else if (cleaned.length === 10) {
    return { valid: true, formatted: '0' + cleaned };
  } else if (cleaned.length === 13 && cleaned.startsWith('234')) {
    return { valid: true, formatted: '0' + cleaned.slice(3) };
  }
  
  return { 
    valid: false, 
    error: 'Please enter a valid Nigerian phone number (e.g., 08012345678)',
    formatted: phone
  };
};

const ProfileScreen = () => {
  const navigate = useNavigate();
  const { currentUser, logout, isLoggedIn, isGuestMode, showPhonePrompt } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [showAuthSheet, setShowAuthSheet] = useState(false);
  const [authMode, setAuthMode] = useState('signup');
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  
  // User data state
  const [profile, setProfile] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [referralStats, setReferralStats] = useState({
    referralCode: '',
    totalReferrals: 0,
    totalEarnings: 0
  });
  const [addresses, setAddresses] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [go7Points, setGo7Points] = useState(0);
  const [rating, setRating] = useState(5.0);

  // Track if this is the initial wallet balance load to prevent false notifications
  const isInitialWalletLoad = useRef(true);

  // Firebase listener management (prevents memory leaks)
  const { registerListener, cleanup: cleanupListeners } = useFirebaseListeners('ProfileScreen');

  // Real-time Firestore listeners
  useEffect(() => {
    if (!currentUser || isGuestMode()) {
      setLoading(false);
      setShowAuthSheet(true);
      return;
    }

    const unsubscribers = [];

    // 1. User Profile Listener (managed by listenerManager)
    const userDocRef = doc(db, 'users', currentUser.uid);
    registerListener('userProfile', 
      onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const userData = docSnap.data();
          setProfile(userData);
          setGo7Points(userData.go7Points || 0);
          setRating(userData.rating || 5.0);
          
          // Set virtual account if exists
          const normalizedAccount = normalizeVirtualAccount(userData.virtualAccount);
          if (normalizedAccount) {
            setVirtualAccount(normalizedAccount);
          }
          
          // Set referral code
          if (!userData.referralCode) {
            const newCode = generateReferralCode(currentUser.uid);
            await updateDoc(userDocRef, { referralCode: newCode });
            setReferralStats(prev => ({ ...prev, referralCode: newCode }));
          } else {
            setReferralStats(prev => ({ ...prev, referralCode: userData.referralCode }));
          }
        } else {
          // Create initial profile
          const newProfile = {
            name: currentUser.displayName || 'Go7 User',
            email: currentUser.email,
            phone: currentUser.phoneNumber || '',
            avatar: currentUser.photoURL || generateAvatarUrl(currentUser.uid),
            referralCode: generateReferralCode(currentUser.uid),
            go7Points: 0,
            rating: 5.0,
            paymentMethod: 'Paystack-Titan',
            createdAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        }
      })
    );

    // 2. Enhanced Wallet Balance Listener with SweetAlert notifications
    const walletDocRef = doc(db, 'wallets', currentUser.uid);
    registerListener('walletBalance',
      onSnapshot(walletDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const walletData = docSnap.data();
        const newBalance = walletData.balance || 0;
        const walletAccount = normalizeVirtualAccount(walletData.virtualAccount);
        if (walletAccount) {
          setVirtualAccount(walletAccount);
        }
        
        // Check if balance increased (wallet credited)
        // Only show notification after initial load and when balance actually increases
        if (!isInitialWalletLoad.current && newBalance > walletBalance) {
          const creditAmount = newBalance - walletBalance;
          console.log('💰 Wallet credited detected:', { 
            previous: walletBalance, 
            new: newBalance, 
            credited: creditAmount 
          });
          
          // Show modern SweetAlert notification
          Swal.fire({
            title: '🎉 Payment Received!',
            html: `
              <div style="text-align: center; padding: 15px;">
                <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite;">💰</div>
                <h3 style="color: #059669; font-size: 26px; margin: 15px 0; font-weight: 700; 
                           text-shadow: 0 2px 4px rgba(5,150,105,0.1);">
                  Wallet Credited Successfully!
                </h3>
                <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); 
                           border-radius: 16px; padding: 25px; margin: 25px 0; 
                           border: 2px solid #10b981; box-shadow: 0 4px 15px rgba(16,185,129,0.15);">
                  <div style="font-size: 28px; font-weight: 800; color: #065f46; margin-bottom: 10px;">
                    +₦${creditAmount.toLocaleString()}
                  </div>
                  <p style="font-size: 16px; margin: 0; color: #374151;">
                    Your new balance: <strong style="color: #111827;">₦${newBalance.toLocaleString()}</strong>
                  </p>
                </div>
                <div style="background: #fef3c7; border-radius: 10px; padding: 12px; margin: 15px 0;">
                  <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                    📧 Email notification sent • Check your inbox
                  </p>
                </div>
              </div>
            `,
            icon: 'success',
            iconColor: '#10b981',
            confirmButtonText: '🛍️ Continue Shopping',
            confirmButtonColor: '#10b981',
            timer: 7000,
            timerProgressBar: true,
            showClass: {
              popup: 'animate__animated animate__bounceIn animate__faster'
            },
            hideClass: {
              popup: 'animate__animated animate__fadeOutUp animate__faster'
            },
            customClass: {
              popup: 'modern-wallet-success',
              title: 'wallet-success-title',
              confirmButton: 'wallet-success-button'
            },
            backdrop: `
              rgba(16,185,129,0.1)
              url("/images/confetti.gif")
              left top
              no-repeat
            `
          });
        }
        
        // Update wallet balance and mark that initial load is complete
        setWalletBalance(newBalance);
        isInitialWalletLoad.current = false;
      } else {
        // Wallet will be created by WalletAutoSetup or WalletComponent
        setWalletBalance(0);
        isInitialWalletLoad.current = false;
      }
      })
    );

    // 3. Recent Transactions Listener (simplified to avoid index requirement)
    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', currentUser.uid),
      limit(10) // Get more docs and sort client-side
    );
    const unsubTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // Sort client-side by timestamp (most recent first)
      .sort((a, b) => {
        const aTime = a.timestamp?.toMillis?.() || 0;
        const bTime = b.timestamp?.toMillis?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 5); // Take only first 5
      
      setRecentTransactions(transactions);
    });
    unsubscribers.push(unsubTransactions);

    // 4. Firestore Notifications Listener (simplified to avoid index requirement)
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('uid', '==', currentUser.uid),
      limit(5) // Get a few recent notifications and filter client-side
    );
    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      // Filter unread notifications and sort by timestamp client-side
      const unreadNotifications = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(notif => notif.read === false)
        .sort((a, b) => {
          const aTime = a.timestamp?.toMillis?.() || 0;
          const bTime = b.timestamp?.toMillis?.() || 0;
          return bTime - aTime;
        });
      
      if (unreadNotifications.length > 0) {
        const latestNotification = unreadNotifications[0];
        console.log('🔔 New notification received:', latestNotification);
        
        // Show SweetAlert for unread notifications
        if (latestNotification.type === 'wallet_credit' || latestNotification.type === 'wallet_credit_dva') {
          Swal.fire({
            icon: 'success',
            title: latestNotification.title,
            text: latestNotification.message,
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: true,
            confirmButtonText: 'Great!',
            confirmButtonColor: '#10b981',
            toast: false,
            position: 'center',
            background: '#f0fff4',
            iconColor: '#10b981'
          }).then(() => {
            // Mark notification as read
            const notificationRef = doc(db, 'notifications', snapshot.docs[0].id);
            updateDoc(notificationRef, { read: true });
          });
        }
      }
    });
    unsubscribers.push(unsubNotifications);

    // 5. Addresses Listener
    const addressesQuery = query(
      collection(db, 'addresses'),
      where('userId', '==', currentUser.uid)
    );
    const unsubAddresses = onSnapshot(addressesQuery, (snapshot) => {
      const addressList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAddresses(addressList);
    });
    unsubscribers.push(unsubAddresses);

    // 5. Orders Count and Recent Orders (simplified to avoid index requirement)
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', currentUser.uid),
      limit(10) // Get more docs and sort client-side
    );
    const unsubOrders = onSnapshot(ordersQuery, async (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      // Sort client-side by createdAt (most recent first)
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 3); // Take only first 3
      
      setRecentOrders(orders);
      
      // Get total count
      const allOrdersQuery = query(
        collection(db, 'orders'),
        where('userId', '==', currentUser.uid)
      );
      const countSnapshot = await getDocs(allOrdersQuery);
      setOrdersCount(countSnapshot.size);
    });
    unsubscribers.push(unsubOrders);

    // 6. Referral Stats
    const referralsQuery = query(
      collection(db, 'referrals'),
      where('referrerId', '==', currentUser.uid)
    );
    const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
      const totalReferrals = snapshot.size;
      const totalEarnings = snapshot.docs.reduce((sum, doc) => sum + (doc.data().earnings || 0), 0);
      setReferralStats(prev => ({
        ...prev,
        totalReferrals,
        totalEarnings
      }));
    });
    unsubscribers.push(unsubReferrals);

    setLoading(false);

    // Cleanup all listeners using listenerManager
    return () => {
      cleanupListeners();
      // Also cleanup any direct unsubscribers
      unsubscribers.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [currentUser, isGuestMode]);

  // Load user data when authenticated
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser && !isGuestMode()) {
        try {
          setLoading(true);
          console.log('🔄 Loading profile data for user:', currentUser.uid);
          
          // Load profile - Enhanced with DiceBear avatar generation
          try {
            console.log('📋 Loading user profile...');
            
            // Create profile with DiceBear avatar
            const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.email || currentUser.uid)}`;
            
            const mockProfile = {
              uid: currentUser.uid,
              name: currentUser.displayName || 'Go7 User',
              email: currentUser.email,
              avatar: avatar,
              phone: '+234 801 234 5678',
              addresses: [
                { 
                  id: '1', 
                  tag: 'Home', 
                  address: '123 Main Street, Abeokuta', 
                  coordinates: { lat: 7.1475, lng: 3.3619 },
                  isDefault: true
                },
                { 
                  id: '2', 
                  tag: 'Office', 
                  address: '456 Business District, Abeokuta', 
                  coordinates: { lat: 7.1575, lng: 3.3519 },
                  isDefault: false
                }
              ],
              location: 'Abeokuta, Ogun State',
              verified: true,
              totalReferrals: 3,
              totalEarnings: 1500
            };
            console.log('✅ Enhanced profile loaded with DiceBear avatar:', mockProfile);
            setProfile(mockProfile);
            setAddresses(mockProfile.addresses || []);
          } catch (profileError) {
            console.error('❌ Profile loading failed:', profileError);
            // Fallback mock data with DiceBear avatar
            const fallbackAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.email || 'fallback')}`;
            const fallbackProfile = {
              name: currentUser.displayName || 'Go7 User',
              email: currentUser.email,
              avatar: fallbackAvatar,
              referralCode: 'GO7DEMO',
              addresses: [],
              joinDate: new Date().toISOString(),
              memberSince: 'October 2025'
            };
            setProfile(fallbackProfile);
            setAddresses(fallbackProfile.addresses || []);
          }

          
          // Load referral stats - use mock data for development
          try {
            console.log('🎯 Loading referral stats...');
            // DEVELOPMENT FIX: Use mock referral data
            const mockReferralStats = {
              referralCode: 'GO7ABC',
              totalReferrals: 12,
              totalEarnings: 24000,
              pendingEarnings: 2000,
              lifetimeEarnings: 58000
            };
            console.log('✅ Mock referral stats loaded:', mockReferralStats);
            setReferralStats(mockReferralStats);
          } catch (referralError) {
            console.error('❌ Referral loading failed:', referralError);
            setReferralStats({
              referralCode: 'GO7DEV',
              totalReferrals: 5,
              totalEarnings: 10000
            });
          }
          

          
          // Mock recent orders (replace with actual Firebase call)
          setRecentOrders([
            { id: '1', restaurant: 'Pizza Palace', status: 'Delivered', date: '2025-10-19', amount: 2500 },
            { id: '2', restaurant: 'Burger King', status: 'In Transit', date: '2025-10-20', amount: 1800 },
            { id: '3', restaurant: 'KFC', status: 'Preparing', date: '2025-10-20', amount: 3200 }
          ]);
          
          console.log('✅ All profile data loading completed');
          
        } catch (error) {
          console.error('💥 Critical error loading user data:', error);
          toast.error(`Failed to load profile: ${error.message}`);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    loadUserData();
  }, [currentUser, isGuestMode]);

  // Handle authentication
  const handleAuth = (mode) => {
    setAuthMode(mode);
    setShowAuthSheet(true);
  };

  const handleAuthSuccess = () => {
    console.log('🎉 AUTH SUCCESS - Profile should now load!');
    setShowAuthSheet(false);
    toast.success('Welcome to Go7!');
    // Force a reload of user data
    setLoading(true);
  };

  const handleGuestMode = () => {
    navigate('/');
    toast.info('Browsing as guest');
  };

  const showTransactionHistory = async () => {
    if (!currentUser) return;
    
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
        
        // Safe date formatting - no .toDate() calls
        let date = 'Today';
        try {
          if (tx.date) {
            date = new Date(tx.date).toLocaleDateString();
          } else if (tx.createdAt) {
            date = new Date(tx.createdAt).toLocaleDateString();
          }
        } catch (error) {
          date = 'Today';
        }
        
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #eee;">
            <div style="text-align: left;">
              <div style="font-weight: bold; color: #333;">${tx.description}</div>
              <div style="font-size: 12px; color: #666;">${date}</div>
            </div>
            <div style="font-weight: bold; color: ${isCredit ? '#22c55e' : '#ef4444'};">
              ${isCredit ? '+' : '-'}${formatCurrency(Math.abs(tx.amount))}
            </div>
          </div>
        `;
      }).join('');

      Swal.fire({
        title: 'Transaction History',
        html: `
          <div style="text-align: center; margin-bottom: 15px;">
            <h4 style="color: #e61e25; margin: 0;">Current Balance: ${formatCurrency(walletBalance)}</h4>
          </div>
          <div style="max-height: 400px; overflow-y: auto; border: 1px solid #eee; border-radius: 8px;">
            ${transactionsHtml}
          </div>
        `,
        confirmButtonColor: '#e61e25',
        width: '90%'
      });
    } catch (error) {
      toast.error('Failed to load transaction history');
    }
  };

  // Referral functions
  const copyReferralCode = async () => {
    const code = profile?.referralCode || referralStats.referralCode;
    if (!code) {
      toast.error('Referral code not available');
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      Swal.fire({
        icon: 'success',
        title: 'Copied!',
        text: `Referral code ${code} copied to clipboard`,
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Referral code copied!');
    }
  };

  // Address functions
  const handleAddAddress = async () => {
    const result = await Swal.fire({
      title: 'Add New Address',
      html: `
        <input id="addressTag" class="swal2-input" placeholder="Tag (e.g., Home, Office)" style="margin-bottom: 10px;">
        <textarea id="addressText" class="swal2-textarea" placeholder="Enter full address" style="margin-bottom: 10px;"></textarea>
        <input id="landmark" class="swal2-input" placeholder="Landmark (optional)" style="margin-bottom: 10px;">
        <label style="display: flex; align-items: center; gap: 5px; margin-top: 10px;">
          <input type="checkbox" id="setDefault"> Set as default address
        </label>
      `,
      showCancelButton: true,
      confirmButtonText: 'Add Address',
      confirmButtonColor: '#e61e25',
      preConfirm: () => {
        const tag = Swal.getPopup().querySelector('#addressTag').value;
        const address = Swal.getPopup().querySelector('#addressText').value;
        const landmark = Swal.getPopup().querySelector('#landmark').value;
        const setDefault = Swal.getPopup().querySelector('#setDefault').checked;
        
        if (!tag || !address) {
          Swal.showValidationMessage('Please fill in tag and address fields');
          return false;
        }
        return { tag, address, landmark, setDefault };
      }
    });

    if (result.isConfirmed) {
      try {
        const addressRef = doc(collection(db, 'addresses'));
        const newAddress = {
          id: addressRef.id,
          userId: currentUser.uid,
          tag: result.value.tag,
          address: result.value.address,
          landmark: result.value.landmark || '',
          isDefault: result.value.setDefault,
          coordinates: null,
          createdAt: new Date().toISOString()
        };
        
        // If setting as default, update other addresses
        if (result.value.setDefault) {
          const addressesQuery = query(
            collection(db, 'addresses'),
            where('userId', '==', currentUser.uid),
            where('isDefault', '==', true)
          );
          const snapshot = await getDocs(addressesQuery);
          snapshot.docs.forEach(async (doc) => {
            await updateDoc(doc.ref, { isDefault: false });
          });
        }
        
        await setDoc(addressRef, newAddress);
        toast.success('Address added successfully!');
      } catch (error) {
        console.error('Add address error:', error);
        toast.error('Failed to add address');
      }
    }
  };

  const handleDeleteAddress = async (addressId) => {
    const result = await Swal.fire({
      title: 'Delete Address?',
      text: 'This action cannot be undone',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e61e25',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await updateDoc(doc(db, 'addresses', addressId), {
          deleted: true,
          deletedAt: new Date().toISOString()
        });
        toast.success('Address deleted successfully!');
      } catch (error) {
        console.error('Delete address error:', error);
        toast.error('Failed to delete address');
      }
    }
  };

  // Wallet functions
  const handleAddMoney = async () => {
    console.log('🔄 ProfileScreen: Add Money button clicked');
    console.log('📱 Current user:', currentUser);
    console.log('🧭 Navigating to wallet top-up page...');
    
    try {
      // Navigate to the working wallet top-up page
      navigate('/wallet/topup');
      console.log('✅ Navigation to wallet topup successful');
    } catch (error) {
      console.error('❌ Navigation to wallet topup failed:', error);
      toast.error('Failed to navigate to payment page. Please try again.');
    }
  };

  // Firestore operations
  const saveProfileToFirestore = async (profileData) => {
    if (!currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        ...profileData,
        updatedAt: new Date().toISOString()
      });
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Save profile error:', error);
      toast.error('Failed to update profile');
    }
  };

  // Profile editing
  const handleEditProfile = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Profile',
      html: `
        <input id="profileName" class="swal2-input" placeholder="Full Name" value="${profile?.name || ''}" style="margin-bottom: 10px;">
        <input id="profilePhone" class="swal2-input" placeholder="Phone Number" value="${profile?.phone || ''}" type="tel" style="margin-bottom: 10px;">
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px; text-align: left; color: #666;">Avatar URL (optional):</label>
          <input id="profileAvatar" class="swal2-input" placeholder="Avatar URL or leave empty for auto-generated" value="${profile?.avatar || ''}" style="margin: 0;">
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Save Changes',
      confirmButtonColor: '#e61e25',
      preConfirm: () => {
        const name = Swal.getPopup().querySelector('#profileName').value;
        const phone = Swal.getPopup().querySelector('#profilePhone').value;
        const avatar = Swal.getPopup().querySelector('#profileAvatar').value;
        
        if (!name.trim()) {
          Swal.showValidationMessage('Name is required');
          return false;
        }
        
        // Validate phone number if provided
        if (phone.trim() && !validatePhoneNumber(phone.trim()).valid) {
          Swal.showValidationMessage(validatePhoneNumber(phone.trim()).error);
          return false;
        }
        
        return { 
          name: name.trim(), 
          phone: phone.trim() ? validatePhoneNumber(phone.trim()).formatted : '', 
          avatar: avatar.trim() 
        };
      }
    });

    if (formValues) {
      try {
        // Generate new DiceBear avatar if no custom avatar provided
        const finalAvatar = formValues.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(currentUser.email || 'updated')}`;
        
        const updatedProfile = {
          ...profile,
          name: formValues.name,
          phone: formValues.phone,
          avatar: finalAvatar
        };
        
        setProfile(updatedProfile);
        
        // Save to Firestore
        const saveResult = await saveProfileToFirestore({
          name: formValues.name,
          phone: formValues.phone,
          avatar: finalAvatar
        });
        
        if (saveResult.success) {
          toast.success('Profile updated successfully!');
        } else {
          toast.error('Profile updated locally, but sync failed');
        }
        
      } catch (error) {
        console.error('Error updating profile:', error);
        toast.error('Failed to update profile');
      }
    }
  };

  // Copy DVA account number
  const copyDVANumber = async () => {
    if (!virtualAccount?.account_number) {
      showProfileToast('No account number available', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(virtualAccount.account_number);
      showProfileToast('Account number copied!', 'success');
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

  // Modern profile toast system
  const showProfileToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `profile-toast ${type}`;
    toast.innerHTML = `
      <div class="profile-toast-wrapper">
        <div class="profile-toast-icon">
          ${type === 'success' ? '✨' : '⚠️'}
        </div>
        <div class="profile-toast-content">
          <div class="profile-toast-title">${type === 'success' ? 'Success!' : 'Notice'}</div>
          <div class="profile-toast-message">${message}</div>
        </div>
      </div>
    `;
    
    const styles = `
      .profile-toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10000;
        padding: 20px 24px;
        border-radius: 24px;
        backdrop-filter: blur(30px);
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: profileToastPop 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        min-width: 300px;
        max-width: 400px;
      }
      .profile-toast.success {
        background: linear-gradient(135deg, rgba(224, 0, 27, 0.92), rgba(200, 0, 24, 0.92));
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      .profile-toast.error {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.92), rgba(220, 38, 38, 0.92));
        border: 2px solid rgba(255, 255, 255, 0.2);
      }
      .profile-toast-wrapper {
        display: flex;
        align-items: center;
        gap: 16px;
        color: white;
      }
      .profile-toast-icon {
        width: 50px;
        height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.25);
        border-radius: 50%;
        font-size: 22px;
        flex-shrink: 0;
      }
      .profile-toast-content {
        flex: 1;
      }
      .profile-toast-title {
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .profile-toast-message {
        font-size: 15px;
        opacity: 0.9;
        font-weight: 500;
      }
      @keyframes profileToastPop {
        0% {
          opacity: 0;
          transform: translateX(-50%) translateY(50px) scale(0.8);
        }
        50% {
          opacity: 1;
          transform: translateX(-50%) translateY(-10px) scale(1.05);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) translateY(0) scale(1);
        }
      }
      @media (max-width: 768px) {
        .profile-toast {
          left: 16px;
          right: 16px;
          transform: none;
          min-width: auto;
          max-width: none;
        }
      }
    `;
    
    if (!document.querySelector('#profile-toast-styles')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'profile-toast-styles';
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'profileToastPop 0.5s reverse';
      setTimeout(() => toast.remove(), 500);
    }, 3000);
  };

  // Navigation
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#e61e25',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, logout'
    });

    if (result.isConfirmed) {
      try {
        // Clear all listeners first
        if (window.unsubscribeAll) {
          window.unsubscribeAll();
        }
        
        // Sign out from Firebase
        await logout();
        
        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();
        
        toast.success('Logged out successfully');
        
        // Navigate to home
        navigate('/', { replace: true });
        
        // Force reload to clear all state
        setTimeout(() => window.location.reload(), 100);
      } catch (error) {
        console.error('Logout error:', error);
        toast.error('Error logging out. Please try again.');
      }
    }
  };

  // Auth sheet effect - CRITICAL: Must be before any conditional returns
  useEffect(() => {
    if ((!isLoggedIn || isGuestMode()) && !showAuthSheet) {
      // Show auth bottom sheet instead of redirecting
      setShowAuthSheet(true);
      setAuthMode('signup');
    }
  }, [isLoggedIn, isGuestMode, showAuthSheet]);

  // Debug logging
  console.log('🔍 ProfileScreen Debug:', { 
    isLoggedIn, 
    currentUser: currentUser?.uid, 
    loading, 
    showAuthSheet,
    isGuestMode: isGuestMode() 
  });

  // Render loading state
  if (loading) {
    return (
      <div className="profile-screen">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Render auth sheet for non-authenticated users
  if (!isLoggedIn || isGuestMode()) {
    return (
      <div className="profile-screen">
        {/* Blurred background showing you need to login */}
        <div className="profile-content" style={{ filter: 'blur(8px)', pointerEvents: 'none' }}>
          <div className="profile-card card">
            <div className="profile-info">
              <div className="avatar">👤</div>
              <div className="user-details">
                <h3>Your Profile</h3>
                <p>Login to view your profile</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Sheet (Bottom Sheet) */}
        {showAuthSheet && (
          <AuthSheet
            mode={authMode}
            onClose={() => {
              setShowAuthSheet(false);
              navigate('/'); // Go to home if they close without logging in
            }}
            onSuccess={handleAuthSuccess}
          />
        )}

        {/* Option to continue as guest */}
        {!showAuthSheet && (
          <div style={{ position: 'fixed', bottom: '100px', left: 0, right: 0, textAlign: 'center', zIndex: 1000 }}>
            <button
              onClick={handleGuestMode}
              style={{
                background: 'transparent',
                border: '2px solid #e61e25',
                color: '#e61e25',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Continue as Guest
            </button>
          </div>
        )}
        
        <BottomNav />
      </div>
    );
  }

  // Render main profile screen
  return (
    <div className="profile-screen modern-profile">
      {/* Back Button - Outside header for better visibility */}
      <button 
        onClick={() => navigate('/')} 
        className="profile-back-button"
        aria-label="Go back to home"
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'white',
          border: '2px solid #E63946',
          color: '#E63946',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          transition: 'all 0.3s ease'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      </button>
      
      <div className="profile-content">
        {/* Modern Profile Header */}
        <div className="profile-header-modern">
          <div className="profile-avatar-section">
            <div className="avatar-modern">
              {profile?.avatarUrl || profile?.avatar ? (
                <img 
                  src={profile.avatarUrl || profile.avatar} 
                  alt="Profile Avatar" 
                  className="avatar-image"
                  onError={(e) => {
                    e.target.src = generateAvatarUrl(currentUser?.uid || 'default');
                  }}
                />
              ) : (
                <img 
                  src={generateAvatarUrl(currentUser?.uid || 'default')}
                  alt="Generated Avatar" 
                  className="avatar-image"
                />
              )}
              <div className="rating-badge">
                <span className="rating-number">{rating.toFixed(1)}</span>
                <svg className="rating-star" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
              </div>
            </div>
            <div className="user-info-modern">
              <h2 className="user-name-modern">{profile?.name || currentUser?.displayName || 'Go7 User'}</h2>
              <p className="user-contact">{profile?.phone || currentUser?.phoneNumber || 'Add phone number'}</p>
              <p className="user-email-secondary">{currentUser?.email}</p>
              <p 
                className="payment-method-badge" 
                onClick={() => {
                  console.log('Payment badge clicked!');
                  setShowPaymentMethodModal(true);
                }}
              >
                💳 {profile?.paymentMethod || 'Paystack-Titan'}
              </p>
              <div className="points-section">
                <span className="points-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="gold" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '4px'}}>
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                  </svg>
                  Go7 Points: {go7Points || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Virtual Account DVA Box */}
          {virtualAccount && (
            <div className="dva-header-box">
              <div className="dva-header-content">
                <span className="dva-bank-label">Paystack–Titan</span>
                <span className="dva-account-number">{virtualAccount.account_number}</span>
              </div>
              <button className="dva-copy-btn" onClick={copyDVANumber}>
                📋
              </button>
            </div>
          )}
          
          {/* Quick Info Badges */}
          <div className="quick-info-badges">
            <div className="info-badge">
              <span className="badge-number">{ordersCount || 0}</span>
              <span className="badge-label">Orders</span>
            </div>
            <div className="info-badge">
              <span className="badge-number">{rating || 5.0}⭐</span>
              <span className="badge-label">Rating</span>
            </div>
            <div className="info-badge">
              <span className="badge-number">{go7Points || 0}</span>
              <span className="badge-label">Points</span>
            </div>
          </div>
        </div>

        {/* Personal Section */}
        <div className="personal-section-modern">
          <div className="section-item" onClick={handleEditProfile}>
            <div className="item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="item-content">
              <span className="item-title">Profile Details</span>
              <span className="item-subtitle">Edit your personal information</span>
            </div>
            <div className="item-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
          
          <div className="section-item" onClick={() => navigate('/addresses')}>
            <div className="item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div className="item-content">
              <span className="item-title">Addresses</span>
              <span className="item-subtitle">Manage delivery locations</span>
            </div>
            <div className="address-count-badge">{(profile?.addresses?.length || addresses.length || 0)}</div>
            <div className="item-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
          
          <div className="section-item" onClick={() => navigate('/orders')}>
            <div className="item-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div className="item-content">
              <span className="item-title">Orders</span>
              <span className="item-subtitle">View your order history</span>
            </div>
            <div className="item-arrow">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </div>
          </div>
          
          {/* Promotional Section */}
          <div className="promo-section">
            <div className="promo-content">
              <div className="promo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polygon points="10 8 16 12 10 16 10 8"/>
                </svg>
              </div>
              <div className="promo-text">
                <h4>Get Free Delivery for 30 days!</h4>
                <p>You could have saved ₦10,000 last month with Go7 Premium</p>
              </div>
              <button className="promo-btn">Learn More</button>
            </div>
          </div>
        </div>

        {/* Professional Wallet Section */}
        <WalletSection />

        {/* Transaction History Section */}
        <div className="profile-section">
          <h3 
            onClick={() => navigate('/history')}
            style={{ 
              margin: '0 0 15px 0', 
              color: '#e53935', 
              fontSize: '18px', 
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '8px 0',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              Transaction History
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e53935" strokeWidth="2">
              <polyline points="9,18 15,12 9,6"/>
            </svg>
          </h3>
          
          {recentTransactions.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' }}>
                {recentTransactions.slice(0, 3).map((tx) => (
                  <div 
                    key={tx.id}
                    style={{
                      background: '#f8f9fa',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e9ecef',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => navigate('/history')}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#e9ecef';
                      e.target.style.transform = 'translateX(3px)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#f8f9fa';
                      e.target.style.transform = 'translateX(0)';
                    }}
                  >
                    <div>
                      <div style={{ 
                        fontWeight: '600', 
                        color: tx.type === 'wallet_topup' || tx.type === 'wallet_topup_dva' ? '#28a745' : '#dc3545',
                        marginBottom: '2px',
                        fontSize: '14px'
                      }}>
                        {tx.type === 'wallet_topup' || tx.type === 'wallet_topup_dva' ? '+' : '-'}₦{tx.amount?.toLocaleString() || '0'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {tx.description || (tx.type === 'wallet_topup' ? 'Wallet Top-up' : 
                         tx.type === 'wallet_topup_dva' ? 'Bank Transfer' : 
                         tx.type)}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {tx.timestamp ? new Date(tx.timestamp.toMillis()).toLocaleDateString() : 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
              
              {recentTransactions.length > 3 && (
                <div style={{
                  textAlign: 'center',
                  padding: '10px',
                  background: '#f0f8ff',
                  borderRadius: '8px',
                  border: '1px solid #e3f2fd',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => navigate('/history')}
                onMouseEnter={(e) => {
                  e.target.style.background = '#e3f2fd';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#f0f8ff';
                }}
                >
                  <span style={{ color: '#1976d2', fontSize: '14px', fontWeight: '500' }}>
                    +{recentTransactions.length - 3} more transactions • View All
                  </span>
                </div>
              )}
            </>
          ) : (
            <div 
              style={{
                textAlign: 'center',
                padding: '30px 20px',
                color: '#666',
                background: '#f8f9fa',
                borderRadius: '10px',
                border: '1px solid #e9ecef',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => navigate('/history')}
              onMouseEnter={(e) => {
                e.target.style.background = '#e9ecef';
                e.target.style.borderColor = '#dee2e6';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.borderColor = '#e9ecef';
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 10px', opacity: 0.5 }}>
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
              <h4 style={{ margin: '0 0 5px 0', color: '#666', fontSize: '16px' }}>No Transactions Yet</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>
                Click here to view your transaction history
              </p>
            </div>
          )}
        </div>

        {/* Debug Button */}
        <div className="profile-section" style={{ marginBottom: '1rem' }}>
          {/* Saved Cards Button */}
          <button
            onClick={() => setShowAddCardModal(true)}
            style={{
              background: '#10b981',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '500'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
              <line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            💳 Manage Saved Cards ({savedCards.length})
          </button>

          <button
            onClick={async () => {
              try {
                const txQuery = query(
                  collection(db, 'transactions'),
                  where('userId', '==', currentUser.uid),
                  orderBy('timestamp', 'desc'),
                  limit(10)
                );
                const txSnapshot = await getDocs(txQuery);                console.log('🔍 Checking transactions for user:', currentUser.uid);
                console.log('📊 Found', txSnapshot.size, 'transactions');
                
                const transactions = [];
                txSnapshot.forEach(doc => {
                  const data = doc.data();
                  transactions.push({
                    id: doc.id,
                    ...data,
                    timestampFormatted: data.timestamp ? new Date(data.timestamp.toMillis()).toLocaleString() : 'No timestamp'
                  });
                  console.log('💳 Transaction:', {
                    id: doc.id,
                    amount: data.amount,
                    reference: data.reference,
                    type: data.type,
                    status: data.status,
                    timestamp: data.timestamp ? new Date(data.timestamp.toMillis()).toLocaleString() : 'No timestamp'
                  });
                });

                // Also check wallet
                const walletDoc = await getDoc(doc(db, 'wallets', currentUser.uid));
                console.log('💰 Wallet exists:', walletDoc.exists());
                if (walletDoc.exists()) {
                  console.log('💰 Wallet data:', walletDoc.data());
                }

                // Also check webhook transactions
                const webhookQuery = query(collection(db, 'webhook_transactions'), limit(5));
                const webhookSnapshot = await getDocs(webhookQuery);
                console.log('🔗 Recent webhook transactions:', webhookSnapshot.size);
                webhookSnapshot.forEach(doc => {
                  console.log('Webhook:', doc.id, doc.data());
                });

                // Show in alert
                Swal.fire({
                  title: '🔍 Debug Results',
                  html: `
                    <div style="text-align: left; font-size: 12px; max-height: 400px; overflow-y: auto;">
                      <p><strong>User ID:</strong> ${currentUser.uid}</p>
                      <p><strong>Transactions found:</strong> ${transactions.length}</p>
                      <p><strong>Wallet exists:</strong> ${walletDoc.exists()}</p>
                      <p><strong>Wallet balance:</strong> ₦${walletDoc.exists() ? (walletDoc.data().balance || 0).toLocaleString() : 0}</p>
                      <hr>
                      <p><strong>Recent transactions:</strong></p>
                      ${transactions.length > 0 ? transactions.map(tx => `
                        <div style="border: 1px solid #ddd; padding: 8px; margin: 4px 0; border-radius: 4px;">
                          <strong>₦${tx.amount}</strong> - ${tx.type}<br>
                          Ref: ${tx.reference || 'N/A'}<br>
                          Status: ${tx.status}<br>
                          Time: ${tx.timestampFormatted}
                        </div>
                      `).join('') : '<p style="color: #999;">No transactions found</p>'}
                      <hr>
                      <p><strong>Looking for reference:</strong> TEST-1761945429402-M8Gol8</p>
                      <p style="font-size: 11px; color: #666;">Check console (F12) for detailed logs</p>
                    </div>
                  `,
                  confirmButtonColor: '#e53935',
                  width: '600px'
                });

              } catch (error) {
                console.error('Debug error:', error);
                Swal.fire({
                  icon: 'error',
                  title: 'Debug Error',
                  text: error.message
                });
              }
            }}
            style={{
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            🔍 Debug: Check Transactions & Wallet
          </button>
        </div>

          <div className="referral-card-modern">
            <div className="referral-header">
              <span className="referral-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="8" width="18" height="12" rx="2"/>
                  <path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/>
                  <path d="M12 11v6"/>
                  <path d="M9 14h6"/>
                </svg>
              </span>
              <div className="referral-text">
                <h4>Refer & Earn ₦500</h4>
                <p>Invite friends and both get rewarded!</p>
              </div>
            </div>
            <div className="referral-code-modern">
              <span className="code-value">{profile?.referralCode || referralStats.referralCode}</span>
              <button className="copy-btn-modern" onClick={copyReferralCode}>
                Copy Code
              </button>
            </div>
            {(profile?.totalReferrals > 0 || referralStats.totalReferrals > 0) && (
              <div className="referral-earnings">
                <span>{profile?.totalReferrals || referralStats.totalReferrals} friends • {formatCurrency(profile?.totalEarnings || referralStats.totalEarnings)} earned</span>
              </div>
            )}
          </div>
          
          <div className="rewards-grid">
            <div className="reward-item">
              <span className="reward-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15.5 7.5l2.5 2.5L20.5 7.5"/>
                  <path d="M3.5 7.5L6 10l2.5-2.5"/>
                  <rect x="4" y="10" width="16" height="10" rx="2"/>
                  <line x1="12" y1="10" x2="12" y2="20"/>
                </svg>
              </span>
              <span className="reward-label">Gift Cards</span>
              <span className="reward-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </span>
            </div>
            <div className="reward-item">
              <span className="reward-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
              </span>
              <span className="reward-label">Go7 Points: 150</span>
              <span className="reward-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </span>
            </div>
          </div>
          
          <div className="app-settings">
            <div className="settings-item">
              <span className="settings-label">App Settings</span>
              <div className="toggle-switch">
                <input type="checkbox" id="appSettings" defaultChecked />
                <label htmlFor="appSettings" className="switch"></label>
              </div>
            </div>
          </div>

        {/* Address Manager */}
        <div className="profile-section address-section card">
          <div className="section-header">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Delivery Addresses
            </h3>
            <button className="add-btn" onClick={handleAddAddress}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          
          {(profile?.addresses?.length > 0 || addresses.length > 0) ? (
            <div className="address-list">
              {(profile?.addresses || addresses).map((address) => (
                <div key={address.id} className="address-item">
                  <div className="address-info">
                    <span className="address-tag">
                      {address.tag}
                      {address.isDefault && <span className="default-badge"> (Default)</span>}
                    </span>
                    <span className="address-text">{address.address}</span>
                  </div>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDeleteAddress(address.id)}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>Add your first delivery address</p>
              <button className="red-btn" onClick={handleAddAddress}>
                Add Address
              </button>
            </div>
          )}
        </div>

        {/* Orders Preview */}
        <div className="profile-section orders-section card">
          <div className="section-header">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{display: 'inline-block', verticalAlign: 'middle', marginRight: '8px'}}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
              Recent Orders
            </h3>
            <button className="view-all-btn" onClick={() => navigate('/orders')}>
              View All Orders
            </button>
          </div>
          
          {recentOrders.length > 0 ? (
            <div className="orders-list">
              {recentOrders.map((order) => (
                <div key={order.id} className="order-item">
                  <div className="order-info">
                    <span className="restaurant-name">{order.restaurant}</span>
                    <span className="order-date">{order.date}</span>
                  </div>
                  <div className="order-details">
                    <span className={`order-status ${order.status.toLowerCase().replace(' ', '-')}`}>
                      {order.status}
                    </span>
                    <span className="order-amount">{formatCurrency(order.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No orders yet. Start exploring restaurants!</p>
              <button className="red-btn" onClick={() => navigate('/')}>
                Browse Restaurants
              </button>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="profile-footer">
          <button className="logout-btn-modern" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>
          
          <div className="powered-by">
            <span>Powered by 7Linkz • Go7.ng</span>
          </div>
        </div>
        
        <BottomNav />
      </div>

      {/* Phone Number Prompt Modal - Disabled for smoother UX */}
      {/* {showPhonePrompt && isLoggedIn && !isGuestMode && (
        <AddPhoneModal onClose={() => {}} />
      )} */}

      {/* Payment Method Modal */}
      {showPaymentMethodModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentMethodModal(false)}>
          <div className="modal-content payment-method-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Payment Method</h3>
              <button className="close-btn" onClick={() => setShowPaymentMethodModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="payment-method-info">
                <div className="payment-icon">💳</div>
                <h4>Paystack-Titan</h4>
                <p className="payment-description">
                  Your default payment method is Paystack-Titan, powered by Paystack. 
                  All transactions are secure and encrypted.
                </p>
                <div className="payment-features">
                  <div className="feature-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>Secure payments</span>
                  </div>
                  <div className="feature-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>Multiple payment options</span>
                  </div>
                  <div className="feature-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>Instant confirmation</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPaymentMethodModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileScreen;