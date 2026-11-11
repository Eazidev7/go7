import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDoc 
} from 'firebase/firestore';
import { db } from '../firebase';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { 
  FaMotorcycle, 
  FaClock, 
  FaPhone, 
  FaStar, 
  FaMapMarkedAlt, 
  FaTimesCircle,
  FaCheckCircle,
  FaRoute
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import VendorNavigation from './VendorNavigation';
import 'leaflet/dist/leaflet.css';

const VendorOrdersLive = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [riders, setRiders] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const vendorId = 'vendor_001'; // This would come from auth context

  // Haversine formula for distance calculation
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Calculate ETA based on distance and average speed
  const calculateETA = (distance, averageSpeed = 30) => {
    const timeInHours = distance / averageSpeed;
    const timeInMinutes = Math.round(timeInHours * 60);
    return timeInMinutes;
  };

  // Fetch rider information
  const fetchRiderInfo = async (riderId) => {
    try {
      if (!db || riders[riderId]) return riders[riderId];
      
      const riderDoc = await getDoc(doc(db, 'riders', riderId));
      if (riderDoc.exists()) {
        const riderData = riderDoc.data();
        setRiders(prev => ({ ...prev, [riderId]: riderData }));
        return riderData;
      }
    } catch (error) {
      console.error('Error fetching rider info:', error);
      // Return mock rider data for demo
      return {
        name: 'Demo Rider',
        phone: '+234 901 234 5678',
        rating: 4.5,
        currentLocation: { lat: 6.5244, lng: 3.3792 }
      };
    }
  };

  // Set up real-time listeners
  useEffect(() => {
    if (!db) {
      // Mock data for demo
      const mockOrders = [
        {
          id: 'order_live_001',
          status: 'assigned',
          riderId: 'rider_001',
          customer: { 
            name: 'John Doe', 
            phone: '+234 901 234 5678',
            address: { lat: 6.5244, lng: 3.3792 }
          },
          pickupAddress: { lat: 6.4281, lng: 3.4219 },
          deliveryAddress: { lat: 6.5244, lng: 3.3792 },
          items: [{ name: 'Spicy Chicken Burger', quantity: 2, price: 1500 }],
          total: 3200,
          createdAt: { toDate: () => new Date() },
          estimatedPickupTime: new Date(Date.now() + 15 * 60000), // 15 min from now
        },
        {
          id: 'order_live_002',
          status: 'preparing',
          customer: { 
            name: 'Sarah Wilson', 
            phone: '+234 902 345 6789',
            address: { lat: 6.5055, lng: 3.3897 }
          },
          pickupAddress: { lat: 6.4281, lng: 3.4219 },
          deliveryAddress: { lat: 6.5055, lng: 3.3897 },
          items: [{ name: 'Grilled Fish', quantity: 1, price: 2500 }],
          total: 2800,
          createdAt: { toDate: () => new Date(Date.now() - 5 * 60000) },
        }
      ];

      setActiveOrders(mockOrders);
      setLoading(false);
      return;
    }

    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('vendorId', '==', vendorId),
        where('status', 'in', ['preparing', 'ready', 'assigned', 'picked_up', 'in_transit'])
      );

      const unsubscribe = onSnapshot(ordersQuery, async (snapshot) => {
        const orders = [];
        
        for (const docSnapshot of snapshot.docs) {
          const orderData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Fetch rider info if order is assigned
          if (orderData.status === 'assigned' && orderData.riderId) {
            await fetchRiderInfo(orderData.riderId);
          }
          
          orders.push(orderData);
        }

        setActiveOrders(orders);
        setLoading(false);
      }, (error) => {
        console.error('Error fetching orders:', error);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up listeners:', error);
      setLoading(false);
    }
  }, [vendorId]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (!db) {
        // Mock update for demo
        setActiveOrders(prev => 
          prev.map(order => 
            order.id === orderId 
              ? { ...order, status: newStatus }
              : order
          )
        );
        
        Swal.fire({
          title: 'Success!',
          text: `Order status updated to ${newStatus}`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        return;
      }

      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      });

      Swal.fire({
        title: 'Success!',
        text: `Order status updated to ${newStatus}`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error updating order:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to update order status',
        icon: 'error'
      });
    }
  };

  // Cancel order
  const cancelOrder = async (orderId) => {
    const result = await Swal.fire({
      title: 'Cancel Order?',
      text: 'Are you sure you want to cancel this order?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel order'
    });

    if (result.isConfirmed) {
      await updateOrderStatus(orderId, 'cancelled');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'preparing': return 'bg-yellow-500 text-white';
      case 'ready': return 'bg-blue-500 text-white';
      case 'assigned': return 'bg-purple-500 text-white';
      case 'picked_up': return 'bg-orange-500 text-white';
      case 'in_transit': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '--';
    const date = typeof timestamp.toDate === 'function' ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <VendorNavigation />
        <div className="lg:ml-64 p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading active orders...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNavigation />
      
      <div className="lg:ml-64 p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Live Order Tracking</h1>
          <p className="text-gray-600 mt-2">Monitor active orders and rider progress in real-time</p>
        </div>

        {activeOrders.length === 0 ? (
          <div className="text-center py-12">
            <FaMotorcycle className="h-24 w-24 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700">No Active Orders</h3>
            <p className="text-gray-500 mt-2">All orders are completed or no new orders yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {activeOrders.map((order) => {
              const rider = riders[order.riderId];
              const distance = order.riderId && rider?.currentLocation 
                ? calculateDistance(
                    rider.currentLocation.lat, 
                    rider.currentLocation.lng,
                    order.deliveryAddress.lat, 
                    order.deliveryAddress.lng
                  )
                : null;
              const eta = distance ? calculateETA(distance) : null;

              return (
                <div key={order.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Order Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id.slice(-6).toUpperCase()}
                        </h3>
                        <p className="text-gray-600">{order.customer.name}</p>
                        <p className="text-sm text-gray-500">
                          <FaClock className="inline mr-1" />
                          Placed at {formatTime(order.createdAt)}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Rider Information */}
                    {order.status === 'assigned' && rider && (
                      <div className="bg-purple-50 p-4 rounded-lg mb-4">
                        <h4 className="font-medium text-purple-900 mb-2 flex items-center">
                          <FaMotorcycle className="mr-2" />
                          Rider Assigned
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-purple-700">
                              <strong>{rider.name}</strong>
                            </p>
                            <p className="text-sm text-purple-600 flex items-center">
                              <FaStar className="mr-1 text-yellow-500" />
                              {rider.rating} rating
                            </p>
                          </div>
                          <div>
                            <a 
                              href={`tel:${rider.phone}`}
                              className="text-sm text-purple-600 hover:text-purple-800 flex items-center"
                            >
                              <FaPhone className="mr-1" />
                              {rider.phone}
                            </a>
                            {eta && (
                              <p className="text-sm text-purple-600 flex items-center mt-1">
                                <FaClock className="mr-1" />
                                ETA: {eta} min ({distance?.toFixed(1)} km)
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="space-y-2">
                      {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>₦{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 font-semibold">
                        Total: ₦{order.total.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Map Section */}
                  {order.pickupAddress && order.deliveryAddress && (
                    <div className="h-64">
                      <MapContainer
                        center={[order.pickupAddress.lat, order.pickupAddress.lng]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer
                          url="https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=YOUR_MAPTILER_KEY"
                          attribution='© MapTiler © OpenStreetMap contributors'
                        />
                        
                        {/* Pickup Location */}
                        <Marker position={[order.pickupAddress.lat, order.pickupAddress.lng]}>
                          <Popup>
                            <strong>Pickup Location</strong><br />
                            Your Restaurant
                          </Popup>
                        </Marker>
                        
                        {/* Delivery Location */}
                        <Marker position={[order.deliveryAddress.lat, order.deliveryAddress.lng]}>
                          <Popup>
                            <strong>Delivery Address</strong><br />
                            {order.customer.name}
                          </Popup>
                        </Marker>
                        
                        {/* Rider Current Location */}
                        {rider?.currentLocation && (
                          <Marker position={[rider.currentLocation.lat, rider.currentLocation.lng]}>
                            <Popup>
                              <strong>Rider Location</strong><br />
                              {rider.name}
                            </Popup>
                          </Marker>
                        )}
                        
                        {/* Route Line */}
                        <Polyline
                          positions={[
                            [order.pickupAddress.lat, order.pickupAddress.lng],
                            [order.deliveryAddress.lat, order.deliveryAddress.lng]
                          ]}
                          color="red"
                          weight={3}
                          opacity={0.7}
                        />
                      </MapContainer>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="p-6 bg-gray-50 border-t">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => window.open(`/live-tracking/${order.id}`, '_blank')}
                        className="flex-1 min-w-0 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center justify-center transition-colors"
                      >
                        <FaMapMarkedAlt className="mr-2" />
                        View Live Map
                      </button>
                      
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="flex-1 min-w-0 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center transition-colors"
                        >
                          <FaCheckCircle className="mr-2" />
                          Mark Ready
                        </button>
                      )}
                      
                      {['preparing', 'ready'].includes(order.status) && (
                        <button
                          onClick={() => cancelOrder(order.id)}
                          className="bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 flex items-center justify-center transition-colors"
                        >
                          <FaTimesCircle className="mr-2" />
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorOrdersLive;