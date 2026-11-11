import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { formatCurrency } from '../../utils/format';
import { isValidNgPhone, NG_PHONE_PATTERN, NG_PHONE_TITLE, sanitizePhoneInput } from '../../utils/phone';

// Status mapping for display and progression
const statusMap = {
  PLACED: { label: 'Order Received', next: 'QUOTED' },
  QUOTED: { label: 'Order Confirmed', next: 'ASSIGNED' },
  ASSIGNED: { label: 'Rider Assigned', next: 'PICKED_UP' },
  PICKED_UP: { label: 'Package Picked Up', next: 'IN_TRANSIT' },
  IN_TRANSIT: { label: 'In Transit', next: 'DELIVERED' },
  DELIVERED: { label: 'Delivered', next: 'COMPLETED' },
  COMPLETED: { label: 'Completed', next: null },
  CANCELED: { label: 'Canceled', next: null }
};

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [riderForm, setRiderForm] = useState({
    name: '',
    phone: '',
    vehicleType: 'scooter',
    vehicleId: '',
  });
  
  // Fetch all bookings (changed from orders to bookings)
  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const bookingsCollection = collection(db, 'bookings');
        const bookingSnapshot = await getDocs(bookingsCollection);
        const bookingsList = bookingSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
          };
        });
        
        // Sort by creation date, newest first
        bookingsList.sort((a, b) => b.createdAt - a.createdAt);
        setOrders(bookingsList);
      } catch (err) {
        console.error("Error fetching bookings:", err);
        setError("Failed to load bookings. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, []);
  
  // Handle opening the assign rider modal
  const handleOpenAssignModal = (order) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };
  
  // Handle assign rider form input changes
  const handleRiderFormChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = name === 'phone' ? sanitizePhoneInput(value) : value;
    setRiderForm(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };
  
  // Handle assigning a rider to an order
  const handleAssignRider = async () => {
    if (!selectedOrder) return;
    
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        setError("Order not found");
        return;
      }
      
      const now = new Date();
      const timestamp = Timestamp.fromDate(now);
      
      // Create rider object
      const rider = {
        name: riderForm.name,
        phone: riderForm.phone,
        vehicleType: riderForm.vehicleType,
        vehicleId: riderForm.vehicleId,
        coordinates: selectedOrder.pickup?.coordinates || null, // Start at pickup location
        assignedAt: timestamp
      };
      
      // Create history entry for assignment
      const historyEntry = {
        status: 'ASSIGNED',
        timestamp,
        message: `Rider ${riderForm.name} assigned to delivery`,
        actor: 'admin'
      };
      
      // Update the timestamps object
      const timestamps = {
        ...(orderDoc.data().timestamps || {}),
        assignedAt: timestamp
      };
      
      // Update order in Firestore
      await updateDoc(orderRef, {
        status: 'ASSIGNED',
        rider,
        history: [...(orderDoc.data().history || []), historyEntry],
        timestamps
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === selectedOrder.id 
            ? { 
                ...order, 
                status: 'ASSIGNED', 
                rider,
                history: [...(order.history || []), historyEntry],
                timestamps: {
                  ...(order.timestamps || {}),
                  assignedAt: now
                }
              } 
            : order
        )
      );
      
      // Reset form and close modal
      setRiderForm({
        name: '',
        phone: '',
        vehicleType: 'scooter',
        vehicleId: '',
      });
      setShowAssignModal(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error("Error assigning rider:", err);
      setError("Failed to assign rider. Please try again.");
    }
  };
  
  // Handle advancing order status
  const handleAdvanceStatus = async (order) => {
    if (!order || !statusMap[order.status] || !statusMap[order.status].next) return;
    
    const nextStatus = statusMap[order.status].next;
    
    try {
      const orderRef = doc(db, 'orders', order.id);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        setError("Order not found");
        return;
      }
      
      const now = new Date();
      const timestamp = Timestamp.fromDate(now);
      
      // Create history entry for status update
      const historyEntry = {
        status: nextStatus,
        timestamp,
        message: `Order status updated to ${statusMap[nextStatus].label}`,
        actor: 'admin'
      };
      
      // Update the timestamps object based on the new status
      const timestampField = `${nextStatus.toLowerCase().split('_').join('')}At`;
      const timestamps = {
        ...(orderDoc.data().timestamps || {}),
        [timestampField]: timestamp
      };
      
      // Special case for PICKED_UP - update rider coordinates to pickup location
      let riderUpdate = {};
      if (nextStatus === 'PICKED_UP' && order.rider && order.pickup?.coordinates) {
        riderUpdate = {
          rider: {
            ...order.rider,
            coordinates: order.pickup.coordinates
          }
        };
      }
      
      // Special case for DELIVERED - update rider coordinates to dropoff location
      if (nextStatus === 'DELIVERED' && order.rider && order.dropoff?.coordinates) {
        riderUpdate = {
          rider: {
            ...order.rider,
            coordinates: order.dropoff.coordinates
          }
        };
      }
      
      // Update order in Firestore
      await updateDoc(orderRef, {
        status: nextStatus,
        history: [...(orderDoc.data().history || []), historyEntry],
        timestamps,
        ...riderUpdate
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id 
            ? { 
                ...o, 
                status: nextStatus, 
                history: [...(o.history || []), historyEntry],
                timestamps: {
                  ...(o.timestamps || {}),
                  [timestampField]: now
                },
                ...riderUpdate
              } 
            : o
        )
      );
    } catch (err) {
      console.error("Error updating order status:", err);
      setError("Failed to update order status. Please try again.");
    }
  };
  
  // Handle canceling an order
  const handleCancelOrder = async (order) => {
    if (!order) return;
    
    try {
      const orderRef = doc(db, 'orders', order.id);
      const orderDoc = await getDoc(orderRef);
      
      if (!orderDoc.exists()) {
        setError("Order not found");
        return;
      }
      
      const now = new Date();
      const timestamp = Timestamp.fromDate(now);
      
      // Create history entry for cancellation
      const historyEntry = {
        status: 'CANCELED',
        timestamp,
        message: `Order canceled by admin`,
        actor: 'admin'
      };
      
      // Update the timestamps object
      const timestamps = {
        ...(orderDoc.data().timestamps || {}),
        canceledAt: timestamp
      };
      
      // Update order in Firestore
      await updateDoc(orderRef, {
        status: 'CANCELED',
        history: [...(orderDoc.data().history || []), historyEntry],
        timestamps
      });
      
      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === order.id 
            ? { 
                ...o, 
                status: 'CANCELED', 
                history: [...(o.history || []), historyEntry],
                timestamps: {
                  ...(o.timestamps || {}),
                  canceledAt: now
                }
              } 
            : o
        )
      );
    } catch (err) {
      console.error("Error canceling order:", err);
      setError("Failed to cancel order. Please try again.");
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Order Management</h1>
          <Link to="/admin" className="text-blue-600 hover:text-blue-800">
            ← Back to Admin
          </Link>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tracking Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pickup
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dropoff
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600">
                            <Link to={`/track/${order.trackingCode}`}>
                              {order.trackingCode}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 truncate max-w-xs">
                            {order.pickup?.address || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 truncate max-w-xs">
                            {order.dropoff?.address || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.payment?.total ? formatCurrency(order.payment.total) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            order.status === 'COMPLETED' || order.status === 'DELIVERED' 
                              ? 'bg-green-100 text-green-800' 
                              : order.status === 'CANCELED' 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {statusMap[order.status]?.label || order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {order.createdAt.toLocaleDateString()} {order.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            {order.status === 'QUOTED' && (
                              <button
                                onClick={() => handleOpenAssignModal(order)}
                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-2 py-1 rounded"
                              >
                                Assign Rider
                              </button>
                            )}
                            
                            {statusMap[order.status]?.next && (
                              <button
                                onClick={() => handleAdvanceStatus(order)}
                                className="text-green-600 hover:text-green-900 bg-green-50 px-2 py-1 rounded"
                              >
                                → {statusMap[statusMap[order.status].next].label}
                              </button>
                            )}
                            
                            {order.status !== 'CANCELED' && order.status !== 'COMPLETED' && order.status !== 'DELIVERED' && (
                              <button
                                onClick={() => handleCancelOrder(order)}
                                className="text-red-600 hover:text-red-900 bg-red-50 px-2 py-1 rounded"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
      
      {/* Assign Rider Modal */}
      {showAssignModal && selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Assign Rider to Order #{selectedOrder.trackingCode}
              </h3>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rider Name</label>
                <input
                  type="text"
                  name="name"
                  value={riderForm.name}
                  onChange={handleRiderFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  pattern={NG_PHONE_PATTERN}
                  title={NG_PHONE_TITLE}
                  name="phone"
                  value={riderForm.phone}
                  onChange={handleRiderFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="e.g., 08166205600"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                <select
                  name="vehicleType"
                  value={riderForm.vehicleType}
                  onChange={handleRiderFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="scooter">Scooter</option>
                  <option value="motorcycle">Motorcycle</option>
                  <option value="car">Car</option>
                  <option value="bicycle">Bicycle</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle ID/License</label>
                <input
                  type="text"
                  name="vehicleId"
                  value={riderForm.vehicleId}
                  onChange={handleRiderFormChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRider}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={!riderForm.name || !riderForm.phone}
              >
                Assign Rider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminOrders;
