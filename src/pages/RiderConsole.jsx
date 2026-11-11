import React, { useState, useEffect } from 'react';
import { 
  query, 
  where, 
  updateDoc,
  onSnapshot, 
  limit
} from 'firebase/firestore';
import { deliveriesCol, deliveryDoc } from '../lib/dbRefs';
import { createDeliveryEvent } from '../types/models';
import { appendEvent } from '../lib/repo';
import { toast } from 'react-hot-toast';

// Mock rider ID and info
const mockRiderId = 'rider-123';
const mockRider = {
  id: mockRiderId,
  name: 'John Rider',
  phone: '08012345678',
  vehicleType: 'Motorcycle',
  vehicleNumber: 'ABJ-123-XY'
};

// Status styles for badges
const STATUS_STYLES = {
  'assigned': { color: 'bg-purple-100 text-purple-800', icon: '🛵' },
  'accepted': { color: 'bg-blue-100 text-blue-800', icon: '👍' },
  'pickup': { color: 'bg-yellow-100 text-yellow-800', icon: '📦' },
  'picked_up': { color: 'bg-yellow-100 text-yellow-800', icon: '📦' },
  'in_transit': { color: 'bg-orange-100 text-orange-800', icon: '🚚' },
  'delivered': { color: 'bg-green-100 text-green-800', icon: '✅' },
  'cancelled': { color: 'bg-red-100 text-red-800', icon: '❌' }
};

// Helper to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0
  }).format(amount);
};

const RiderConsole = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingJobs, setProcessingJobs] = useState({});

  // Subscribe to deliveries assigned to this rider
  useEffect(() => {
    setLoading(true);
    
    // Create query for deliveries where status is assigned or picked_up
    const q = query(
      deliveriesCol,
      where('status', 'in', ['assigned', 'picked_up']),
      where('rider.id', '==', mockRiderId),
      limit(10)
    );
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const deliveryList = [];
        querySnapshot.forEach((doc) => {
          deliveryList.push(doc.data());
        });
        setDeliveries(deliveryList);
        setLoading(false);
      },
      (err) => {
        console.error('Error getting deliveries:', err);
        toast.error('Failed to load deliveries. Please try again.');
        setLoading(false);
      }
    );
    
    // Clean up subscription
    return () => unsubscribe();
  }, []);

  // Handle accept delivery
  const handleAccept = async (delivery) => {
    setProcessingJobs(prev => ({ ...prev, [delivery.id]: true }));
    
    try {
      // Update delivery status
      await updateDoc(deliveryDoc(delivery.id), {
        status: 'accepted',
        rider: mockRider,
        updatedAt: new Date()
      });
      
      // Add event to timeline
      await appendEvent(delivery.id, createDeliveryEvent('accepted'));
      
      toast.success('Delivery accepted successfully');
    } catch (error) {
      console.error('Error accepting delivery:', error);
      toast.error('Failed to accept delivery');
    } finally {
      setProcessingJobs(prev => ({ ...prev, [delivery.id]: false }));
    }
  };

  // Handle picked up
  const handlePickedUp = async (delivery) => {
    setProcessingJobs(prev => ({ ...prev, [delivery.id]: true }));
    
    try {
      // Update delivery status
      await updateDoc(deliveryDoc(delivery.id), {
        status: 'picked_up',
        updatedAt: new Date()
      });
      
      // Add event to timeline
      await appendEvent(delivery.id, createDeliveryEvent('pickup'));
      
      toast.success('Package marked as picked up');
    } catch (error) {
      console.error('Error marking as picked up:', error);
      toast.error('Failed to update pickup status');
    } finally {
      setProcessingJobs(prev => ({ ...prev, [delivery.id]: false }));
    }
  };

  // Handle delivered
  const handleDelivered = async (delivery) => {
    setProcessingJobs(prev => ({ ...prev, [delivery.id]: true }));
    
    try {
      // Update delivery status
      await updateDoc(deliveryDoc(delivery.id), {
        status: 'delivered',
        updatedAt: new Date()
      });
      
      // Add event to timeline
      await appendEvent(delivery.id, createDeliveryEvent('delivered'));
      
      toast.success('Delivery completed successfully');
    } catch (error) {
      console.error('Error marking as delivered:', error);
      toast.error('Failed to complete delivery');
    } finally {
      setProcessingJobs(prev => ({ ...prev, [delivery.id]: false }));
    }
  };

  // Render status badge
  const renderStatusBadge = (status) => {
    const style = STATUS_STYLES[status] || 
      { color: 'bg-gray-100 text-gray-800', icon: '❓' };
      
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${style.color}`}>
        <span className="mr-1">{style.icon}</span>
        <span className="capitalize">{status.replace('_', ' ')}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-700">Loading deliveries...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rider Console</h1>
          <p className="text-gray-600">Rider ID: {mockRiderId}</p>
        </header>

        {deliveries.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center">
            <div className="text-5xl mb-4">🛵</div>
            <h2 className="text-xl font-bold mb-2">No Active Deliveries</h2>
            <p className="text-gray-600">You don't have any assigned deliveries right now.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {deliveries.map(delivery => (
              <div 
                key={delivery.id} 
                className="bg-white rounded-xl shadow-md p-5 border border-gray-200"
              >
                <div className="mb-4">
                  <div className="flex justify-between">
                    <h3 className="font-bold">#{delivery.jobId.slice(-6)}</h3>
                    {renderStatusBadge(delivery.status)}
                  </div>
                  
                  <div className="mt-3 flex items-center">
                    <div className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center text-green-600 flex-shrink-0">
                      A
                    </div>
                    <div className="ml-3 flex-grow">
                      <p className="font-medium">Pickup</p>
                      <p className="text-sm text-gray-600 truncate">{delivery.pickup?.address || "Pickup location"}</p>
                    </div>
                  </div>
                  
                  <div className="my-2 ml-4 border-l-2 border-dashed border-gray-300 h-6"></div>
                  
                  <div className="flex items-center">
                    <div className="bg-red-100 rounded-full w-8 h-8 flex items-center justify-center text-red-600 flex-shrink-0">
                      B
                    </div>
                    <div className="ml-3 flex-grow">
                      <p className="font-medium">Dropoff</p>
                      <p className="text-sm text-gray-600 truncate">{delivery.dropoff?.address || "Dropoff location"}</p>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-3 mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Distance:</span>
                    <span className="font-medium">{delivery.distanceKm.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{delivery.durationMin} min</span>
                  </div>
                  {delivery.pricing?.total && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-medium text-red-600">
                        {formatCurrency(delivery.pricing.total)}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {delivery.status === 'assigned' && (
                    <>
                      <button
                        onClick={() => handleAccept(delivery)}
                        disabled={processingJobs[delivery.id]}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handlePickedUp(delivery)}
                        disabled={processingJobs[delivery.id]}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Picked Up
                      </button>
                    </>
                  )}
                  
                  {delivery.status === 'accepted' && (
                    <button
                      onClick={() => handlePickedUp(delivery)}
                      disabled={processingJobs[delivery.id]}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                    >
                      Picked Up
                    </button>
                  )}
                  
                  {delivery.status === 'picked_up' && (
                    <button
                      onClick={() => handleDelivered(delivery)}
                      disabled={processingJobs[delivery.id]}
                      className="bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed col-span-2"
                    >
                      Delivered
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RiderConsole;
