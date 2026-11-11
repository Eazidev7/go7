/**
 * 🏪 VENDOR DASHBOARD - Main vendor management interface
 * Integrates with VendorDashboardAlerts for order management
 * Includes orders, menu, payouts, and settings sections
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { uploadVendorImagePreferHostinger } from '../services/hostingerImageUpload';
import VendorDashboardAlerts from '../components/VendorDashboardAlerts';
import VendorProductManagerV2 from '../components/VendorProductManagerV2';
import VendorAddons from '../components/vendor/VendorAddons';
import VendorCategoriesManager from '../components/vendor/VendorCategoriesManager';
import VendorComboManager from '../components/VendorComboManager';
import VendorPhoneVerification from '../components/VendorPhoneVerification';
import VendorWalletPanel from '../components/vendor/VendorWallet';
import VendorBankDetailsForm from '../components/vendor/VendorBankDetailsForm';
import VendorPasswordForm from '../components/vendor/VendorPasswordForm';
import VendorImageCaptureInput from '../components/vendor/VendorImageCaptureInput';
import VendorMealPlans from '../components/vendor/VendorMealPlans';
import VendorScheduledLegs from '../components/vendor/VendorScheduledLegs';
import { FirestoreVendorHelpers } from '../utils/firestoreVendorHelpers';
import { updateVendorProfile } from '../services/vendorAuthService';
import { fetchMealPlansEnabled } from '../services/mealBundleService';
import { 
  Store, Package, DollarSign, Settings, LogOut, 
  TrendingUp, Users, Clock, CheckCircle,
  Menu as MenuIcon, X, BarChart3, Plus, Folder, Zap, Camera
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorDashboard() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('orders');
  const [addons, setAddons] = useState([]);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    revenue: 0
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [mealPlansEnabled, setMealPlansEnabled] = useState(false);

  useEffect(() => {
    fetchMealPlansEnabled()
      .then(setMealPlansEnabled)
      .catch(() => setMealPlansEnabled(false));
  }, []);

  const toggleSidebar = () => setSidebarOpen((open) => !open);
  const closeSidebar = () => setSidebarOpen(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      closeSidebar();
    }
  };
  const [activeView, setActiveView] = useState('overview');
  const [editingBusinessName, setEditingBusinessName] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  // Vendor image upload function
  const handleImageUpload = async (file) => {
    if (!file) return;
    
    try {
      setUploadingImage(true);
      
      // Hostinger only (Firebase Storage bypass)
      const timestamp = Date.now();
      const imageUrl = await uploadVendorImagePreferHostinger(
        file,
        `vendors/${vendorId}/logo_${timestamp}.jpg`
      );
      
      // Update vendor document with new image URL
      await updateDoc(doc(db, 'vendors', vendorId), {
        imageUrl,
        profileImage: imageUrl,
        businessLogo: imageUrl,
        updatedAt: new Date()
      });
      
      // Update local state
      setVendor(prev => ({ ...prev, imageUrl, profileImage: imageUrl, businessLogo: imageUrl }));
      
      toast.success('Business logo updated successfully!');
      setSelectedImageFile(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image file selection (camera or gallery)
  const processImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setSelectedImageFile(file);
    handleImageUpload(file);
  };

  // Business name update function
  const handleBusinessNameUpdate = async () => {
    if (!newBusinessName.trim()) {
      toast.error('Business name cannot be empty');
      return;
    }
    
    try {
      await updateVendorProfile(vendorId, {
        businessName: newBusinessName.trim()
      });
      
      setVendor(prev => ({ ...prev, businessName: newBusinessName.trim() }));
      setEditingBusinessName(false);
      setNewBusinessName('');
      toast.success('Business name updated successfully!');
    } catch (error) {
      console.error('Error updating business name:', error);
      toast.error('Failed to update business name. Please try again.');
    }
  };

  // Fetch vendor data with persistent auth
  useEffect(() => {
    let isMounted = true;
    
    const fetchVendor = async () => {
      try {
        // Wait for Firebase Auth to finish restoring the session (first callback).
        const restoredUser = await new Promise((resolve) => {
          let done = false;
          const finish = (user) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            unsub();
            resolve(user || null);
          };
          const timer = setTimeout(() => finish(auth.currentUser), 6000);
          const unsub = auth.onAuthStateChanged((user) => finish(user));
        });

        let currentUser = restoredUser || auth.currentUser;

        // Session fallback while auth finishes restoring across vendor.html → full app
        if (!currentUser) {
          const storedSession = localStorage.getItem('go7_vendor_session');
          if (storedSession) {
            console.log('⚠️ Auth not ready but session exists, waiting...');
            await new Promise((resolve) => setTimeout(resolve, 1500));
            currentUser = auth.currentUser;
          }
        }

        if (!currentUser) {
          console.error('❌ User not authenticated');
          toast.error('Please log in to continue');
          navigate('/vendor/login');
          return;
        }

        if (!vendorId) {
          const authUserId = currentUser.uid;
          console.log('🔄 No vendor ID in URL, redirecting to user dashboard:', authUserId);
          navigate(`/vendor/dashboard/${authUserId}`, { replace: true });
          return;
        }

        // Verify the vendorId matches the authenticated user
        if (vendorId !== currentUser.uid) {
          console.warn('⚠️ Vendor ID mismatch, redirecting to correct dashboard:', {
            urlId: vendorId,
            authId: currentUser.uid,
          });
          navigate(`/vendor/dashboard/${currentUser.uid}`, { replace: true });
          return;
        }

        console.log('🔍 Fetching vendor data for ID:', vendorId);
        const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
        
        if (!isMounted) return;
        
        if (!vendorDoc.exists()) {
          console.error('❌ Vendor document not found in Firestore');
          toast.error('Vendor profile not found. Please complete registration.');
          navigate('/vendor/register');
          return;
        }

        const vendorData = {
          id: vendorDoc.id,
          ...vendorDoc.data()
        };
        
        // CHECK PHONE VERIFICATION STATUS
        console.log('🔍 Vendor Verification Check:', {
          phoneVerified: vendorData.phoneVerified,
          accountStatus: vendorData.accountStatus,
          registrationComplete: vendorData.registrationComplete,
          canReceiveOrders: vendorData.canReceiveOrders,
          isActive: vendorData.isActive
        });
        
        // Store vendor session
        localStorage.setItem('go7_vendor_session', JSON.stringify({
          vendorId: vendorDoc.id,
          businessName: vendorData.businessName || vendorData.name,
          timestamp: Date.now()
        }));
        
        console.log('✅ Vendor data loaded:', vendorData.businessName || vendorData.name);
        setVendor(vendorData);
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        console.error('❌ Error fetching vendor:', error);
        toast.error('Failed to load vendor data: ' + error.message);
        setLoading(false);
      }
    };

    fetchVendor();
    
    return () => {
      isMounted = false;
    };
  }, [vendorId, navigate]);

  // Calculate stats from orders
  useEffect(() => {
    if (!vendorId) return;

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('vendorId', '==', vendorId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pending = orders.filter(o => 
        ['pending_vendor', 'queued_vendor_offline'].includes(o.orderStatus)
      ).length;

      const completedToday = orders.filter(o => {
        const orderDate = o.createdAt?.toDate();
        return o.orderStatus === 'delivered' && orderDate >= today;
      }).length;

      const totalRevenue = orders
        .filter(o => ['accepted', 'delivered'].includes(o.orderStatus))
        .reduce((sum, o) => sum + (o.total || 0), 0);

      setStats({
        totalOrders: orders.length,
        pendingOrders: pending,
        completedToday: completedToday,
        revenue: totalRevenue
      });
    });

    return () => unsubscribe();
  }, [vendorId]);

  // Setup addon listener
  useEffect(() => {
    if (!vendorId) return;

    try {
      const unsubscribe = FirestoreVendorHelpers.setupAddonsListener(vendorId, (addons) => {
        setAddons(addons);
        console.log('✅ Real-time addons updated:', addons.length);
      });
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error setting up addon listener:', error);
      return () => {}; // Return no-op unsubscribe function
    }
  }, [vendorId]);

  // Handle logout — keep shop open/closed as set by Online toggle (do not force offline)
  const handleLogout = async () => {
    try {
      await updateDoc(doc(db, 'vendors', vendorId), {
        lastSeen: new Date().toISOString()
      });

      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/vendor/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-red-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Vendor not found</p>
        </div>
      </div>
    );
  }

  // CHECK IF VENDOR NEEDS PHONE VERIFICATION
  const needsVerification = (
    !vendor.phoneVerified ||
    vendor.accountStatus === 'pending_phone_verification' ||
    !vendor.registrationComplete
  );

  const awaitingAdminApproval = (
    vendor.phoneVerified &&
    vendor.registrationComplete &&
    vendor.approved !== true &&
    vendor.status !== 'approved' &&
    vendor.isLive !== true
  );

  // SHOW VERIFICATION SCREEN IF NEEDED
  if (needsVerification) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">📱</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Phone Verification Required
            </h1>
            <p className="text-gray-600 mb-6">
              To start receiving orders and accessing your vendor dashboard, 
              you must verify your phone number via WhatsApp OTP.
            </p>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6">
              <p className="text-sm text-yellow-800">
                <strong>⚠️ Your account is inactive</strong><br/>
                You cannot receive orders until phone verification is complete.
              </p>
            </div>
          </div>

          <VendorPhoneVerification
            vendorId={vendor.id || vendor.vendorId}
            phoneNumber={vendor.phone}
            onVerificationSuccess={() => {
              // Refresh page to reload vendor data
              window.location.reload();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {awaitingAdminApproval && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
          <p className="text-amber-900 font-medium">Awaiting GO7 admin approval</p>
          <p className="text-sm text-amber-800 mt-1">
            Set up your menu and combos now. Your store goes live on the customer app after admin approves you.
          </p>
        </div>
      )}
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {sidebarOpen ? <X size={24} /> : <MenuIcon size={24} />}
            </button>
            
            <div className="flex items-center space-x-3">
              {vendor.imageUrl ? (
                <img
                  src={vendor.imageUrl}
                  alt={vendor.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <Store size={20} className="text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900">{vendor.name}</h1>
                <p className="text-sm text-gray-600">{vendor.type}</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <LogOut size={20} />
            <span className="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>

      <div className="flex min-w-0 max-w-full overflow-x-hidden">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={closeSidebar}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed top-[73px] bottom-0 left-0 z-30 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-200 ease-in-out overflow-y-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <nav className="p-4 space-y-2">
            <button
              onClick={() => handleTabChange('orders')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'orders'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package size={20} />
              <span className="font-semibold">Orders</span>
            </button>

            <button
              onClick={() => handleTabChange('menu')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'menu'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package size={20} />
              <span className="font-semibold">Products V2</span>
            </button>

            <button
              onClick={() => handleTabChange('categories')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'categories'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Folder size={20} />
              <span className="font-semibold">Categories</span>
            </button>

            <button
              onClick={() => handleTabChange('combos')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'combos'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Zap size={20} />
              <span className="font-semibold">Combo Rush</span>
            </button>

            {mealPlansEnabled && (
              <button
                onClick={() => handleTabChange('mealplans')}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  activeTab === 'mealplans'
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Clock size={20} />
                <span className="font-semibold">Meal Plans</span>
              </button>
            )}

            <button
              onClick={() => handleTabChange('analytics')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'analytics'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={20} />
              <span className="font-semibold">Analytics</span>
            </button>

            <button
              onClick={() => handleTabChange('addons')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'addons'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Plus size={20} />
              <span className="font-semibold">Add-ons</span>
            </button>

            <button
              onClick={() => handleTabChange('payouts')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'payouts'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DollarSign size={20} />
              <span className="font-semibold">Payouts</span>
            </button>

            <button
              onClick={() => handleTabChange('profile')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'profile'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Users size={20} />
              <span className="font-semibold">Profile</span>
            </button>

            <button
              onClick={() => handleTabChange('settings')}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                activeTab === 'settings'
                  ? 'bg-red-50 text-red-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Settings size={20} />
              <span className="font-semibold">Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 min-w-0 w-full max-w-full overflow-x-hidden p-4 sm:p-6 transition-[margin] duration-200 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
          {/* Stats Cards — orders tab only so menu/forms have room on mobile */}
          {activeTab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Total Orders</span>
                <Package className="text-blue-500" size={24} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
              <p className="text-sm text-gray-500 mt-1">All time</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Pending Orders</span>
                <Clock className="text-yellow-500" size={24} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingOrders}</p>
              <p className="text-sm text-gray-500 mt-1">Awaiting response</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Completed Today</span>
                <CheckCircle className="text-green-500" size={24} />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.completedToday}</p>
              <p className="text-sm text-gray-500 mt-1">Orders delivered</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Revenue</span>
                <TrendingUp className="text-purple-500" size={24} />
              </div>
              <p className="text-3xl font-bold text-gray-900">₦{stats.revenue.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">Total earnings</p>
            </div>
          </div>
          )}

          {/* Tab Content */}
          {activeTab === 'orders' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Management</h2>
              {mealPlansEnabled && <VendorScheduledLegs vendorId={vendorId} />}
              <VendorDashboardAlerts vendorId={vendorId} />
            </div>
          )}

          {activeTab === 'mealplans' && mealPlansEnabled && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">CheapChop Meal Plans</h2>
              <VendorMealPlans vendorId={vendorId} />
            </div>
          )}

          {activeTab === 'menu' && (
            <VendorProductManagerV2 vendorId={vendorId} />
          )}

          {activeTab === 'categories' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Categories Management</h2>
              <VendorCategoriesManager vendorId={vendorId} />
            </div>
          )}

          {activeTab === 'combos' && (
            <VendorComboManager 
              vendorId={vendorId} 
              vendorName={vendor?.name || 'Your Restaurant'} 
            />
          )}

          {activeTab === 'addons' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Add-ons Management</h2>
              <VendorAddons vendorId={vendorId} />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Analytics & Reports</h2>
              <div className="text-center py-12">
                <BarChart3 size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Analytics dashboard coming soon!</p>
                <p className="text-sm text-gray-500 mt-2">
                  Track your sales, customer insights, and performance metrics.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && (
            <VendorWalletPanel />
          )}

          {activeTab === 'profile' && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Vendor Profile</h2>
              
              <div className="space-y-6">
                {/* Business Information */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏪 Business Information</h3>
                  {/* Business Logo */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Business Logo
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {vendor?.imageUrl ? (
                          <img src={vendor.imageUrl} alt="Business Logo" className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200" />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center">
                            <Store size={24} className="text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <VendorImageCaptureInput
                          onImageSelected={processImageFile}
                          disabled={uploadingImage}
                        />
                        <p className="text-sm text-gray-600 mt-2">Use camera or gallery (max 5MB, square logo recommended)</p>
                      </div>
                    </div>
                  </div>


                  
                  {/* Business Name */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Business Name
                    </label>
                    {editingBusinessName ? (
                      <div className="flex items-center space-x-3">
                        <input
                          type="text"
                          value={newBusinessName}
                          onChange={(e) => setNewBusinessName(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter business name"
                          maxLength={50}
                          autoFocus
                        />
                        <button
                          onClick={handleBusinessNameUpdate}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingBusinessName(false);
                            setNewBusinessName('');
                          }}
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900 text-lg">
                            {vendor?.businessName || 'Business Name Not Set'}
                          </span>
                          <p className="text-sm text-gray-500 mt-1">
                            This is how your business appears to customers
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setEditingBusinessName(true);
                            setNewBusinessName(vendor?.businessName || '');
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          Edit Business Name
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Other Profile Fields - Read Only for now */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{vendor?.email || 'Not set'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{vendor?.phone || 'Not set'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{vendor?.name || 'Not set'}</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <span className="text-gray-900">{vendor?.address || 'Not set'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Note:</strong> Only business name can be edited here. To update other profile information, please contact support or visit the full vendor settings page.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Vendor Settings</h2>
              
              <div className="space-y-6">
                {/* Business Availability */}
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🕐 Business Availability</h3>
                  
                  {/* Temporary Closure Toggle */}
                  <div className="mb-6 pb-6 border-b border-red-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-semibold text-gray-900">Temporarily Closed</label>
                        <p className="text-xs text-gray-600 mt-1">
                          Turn this on to stop accepting orders temporarily
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const newStatus = !vendor.isTemporarilyClosed;
                            await updateVendorProfile(vendorId, {
                              isTemporarilyClosed: newStatus
                            });
                            setVendor(prev => ({ ...prev, isTemporarilyClosed: newStatus }));
                            toast.success(newStatus ? 'Business temporarily closed' : 'Business reopened');
                          } catch (error) {
                            console.error('Error toggling closure:', error);
                            toast.error('Failed to update status');
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                          vendor.isTemporarilyClosed ? 'bg-red-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            vendor.isTemporarilyClosed ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    {vendor.isTemporarilyClosed && (
                      <div className="mt-3 bg-red-100 border border-red-300 rounded-lg p-3">
                        <p className="text-sm text-red-800 font-semibold">
                          ⚠️ Your business is currently closed. Customers cannot place orders.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Operating Hours */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Operating Hours</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Open Time</label>
                        <input
                          type="time"
                          value={vendor.availableHours?.start || '08:00'}
                          onChange={(e) => {
                            const newHours = { ...vendor.availableHours, start: e.target.value };
                            setVendor(prev => ({ ...prev, availableHours: newHours }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Close Time</label>
                        <input
                          type="time"
                          value={vendor.availableHours?.end || '22:00'}
                          onChange={(e) => {
                            const newHours = { ...vendor.availableHours, end: e.target.value };
                            setVendor(prev => ({ ...prev, availableHours: newHours }));
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operating Days */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Operating Days</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const currentDays = vendor.availableDays || [];
                            const newDays = currentDays.includes(day)
                              ? currentDays.filter(d => d !== day)
                              : [...currentDays, day];
                            setVendor(prev => ({ ...prev, availableDays: newDays }));
                          }}
                          className={`px-3 py-2 rounded-lg font-medium text-sm transition ${
                            (vendor.availableDays || []).includes(day)
                              ? 'bg-red-500 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={async () => {
                      try {
                        await updateVendorProfile(vendorId, {
                          availableDays: vendor.availableDays,
                          availableHours: vendor.availableHours
                        });
                        toast.success('Availability updated successfully');
                      } catch (error) {
                        console.error('Error updating availability:', error);
                        toast.error('Failed to update availability');
                      }
                    }}
                    className="w-full bg-red-500 text-white py-3 rounded-lg font-semibold hover:bg-red-600 transition"
                  >
                    Save Availability Settings
                  </button>
                </div>

                {/* Business Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Business Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                      <input
                        type="text"
                        value={vendor.name}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={vendor.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={vendor.phone}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                      <input
                        type="text"
                        value={vendor.type}
                        disabled
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Address</label>
                  <textarea
                    value={vendor.address}
                    disabled
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={vendor.description || 'No description provided'}
                    disabled
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <VendorBankDetailsForm
                    vendorId={vendorId}
                    initialDetails={vendor?.bankDetails}
                    onSaved={(details) => setVendor((prev) => ({ ...prev, bankDetails: details }))}
                  />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <VendorPasswordForm accountEmail={vendor?.email} />
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    To update your business information, please contact{' '}
                    <a href="mailto:support@go7.com" className="text-red-500 hover:text-red-600 font-semibold">
                      support@go7.com
                    </a>
                  </p>
                </div>
              </div>
              
              {/* Navigation Tabs */}
              <div className="mt-6 border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveView('overview')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeView === 'overview'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Package className="h-4 w-4 inline mr-2" />
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveView('analytics')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeView === 'analytics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 inline mr-2" />
                    Analytics
                  </button>
                  <button
                    onClick={() => setActiveView('products')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeView === 'products'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <TrendingUp className="h-4 w-4 inline mr-2" />
                    Products
                  </button>
                  <button
                    onClick={() => setActiveView('settings')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeView === 'settings'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Settings className="h-4 w-4 inline mr-2" />
                    Settings
                  </button>
                </nav>
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Addon Modal */}
      {showAddonModal && (
        <VendorAddonsModal
          vendorId={vendorId}
          editingAddon={editingAddon}
          onClose={() => {
            setShowAddonModal(false);
            setEditingAddon(null);
          }}
          onAddonAdded={() => {
            setShowAddonModal(false);
            setEditingAddon(null);
            // Real-time listener will update the list automatically
          }}
        />
      )}
    </div>
  );
}


