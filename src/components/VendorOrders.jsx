import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { FaEye, FaMapMarkerAlt, FaClock, FaPhone, FaFilter, FaSearch } from 'react-icons/fa';
import Swal from 'sweetalert2';
import VendorNavigation from './VendorNavigation';

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const navigate = useNavigate();

  // Mock vendor ID - in production, get from auth context
  const vendorId = 'vendor_123';

  const statusOptions = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready for Pickup' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  useEffect(() => {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('vendorId', '==', vendorId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      const ordersData = [];
      snapshot.forEach((doc) => {
        ordersData.push({ id: doc.id, ...doc.data() });
      });
      setOrders(ordersData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer?.phone?.includes(searchTerm)
      );
    }

    setFilteredOrders(filtered);
  }, [orders, statusFilter, searchTerm]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'preparing': return 'bg-yellow-100 text-yellow-800';
      case 'ready': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-purple-100 text-purple-800';
      case 'in_transit': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'preparing': return '👨‍🍳';
      case 'ready': return '✅';
      case 'picked_up': return '🚚';
      case 'in_transit': return '🛵';
      case 'delivered': return '📦';
      case 'cancelled': return '❌';
      default: return '⏳';
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderSnap = await getDoc(orderRef);
      const priorOrder = orderSnap.exists() ? orderSnap.data() : {};

      await updateDoc(orderRef, {
        status: newStatus,
        orderStatus: newStatus,
        updatedAt: new Date()
      });

      if (newStatus === 'delivered') {
        const { creditVendorIfOrderCompleted } = await import('../services/vendorWalletService');
        await creditVendorIfOrderCompleted(orderId, {
          ...priorOrder,
          status: 'delivered',
          orderStatus: 'delivered',
        });
      }

      Swal.fire({
        title: 'Status Updated!',
        text: `Order status changed to ${newStatus.replace('_', ' ')}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      Swal.fire({
        title: 'Error',
        text: 'Failed to update order status',
        icon: 'error',
        confirmButtonColor: '#dc2626'
      });
    }
  };

  const handleStatusChange = (orderId, currentStatus, newStatus) => {
    Swal.fire({
      title: 'Update Order Status',
      text: `Change status from "${currentStatus.replace('_', ' ')}" to "${newStatus.replace('_', ' ')}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Update Status'
    }).then((result) => {
      if (result.isConfirmed) {
        updateOrderStatus(orderId, newStatus);
      }
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp.toDate()).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDeliveryAddress = (address) => {
    if (!address) return 'No address provided';
    return `${address.street || ''} ${address.city || ''} ${address.state || ''}`.trim();
  };

  const trackDelivery = (orderId) => {
    navigate(`/track-delivery/${orderId}`);
  };

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
              <h1 className="text-3xl font-bold text-gray-900">Orders Management</h1>
              <p className="text-gray-600 mt-1">
                Track and manage all orders from your customers
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <span className="text-sm text-gray-500">
                Total Orders: {orders.length}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by Order ID, Customer Name, or Phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <FaFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Orders from customers will appear here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            #{order.id.slice(-8).toUpperCase()}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.items?.length || 0} item(s)
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.customer?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1">
                            <FaPhone className="w-3 h-3" />
                            <span>{order.customer?.phone || 'No phone'}</span>
                          </div>
                          <div className="text-sm text-gray-500 flex items-center space-x-1 mt-1">
                            <FaMapMarkerAlt className="w-3 h-3" />
                            <span className="truncate max-w-xs">
                              {formatDeliveryAddress(order.deliveryAddress)}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {getStatusIcon(order.status)}
                          </span>
                          <div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status?.replace('_', ' ').toUpperCase()}
                            </span>
                            {order.estimatedDelivery && (
                              <div className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                                <FaClock className="w-3 h-3" />
                                <span>ETA: {formatTime(order.estimatedDelivery)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₦{order.total?.toLocaleString() || '0'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.paymentMethod || 'Unknown'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatTime(order.createdAt)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {/* Status Update Dropdown */}
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <select
                              value={order.status}
                              onChange={(e) => handleStatusChange(order.id, order.status, e.target.value)}
                              className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                            >
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready</option>
                              <option value="picked_up">Picked Up</option>
                              <option value="in_transit">In Transit</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          )}

                          {/* Track Delivery Button */}
                          <button
                            onClick={() => trackDelivery(order.id)}
                            className="text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
                          >
                            <FaEye className="w-4 h-4" />
                            <span>Track</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorOrders;