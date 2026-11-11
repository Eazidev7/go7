import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { FaDollarSign, FaClock, FaCalendarAlt, FaArrowUp, FaDownload, FaEye } from 'react-icons/fa';
import VendorNavigation from './VendorNavigation';

const Earnings = () => {
  // Vendor earnings dashboard component
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('7days');
  const [earnings, setEarnings] = useState({
    total: 0,
    pending: 0,
    last7Days: 0,
    last30Days: 0,
    today: 0
  });

  // Mock vendor ID - in production, get from auth context
  const vendorId = 'vendor_123';

  const periodOptions = [
    { value: '7days', label: 'Last 7 Days' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '3months', label: 'Last 3 Months' },
    { value: 'all', label: 'All Time' }
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
      calculateEarnings(ordersData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const calculateEarnings = (ordersData) => {
    const now = new Date();
    const today = now.toDateString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let totalEarnings = 0;
    let pendingEarnings = 0;
    let todayEarnings = 0;
    let last7DaysEarnings = 0;
    let last30DaysEarnings = 0;

    ordersData.forEach((order) => {
      const orderDate = order.createdAt?.toDate();
      const orderAmount = order.total || 0;

      // Calculate based on order status and date
      if (order.status === 'delivered') {
        totalEarnings += orderAmount;

        if (orderDate && orderDate.toDateString() === today) {
          todayEarnings += orderAmount;
        }

        if (orderDate && orderDate >= sevenDaysAgo) {
          last7DaysEarnings += orderAmount;
        }

        if (orderDate && orderDate >= thirtyDaysAgo) {
          last30DaysEarnings += orderAmount;
        }
      } else if (['preparing', 'ready', 'picked_up', 'in_transit'].includes(order.status)) {
        pendingEarnings += orderAmount;
      }
    });

    setEarnings({
      total: totalEarnings,
      pending: pendingEarnings,
      today: todayEarnings,
      last7Days: last7DaysEarnings,
      last30Days: last30DaysEarnings
    });
  };

  const getFilteredOrders = () => {
    const now = new Date();
    let cutoffDate;

    switch (selectedPeriod) {
      case '7days':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30days':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return orders.filter(order => order.status === 'delivered');
    }

    return orders.filter(order => {
      const orderDate = order.createdAt?.toDate();
      return order.status === 'delivered' && orderDate && orderDate >= cutoffDate;
    });
  };

  const generateEarningsReport = () => {
    const filteredOrders = getFilteredOrders();
    const reportData = {
      period: periodOptions.find(p => p.value === selectedPeriod)?.label,
      totalOrders: filteredOrders.length,
      totalEarnings: filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0),
      averageOrderValue: filteredOrders.length > 0 
        ? filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0) / filteredOrders.length 
        : 0,
      orders: filteredOrders
    };

    // In a real app, you'd generate and download a PDF or CSV
    console.log('Earnings Report:', reportData);
    alert(`Report generated for ${reportData.period}\nTotal Orders: ${reportData.totalOrders}\nTotal Earnings: ₦${reportData.totalEarnings.toLocaleString()}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp.toDate()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    return new Date(timestamp.toDate()).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    );
  }

  const filteredOrders = getFilteredOrders();

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />
      <div className="md:ml-64 p-4 pb-20 md:pb-4">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Earnings Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Track your revenue and financial performance
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <button
                onClick={generateEarningsReport}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 transition-colors"
              >
                <FaDownload className="w-4 h-4" />
                <span>Download Report</span>
              </button>
            </div>
          </div>
        </div>

        {/* Earnings Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <FaDollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-gray-900">₦{earnings.total.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <FaClock className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
                <p className="text-2xl font-bold text-gray-900">₦{earnings.pending.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <FaCalendarAlt className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                <p className="text-2xl font-bold text-gray-900">₦{earnings.today.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <FaArrowUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Last 7 Days</p>
                <p className="text-2xl font-bold text-gray-900">₦{earnings.last7Days.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Period Filter and Detailed Earnings */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <h2 className="text-xl font-semibold text-gray-900">Earnings History</h2>
              <div className="flex items-center space-x-3 mt-4 md:mt-0">
                <label className="text-sm font-medium text-gray-700">Period:</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  {periodOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Earnings Found</h3>
                <p className="text-gray-500">
                  No delivered orders found for the selected period
                </p>
              </div>
            ) : (
              <>
                {/* Summary for selected period */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{filteredOrders.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₦{filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Average Order Value</p>
                      <p className="text-2xl font-bold text-blue-600">
                        ₦{filteredOrders.length > 0 
                          ? Math.round(filteredOrders.reduce((sum, order) => sum + (order.total || 0), 0) / filteredOrders.length).toLocaleString()
                          : '0'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Order ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Method
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
                            <div className="text-sm font-medium text-gray-900">
                              #{order.id.slice(-8).toUpperCase()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {order.customer?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.customer?.phone || 'No phone'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(order.createdAt)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {formatTime(order.createdAt)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-green-600">
                              ₦{order.total?.toLocaleString() || '0'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.items?.length || 0} item(s)
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {order.paymentMethod || 'Cash'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {order.paymentStatus || 'Completed'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-red-600 hover:text-red-700 font-medium flex items-center space-x-1">
                              <FaEye className="w-4 h-4" />
                              <span>Details</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Earnings;