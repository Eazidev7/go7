// GO7 Rider Dashboard with Scheduled Deliveries Tabs
// Enhanced interface with time-based delivery organization

import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, Typography, Button, Tabs, Tab, Box, Badge } from '@mui/material';
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
import { 
  riderAcceptsDelivery, 
  completeDelivery 
} from '../services/deliveryService';
import { deliveryStatusService } from '../services/deliveryStatusService';
import GO7ChatUI, { GO7ChatButton, useGO7Chat } from '../components/GO7ChatUI';
import EnhancedChatComponent from '../components/chat/EnhancedChatComponent';

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
  const [tabValue, setTabValue] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    earnings: 0
  });
  
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
      
      // Calculate stats from all rider deliveries
      const allDeliveriesQuery = query(
        collection(db, 'deliveries'),
        where('riderId', '==', riderId)
      );
      
      const unsubscribeStats = onSnapshot(allDeliveriesQuery, (snapshot) => {
        const allDeliveries = snapshot.docs.map(doc => doc.data());
        const completed = allDeliveries.filter(d => d.status === 'delivered').length;
        const earnings = allDeliveries
          .filter(d => d.status === 'delivered')
          .reduce((sum, d) => sum + (d.deliveryFee || 0), 0);

        setStats({
          total: allDeliveries.length,
          completed,
          earnings
        });
      });

      return () => unsubscribeStats();
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

  // Format address
  const formatAddress = (address) => {
    if (!address) return 'Address not set';
    return address.length > 40 ? address.substring(0, 40) + '...' : address;
  };

  // Chat function
  const handleOpenChat = (deliveryId, delivery) => {
    openGO7Chat(deliveryId, delivery.customerId, `Customer (${delivery.customerName || 'Unknown'})`);
  };

  // Accept delivery
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
    } catch (error) {
      console.error('❌ Error accepting delivery:', error);
      alert('Failed to accept delivery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete delivery
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
          message: 'Your order has been delivered successfully!'
        }
      );
      
      console.log('✅ Delivery completed:', deliveryId);
    } catch (error) {
      console.error('❌ Error completing delivery:', error);
      alert('Failed to complete delivery. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Deliveries
                </Typography>
                <Typography variant="h5">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Completed
                </Typography>
                <Typography variant="h5">
                  {stats.completed}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Earnings
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(stats.earnings)}
                </Typography>
              </CardContent>
            </Card>
          </div>

          {/* Tabbed Interface */}
          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="rider delivery tabs">
                <Tab 
                  label={
                    <Badge badgeContent={scheduledDeliveries.length} color="primary">
                      Scheduled Deliveries
                    </Badge>
                  } 
                />
                <Tab 
                  label={
                    <Badge badgeContent={getActiveDeliveries().length} color="secondary">
                      Active Deliveries
                    </Badge>
                  } 
                />
                <Tab 
                  label={
                    <Badge badgeContent={availableDeliveries.length} color="info">
                      Available Jobs
                    </Badge>
                  } 
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
                              From: {formatAddress(delivery.pickup?.address || delivery.pickupAddress)}
                            </Typography>
                            <Typography color="textSecondary">
                              To: {formatAddress(delivery.dropoff?.address || delivery.deliveryAddress)}
                            </Typography>
                            <Typography color="primary" className="mt-2">
                              📅 Pickup: {formatPickupTime(delivery.pickupTime)}
                            </Typography>
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

            {/* Active Deliveries Tab */}
            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" className="mb-4">
                Active Deliveries (Available for pickup or in progress)
              </Typography>
              {getActiveDeliveries().length === 0 ? (
                <Typography color="textSecondary">
                  No active deliveries at this time.
                </Typography>
              ) : (
                <div className="space-y-3">
                  {getActiveDeliveries().map((delivery) => (
                    <Card key={delivery.id} variant="outlined" className="border-l-4 border-green-500">
                      <CardContent>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <Typography variant="h6">
                              Delivery #{delivery.id.slice(-6)}
                            </Typography>
                            <Typography color="textSecondary">
                              From: {formatAddress(delivery.pickup?.address || delivery.pickupAddress)}
                            </Typography>
                            <Typography color="textSecondary">
                              To: {formatAddress(delivery.dropoff?.address || delivery.deliveryAddress)}
                            </Typography>
                            {delivery.pickupTime && (
                              <Typography color="warning.main" className="mt-2">
                                🕒 Pickup: {formatPickupTime(delivery.pickupTime)}
                              </Typography>
                            )}
                          </div>
                          <div className="text-right">
                            <Typography variant="h6">
                              {formatCurrency(delivery.totalPrice || delivery.deliveryFee || 0)}
                            </Typography>
                            <Typography 
                              color="secondary" 
                              className="px-2 py-1 bg-orange-100 rounded text-sm"
                            >
                              {getDeliveryStatus(delivery)}
                            </Typography>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          {delivery.status === 'assigned' && (
                            <Button
                              onClick={() => handleAcceptDelivery(delivery.id)}
                              disabled={isLoading}
                              variant="contained"
                              color="primary"
                              className="flex-1"
                            >
                              {isLoading ? '⏳ Starting...' : '🚀 Start Delivery'}
                            </Button>
                          )}
                          
                          {delivery.status === 'enroute' && (
                            <Button
                              onClick={() => handleCompleteDelivery(delivery.id)}
                              disabled={isLoading}
                              variant="contained"
                              color="success"
                              className="flex-1"
                            >
                              {isLoading ? '⏳ Completing...' : '✅ Mark as Delivered'}
                            </Button>
                          )}
                          
                          <Button variant="outlined">
                            📞 Call Customer
                          </Button>
                          
                          <GO7ChatButton 
                            deliveryId={delivery.id}
                            receiverId={delivery.customerId}
                            recipientName={`Customer (${delivery.customerName || 'Unknown'})`}
                            onClick={() => handleOpenChat(delivery.id, delivery)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabPanel>

            {/* Available Jobs Tab */}
            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" className="mb-4">
                Available Delivery Jobs
              </Typography>
              {availableDeliveries.length === 0 ? (
                <Typography color="textSecondary">
                  No available jobs at this time.
                </Typography>
              ) : (
                <div className="space-y-3">
                  {availableDeliveries.map((delivery) => (
                    <Card key={delivery.id} variant="outlined">
                      <CardContent>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <Typography variant="h6">
                              Delivery #{delivery.id.slice(-6)}
                            </Typography>
                            <Typography color="textSecondary">
                              From: {formatAddress(delivery.pickup?.address || delivery.pickupAddress)}
                            </Typography>
                            <Typography color="textSecondary">
                              To: {formatAddress(delivery.dropoff?.address || delivery.deliveryAddress)}
                            </Typography>
                            <Typography color="textSecondary" className="mt-2">
                              📞 Contact: {delivery.pickup?.contactPhone || delivery.customerPhone}
                            </Typography>
                          </div>
                          <div className="text-right">
                            <Typography variant="h6">
                              {formatCurrency(delivery.totalPrice || delivery.deliveryFee || 0)}
                            </Typography>
                            <Typography 
                              color="info" 
                              className="px-2 py-1 bg-blue-100 rounded text-sm"
                            >
                              Available
                            </Typography>
                          </div>
                        </div>
                        
                        <Button
                          onClick={() => handleAcceptDelivery(delivery.id)}
                          disabled={isLoading}
                          variant="contained"
                          color="primary"
                          fullWidth
                        >
                          {isLoading ? '⏳ Accepting...' : '✋ Accept This Delivery'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabPanel>
          </Card>
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