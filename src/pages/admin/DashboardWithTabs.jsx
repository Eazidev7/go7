import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, Typography, Tabs, Tab, Box, Badge } from '@mui/material';
import { collection, getDocs, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getScheduledDeliveries, getGroupedScheduledDeliveries, getScheduledDeliveriesWithTimeFilter } from '../../services/enhancedDeliveryService';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { formatCurrency } from '../../utils/format';
import GoBuyFleetAdmin from '../../components/admin/GoBuyFleetAdmin';
import CategoryManagement from './CategoryManagement';

// TabPanel component for Material-UI Tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [scheduledDeliveries, setScheduledDeliveries] = useState([]);
  const [readyDeliveries, setReadyDeliveries] = useState([]);
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [groupedScheduledDeliveries, setGroupedScheduledDeliveries] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    canceledOrders: 0,
    totalRevenue: 0
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

  // Fetch dashboard data including scheduled deliveries
  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || !isAdmin) return;

      try {
        // Get all orders for stats
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const orders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate stats
        const totalOrders = orders.length;
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const completedOrders = orders.filter(order => order.status === 'completed').length;
        const canceledOrders = orders.filter(order => order.status === 'canceled').length;
        const totalRevenue = orders
          .filter(order => order.status === 'completed')
          .reduce((sum, order) => sum + (order.total || 0), 0);

        setStats({
          totalOrders,
          pendingOrders,
          completedOrders,
          canceledOrders,
          totalRevenue
        });

        // Get recent orders
        const recentOrdersQuery = query(
          collection(db, 'orders'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
        const recentOrdersData = recentOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate()
        }));
        setRecentOrders(recentOrdersData);

        // Get scheduled deliveries
        const scheduledDeliveriesData = await getScheduledDeliveries();
        setScheduledDeliveries(scheduledDeliveriesData);

        // Get grouped scheduled deliveries
        const groupedData = await getGroupedScheduledDeliveries();
        setGroupedScheduledDeliveries(groupedData);

        // Get scheduled deliveries with time filtering
        const { scheduled, readyForAssignment } = await getScheduledDeliveriesWithTimeFilter();
        setScheduledDeliveries(scheduled);
        setReadyDeliveries(readyForAssignment);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    }

    fetchDashboardData();
  }, [user, isAdmin]);

  // Subscribe to active deliveries
  useEffect(() => {
    if (!user || !isAdmin) return;

    const activeQuery = query(
      collection(db, 'deliveries'),
      where('status', 'in', ['assigned', 'picked_up', 'in_transit', 'enroute']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      activeQuery, 
      (snapshot) => {
        const deliveries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
        pickupTime: doc.data().pickupTime?.toDate()
      }));
      setActiveDeliveries(deliveries);
      console.log('📦 Active deliveries updated:', deliveries);
    },
    (error) => {
      // Handle Firebase index errors gracefully
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.warn('⚠️ Firebase index required for active deliveries. Dashboard will work with limited functionality.');
        setActiveDeliveries([]);
      } else {
        console.error('Error subscribing to active deliveries:', error);
      }
    }
    );

    return () => unsubscribe();
  }, [user, isAdmin]);

  // Refresh scheduled deliveries every minute
  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchScheduledDeliveries = async () => {
      try {
        const { scheduled, readyForAssignment } = await getScheduledDeliveriesWithTimeFilter();
        setScheduledDeliveries(scheduled);
        setReadyDeliveries(readyForAssignment);
      } catch (error) {
        console.error('Error fetching scheduled deliveries:', error);
      }
    };

    const interval = setInterval(fetchScheduledDeliveries, 60000);
    return () => clearInterval(interval);
  }, [user, isAdmin]);

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Format pickup time
  const formatPickupTime = (pickupTime) => {
    if (!pickupTime) return 'Not scheduled';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(pickupTime);
  };

  // Get delivery status display
  const getDeliveryStatus = (delivery) => {
    switch (delivery.status) {
      case 'scheduled':
      case 'delivery_scheduled':
        return 'Scheduled';
      case 'assigned':
        return 'Assigned';
      case 'picked_up':
        return 'Picked Up';
      case 'in_transit':
        return 'In Transit';
      case 'enroute':
        return 'En Route';
      case 'delivered':
        return 'Delivered';
      case 'pending':
        return 'Pending';
      default:
        return delivery.status;
    }
  };

  // Format address
  const formatAddress = (address) => {
    if (!address) return 'Address not set';
    return address.length > 50 ? address.substring(0, 50) + '...' : address;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Monitor and manage GO7 deliveries and operations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Orders</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pending</h3>
            <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Completed</h3>
            <p className="text-3xl font-bold text-green-600">{stats.completedOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Canceled</h3>
            <p className="text-3xl font-bold text-red-600">{stats.canceledOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Revenue</h3>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
          </div>
        </div>

        {/* Tabbed Delivery Interface */}
        <Card className="mb-8">
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="admin delivery tabs">
              <Tab
                label={
                  <Badge badgeContent={scheduledDeliveries.length} color="primary">
                    Scheduled Deliveries
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={readyDeliveries.length} color="warning">
                    Ready for Pickup
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={activeDeliveries.length} color="secondary">
                    Active Deliveries
                  </Badge>
                }
              />
              <Tab
                label={
                  <Badge badgeContent={groupedScheduledDeliveries.length} color="info">
                    Vendor Batches
                  </Badge>
                }
              />
              <Tab
                label="🛍️ GoBuy Fleet"
              />
              <Tab
                label="📂 Categories"
              />
            </Tabs>
          </Box>

          {/* Scheduled Deliveries Tab */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" className="mb-4">
              Scheduled Deliveries (Pickup Time &gt; 20 minutes)
            </Typography>
            {scheduledDeliveries.length === 0 ? (
              <Typography color="textSecondary">
                No scheduled deliveries at this time.
              </Typography>
            ) : (
              <div className="space-y-3">
                {scheduledDeliveries.map((delivery) => (
                  <Card key={delivery.id} variant="outlined">
                    <CardContent>
                      <div className="flex justify-between items-start">
                        <div>
                          <Typography variant="h6">
                            Delivery #{delivery.id.slice(-6)}
                          </Typography>
                          <Typography color="textSecondary">
                            Customer: {delivery.customerName || 'Unknown'}
                          </Typography>
                          <Typography color="textSecondary">
                            From: {formatAddress(delivery.pickup?.address || delivery.pickupAddress)}
                          </Typography>
                          <Typography color="textSecondary">
                            To: {formatAddress(delivery.dropoff?.address || delivery.deliveryAddress)}
                          </Typography>
                          <Typography color="primary" className="mt-2">
                            📅 Pickup: {formatPickupTime(delivery.pickupTime)}
                          </Typography>
                          {delivery.riderId && (
                            <Typography color="success.main" className="mt-1">
                              👨‍🚴 Rider: {delivery.riderName || delivery.riderId}
                            </Typography>
                          )}
                        </div>
                        <div className="text-right">
                          <Typography variant="h6">
                            {formatCurrency(delivery.totalPrice || delivery.deliveryFee || 0)}
                          </Typography>
                          <Typography
                            color="primary"
                            className="px-2 py-1 bg-blue-100 rounded text-sm"
                          >
                            {getDeliveryStatus(delivery)}
                          </Typography>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabPanel>

          {/* Ready for Pickup Tab */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" className="mb-4">
              Ready for Pickup (Within 20 minutes of pickup time)
            </Typography>
            {readyDeliveries.length === 0 ? (
              <Typography color="textSecondary">
                No deliveries ready for pickup at this time.
              </Typography>
            ) : (
              <div className="space-y-3">
                {readyDeliveries.map((delivery) => (
                  <Card key={delivery.id} variant="outlined" className="border-l-4 border-orange-500">
                    <CardContent>
                      <div className="flex justify-between items-start">
                        <div>
                          <Typography variant="h6">
                            Delivery #{delivery.id.slice(-6)}
                          </Typography>
                          <Typography color="textSecondary">
                            Customer: {delivery.customerName || 'Unknown'}
                          </Typography>
                          <Typography color="textSecondary">
                            From: {formatAddress(delivery.pickup?.address || delivery.pickupAddress)}
                          </Typography>
                          <Typography color="textSecondary">
                            To: {formatAddress(delivery.dropoff?.address || delivery.deliveryAddress)}
                          </Typography>
                          <Typography color="warning.main" className="mt-2">
                            🚨 Pickup: {formatPickupTime(delivery.pickupTime)}
                          </Typography>
                          {delivery.riderId ? (
                            <Typography color="success.main" className="mt-1">
                              👨‍🚴 Assigned to: {delivery.riderName || delivery.riderId}
                            </Typography>
                          ) : (
                            <Typography color="error.main" className="mt-1">
                              ⚠️ No rider assigned
                            </Typography>
                          )}
                        </div>
                        <div className="text-right">
                          <Typography variant="h6">
                            {formatCurrency(delivery.totalPrice || delivery.deliveryFee || 0)}
                          </Typography>
                          <Typography
                            color="warning.main"
                            className="px-2 py-1 bg-orange-100 rounded text-sm"
                          >
                            Ready for Pickup
                          </Typography>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabPanel>

          {/* Active Deliveries Tab */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" className="mb-4">
              Active Deliveries (In Progress)
            </Typography>
            {activeDeliveries.length === 0 ? (
              <Typography color="textSecondary">
                No active deliveries at this time.
              </Typography>
            ) : (
              <div className="space-y-3">
                {activeDeliveries.map((delivery) => (
                  <Card key={delivery.id} variant="outlined" className="border-l-4 border-green-500">
                    <CardContent>
                      <div className="flex justify-between items-start">
                        <div>
                          <Typography variant="h6">
                            Delivery #{delivery.id.slice(-6)}
                          </Typography>
                          <Typography color="textSecondary">
                            Customer: {delivery.customerName || 'Unknown'}
                          </Typography>
                          <Typography color="textSecondary">
                            From: {formatAddress(delivery.pickup?.address || delivery.pickupAddress)}
                          </Typography>
                          <Typography color="textSecondary">
                            To: {formatAddress(delivery.dropoff?.address || delivery.deliveryAddress)}
                          </Typography>
                          <Typography color="success.main" className="mt-2">
                            👨‍🚴 Rider: {delivery.riderName || delivery.riderId}
                          </Typography>
                          {delivery.pickupTime && (
                            <Typography color="textSecondary" className="mt-1">
                              🕒 Pickup Time: {formatPickupTime(delivery.pickupTime)}
                            </Typography>
                          )}
                        </div>
                        <div className="text-right">
                          <Typography variant="h6">
                            {formatCurrency(delivery.totalPrice || delivery.deliveryFee || 0)}
                          </Typography>
                          <Typography
                            color="success.main"
                            className="px-2 py-1 bg-green-100 rounded text-sm"
                          >
                            {getDeliveryStatus(delivery)}
                          </Typography>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabPanel>

          {/* Vendor Batches Tab */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" className="mb-4">
              Vendor Batch Deliveries
            </Typography>
            {groupedScheduledDeliveries.length === 0 ? (
              <Typography color="textSecondary">
                No vendor batch deliveries scheduled.
              </Typography>
            ) : (
              <div className="space-y-4">
                {groupedScheduledDeliveries.map((group, index) => (
                  <Card key={index} variant="outlined" className="border-l-4 border-purple-500">
                    <CardContent>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <Typography variant="h6">
                            {group.vendor.name}
                          </Typography>
                          <Typography color="textSecondary">
                            📍 {formatAddress(group.vendor.address)}
                          </Typography>
                          <Typography color="primary" className="mt-2">
                            📅 Pickup: {formatPickupTime(group.pickupTime)}
                          </Typography>
                        </div>
                        <div className="text-right">
                          <Typography variant="h6">
                            {group.totalOrders} orders
                          </Typography>
                          <Typography color="textSecondary">
                            {formatCurrency(group.totalAmount)}
                          </Typography>
                        </div>
                      </div>

                      <div className="mt-3">
                        <Typography variant="subtitle2" className="mb-2">
                          Delivery Details:
                        </Typography>
                        <div className="grid gap-2">
                          {group.deliveries.slice(0, 3).map((delivery) => (
                            <div key={delivery.id} className="flex justify-between text-sm">
                              <span>#{delivery.id.slice(-6)} → {formatAddress(delivery.deliveryAddress)}</span>
                              <span>{formatCurrency(delivery.totalAmount || 0)}</span>
                            </div>
                          ))}
                          {group.deliveries.length > 3 && (
                            <div className="text-sm text-gray-500">
                              ... and {group.deliveries.length - 3} more deliveries
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabPanel>

          {/* GoBuy Fleet Management Tab */}
          <TabPanel value={tabValue} index={4}>
            <GoBuyFleetAdmin />
          </TabPanel>

          {/* Category Management Tab */}
          <TabPanel value={tabValue} index={5}>
            <CategoryManagement />
          </TabPanel>
        </Card>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Orders</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{order.id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.customerName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'canceled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.total || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.createdAt ? order.createdAt.toLocaleDateString() : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link to={`/admin/orders/${order.id}`} className="text-orange-600 hover:text-orange-900">
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to="/admin/orders" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Orders</h3>
            <p className="text-gray-600">View and manage all customer orders</p>
          </Link>
          <Link to="/admin/vendors" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Vendors</h3>
            <p className="text-gray-600">Add, edit, and manage restaurant vendors</p>
          </Link>
          <Link to="/admin/analytics" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600">View detailed reports and analytics</p>
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AdminDashboard;