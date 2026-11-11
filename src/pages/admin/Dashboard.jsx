import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getScheduledDeliveries, getGroupedScheduledDeliveries } from '../../services/enhancedDeliveryService';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { formatCurrency } from '../../utils/format';

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [scheduledDeliveries, setScheduledDeliveries] = useState([]);
  const [groupedScheduledDeliveries, setGroupedScheduledDeliveries] = useState([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    newCustomersToday: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    monthlyProfit: 0,
    monthlyOrders: 0
  });
  
  // Check if user is authenticated and has admin role
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        // In a real app, you would check a claims token or admin collection
        // This is a simplified example - you should implement proper admin verification
        setIsAdmin(true);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || !isAdmin) return;
      
      try {
        // Get all bookings for stats (changed from 'orders' to 'bookings')
        const bookingsCollection = collection(db, 'bookings');
        const bookingSnapshot = await getDocs(bookingsCollection);
        const bookingsList = bookingSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          };
        });
        
        // Calculate stats
        let totalRevenue = 0;
        let pendingOrders = 0;
        let completedOrders = 0;
        let canceledOrders = 0;
        let monthlyRevenue = 0;
        let monthlyProfit = 0;
        let monthlyOrders = 0;
        let newCustomersToday = 0;

        // Count customers who signed up today
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
          usersSnap.forEach((d) => {
            const u = d.data();
            if (u.role === 'admin' || u.role === 'rider' || u.role === 'vendor') return;
            const c = u.createdAt?.toDate?.() || (u.createdAt ? new Date(u.createdAt) : null);
            if (c && c >= startOfToday) newCustomersToday++;
          });
        } catch (e) {
          console.warn('Could not count new customers:', e.message);
        }
        
        // Get current month's start and end dates
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        bookingsList.forEach(order => {
          const orderDate = order.createdAt;
          const isCurrentMonth = orderDate >= currentMonthStart && orderDate <= currentMonthEnd;
          
          // Sum up revenue from total or fare
          let orderRevenue = 0;
          if (order.total) {
            orderRevenue = parseFloat(order.total);
          } else if (order.fare) {
            orderRevenue = parseFloat(order.fare);
          }
          
          totalRevenue += orderRevenue;
          
          // Calculate monthly revenue and profit
          if (isCurrentMonth) {
            monthlyOrders++;
            monthlyRevenue += orderRevenue;
            
            // Platform profit is the platformFee (30% of delivery fee)
            if (order.platformFee) {
              monthlyProfit += parseFloat(order.platformFee);
            }
          }
          
          // Count by status (orderStatus field in bookings)
          const status = order.orderStatus || order.status;
          if (status === 'completed' || status === 'delivered') {
            completedOrders++;
          } else if (status === 'canceled' || status === 'cancelled') {
            canceledOrders++;
          } else {
            pendingOrders++;
          }
        });
        
        setStats({
          totalOrders: bookingsList.length,
          pendingOrders,
          completedOrders,
          canceledOrders,
          newCustomersToday,
          totalRevenue,
          monthlyRevenue,
          monthlyProfit,
          monthlyOrders
        });
        
        // Get recent bookings
        bookingsList.sort((a, b) => b.createdAt - a.createdAt);
        setRecentOrders(bookingsList.slice(0, 5));

        // Get scheduled deliveries
        const scheduled = await getScheduledDeliveries();
        setScheduledDeliveries(scheduled);
        
        // Get grouped scheduled deliveries
        const groupedScheduled = await getGroupedScheduledDeliveries();
        setGroupedScheduledDeliveries(groupedScheduled);
        
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    }
    
    fetchDashboardData();
  }, [user, isAdmin]);
  
  // Redirect if not admin
  if (!loading && (!user || !isAdmin)) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Admin Dashboard</h1>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Monthly Stats Cards */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                This Month ({new Date().toLocaleString('default', { month: 'long', year: 'numeric' })})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
                  <h3 className="text-blue-100 text-sm font-medium">Monthly Orders</h3>
                  <p className="text-3xl font-bold mt-2">{stats.monthlyOrders}</p>
                  <p className="text-blue-100 text-xs mt-2">Orders this month</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
                  <h3 className="text-green-100 text-sm font-medium">Monthly Sales</h3>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats.monthlyRevenue)}</p>
                  <p className="text-green-100 text-xs mt-2">Total sales this month</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
                  <h3 className="text-purple-100 text-sm font-medium">Monthly Profit</h3>
                  <p className="text-3xl font-bold mt-2">{formatCurrency(stats.monthlyProfit)}</p>
                  <p className="text-purple-100 text-xs mt-2">Platform earnings (30%)</p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
                  <h3 className="text-orange-100 text-sm font-medium">Avg Order Value</h3>
                  <p className="text-3xl font-bold mt-2">
                    {stats.monthlyOrders > 0 
                      ? formatCurrency(stats.monthlyRevenue / stats.monthlyOrders)
                      : formatCurrency(0)
                    }
                  </p>
                  <p className="text-orange-100 text-xs mt-2">Average per order</p>
                </div>
              </div>
            </div>
            
            {/* Overall Stats Cards */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Overall Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-gray-500 text-sm font-medium">Total Orders</h3>
                  <p className="text-3xl font-bold text-gray-800">{stats.totalOrders}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-gray-500 text-sm font-medium">Pending Orders</h3>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-gray-500 text-sm font-medium">Completed Orders</h3>
                  <p className="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
                </div>
                
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                  <p className="text-3xl font-bold text-blue-600">{formatCurrency(stats.totalRevenue)}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-gray-500 text-sm font-medium">New Customers Today</h3>
                  <p className="text-3xl font-bold text-purple-600">{stats.newCustomersToday}</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-gray-500 text-sm font-medium">Failed / Cancelled Orders</h3>
                  <p className="text-3xl font-bold text-red-600">{stats.canceledOrders}</p>
                </div>
              </div>
            </div>
            
            {/* Admin Menu */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">Admin Menu</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  <Link
                    to="/admin/orders"
                    className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg flex items-center transition-colors"
                  >
                    <svg className="h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span className="font-medium">Manage Orders</span>
                  </Link>
                  
                  <Link
                    to="/admin/deliveries"
                    className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg flex items-center transition-colors"
                  >
                    <svg className="h-6 w-6 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span className="font-medium">Manage Deliveries</span>
                  </Link>
                  
                  <Link
                    to="/admin/riders"
                    className="bg-green-50 hover:bg-green-100 p-4 rounded-lg flex items-center transition-colors"
                  >
                    <svg className="h-6 w-6 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="font-medium">Manage Riders</span>
                  </Link>
                  
                  <Link
                    to="/admin/categories"
                    className="bg-orange-50 hover:bg-orange-100 p-4 rounded-lg flex items-center"
                  >
                    <svg className="h-6 w-6 text-orange-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="font-medium">Manage Categories</span>
                  </Link>
                  
                  <Link
                    to="/admin/settings"
                    className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg flex items-center"
                  >
                    <svg className="h-6 w-6 text-purple-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">Settings</span>
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Scheduled Deliveries */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Scheduled Deliveries</h2>
                <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  {scheduledDeliveries.length} scheduled
                </span>
              </div>
              <div className="p-6">
                {scheduledDeliveries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No scheduled deliveries</p>
                ) : (
                  <div className="space-y-4">
                    {scheduledDeliveries.slice(0, 5).map((delivery) => (
                      <div key={delivery.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                SCHEDULED
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                #{delivery.id.slice(-6)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">
                                  <span className="font-medium">Pickup:</span> 
                                  {delivery.pickupTime ? 
                                    delivery.pickupTime.toLocaleString() : 
                                    'Time not set'
                                  }
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Customer:</span> {delivery.senderName || 'Unknown'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  <span className="font-medium">From:</span> {delivery.pickupAddress?.substring(0, 30) || 'N/A'}...
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">To:</span> {delivery.dropoffAddress?.substring(0, 30) || 'N/A'}...
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  <span className="font-medium">Size:</span> {delivery.packageSize}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">Priority:</span> {delivery.deliveryPriority}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <span className={`text-xs px-2 py-1 rounded ${
                                delivery.pickupTime && new Date() >= new Date(delivery.pickupTime.getTime() - 20 * 60 * 1000) ?
                                  'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                                {delivery.pickupTime && new Date() >= new Date(delivery.pickupTime.getTime() - 20 * 60 * 1000) ?
                                  '⚠️ Ready for assignment' :
                                  `⏰ ${Math.ceil((delivery.pickupTime - new Date()) / (1000 * 60 * 60))} hours until pickup`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {scheduledDeliveries.length > 5 && (
                      <div className="text-center pt-4">
                        <Link to="/admin/scheduled" className="text-blue-600 hover:text-blue-800 text-sm">
                          View all {scheduledDeliveries.length} scheduled deliveries
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Grouped Scheduled Deliveries */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Vendor Batch Deliveries</h2>
                <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  {groupedScheduledDeliveries.length} vendor batches
                </span>
              </div>
              <div className="p-6">
                {groupedScheduledDeliveries.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No vendor batch deliveries scheduled</p>
                ) : (
                  <div className="space-y-4">
                    {groupedScheduledDeliveries.slice(0, 3).map((group, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gradient-to-r from-indigo-50 to-blue-50">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                VENDOR BATCH
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {group.vendor.name}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">
                                  <span className="font-medium">📅 Pickup Time:</span> 
                                  <br />
                                  {group.pickupTime.toLocaleString()}
                                </p>
                                <p className="text-gray-600 mt-1">
                                  <span className="font-medium">📞 Vendor Phone:</span> {group.vendor.phone || 'Not provided'}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  <span className="font-medium">📍 Pickup Location:</span> 
                                  <br />
                                  {group.vendor.address?.substring(0, 50) || 'Address not available'}...
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  <span className="font-medium">📦 Total Orders:</span> {group.totalOrders}
                                </p>
                                <p className="text-gray-600">
                                  <span className="font-medium">💰 Total Value:</span> {formatCurrency(group.totalAmount)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-3 flex flex-wrap gap-2">
                              {group.deliveries.slice(0, 3).map(delivery => (
                                <span key={delivery.id} className="text-xs bg-white px-2 py-1 rounded border">
                                  Order #{delivery.orderId?.substring(0, 8) || delivery.id.substring(0, 8)} - {delivery.customerName}
                                </span>
                              ))}
                              {group.deliveries.length > 3 && (
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  +{group.deliveries.length - 3} more orders
                                </span>
                              )}
                            </div>
                            
                            <div className="mt-3">
                              <span className={`text-xs px-2 py-1 rounded ${
                                group.pickupTime && new Date() >= new Date(group.pickupTime.getTime() - 20 * 60 * 1000) ?
                                  'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                              }`}>
                                {group.pickupTime && new Date() >= new Date(group.pickupTime.getTime() - 20 * 60 * 1000) ?
                                  '⚠️ Ready for rider assignment' :
                                  `⏰ ${Math.ceil((group.pickupTime - new Date()) / (1000 * 60 * 60))} hours until pickup`
                                }
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {groupedScheduledDeliveries.length > 3 && (
                      <div className="text-center pt-4">
                        <Link to="/admin/vendor-batches" className="text-indigo-600 hover:text-indigo-800 text-sm">
                          View all {groupedScheduledDeliveries.length} vendor batch deliveries
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">Recent Orders</h2>
                <Link to="/admin/orders" className="text-blue-600 hover:text-blue-800 text-sm">
                  View All
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracking Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentOrders.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      recentOrders.map(order => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600">
                              <Link to={`/admin/orders?id=${order.id}`}>
                                {order.trackingCode}
                              </Link>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.customer?.name || 'Guest'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customer?.email || 'No email'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              order.status === 'COMPLETED' || order.status === 'DELIVERED' 
                                ? 'bg-green-100 text-green-800' 
                                : order.status === 'CANCELED' 
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.payment?.total ? formatCurrency(order.payment.total) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {order.createdAt.toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

export default AdminDashboard;
