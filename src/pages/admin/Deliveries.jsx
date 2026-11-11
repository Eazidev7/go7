import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, updateDoc, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../../services/firebase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { formatCurrency } from '../../utils/format';
import Swal from 'sweetalert2';
import { getAdminStatusLabel, getAdminStatusColor } from '../../utils/deliveryAdminStatus';

function AdminDeliveries() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [secretPins, setSecretPins] = useState({});
  const [filter, setFilter] = useState('all'); // all, pending, assigned, picked_up, delivered
  const [searchTerm, setSearchTerm] = useState('');
  const [riders, setRiders] = useState([]);
  
  // Check if user is authenticated and has admin role
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user) {
        setIsAdmin(true);
      }
      
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Fetch deliveries and riders
  useEffect(() => {
    async function fetchData() {
      if (!user || !isAdmin) return;
      
      try {
        // Get all deliveries
        const deliveriesCollection = collection(db, 'deliveries');
        const deliveriesSnapshot = await getDocs(deliveriesCollection);
        const deliveriesList = deliveriesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || Date.now()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
          };
        });
        
        // Sort by creation date (newest first)
        deliveriesList.sort((a, b) => b.createdAt - a.createdAt);
        setDeliveries(deliveriesList);

        // New orders keep the PIN in deliverySecrets/{id} (admin-readable).
        // Fetch pins for recent rows that don't carry a legacy deliveryPin.
        const pinMap = {};
        await Promise.all(
          deliveriesList.slice(0, 60).map(async (d) => {
            if (d.deliveryPin) { pinMap[d.id] = d.deliveryPin; return; }
            try {
              const s = await getDoc(doc(db, 'deliverySecrets', d.id));
              if (s.exists() && s.data()?.pin) pinMap[d.id] = String(s.data().pin);
            } catch (_) {}
          })
        );
        setSecretPins(pinMap);
        
        // Get all riders
        const ridersCollection = collection(db, 'riders');
        const ridersSnapshot = await getDocs(ridersCollection);
        const ridersList = ridersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRiders(ridersList);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        Swal.fire('Error', 'Failed to load deliveries', 'error');
      }
    }
    
    fetchData();
  }, [user, isAdmin]);
  
  // Filter deliveries
  const filteredDeliveries = deliveries.filter(delivery => {
    const matchesFilter = filter === 'all' || delivery.status === filter;
    const matchesSearch = !searchTerm || 
      delivery.bookingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (delivery.deliveryPin || secretPins[delivery.id] || '').includes(searchTerm) ||
      delivery.sender?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.recipient?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });
  
  // Assign rider to delivery
  const handleAssignRider = async (deliveryId, currentRiderId) => {
    const { value: riderId } = await Swal.fire({
      title: 'Assign Rider',
      input: 'select',
      inputOptions: riders.reduce((acc, rider) => {
        acc[rider.id] = `${rider.name || rider.displayName} (${rider.phone || 'No phone'})`;
        return acc;
      }, {}),
      inputPlaceholder: 'Select a rider',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to select a rider!';
        }
      }
    });
    
    if (riderId) {
      try {
        const rider = riders.find(r => r.id === riderId);

        // Route through the server callable so the FULL assignment set lands
        // (bookings + orders + deliveries + rider state + tracking docs).
        // Direct Firestore writes here previously left live tracking broken.
        const fn = httpsCallable(getFunctions(), 'adminAssignRiderToDelivery');
        const delivery = deliveries.find(d => d.id === deliveryId);
        const bookingId = delivery?.bookingId || deliveryId;
        await fn({ bookingId, riderId });

        Swal.fire('Success', 'Rider assigned successfully!', 'success');
        
        // Refresh deliveries
        const updatedDeliveries = deliveries.map(d => 
          d.id === deliveryId 
            ? { ...d, riderId, riderName: rider.name || rider.displayName, status: 'assigned' }
            : d
        );
        setDeliveries(updatedDeliveries);
      } catch (error) {
        console.error('Error assigning rider:', error);
        Swal.fire('Error', 'Failed to assign rider', 'error');
      }
    }
  };
  
  // View delivery details
  const handleViewDetails = async (delivery) => {
    const bookingRef = doc(db, 'bookings', delivery.bookingId || delivery.id);
    let bookingData = null;
    
    try {
      const bookingDoc = await getDoc(bookingRef);
      if (bookingDoc.exists()) {
        bookingData = bookingDoc.data();
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
    }
    
    await Swal.fire({
      title: `Delivery #${delivery.orderId || delivery.id.slice(-8)}`,
      html: `
        <div class="text-left space-y-3">
          <div class="bg-red-50 p-4 rounded-lg border-2 border-red-500">
            <p class="text-sm text-gray-600 font-semibold">Delivery PIN</p>
            <p class="text-3xl font-bold text-red-600">${delivery.deliveryPin || secretPins[delivery.id] || 'Not set'}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p class="text-sm text-gray-600 font-semibold">Status</p>
              <p class="text-lg capitalize">${delivery.status || 'pending'}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600 font-semibold">Service Type</p>
              <p class="text-lg capitalize">${delivery.serviceType || 'parcel'}</p>
            </div>
          </div>
          
          <div>
            <p class="text-sm text-gray-600 font-semibold">📍 Pickup</p>
            <p class="text-sm">${delivery.pickup?.address || 'N/A'}</p>
            <p class="text-xs text-gray-500">${delivery.sender?.name || 'Unknown'} - ${delivery.sender?.phone || 'No phone'}</p>
          </div>
          
          <div>
            <p class="text-sm text-gray-600 font-semibold">🎯 Dropoff</p>
            <p class="text-sm">${delivery.dropoff?.address || 'N/A'}</p>
            <p class="text-xs text-gray-500">${delivery.recipient?.name || 'Unknown'} - ${delivery.recipient?.phone || 'No phone'}</p>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 font-semibold">Distance</p>
              <p class="text-lg">${delivery.distance ? delivery.distance.toFixed(2) + ' km' : 'N/A'}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600 font-semibold">Delivery Fee</p>
              <p class="text-lg font-bold">${formatCurrency(delivery.deliveryFee || delivery.fare || 0)}</p>
            </div>
          </div>
          
          <div class="bg-green-50 p-3 rounded">
            <p class="text-sm text-gray-600 font-semibold">💰 Payment Split</p>
            <p class="text-sm">Rider: ${formatCurrency(delivery.riderPayout || 0)} (${delivery.riderPercentage || 50}%)</p>
            <p class="text-sm">Platform: ${formatCurrency(delivery.platformFee || 0)} (${100 - (delivery.riderPercentage || 50)}%)</p>
          </div>
          
          ${delivery.riderId ? `
            <div>
              <p class="text-sm text-gray-600 font-semibold">🚴 Assigned Rider</p>
              <p class="text-sm">${delivery.riderName || 'Unknown'}</p>
              <p class="text-xs text-gray-500">${delivery.riderPhone || 'No phone'}</p>
            </div>
          ` : '<p class="text-sm text-yellow-600">⚠️ No rider assigned yet</p>'}
          
          <div>
            <p class="text-sm text-gray-600 font-semibold">Item Description</p>
            <p class="text-sm">${delivery.itemDescription || 'N/A'}</p>
          </div>
          
          <div class="text-xs text-gray-500">
            <p>Created: ${delivery.createdAt?.toLocaleString()}</p>
            ${delivery.updatedAt ? `<p>Updated: ${delivery.updatedAt.toLocaleString()}</p>` : ''}
          </div>
        </div>
      `,
      width: 600,
      confirmButtonText: 'Close',
      confirmButtonColor: '#E30613'
    });
  };
  
  const getStatusColor = (status) => getAdminStatusColor(status);
  
  // Redirect if not admin
  if (!loading && (!user || !isAdmin)) {
    return <Navigate to="/login?redirect=/admin/deliveries" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Delivery Management</h1>
          <Link 
            to="/admin" 
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg"
          >
            ← Back to Dashboard
          </Link>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-yellow-50 rounded-lg shadow p-4 border-l-4 border-yellow-500">
                <h3 className="text-sm text-gray-600 font-medium">Pending</h3>
                <p className="text-2xl font-bold text-yellow-600">
                  {deliveries.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-500">
                <h3 className="text-sm text-gray-600 font-medium">Assigned</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {deliveries.filter(d => d.status === 'assigned').length}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-500">
                <h3 className="text-sm text-gray-600 font-medium">In Transit</h3>
                <p className="text-2xl font-bold text-purple-600">
                  {deliveries.filter(d => ['picked_up', 'in_transit'].includes(d.status)).length}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-500">
                <h3 className="text-sm text-gray-600 font-medium">Delivered</h3>
                <p className="text-2xl font-bold text-green-600">
                  {deliveries.filter(d => d.status === 'delivered').length}
                </p>
              </div>
            </div>
            
            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Deliveries</option>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="picked_up">Picked Up</option>
                    <option value="in_transit">In Transit</option>
                    <option value="delivered">Delivered</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by booking ID, PIN, name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Deliveries Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Booking ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        PIN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pickup / Dropoff
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fee / Payout
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredDeliveries.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                          No deliveries found
                        </td>
                      </tr>
                    ) : (
                      filteredDeliveries.map(delivery => (
                        <tr key={delivery.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-blue-600">
                              #{delivery.orderId?.slice(-8) || delivery.id.slice(-8)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {delivery.createdAt.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-lg font-bold text-red-600">
                              {delivery.deliveryPin || secretPins[delivery.id] || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm">
                              <div className="text-gray-900">📍 {delivery.pickup?.address?.substring(0, 30) || 'N/A'}...</div>
                              <div className="text-gray-500">🎯 {delivery.dropoff?.address?.substring(0, 30) || 'N/A'}...</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {delivery.riderId ? (
                              <div className="text-sm">
                                <div className="text-gray-900">{delivery.riderName || 'Unknown'}</div>
                                <div className="text-gray-500">{delivery.riderPhone || 'No phone'}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">Not assigned</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                              {getAdminStatusLabel(delivery.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-900 font-semibold">{formatCurrency(delivery.deliveryFee || 0)}</div>
                              <div className="text-green-600 text-xs">Rider: {formatCurrency(delivery.riderPayout || 0)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewDetails(delivery)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                View
                              </button>
                              {!delivery.riderId && (
                                <button
                                  onClick={() => handleAssignRider(delivery.id, delivery.riderId)}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Assign
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
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}

export default AdminDeliveries;
