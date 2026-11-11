import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { 
  FaUsers, 
  FaMotorcycle, 
  FaDollarSign, 
  FaClipboardList,
  FaEye,
  FaUserPlus,
  FaMapMarkerAlt,
  FaClock,
  FaPhone,
  FaStar,
  FaCheck,
  FaTimes,
  FaChartLine,
  FaStore,
  FaCreditCard
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import 'leaflet/dist/leaflet.css';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [riders, setRiders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [stats, setStats] = useState({
    activeOrders: 0,
    onlineRiders: 0,
    totalEarnings: 0,
    completedToday: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [mapCenter, setMapCenter] = useState([6.5244, 3.3792]); // Lagos coordinates

  // Calculate real-time statistics
  const calculateStats = (ordersData, ridersData) => {
    const activeOrders = ordersData.filter(order => 
      ['preparing', 'ready', 'assigned', 'picked_up', 'in_transit'].includes(order.status)
    ).length;

    const onlineRiders = ridersData.filter(rider => rider.status === 'active').length;

    const today = new Date().toDateString();
    const completedToday = ordersData.filter(order => 
      order.status === 'delivered' && 
      new Date(order.deliveredAt?.toDate ? order.deliveredAt.toDate() : order.deliveredAt).toDateString() === today
    ).length;

    const totalEarnings = ordersData
      .filter(order => order.status === 'delivered')
      .reduce((sum, order) => sum + (order.total || 0), 0);

    setStats({
      activeOrders,
      onlineRiders,
      totalEarnings,
      completedToday
    });
  };

  // Set up real-time listeners
  useEffect(() => {
    if (!db) {
      // Mock data for demo
      const mockOrders = [
        {
          id: 'order_001',
          customer: { name: 'John Doe', phone: '+234 901 234 5678' },
          vendor: { name: 'Pizza Palace', id: 'vendor_001' },
          status: 'preparing',
          total: 2500,
          items: [{ name: 'Margherita Pizza', quantity: 1 }],
          createdAt: { toDate: () => new Date() },
          deliveryAddress: { lat: 6.5244, lng: 3.3792 }
        },
        {
          id: 'order_002',
          customer: { name: 'Sarah Wilson', phone: '+234 902 345 6789' },
          vendor: { name: 'Burger House', id: 'vendor_002' },
          status: 'assigned',
          riderId: 'rider_001',
          total: 1800,
          items: [{ name: 'Classic Burger', quantity: 2 }],
          createdAt: { toDate: () => new Date(Date.now() - 15 * 60000) },
          deliveryAddress: { lat: 6.5055, lng: 3.3897 }
        }
      ];

      const mockRiders = [
        {
          id: 'rider_001',
          name: 'Ahmed Hassan',
          phone: '+234 803 123 4567',
          status: 'active',
          rating: 4.8,
          currentLocation: { lat: 6.5200, lng: 3.3850 },
          totalDeliveries: 45,
          earnings: 15000
        },
        {
          id: 'rider_002',
          name: 'Emmanuel Okafor',
          phone: '+234 805 987 6543',
          status: 'offline',
          rating: 4.6,
          currentLocation: { lat: 6.4900, lng: 3.4100 },
          totalDeliveries: 32,
          earnings: 12000
        }
      ];

      const mockVendors = [
        {
          id: 'vendor_001',
          businessName: 'Pizza Palace',
          email: 'pizza@example.com',
          status: 'active',
          totalOrders: 156,
          earnings: 245000
        },
        {
          id: 'vendor_002',
          businessName: 'Burger House', 
          email: 'burger@example.com',
          status: 'active',
          totalOrders: 98,
          earnings: 180000
        }
      ];

      const mockPayoutRequests = [
        {
          id: 'payout_001',
          vendorId: 'vendor_001',
          vendor: { businessName: 'Pizza Palace' },
          amount: 25000,
          status: 'pending',
          bankDetails: {
            accountName: 'Pizza Palace Ltd',
            accountNumber: '0123456789',
            bankName: 'First Bank Nigeria'
          },
          requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
        },
        {
          id: 'payout_002',
          vendorId: 'vendor_002',
          vendor: { businessName: 'Burger House' },
          amount: 18000,
          status: 'pending',
          bankDetails: {
            accountName: 'Burger House Ltd',
            accountNumber: '9876543210',
            bankName: 'GTBank'
          },
          requestedAt: new Date(Date.now() - 5 * 60 * 60 * 1000)
        }
      ];

      setOrders(mockOrders);
      setRiders(mockRiders);
      setVendors(mockVendors);
      setPayoutRequests(mockPayoutRequests);
      calculateStats(mockOrders, mockRiders);
      setLoading(false);
      return;
    }

    try {
      // Orders listener
      const ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubscribeOrders = onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setOrders(ordersData);
        calculateStats(ordersData, riders);
      });

      // Riders listener
      const ridersQuery = query(collection(db, 'riders'));
      const unsubscribeRiders = onSnapshot(ridersQuery, (snapshot) => {
        const ridersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRiders(ridersData);
        calculateStats(orders, ridersData);
      });

      // Vendors listener
      const vendorsQuery = query(collection(db, 'vendors'));
      const unsubscribeVendors = onSnapshot(vendorsQuery, (snapshot) => {
        const vendorsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setVendors(vendorsData);
      });

      // Payout requests listener
      const payoutsQuery = query(
        collection(db, 'payoutRequests'),
        orderBy('requestedAt', 'desc'),
        limit(50)
      );
      const unsubscribePayouts = onSnapshot(payoutsQuery, (snapshot) => {
        const payoutsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPayoutRequests(payoutsData);
      });

      setLoading(false);

      return () => {
        unsubscribeOrders();
        unsubscribeRiders();
        unsubscribeVendors();
        unsubscribePayouts();
      };
    } catch (error) {
      console.error('Error setting up admin listeners:', error);
      setLoading(false);
    }
  }, []);

  // Assign rider to order
  const assignRider = async (orderId, riderId) => {
    try {
      if (!db) {
        // Mock assignment for demo
        setOrders(prev => 
          prev.map(order => 
            order.id === orderId 
              ? { ...order, status: 'assigned', riderId, assignedAt: new Date() }
              : order
          )
        );

        Swal.fire({
          title: 'Rider Assigned!',
          text: 'Order has been assigned to the selected rider.',
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
        return;
      }

      await updateDoc(doc(db, 'orders', orderId), {
        status: 'assigned',
        riderId: riderId,
        assignedAt: new Date()
      });

      Swal.fire({
        title: 'Rider Assigned!',
        text: 'Order has been assigned to the selected rider.',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error assigning rider:', error);
      Swal.fire({
        title: 'Assignment Failed',
        text: 'Could not assign rider to order.',
        icon: 'error'
      });
    }
  };

  // Show rider selection modal
  const showRiderSelection = (order) => {
    const availableRiders = riders.filter(rider => rider.status === 'active');
    
    if (availableRiders.length === 0) {
      Swal.fire({
        title: 'No Available Riders',
        text: 'There are no active riders available for assignment.',
        icon: 'warning'
      });
      return;
    }

    const riderOptions = availableRiders.reduce((acc, rider) => {
      acc[rider.id] = `${rider.name} (${rider.rating}⭐ - ${rider.totalDeliveries || 0} deliveries)`;
      return acc;
    }, {});

    Swal.fire({
      title: 'Select Rider',
      text: `Assign rider to Order #${order.id.slice(-6)}`,
      input: 'select',
      inputOptions: riderOptions,
      inputPlaceholder: 'Choose a rider',
      showCancelButton: true,
      confirmButtonText: 'Assign Rider',
      confirmButtonColor: '#dc2626'
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        assignRider(order.id, result.value);
      }
    });
  };

  // Approve payout request
  const approvePayout = async (payoutRequest) => {
    try {
      if (!db) {
        // Mock approval for demo
        setPayoutRequests(prev => 
          prev.map(payout => 
            payout.id === payoutRequest.id 
              ? { ...payout, status: 'paid', processedAt: new Date() }
              : payout
          )
        );

        Swal.fire({
          title: 'Payout Approved!',
          text: `₦${payoutRequest.amount.toLocaleString()} has been approved for payment.`,
          icon: 'success',
          timer: 3000,
          showConfirmButton: false
        });
        return;
      }

      // Update payout request status
      await updateDoc(doc(db, 'payoutRequests', payoutRequest.id), {
        status: 'paid',
        processedAt: new Date(),
        processedBy: 'admin', // Would be current admin user
        notes: 'Approved by admin'
      });

      // Update vendor totals
      const vendorRef = doc(db, 'vendors', payoutRequest.vendorId);
      const vendorDoc = await getDoc(vendorRef);
      
      if (vendorDoc.exists()) {
        const vendorData = vendorDoc.data();
        await updateDoc(vendorRef, {
          totalWithdrawn: (vendorData.totalWithdrawn || 0) + payoutRequest.amount,
          pendingPayouts: (vendorData.pendingPayouts || 0) - payoutRequest.amount
        });
      }

      Swal.fire({
        title: 'Payout Approved!',
        text: `₦${payoutRequest.amount.toLocaleString()} has been approved for payment.`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error approving payout:', error);
      Swal.fire({
        title: 'Approval Failed',
        text: 'Could not approve payout request.',
        icon: 'error'
      });
    }
  };

  // Reject payout request
  const rejectPayout = async (payoutRequest) => {
    const result = await Swal.fire({
      title: 'Reject Payout?',
      text: 'This will reject the payout request and return funds to vendor balance.',
      input: 'textarea',
      inputPlaceholder: 'Reason for rejection (optional)',
      showCancelButton: true,
      confirmButtonText: 'Reject Payout',
      confirmButtonColor: '#dc2626'
    });

    if (result.isConfirmed) {
      try {
        if (!db) {
          // Mock rejection for demo
          setPayoutRequests(prev => 
            prev.map(payout => 
              payout.id === payoutRequest.id 
                ? { ...payout, status: 'rejected', processedAt: new Date(), notes: result.value || 'Rejected by admin' }
                : payout
            )
          );

          Swal.fire({
            title: 'Payout Rejected',
            text: 'The payout request has been rejected.',
            icon: 'info',
            timer: 3000,
            showConfirmButton: false
          });
          return;
        }

        // Update payout request status
        await updateDoc(doc(db, 'payoutRequests', payoutRequest.id), {
          status: 'rejected',
          processedAt: new Date(),
          processedBy: 'admin',
          notes: result.value || 'Rejected by admin'
        });

        // Return funds to vendor available balance
        const vendorRef = doc(db, 'vendors', payoutRequest.vendorId);
        const vendorDoc = await getDoc(vendorRef);
        
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          await updateDoc(vendorRef, {
            availableBalance: (vendorData.availableBalance || 0) + payoutRequest.amount,
            pendingPayouts: (vendorData.pendingPayouts || 0) - payoutRequest.amount
          });
        }

        Swal.fire({
          title: 'Payout Rejected',
          text: 'The payout request has been rejected and funds returned to vendor.',
          icon: 'info',
          timer: 3000,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error rejecting payout:', error);
        Swal.fire({
          title: 'Rejection Failed',
          text: 'Could not reject payout request.',
          icon: 'error'
        });
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'picked_up': return 'bg-orange-100 text-orange-800';
      case 'in_transit': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-emerald-100 text-emerald-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiderStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-gray-100 text-gray-800';
      case 'delivering': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Go7 Admin Control Panel</h1>
              <p className="text-gray-600">Real-time operations management</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">G7</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaClipboardList className="text-red-600 text-xl mr-2" />
              <span className="text-2xl font-bold text-gray-900">{stats.activeOrders}</span>
            </div>
            <p className="text-sm text-gray-600">Active Orders</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaMotorcycle className="text-green-600 text-xl mr-2" />
              <span className="text-2xl font-bold text-gray-900">{stats.onlineRiders}</span>
            </div>
            <p className="text-sm text-gray-600">Online Riders</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaDollarSign className="text-blue-600 text-xl mr-2" />
              <span className="text-2xl font-bold text-gray-900">₦{stats.totalEarnings.toLocaleString()}</span>
            </div>
            <p className="text-sm text-gray-600">Total Earnings</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <FaCheck className="text-emerald-600 text-xl mr-2" />
              <span className="text-2xl font-bold text-gray-900">{stats.completedToday}</span>
            </div>
            <p className="text-sm text-gray-600">Completed Today</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex space-x-8">
          {[
            { id: 'orders', label: 'Orders', icon: FaClipboardList },
            { id: 'riders', label: 'Riders', icon: FaMotorcycle },
            { id: 'vendors', label: 'Vendors', icon: FaStore },
            { id: 'payments', label: 'Payments', icon: FaCreditCard }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {activeTab === 'orders' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Orders List */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Orders</h2>
              {orders.map((order) => (
                <div key={order.id} className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Order #{order.id.slice(-6).toUpperCase()}
                      </h3>
                      <p className="text-gray-600">{order.customer?.name}</p>
                      <p className="text-sm text-gray-500">
                        <FaClock className="inline mr-1" />
                        {formatTime(order.createdAt)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <p className="text-sm"><strong>Vendor:</strong> {order.vendor?.name}</p>
                    <p className="text-sm"><strong>Total:</strong> ₦{order.total?.toLocaleString()}</p>
                    {order.riderId && (
                      <p className="text-sm">
                        <strong>Rider:</strong> {riders.find(r => r.id === order.riderId)?.name || 'Unknown'}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    {!order.riderId && order.status === 'ready' && (
                      <button
                        onClick={() => showRiderSelection(order)}
                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center transition-colors"
                      >
                        <FaUserPlus className="mr-2" />
                        Assign Rider
                      </button>
                    )}
                    <button
                      onClick={() => window.open(`/live-tracking/${order.id}`, '_blank')}
                      className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center transition-colors"
                    >
                      <FaEye className="mr-2" />
                      View Live Map
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Live Map */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Live Rider Locations</h2>
                <p className="text-gray-600">Real-time tracking of all active riders</p>
              </div>
              <div className="h-96">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=YOUR_MAPTILER_KEY"
                    attribution='© MapTiler © OpenStreetMap contributors'
                  />
                  
                  {riders.map((rider) => (
                    rider.currentLocation && (
                      <Marker 
                        key={rider.id}
                        position={[rider.currentLocation.lat, rider.currentLocation.lng]}
                      >
                        <Popup>
                          <div className="text-center">
                            <strong>{rider.name}</strong><br />
                            Status: <span className={getRiderStatusColor(rider.status).replace('bg-', '').replace('text-', '')}>
                              {rider.status}
                            </span><br />
                            Rating: {rider.rating}⭐<br />
                            Phone: {rider.phone}
                          </div>
                        </Popup>
                      </Marker>
                    )
                  ))}
                </MapContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'riders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <h2 className="col-span-full text-xl font-semibold text-gray-900 mb-4">Rider Management</h2>
            {riders.map((rider) => (
              <div key={rider.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{rider.name}</h3>
                    <p className="text-gray-600 flex items-center">
                      <FaPhone className="mr-1" />
                      {rider.phone}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiderStatusColor(rider.status)}`}>
                    {rider.status.toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm flex items-center">
                    <FaStar className="mr-2 text-yellow-500" />
                    Rating: {rider.rating}/5.0
                  </p>
                  <p className="text-sm">Total Deliveries: {rider.totalDeliveries || 0}</p>
                  <p className="text-sm">Earnings: ₦{(rider.earnings || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'vendors' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <h2 className="col-span-full text-xl font-semibold text-gray-900 mb-4">Vendor Management</h2>
            {vendors.map((vendor) => (
              <div key={vendor.id} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{vendor.businessName}</h3>
                    <p className="text-gray-600">{vendor.email}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {vendor.status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm">Total Orders: {vendor.totalOrders || 0}</p>
                  <p className="text-sm">Earnings: ₦{(vendor.earnings || 0).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Payout Management</h2>
              <div className="flex space-x-4 text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                  <span>Approved</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
                  <span>Rejected</span>
                </div>
              </div>
            </div>

            {payoutRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <FaCreditCard className="h-24 w-24 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">No Payout Requests</h3>
                <p className="text-gray-500 mt-2">Vendor payout requests will appear here for approval.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vendor
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Bank Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Requested
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payoutRequests.map((payout) => (
                        <tr key={payout.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {payout.vendor?.businessName || 'Unknown Vendor'}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {payout.vendorId}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900">
                              ₦{payout.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>{payout.bankDetails?.accountName}</div>
                              <div className="text-gray-500">{payout.bankDetails?.bankName}</div>
                              <div className="text-gray-500">{payout.bankDetails?.accountNumber}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payout.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : payout.status === 'paid'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {payout.status === 'pending' && <FaClock className="mr-1" />}
                              {payout.status === 'paid' && <FaCheck className="mr-1" />}
                              {payout.status === 'rejected' && <FaTimes className="mr-1" />}
                              {payout.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatTime(payout.requestedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {payout.status === 'pending' ? (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => approvePayout(payout)}
                                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors flex items-center"
                                >
                                  <FaCheck className="mr-1" />
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectPayout(payout)}
                                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors flex items-center"
                                >
                                  <FaTimes className="mr-1" />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-500">
                                <FaEye className="mr-1" />
                                {payout.status === 'paid' ? 'Completed' : 'Rejected'}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payout Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <FaClock className="text-yellow-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                    <p className="text-lg font-bold text-gray-900">
                      {payoutRequests.filter(p => p.status === 'pending').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <FaCheck className="text-green-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Approved Today</p>
                    <p className="text-lg font-bold text-gray-900">
                      {payoutRequests.filter(p => p.status === 'paid').length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FaDollarSign className="text-blue-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-lg font-bold text-gray-900">
                      ₦{payoutRequests.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <FaTimes className="text-red-600 text-xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Rejected</p>
                    <p className="text-lg font-bold text-gray-900">
                      {payoutRequests.filter(p => p.status === 'rejected').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;