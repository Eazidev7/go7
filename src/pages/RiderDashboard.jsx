// GO7 Rider Dashboard - Accept and manage deliveries
// Real-time interface for delivery riders

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, Typography, Button, Tabs, Tab, Box, Badge } from '@mui/material';
import { 
  riderAcceptsDelivery, 
  completeDelivery, 
  subscribeToDelivery 
} from '../services/deliveryService';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatCurrency } from '../utils/formatters';
import { getScheduledDeliveriesWithTimeFilter } from '../services/enhancedDeliveryService';
import ChatWindow, { ChatButton } from '../components/ChatWindow';
import SimpleChatUI, { SimpleChatButton } from '../components/SimpleChatUI';
import GO7ChatUI, { GO7ChatButton, useGO7Chat } from '../components/GO7ChatUI';
import EnhancedChatComponent from '../components/chat/EnhancedChatComponent';
import { deliveryStatusService } from '../services/deliveryStatusService';

// TabPanel component for Material-UI Tabs
function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`rider-tabpanel-${index}`}
      aria-labelledby={`rider-tab-${index}`}
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

export default function RiderDashboard() {
  const [riderId] = useState('go7_rider_001'); // In production, get from auth
  const [assignedDeliveries, setAssignedDeliveries] = useState([]);
  const [availableDeliveries, setAvailableDeliveries] = useState([]);
  const [scheduledDeliveries, setScheduledDeliveries] = useState([]);
  const [readyDeliveries, setReadyDeliveries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    earnings: 0
  });
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  
  // Use GO7 Chat hook
  const { 
    isChatOpen: isGO7ChatOpen, 
    selectedDelivery, 
    selectedReceiver, 
    recipientName,
    openChat: openGO7Chat, 
    closeChat: closeGO7Chat 
  } = useGO7Chat();

  // Subscribe to deliveries assigned to this rider
  useEffect(() => {
    const assignedQuery = query(
      collection(db, 'deliveries'),
      where('riderId', '==', riderId),
      where('status', 'in', ['assigned', 'enroute', 'picked_up', 'in_transit']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeAssigned = onSnapshot(assignedQuery, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        pickupTime: doc.data().pickupTime?.toDate()
      }));
      setAssignedDeliveries(deliveries);
      console.log('📦 Assigned deliveries updated:', deliveries);
      
      // Calculate stats
      const completed = deliveries.filter(d => d.status === 'delivered').length;
      const earnings = deliveries
        .filter(d => d.status === 'delivered')
        .reduce((sum, d) => sum + (d.deliveryFee || 0), 0);

      setStats({
        total: deliveries.length,
        completed,
        earnings
      });
    });

    return () => unsubscribeAssigned();
  }, [riderId]);

  // Subscribe to available deliveries (pending status)
  useEffect(() => {
    const availableQuery = query(
      collection(db, 'deliveries'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeAvailable = onSnapshot(availableQuery, (snapshot) => {
      const deliveries = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        pickupTime: doc.data().pickupTime?.toDate()
      }));
      setAvailableDeliveries(deliveries);
      console.log('📦 Available deliveries updated:', deliveries);
    });

    return () => unsubscribeAvailable();
  }, []);

  // Fetch scheduled deliveries with time filtering
  useEffect(() => {
    const fetchScheduledDeliveries = async () => {
      try {
        const { scheduled, readyForAssignment } = await getScheduledDeliveriesWithTimeFilter();
        
        // Filter for this rider or unassigned deliveries
        const riderScheduled = scheduled.filter(d => 
          d.riderId === riderId || !d.riderId
        );
        const riderReady = readyForAssignment.filter(d => 
          d.riderId === riderId || !d.riderId
        );

        setScheduledDeliveries(riderScheduled);
        setReadyDeliveries(riderReady);
        console.log('⏰ Scheduled deliveries updated:', riderScheduled);
        console.log('🚨 Ready deliveries updated:', riderReady);
      } catch (error) {
        console.error('Error fetching scheduled deliveries:', error);
      }
    };

    fetchScheduledDeliveries();
    
    // Refresh every minute to update time-based filtering
    const interval = setInterval(fetchScheduledDeliveries, 60000);
    return () => clearInterval(interval);
  }, [riderId]);

  // Tab change handler
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Get active deliveries (assigned + ready for pickup)
  const getActiveDeliveries = () => {
    return assignedDeliveries.concat(readyDeliveries);
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
        return 'Available';
      default:
        return delivery.status;
    }
  };

  // Chat function
  const handleOpenChat = (deliveryId, delivery) => {
    // Open GO7 Chat with customer details
    openGO7Chat(deliveryId, delivery.customerId, `Customer (${delivery.customerName || 'Unknown'})`);
  };

  const handleAcceptDelivery = async (deliveryId) => {
    setIsLoading(true);
    try {
      await riderAcceptsDelivery(deliveryId, riderId);
      
      // Send status update with chat notification
      await deliveryStatusService.updateDeliveryStatus(
        deliveryId, 
        'picked_up',
        { 
          riderId: riderId,
          message: 'Rider has picked up your order and is on the way!'
        }
      );
      
      console.log('✅ Delivery accepted and status updated:', deliveryId);
      setActiveDelivery(deliveryId);
    } catch (error) {
      console.error('❌ Error accepting delivery:', error);
      alert('Failed to accept delivery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteDelivery = async (deliveryId) => {
    setIsLoading(true);
    try {
      const earnings = 1000; // In production, calculate based on distance/pricing
      await completeDelivery(deliveryId, riderId, earnings);
      
      // Send completion status with chat notification
      await deliveryStatusService.updateDeliveryStatus(
        deliveryId,
        'delivered',
        {
          riderId: riderId,
          completedAt: new Date().toISOString(),
          message: 'Your delivery has been completed successfully!'
        }
      );
      
      console.log('✅ Delivery completed with status update:', deliveryId);
      setActiveDelivery(null);
    } catch (error) {
      console.error('❌ Error completing delivery:', error);
      alert('Failed to complete delivery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (deliveryId, status) => {
    setIsLoading(true);
    try {
      const statusMessages = {
        'picked_up': 'Your order has been picked up! 📦',
        'in_transit': 'Your order is on the way! 🚚',
        'arrived': 'The rider has arrived at your location! 📍',
        'attempted': 'Delivery attempted - please check your phone for rider contact ⚠️'
      };

      const statusEmojis = {
        'picked_up': '📦',
        'in_transit': '🚚', 
        'arrived': '📍',
        'attempted': '⚠️'
      };

      await deliveryStatusService.updateDeliveryStatus(
        deliveryId,
        status,
        {
          riderId: riderId,
          timestamp: new Date().toISOString(),
          message: statusMessages[status] || 'Delivery status updated'
        }
      );

      console.log(`✅ Status updated to ${status} for delivery:`, deliveryId);
      
      // Show success feedback
      const emoji = statusEmojis[status] || '✅';
      alert(`${emoji} Status updated successfully!`);
      
    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced status update functions
  const handleUpdateStatus = async (deliveryId, status, statusData = {}) => {
    try {
      await deliveryStatusService.updateDeliveryStatus(deliveryId, status, {
        riderId: riderId,
        timestamp: new Date().toISOString(),
        ...statusData
      });
      console.log(`✅ Status updated to ${status}:`, deliveryId);
    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const formatAddress = (address) => {
    return address.length > 40 ? address.substring(0, 40) + '...' : address;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <>
      <Helmet>
        <title>GO7 Rider Dashboard</title>
        <meta name="description" content="Manage your GO7 deliveries and earnings" />
      </Helmet>

      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">🚴‍♂️ GO7 Rider Dashboard</h1>
            <p className="text-green-100">
              Rider ID: {riderId} | Status: Available
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Active Deliveries */}
          {assignedDeliveries.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🎯 Your Active Deliveries ({assignedDeliveries.length})
              </h2>
              
              <div className="grid gap-4">
                {assignedDeliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-white rounded-lg shadow-sm border-l-4 border-green-500 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Delivery #{delivery.id.slice(-8)}
                        </h3>
                        <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                          delivery.status === 'assigned' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {delivery.status === 'assigned' ? '🟡 Assigned' : '🟢 En Route'}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          ₦{delivery.totalPrice || delivery.pricing?.total || 'TBD'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Created: {formatTime(delivery.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">📍 Pickup</h4>
                        <p className="text-gray-700">{formatAddress(delivery.pickup?.address || 'Address not set')}</p>
                        <p className="text-sm text-gray-500">
                          Contact: {delivery.pickup?.contactName} ({delivery.pickup?.contactPhone})
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">🎯 Dropoff</h4>
                        <p className="text-gray-700">{formatAddress(delivery.dropoff?.address || 'Address not set')}</p>
                        <p className="text-sm text-gray-500">
                          Contact: {delivery.dropoff?.contactName} ({delivery.dropoff?.contactPhone})
                        </p>
                      </div>
                    </div>
                    
                    {delivery.packageDetails?.description && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-1">📦 Package</h4>
                        <p className="text-gray-700">{delivery.packageDetails.description}</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      {/* Primary Action Buttons */}
                      <div className="flex gap-3">
                        {delivery.status === 'assigned' && (
                          <button
                            onClick={() => handleAcceptDelivery(delivery.id)}
                            disabled={isLoading}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            {isLoading ? '⏳ Starting...' : '🚀 Start Delivery'}
                          </button>
                        )}
                        
                        {delivery.status === 'enroute' && (
                          <button
                            onClick={() => handleCompleteDelivery(delivery.id)}
                            disabled={isLoading}
                            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isLoading ? '⏳ Completing...' : '✅ Mark as Delivered'}
                          </button>
                        )}
                        
                        <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                          📞 Call Customer
                        </button>
                        
                        <GO7ChatButton 
                          deliveryId={delivery.id}
                          receiverId={delivery.customerId}
                          recipientName={`Customer (${delivery.customerName || 'Unknown'})`}
                          onClick={() => handleOpenChat(delivery.id, delivery)}
                        />
                      </div>

                      {/* Status Update Buttons */}
                      {delivery.status === 'enroute' && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleStatusUpdate(delivery.id, 'picked_up')}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
                          >
                            📦 Picked Up
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(delivery.id, 'in_transit')}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
                          >
                            🚚 In Transit
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(delivery.id, 'arrived')}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50"
                          >
                            📍 Arrived at Destination
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(delivery.id, 'attempted')}
                            disabled={isLoading}
                            className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 disabled:opacity-50"
                          >
                            ⚠️ Delivery Attempted
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scheduled Deliveries */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ⏰ Scheduled Deliveries ({scheduledDeliveries.length})
            </h2>
            
            {scheduledDeliveries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500 text-lg">No scheduled deliveries</p>
                <p className="text-gray-400 mt-2">Scheduled deliveries will appear here</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {scheduledDeliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                            SCHEDULED
                          </span>
                          <span className="text-sm text-gray-500">
                            Pickup: {delivery.pickupTime?.toLocaleString() || 'Time not set'}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2">
                          Delivery #{delivery.id.slice(-6)}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">From:</span> {delivery.pickupAddress || delivery.pickup?.address}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">To:</span> {delivery.dropoffAddress || delivery.dropoff?.address}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              <span className="font-medium">Package:</span> {delivery.packageSize} • {delivery.deliveryPriority}
                            </p>
                            <p className="text-gray-600">
                              <span className="font-medium">Customer:</span> {delivery.senderName || delivery.customerName || 'Unknown'}
                            </p>
                          </div>
                        </div>

                        {delivery.description && (
                          <p className="text-gray-600 text-sm mt-2">
                            <span className="font-medium">Description:</span> {delivery.description}
                          </p>
                        )}

                        <div className="mt-4">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                              ⏰ Waiting for pickup time
                            </span>
                            <span className="text-gray-500">
                              {delivery.pickupTime && new Date() < delivery.pickupTime ? 
                                `${Math.ceil((delivery.pickupTime - new Date()) / (1000 * 60 * 60))} hours until pickup` :
                                'Ready for assignment'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Deliveries */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📦 Available Deliveries ({availableDeliveries.length})
            </h2>
            
            {availableDeliveries.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500 text-lg">No deliveries available right now</p>
                <p className="text-gray-400 mt-2">Check back soon for new delivery requests!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableDeliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-white rounded-lg shadow-sm p-6 border">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          New Delivery #{delivery.id.slice(-8)}
                        </h3>
                        <span className="inline-block px-2 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800">
                          🔵 Pending Assignment
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-blue-600">
                          ₦{delivery.totalPrice || delivery.pricing?.total || 'TBD'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Posted: {formatTime(delivery.createdAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">📍 Pickup</h4>
                        <p className="text-gray-700">{formatAddress(delivery.pickup?.address || 'Address not set')}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">🎯 Dropoff</h4>
                        <p className="text-gray-700">{formatAddress(delivery.dropoff?.address || 'Address not set')}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleAcceptDelivery(delivery.id)}
                      disabled={isLoading}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? '⏳ Accepting...' : '✋ Accept This Delivery'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced Real-time Chat */}
      {isGO7ChatOpen && selectedDelivery && selectedReceiver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-3/4 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <h3 className="font-semibold text-gray-800">
                    {recipientName || 'Customer'}
                  </h3>
                  <p className="text-sm text-gray-500">Delivery #{selectedDelivery.slice(-8)}</p>
                </div>
              </div>
              <button
                onClick={closeGO7Chat}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            {/* Enhanced Chat Component */}
            <div className="flex-1">
              <EnhancedChatComponent
                deliveryId={selectedDelivery}
                recipientId={selectedReceiver}
                className="h-full"
                enableTypingIndicator={true}
                enableStatusUpdates={true}
                onMessageSent={() => console.log('✅ Rider sent message')}
                onError={(error) => console.error('❌ Rider chat error:', error)}
                onTyping={(isTyping) => console.log('✍️ Customer typing:', isTyping)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}