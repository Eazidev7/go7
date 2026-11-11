/**
 * 🏪 VENDOR DASHBOARD - Order Alerts & Status Management
 * Shows real-time alerts when vendor comes online
 */

import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateVendorStatus, subscribeToVendorStatus } from '../services/vendorOfflineService';
import { Bell, CheckCircle, XCircle, Clock, AlertCircle, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

export default function VendorDashboardAlerts({ vendorId }) {
  const [alerts, setAlerts] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [queuedOrdersCount, setQueuedOrdersCount] = useState(0);

  // Subscribe to vendor online status
  useEffect(() => {
    if (!vendorId) return;

    const unsubscribe = subscribeToVendorStatus(vendorId, (status) => {
      setIsOnline(status.isOnline);
      console.log('📡 Vendor status updated:', status);
    });

    return () => unsubscribe();
  }, [vendorId]);

  // Listen for alerts
  useEffect(() => {
    if (!vendorId) return;

    const alertsRef = collection(db, 'vendors', vendorId, 'alerts');
    const q = query(alertsRef, where('read', '==', false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setAlerts(alertsList);

      // Show toast for new alerts
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const alert = change.doc.data();
          toast.success(alert.message, {
            duration: 5000,
            icon: '🔔'
          });
        }
      });
    });

    return () => unsubscribe();
  }, [vendorId]);

  // Count queued orders
  useEffect(() => {
    if (!vendorId) return;

    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef,
      where('vendorId', '==', vendorId),
      where('orderStatus', '==', 'queued_vendor_offline')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setQueuedOrdersCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [vendorId]);

  // Toggle online status
  const handleToggleOnline = async () => {
    try {
      await updateVendorStatus(vendorId, !isOnline);
      toast.success(isOnline ? 'You are now offline' : 'You are now online!');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Accept order
  const handleAcceptOrder = async (alertId, orderId) => {
    try {
      // Update order status
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        orderStatus: 'accepted',
        acceptedAt: new Date().toISOString()
      });

      // Mark alert as read
      const alertRef = doc(db, 'vendors', vendorId, 'alerts', alertId);
      await updateDoc(alertRef, {
        read: true,
        action: 'accepted',
        actionAt: new Date().toISOString()
      });

      toast.success('Order accepted!');
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  // Reject order
  const handleRejectOrder = async (alertId, orderId) => {
    try {
      // Update order status
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        orderStatus: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectionReason: 'Vendor rejected'
      });

      // Mark alert as read
      const alertRef = doc(db, 'vendors', vendorId, 'alerts', alertId);
      await updateDoc(alertRef, {
        read: true,
        action: 'rejected',
        actionAt: new Date().toISOString()
      });

      toast.success('Order rejected');
    } catch (error) {
      toast.error('Failed to reject order');
    }
  };

  return (
    <div className="vendor-dashboard-alerts">
      {/* Online Status Toggle */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {isOnline ? 'You are Online' : 'You are Offline'}
              </h3>
              <p className="text-sm text-gray-600">
                {isOnline ? 'Receiving orders' : 'Not receiving orders'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition ${
              isOnline
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            <Power size={20} />
            <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
          </button>
        </div>

        {queuedOrdersCount > 0 && !isOnline && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <Clock size={20} />
              <span className="font-semibold">
                {queuedOrdersCount} order{queuedOrdersCount > 1 ? 's' : ''} waiting in queue
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Go online to start processing queued orders
            </p>
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
            <Bell size={20} />
            <span>New Order Alerts</span>
          </h3>
          {alerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No new alerts</p>
            <p className="text-sm text-gray-500 mt-1">
              {isOnline ? 'Waiting for new orders...' : 'Go online to receive orders'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  className="border border-gray-200 rounded-xl p-4 hover:border-red-300 transition"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        Order #{alert.orderId?.slice(-6)}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.customerName}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {alert.itemCount} item{alert.itemCount > 1 ? 's' : ''} • ₦{alert.orderTotal?.toLocaleString()}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-red-500">
                        ₦{alert.orderTotal?.toLocaleString()}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(alert.createdAt?.toDate()).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {alert.actionRequired && (
                    <div className="flex items-center space-x-3 mt-4">
                      <button
                        onClick={() => handleAcceptOrder(alert.id, alert.orderId)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold flex items-center justify-center space-x-2 transition"
                      >
                        <CheckCircle size={18} />
                        <span>Accept</span>
                      </button>

                      <button
                        onClick={() => handleRejectOrder(alert.id, alert.orderId)}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold flex items-center justify-center space-x-2 transition"
                      >
                        <XCircle size={18} />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
