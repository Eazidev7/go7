/**
 * 🏪 ENHANCED VENDOR DASHBOARD V2
 * 
 * Updated vendor dashboard with:
 * - Integrated analytics dashboard
 * - V2 product system migration
 * - Enhanced UI with tabs
 * - Real-time performance metrics
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import VendorDashboardAlerts from '../components/VendorDashboardAlerts';
import VendorAnalyticsDashboard from '../components/VendorAnalyticsDashboard';
import VendorProductManagerV2 from '../components/VendorProductManagerV2';
import VendorAddonsV2 from '../components/VendorAddonsV2';
import { FirestoreVendorHelpers } from '../utils/firestoreVendorHelpers';
import { updateVendorProfile } from '../services/vendorAuthService';
import { 
  Store, Package, DollarSign, Settings, LogOut, 
  TrendingUp, Users, Clock, CheckCircle,
  Menu as MenuIcon, X, BarChart3, Plus,
  Activity, AlertTriangle, Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function VendorDashboardV2() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [addons, setAddons] = useState([]);
  const [showAddonModal, setShowAddonModal] = useState(false);
  const [editingAddon, setEditingAddon] = useState(null);
  const [v2MigrationStatus, setV2MigrationStatus] = useState('checking');
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    revenue: 0
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fetch vendor data
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ User not authenticated');
      toast.error('Please log in to continue');
      navigate('/vendor/login');
      return;
    }

    // Verify the vendorId matches the authenticated user
    if (vendorId && vendorId !== currentUser.uid) {
      console.error('❌ Vendor ID mismatch:', { urlId: vendorId, authId: currentUser.uid });
      navigate(`/vendor/dashboard/${currentUser.uid}`);
      return;
    }

    const actualVendorId = vendorId || currentUser.uid;

    const fetchVendorData = async () => {
      try {
        const vendorRef = doc(db, 'vendors', actualVendorId);
        const vendorSnap = await getDoc(vendorRef);
        
        if (vendorSnap.exists()) {
          const vendorData = vendorSnap.data();
          setVendor({ id: actualVendorId, ...vendorData });
          
          // Check V2 migration status
          const migrationStatus = vendorData.productSystemVersion || 'v1';
          setV2MigrationStatus(migrationStatus === 'v2' ? 'completed' : 'pending');
          
        } else {
          toast.error('Vendor profile not found. Please complete registration.');
          navigate('/vendor/register');
        }
      } catch (error) {
        console.error('Error fetching vendor data:', error);
        toast.error('Failed to load vendor data');
      } finally {
        setLoading(false);
      }
    };

    fetchVendorData();
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
        ['pending_vendor', 'queued_vendor_offline', 'pending', 'pending_payment'].includes(o.status || o.orderStatus)
      ).length;

      const completedToday = orders.filter(o => {
        const orderDate = o.createdAt?.toDate();
        const isCompleted = ['delivered', 'completed', 'confirmed'].includes(o.status || o.orderStatus);
        return isCompleted && orderDate >= today;
      }).length;

      const totalRevenue = orders
        .filter(o => {
          const status = o.status || o.orderStatus;
          const paymentStatus = o.paymentStatus;
          return ['accepted', 'delivered', 'completed', 'confirmed'].includes(status) && 
                 paymentStatus === 'paid';
        })
        .reduce((sum, o) => sum + (o.totalAmount || o.totalCost || o.total || 0), 0);

      setStats({
        totalOrders: orders.length,
        pendingOrders: pending,
        completedToday: completedToday,
        revenue: totalRevenue
      });
    });

    return () => unsubscribe();
  }, [vendorId]);

  // Run V2 Migration
  const runV2Migration = async () => {
    if (!vendorId) return;

    try {
      toast.loading('Starting V2 migration...', { id: 'migration' });
      
      // Update vendor profile to mark as V2
      await updateDoc(doc(db, 'vendors', vendorId), {
        productSystemVersion: 'v2',
        lastMigration: new Date(),
        features: {
          v2Products: true,
          advancedAnalytics: true,
          advancedAddons: true,
          measurementTypes: true,
          categoryManagement: true,
          seoOptimization: true
        }
      });
      
      setV2MigrationStatus('completed');
      toast.success('V2 migration completed successfully!', { id: 'migration' });
      
      // Set active tab to analytics to show new features
      setActiveTab('analytics');
      
    } catch (error) {
      console.error('Migration failed:', error);
      toast.error('Migration failed. Please try again.', { id: 'migration' });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/vendor/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
              >
                {sidebarOpen ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
              </button>
              <div className="ml-4 flex items-center">
                <Store className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">
                    {vendor?.name || 'Vendor Dashboard'}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Enhanced Analytics & Management
                  </p>
                </div>
              </div>
            </div>

            {/* V2 Status & Actions */}
            <div className="flex items-center space-x-4">
              {v2MigrationStatus === 'pending' && (
                <button
                  onClick={runV2Migration}
                  className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to V2
                </button>
              )}
              
              {v2MigrationStatus === 'completed' && (
                <div className="flex items-center px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  V2 System
                </div>
              )}

              <button
                onClick={handleSignOut}
                className="flex items-center px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* V2 Migration Banner */}
        {v2MigrationStatus === 'pending' && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center">
                <Activity className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    🚀 Upgrade to V2 System Available
                  </h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Get enhanced analytics, better product management, advanced reporting, and improved performance
                  </p>
                  <div className="mt-3 flex items-center text-xs text-blue-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span className="mr-4">Advanced Analytics Dashboard</span>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span className="mr-4">Enhanced Product Management</span>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    <span>Real-time Performance Metrics</span>
                  </div>
                </div>
              </div>
              <button
                onClick={runV2Migration}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Overview
              </button>
              
              {v2MigrationStatus === 'completed' && (
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BarChart3 className="h-4 w-4 inline mr-2" />
                  Analytics
                  <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                    New
                  </span>
                </button>
              )}
              
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orders'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="h-4 w-4 inline mr-2" />
                Orders
                {stats.pendingOrders > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                    {stats.pendingOrders}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => setActiveTab('products')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'products'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Package className="h-4 w-4 inline mr-2" />
                Products
              </button>
              
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Settings className="h-4 w-4 inline mr-2" />
                Settings
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-green-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-900">Total Revenue</p>
                        <p className="text-2xl font-bold text-green-900">₦{stats.revenue.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <Package className="h-8 w-8 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-900">Total Orders</p>
                        <p className="text-2xl font-bold text-blue-900">{stats.totalOrders}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-orange-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-orange-900">Pending Orders</p>
                        <p className="text-2xl font-bold text-orange-900">{stats.pendingOrders}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 p-6 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-purple-900">Completed Today</p>
                        <p className="text-2xl font-bold text-purple-900">{stats.completedToday}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Alerts */}
                <VendorDashboardAlerts vendorId={vendorId} />

                {/* Recent Orders Summary */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">All Time Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">₦{stats.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Avg Order Value</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ₦{stats.totalOrders > 0 ? Math.round(stats.revenue / stats.totalOrders).toLocaleString() : '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Today's Orders</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.completedToday}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && v2MigrationStatus === 'completed' && (
              <VendorAnalyticsDashboard 
                vendorId={vendorId} 
                vendorName={vendor?.name}
              />
            )}

            {activeTab === 'analytics' && v2MigrationStatus === 'pending' && (
              <div className="text-center py-12">
                <AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics Requires V2 Upgrade</h3>
                <p className="text-gray-600 mb-4">
                  Upgrade to the V2 system to access advanced analytics and reporting features.
                </p>
                <button
                  onClick={runV2Migration}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Zap className="h-4 w-4 inline mr-2" />
                  Upgrade to V2 Now
                </button>
              </div>
            )}

            {activeTab === 'orders' && (
              <VendorDashboardAlerts vendorId={vendorId} />
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Product Management</h3>
                  <button
                    onClick={() => navigate('/vendor/products')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 inline mr-2" />
                    Add Product
                  </button>
                </div>
                
                {v2MigrationStatus === 'completed' ? (
                  <VendorProductManagerV2 vendorId={vendorId} />
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">Enhanced product management available after V2 upgrade</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Vendor Settings</h3>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-600">Settings panel will be available here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}