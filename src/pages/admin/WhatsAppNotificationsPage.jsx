/**
 * 📊 WHATSAPP NOTIFICATIONS DASHBOARD
 * Admin panel to view and manage WhatsApp notification logs
 * Date: October 23, 2025
 */

import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Helmet } from 'react-helmet-async';
import { RefreshCw, Search, Filter, CheckCircle, XCircle, AlertCircle, Phone, Package, Truck, CheckSquare } from 'lucide-react';
import Swal from 'sweetalert2';

const WhatsAppNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    messageType: '',
    orderId: '',
    recipientType: ''
  });
  const [timeRange, setTimeRange] = useState('24h');

  const functions = getFunctions();

  // Load notifications and stats
  const loadData = async () => {
    try {
      setRefreshing(true);

      // Get notifications
      const getNotifications = httpsCallable(functions, 'getWhatsAppNotifications');
      const notifResult = await getNotifications({
        limit: 50,
        status: filters.status || null,
        messageType: filters.messageType || null,
        orderId: filters.orderId || null,
        recipientType: filters.recipientType || null
      });

      setNotifications(notifResult.data.notifications || []);

      // Get stats
      const getStats = httpsCallable(functions, 'getNotificationStats');
      const statsResult = await getStats({ timeRange });

      setStats(statsResult.data.stats || null);

    } catch (error) {
      console.error('Error loading notifications:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to load notifications',
        confirmButtonColor: '#e61e25'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters, timeRange]);

  // Trigger manual auto-retry for all failed notifications
  const handleAutoRetry = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Trigger Auto-Retry?',
      text: 'This will retry all failed notifications with retryCount < 3.',
      showCancelButton: true,
      confirmButtonText: 'Start Auto-Retry',
      confirmButtonColor: '#e61e25',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Processing...',
          text: 'Retrying failed notifications',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const triggerAutoRetry = httpsCallable(functions, 'triggerAutoRetryWhatsApp');
        const retryResult = await triggerAutoRetry();

        Swal.fire({
          icon: 'success',
          title: 'Auto-Retry Complete!',
          html: `
            <p>${retryResult.data.message}</p>
            <div class="mt-4 text-left">
              <p><strong>Processed:</strong> ${retryResult.data.processed}</p>
              <p><strong>Successes:</strong> ${retryResult.data.successes}</p>
              <p><strong>Failures:</strong> ${retryResult.data.failures}</p>
            </div>
          `,
          confirmButtonColor: '#e61e25'
        });

        loadData(); // Refresh data
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to trigger auto-retry',
          confirmButtonColor: '#e61e25'
        });
      }
    }
  };

  // Retry failed notification
  const handleRetry = async (notificationId) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Retry Notification?',
      text: 'This will attempt to resend the WhatsApp message.',
      showCancelButton: true,
      confirmButtonText: 'Retry',
      confirmButtonColor: '#e61e25',
      cancelButtonColor: '#6b7280'
    });

    if (result.isConfirmed) {
      try {
        const retryNotification = httpsCallable(functions, 'retryFailedNotification');
        const retryResult = await retryNotification({ notificationId });

        if (retryResult.data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Notification resent successfully',
            confirmButtonColor: '#e61e25'
          });
          loadData(); // Refresh data
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Retry Failed',
            text: retryResult.data.message,
            confirmButtonColor: '#e61e25'
          });
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to retry notification',
          confirmButtonColor: '#e61e25'
        });
      }
    }
  };

  // Get status icon and color
  const getStatusBadge = (status) => {
    const styles = {
      SENT: { icon: CheckCircle, color: 'bg-green-100 text-green-800', text: 'Sent' },
      FAILED: { icon: XCircle, color: 'bg-red-100 text-red-800', text: 'Failed' },
      RETRIED: { icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800', text: 'Retried' }
    };

    const style = styles[status] || styles.SENT;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${style.color}`}>
        <Icon size={16} />
        {style.text}
      </span>
    );
  };

  // Get message type icon
  const getMessageTypeIcon = (type) => {
    const icons = {
      CONFIRMED: <Package size={20} className="text-blue-600" />,
      OUT_FOR_DELIVERY: <Truck size={20} className="text-orange-600" />,
      DELIVERED: <CheckSquare size={20} className="text-green-600" />,
      VENDOR_NEW_ORDER: <Package size={20} className="text-red-600" />
    };

    return icons[type] || <Phone size={20} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin text-red-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>WhatsApp Notifications - Go7 Admin</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📱 WhatsApp Notifications</h1>
              <p className="text-gray-600 mt-1">Track and manage delivery notifications</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleAutoRetry}
                className="flex items-center gap-2 bg-yellow-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-yellow-700 transition-colors"
              >
                <RefreshCw size={20} />
                Auto-Retry All
              </button>
              <button
                onClick={loadData}
                disabled={refreshing}
                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Statistics Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 font-semibold">Total Sent</h3>
                  <CheckCircle size={24} className="text-green-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">{stats.sent}</p>
                <p className="text-sm text-gray-500 mt-1">Last {timeRange}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 font-semibold">Failed</h3>
                  <XCircle size={24} className="text-red-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">{stats.failed}</p>
                <p className="text-sm text-gray-500 mt-1">Last {timeRange}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 font-semibold">Retried</h3>
                  <AlertCircle size={24} className="text-yellow-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">{stats.retried}</p>
                <p className="text-sm text-gray-500 mt-1">Last {timeRange}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-600 font-semibold">Success Rate</h3>
                  <CheckSquare size={24} className="text-blue-600" />
                </div>
                <p className="text-4xl font-bold text-gray-900">{stats.successRate}%</p>
                <p className="text-sm text-gray-500 mt-1">Last {timeRange}</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border-2 border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={20} className="text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900">Filters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Audience</label>
                <select
                  value={filters.recipientType}
                  onChange={(e) => setFilters({ ...filters, recipientType: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                >
                  <option value="">All</option>
                  <option value="vendor">Vendor</option>
                  <option value="customer">Customer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                  <option value="RETRIED">Retried</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message Type</label>
                <select
                  value={filters.messageType}
                  onChange={(e) => setFilters({ ...filters, messageType: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="VENDOR_NEW_ORDER">Vendor New Order</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                  <option value="DELIVERED">Delivered</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Order ID</label>
                <input
                  type="text"
                  value={filters.orderId}
                  onChange={(e) => setFilters({ ...filters, orderId: e.target.value })}
                  placeholder="Search by order ID"
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Time Range</label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none"
                >
                  <option value="1h">Last Hour</option>
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-gray-100">
            <div className="px-6 py-4 border-b-2 border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                Notification Log ({notifications.length})
              </h3>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Phone size={64} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">No notifications found</p>
                <p className="text-gray-500 text-sm mt-2">Adjust your filters or wait for new orders</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-100">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Order ID</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Attempt</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Time</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {notifications.map((notif) => (
                      <tr key={notif.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {notif.orderId?.slice(-6) || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{notif.customerName || 'Unknown'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{notif.formattedPhone || notif.customerPhone}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {getMessageTypeIcon(notif.messageType)}
                            <span className="text-sm text-gray-700">{notif.messageType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(notif.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {notif.attempt}/{notif.maxAttempts}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {notif.timestamp ? new Date(notif.timestamp).toLocaleString() : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {notif.status === 'FAILED' && (
                            <button
                              onClick={() => handleRetry(notif.id)}
                              className="text-red-600 hover:text-red-800 font-semibold text-sm"
                            >
                              Retry
                            </button>
                          )}
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
    </>
  );
};

export default WhatsAppNotificationsPage;
