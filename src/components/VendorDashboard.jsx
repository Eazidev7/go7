import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, doc, getDoc, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaPlus, FaTruck, FaEye, FaDollarSign, FaShoppingBag, FaClock, FaMapMarkerAlt, FaCog } from 'react-icons/fa';
import VendorAddonsModal from './VendorAddonsModal';
import VendorAddonsList from './VendorAddonsList';
import VendorNavigation from './VendorNavigation';
import VendorPhoneVerification from './VendorPhoneVerification';
import { FirestoreVendorHelpers } from '../utils/firestoreVendorHelpers';
import { getVendorData } from '../services/vendorAuthService';
import { VendorVerificationStatus, VerificationBlocker } from '../utils/vendorVerificationGuard';

const VendorDashboard = () => {
  const [vendorData, setVendorData] = useState(null);
  const [totalOrders, setTotalOrders] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [needsPhoneVerification, setNeedsPhoneVerification] = useState(false);
  const navigate = useNavigate();

  // Mock vendor ID - in production, get from auth context
  const vendorId = 'vendor_123';

  useEffect(() => {
    fetchVendorData();
    setupOrderListeners();
    setupAddonListener();
    
    // Fallback timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Loading timeout reached, showing dashboard anyway');
      setLoading(false);
    }, 3000); // 3 second timeout
    
    return () => clearTimeout(timeout);
  }, []);

  const setupAddonListener = () => {
    try {
      return FirestoreVendorHelpers.setupAddonsListener(vendorId, (addons) => {
        setAddons(addons);
        console.log('✅ Real-time addons updated:', addons.length);
      });
    } catch (error) {
      console.error('❌ Error setting up addon listener:', error);
      return () => {}; // Return no-op unsubscribe function
    }
  };

  const fetchVendorData = async () => {
    try {
      if (!db) {
        // Use mock vendor data if Firebase not configured
        setVendorData({
          businessName: 'Sample Restaurant',
          email: 'vendor@go7.com',
          phone: '+234 123 456 7890',
          phoneVerified: false, // Mock as unverified to test verification flow
          phoneVerificationRequired: true,
          mustVerifyPhone: true,
          canReceiveOrders: false,
          accountStatus: 'pending_phone_verification',
          registrationComplete: false
        });
        return;
      }
      
      const vendorDoc = await getDoc(doc(db, 'vendors', vendorId));
      if (vendorDoc.exists()) {
        const data = vendorDoc.data();
        setVendorData(data);
        
        // Check if phone verification is needed (MANDATORY)
        if (!data.phoneVerified || data.accountStatus === 'pending_phone_verification' || !data.registrationComplete) {
          setNeedsPhoneVerification(true);
          setShowPhoneVerification(true);
          console.log('🔒 Vendor needs phone verification:', {
            phoneVerified: data.phoneVerified,
            accountStatus: data.accountStatus,
            registrationComplete: data.registrationComplete
          });
        }
      }
    } catch (error) {
      console.error('Error fetching vendor data:', error);
      // Fallback to mock data
      setVendorData({
        businessName: 'Sample Restaurant',
        email: 'vendor@go7.com',
        phone: '+234 123 456 7890',
        phoneVerified: false,
        phoneVerificationRequired: true,
        mustVerifyPhone: true,
        canReceiveOrders: false,
        accountStatus: 'pending_phone_verification',
        registrationComplete: false
      });
    }
  };

  const setMockData = () => {
    // Mock data for demonstration
    const mockOrders = [
      {
        id: 'order_001',
        customer: { name: 'John Doe', phone: '+234 901 234 5678' },
        status: 'preparing',
        total: 2500,
        createdAt: { toDate: () => new Date() },
        items: [{ name: 'Burger', quantity: 2 }]
      },
      {
        id: 'order_002',
        customer: { name: 'Jane Smith', phone: '+234 902 345 6789' },
        status: 'delivered',
        total: 1800,
        createdAt: { toDate: () => new Date(Date.now() - 3600000) },
        items: [{ name: 'Pizza', quantity: 1 }]
      }
    ];

    setTotalOrders(mockOrders.length);
    setTodayEarnings(1800);
    setActiveDeliveries([mockOrders[0]]);
    setRecentOrders(mockOrders);
    setLoading(false);
  };

  const setupOrderListeners = () => {
    // Check if Firebase is configured
    if (!db) {
      console.log('Firebase not configured, using mock data');
      setMockData();
      return;
    }

    try {
      // Listen to orders for this vendor
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
        const orders = [];
        let todayTotal = 0;
        const today = new Date().toDateString();
        const activeDelivs = [];

        snapshot.forEach((doc) => {
          const order = { id: doc.id, ...doc.data() };
          orders.push(order);

          // Calculate today's earnings
          if (order.status === 'delivered' && new Date(order.deliveredAt?.toDate()).toDateString() === today) {
            todayTotal += order.total || 0;
          }

          // Track active deliveries
          if (['preparing', 'ready', 'picked_up', 'in_transit'].includes(order.status)) {
            activeDelivs.push(order);
          }
        });

        setTotalOrders(orders.length);
        setTodayEarnings(todayTotal);
        setActiveDeliveries(activeDelivs.slice(0, 5)); // Show first 5
        setRecentOrders(orders.slice(0, 8)); // Show first 8
        setLoading(false);
      }, (error) => {
        console.error('Error fetching orders:', error);
        // Set loading to false even if there's an error
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up order listeners:', error);
      // Set loading to false if setup fails
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp.toDate()).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Phone verification handlers
  const handlePhoneVerificationSuccess = () => {
    setShowPhoneVerification(false);
    setNeedsPhoneVerification(false);
    // Refresh vendor data to get updated status
    fetchVendorData();
  };

  const handleSkipPhoneVerification = () => {
    setShowPhoneVerification(false);
    // Don't change needsPhoneVerification - keep showing alerts
  };

  // Show phone verification modal if needed
  if (showPhoneVerification && vendorData) {
    return (
      <VendorPhoneVerification
        vendorId={vendorId}
        phoneNumber={vendorData.phone}
        onVerificationSuccess={handlePhoneVerificationSuccess}
        onSkip={handleSkipPhoneVerification}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />
      <div className="md:ml-64 p-4 pb-20 md:pb-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {vendorData?.businessName || 'Vendor'}!
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your products, orders, and track your business performance
              </p>
            </div>
            <div className="flex space-x-3 mt-4 md:mt-0">
              <button
                onClick={() => setShowAddonModal(true)}
                disabled={!vendorData?.canReceiveOrders}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  vendorData?.canReceiveOrders 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!vendorData?.canReceiveOrders ? 'Verify phone number to add addons' : ''}
              >
                <FaPlus className="w-4 h-4" />
                <span>Add Addon</span>
              </button>
              <button
                onClick={() => navigate('/book-delivery')}
                disabled={!vendorData?.canReceiveOrders}
                className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                  vendorData?.canReceiveOrders 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!vendorData?.canReceiveOrders ? 'Verify phone number to book deliveries' : ''}
              >
                <FaTruck className="w-4 h-4" />
                <span>Book Delivery</span>
              </button>
            </div>
          </div>
        </div>

        {/* Phone Verification Alert */}
        {needsPhoneVerification && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">📱</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-medium text-red-800">
                  Phone Verification Required
                </h3>
                <p className="mt-2 text-sm text-red-700">
                  Your vendor account is inactive because your phone number hasn't been verified. 
                  You won't receive orders until verification is complete.
                </p>
                <div className="mt-4">
                  <button
                    onClick={() => setShowPhoneVerification(true)}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Verify Phone Number Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <FaDollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900">₦{todayEarnings.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <FaShoppingBag className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-orange-100">
                <FaTruck className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{activeDeliveries.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <FaClock className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Prep Time</p>
                <p className="text-2xl font-bold text-gray-900">15min</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Active Deliveries */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Active Deliveries</h2>
                <button
                  onClick={() => navigate('/vendor/orders')}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              {activeDeliveries.length === 0 ? (
                <div className="text-center py-8">
                  <FaTruck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active deliveries</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeDeliveries.map((delivery) => (
                    <div key={delivery.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-red-100 rounded-full">
                          <FaMapMarkerAlt className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Order #{delivery.id.slice(-6)}</p>
                          <p className="text-sm text-gray-600">{delivery.customer?.name || 'Customer'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(delivery.status)}`}>
                          {delivery.status?.replace('_', ' ').toUpperCase()}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          ETA: {delivery.estimatedDelivery ? formatTime(delivery.estimatedDelivery) : 'TBD'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
                <button
                  onClick={() => navigate('/vendor/orders')}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="p-6">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FaShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No recent orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                      <div>
                        <p className="font-medium text-gray-900">#{order.id.slice(-6)}</p>
                        <p className="text-sm text-gray-600">{order.customer?.name || 'Customer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">₦{order.total?.toLocaleString() || '0'}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/vendor/orders')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <FaEye className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Orders</span>
            </button>
            <button
              onClick={() => navigate('/vendor/products')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <FaShoppingBag className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Manage Products</span>
            </button>
            <button
              onClick={() => navigate('/vendor/earnings')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <FaDollarSign className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">View Earnings</span>
            </button>
            <button
              onClick={() => navigate('/book-delivery')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <FaTruck className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Book Delivery</span>
            </button>
            <button
              onClick={() => {
                setEditingAddon(null);
                setShowAddonModal(true);
              }}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <FaPlus className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Add-ons</span>
            </button>
            <button
              onClick={() => navigate('/vendor/settings')}
              className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              <FaCog className="w-8 h-8 text-red-600 mb-2" />
              <span className="text-sm font-medium text-gray-900">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vendor Addons Section */}
      <VendorAddonsList 
        vendorId={vendorId}
        addons={addons}
        onEditAddon={(addon) => {
          setEditingAddon(addon);
          setShowAddonModal(true);
        }}
        onAddAddon={() => {
          setEditingAddon(null);
          setShowAddonModal(true);
        }}
      />

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
    </div>
  );
};

export default VendorDashboard;