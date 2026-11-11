import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { formatCurrency } from '../../utils/format';
import Swal from 'sweetalert2';

function AdminRiders() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [riders, setRiders] = useState([]);
  const [riderStats, setRiderStats] = useState({});
  const [filter, setFilter] = useState('all'); // all, online, offline, active, inactive
  const [searchTerm, setSearchTerm] = useState('');
  
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
  
  // Fetch riders and their stats
  useEffect(() => {
    async function fetchData() {
      if (!user || !isAdmin) return;
      
      try {
        // Get all riders
        const ridersCollection = collection(db, 'riders');
        const ridersSnapshot = await getDocs(ridersCollection);
        const ridersList = ridersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt || Date.now()),
        }));
        
        setRiders(ridersList);
        
        // Get deliveries to calculate stats for each rider
        const deliveriesCollection = collection(db, 'deliveries');
        const deliveriesSnapshot = await getDocs(deliveriesCollection);
        const deliveries = deliveriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Calculate stats for each rider
        const stats = {};
        ridersList.forEach(rider => {
          const riderDeliveries = deliveries.filter(d => d.riderId === rider.id);
          const completedDeliveries = riderDeliveries.filter(d => d.status === 'delivered');
          const totalEarnings = completedDeliveries.reduce((sum, d) => sum + (d.riderPayout || 0), 0);
          
          stats[rider.id] = {
            totalDeliveries: riderDeliveries.length,
            completedDeliveries: completedDeliveries.length,
            pendingDeliveries: riderDeliveries.filter(d => ['assigned', 'picked_up', 'in_transit'].includes(d.status)).length,
            totalEarnings: totalEarnings,
            averageEarning: completedDeliveries.length > 0 ? totalEarnings / completedDeliveries.length : 0
          };
        });
        
        setRiderStats(stats);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        Swal.fire('Error', 'Failed to load riders', 'error');
      }
    }
    
    fetchData();
  }, [user, isAdmin]);
  
  // Filter riders
  const filteredRiders = riders.filter(rider => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'online' && rider.isOnline) ||
      (filter === 'offline' && !rider.isOnline) ||
      (filter === 'active' && rider.status === 'active') ||
      (filter === 'inactive' && rider.status === 'inactive');
    
    const matchesSearch = !searchTerm || 
      rider.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.phone?.includes(searchTerm) ||
      rider.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.vehicleNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });
  
  // View rider details
  const handleViewDetails = async (rider) => {
    const stats = riderStats[rider.id] || {};
    
    await Swal.fire({
      title: `Rider: ${rider.name || rider.displayName}`,
      html: `
        <div class="text-left space-y-3">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 font-semibold">Phone</p>
              <p class="text-lg">${rider.phone || 'N/A'}</p>
            </div>
            <div>
              <p class="text-sm text-gray-600 font-semibold">Email</p>
              <p class="text-lg">${rider.email || 'N/A'}</p>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm text-gray-600 font-semibold">Status</p>
              <p class="text-lg">
                <span class="${rider.isOnline ? 'text-green-600' : 'text-gray-500'}">
                  ${rider.isOnline ? '🟢 Online' : '⚫ Offline'}
                </span>
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 font-semibold">Account Status</p>
              <p class="text-lg capitalize">${rider.status || 'active'}</p>
            </div>
          </div>
          
          <div>
            <p class="text-sm text-gray-600 font-semibold">🏍️ Vehicle</p>
            <p class="text-sm">${rider.vehicleType || 'N/A'} - ${rider.vehicleNumber || 'No plate'}</p>
          </div>
          
          <div class="bg-blue-50 p-3 rounded">
            <p class="text-sm text-gray-600 font-semibold mb-2">📊 Statistics</p>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div>Total Deliveries: <strong>${stats.totalDeliveries || 0}</strong></div>
              <div>Completed: <strong>${stats.completedDeliveries || 0}</strong></div>
              <div>Pending: <strong>${stats.pendingDeliveries || 0}</strong></div>
              <div>Success Rate: <strong>${stats.totalDeliveries > 0 ? Math.round((stats.completedDeliveries / stats.totalDeliveries) * 100) : 0}%</strong></div>
            </div>
          </div>
          
          <div class="bg-green-50 p-3 rounded">
            <p class="text-sm text-gray-600 font-semibold mb-2">💰 Earnings</p>
            <p class="text-2xl font-bold text-green-600">${formatCurrency(stats.totalEarnings || 0)}</p>
            <p class="text-xs text-gray-600">Average per delivery: ${formatCurrency(stats.averageEarning || 0)}</p>
          </div>
          
          ${rider.address ? `
            <div>
              <p class="text-sm text-gray-600 font-semibold">Address</p>
              <p class="text-sm">${rider.address}</p>
            </div>
          ` : ''}
          
          <div class="text-xs text-gray-500">
            <p>Joined: ${rider.createdAt?.toLocaleDateString() || 'Unknown'}</p>
            ${rider.lastSeen ? `<p>Last seen: ${new Date(rider.lastSeen).toLocaleString()}</p>` : ''}
          </div>
        </div>
      `,
      width: 600,
      confirmButtonText: 'Close',
      confirmButtonColor: '#E30613'
    });
  };
  
  // Normalize stored values to canonical forms for display — existing rider
  // docs carry aliases like 'go7', 'bike', 'moto' (backend treats 'bike' as
  // BICYCLE, so guessing MOTORCYCLE for unmapped values would be wrong).
  const displayVehicleOwnership = (v) => {
    const k = String(v || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    return ['go7', 'go7_owned', 'go7owned', 'company', 'company_owned', 'fleet', 'go7_bike'].includes(k)
      ? 'GO7_OWNED'
      : 'RIDER_OWNED';
  };
  const displayVehicleType = (v) => {
    const k = String(v || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (['bicycle', 'bike', 'push_bike'].includes(k)) return 'BICYCLE';
    if (['ebike', 'e_bike', 'electric_bike', 'electric'].includes(k)) return 'EBIKE';
    if (['motorcycle', 'moto', 'motorcycle_2', 'okada'].includes(k)) return 'MOTORCYCLE';
    return 'MOTORCYCLE';
  };

  // Update rider vehicle fields (vehicleType / vehicleOwnership drive pricing + dispatch)
  const handleUpdateVehicle = async (riderId, field, value) => {
    try {
      await updateDoc(doc(db, 'riders', riderId), { [field]: value, updatedAt: new Date() });
      setRiders(riders.map((r) => (r.id === riderId ? { ...r, [field]: value } : r)));
    } catch (error) {
      console.error('Error updating rider vehicle:', error);
      Swal.fire('Error', 'Failed to update rider vehicle', 'error');
    }
  };

  // Toggle rider status
  const handleToggleStatus = async (riderId, currentStatus) => {
    const rider = riders.find(r => r.id === riderId);
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    const result = await Swal.fire({
      title: 'Confirm Status Change',
      text: `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'deactivate'} ${rider.name || rider.displayName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: newStatus === 'active' ? '#10B981' : '#EF4444',
      confirmButtonText: `Yes, ${newStatus === 'active' ? 'activate' : 'deactivate'}`,
      cancelButtonText: 'Cancel'
    });
    
    if (result.isConfirmed) {
      try {
        const riderRef = doc(db, 'riders', riderId);
        await updateDoc(riderRef, {
          status: newStatus,
          updatedAt: new Date()
        });
        
        Swal.fire('Success', `Rider ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`, 'success');
        
        // Update local state
        setRiders(riders.map(r => 
          r.id === riderId ? { ...r, status: newStatus } : r
        ));
      } catch (error) {
        console.error('Error updating rider status:', error);
        Swal.fire('Error', 'Failed to update rider status', 'error');
      }
    }
  };
  
  // Get total stats
  const totalStats = {
    total: riders.length,
    online: riders.filter(r => r.isOnline).length,
    active: riders.filter(r => r.status === 'active' || !r.status).length,
    totalEarnings: Object.values(riderStats).reduce((sum, stat) => sum + (stat.totalEarnings || 0), 0),
    totalDeliveries: Object.values(riderStats).reduce((sum, stat) => sum + (stat.totalDeliveries || 0), 0),
    completedDeliveries: Object.values(riderStats).reduce((sum, stat) => sum + (stat.completedDeliveries || 0), 0)
  };
  
  // Redirect if not admin
  if (!loading && (!user || !isAdmin)) {
    return <Navigate to="/login?redirect=/admin/riders" replace />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Rider Management</h1>
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
              <div className="bg-blue-50 rounded-lg shadow p-4 border-l-4 border-blue-500">
                <h3 className="text-sm text-gray-600 font-medium">Total Riders</h3>
                <p className="text-2xl font-bold text-blue-600">{totalStats.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4 border-l-4 border-green-500">
                <h3 className="text-sm text-gray-600 font-medium">Online Now</h3>
                <p className="text-2xl font-bold text-green-600">{totalStats.online}</p>
              </div>
              <div className="bg-purple-50 rounded-lg shadow p-4 border-l-4 border-purple-500">
                <h3 className="text-sm text-gray-600 font-medium">Active Riders</h3>
                <p className="text-2xl font-bold text-purple-600">{totalStats.active}</p>
              </div>
              <div className="bg-orange-50 rounded-lg shadow p-4 border-l-4 border-orange-500">
                <h3 className="text-sm text-gray-600 font-medium">Total Earnings</h3>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalStats.totalEarnings)}</p>
              </div>
            </div>
            
            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm text-gray-600 font-medium mb-2">Total Deliveries</h3>
                <p className="text-3xl font-bold text-gray-800">{totalStats.totalDeliveries}</p>
                <p className="text-sm text-green-600 mt-1">{totalStats.completedDeliveries} completed</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm text-gray-600 font-medium mb-2">Average Earnings per Rider</h3>
                <p className="text-3xl font-bold text-gray-800">
                  {totalStats.total > 0 ? formatCurrency(totalStats.totalEarnings / totalStats.total) : formatCurrency(0)}
                </p>
                <p className="text-sm text-gray-600 mt-1">Across all riders</p>
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
                    <option value="all">All Riders</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                  <input
                    type="text"
                    placeholder="Search by name, phone, email, vehicle..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Riders Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deliveries
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRiders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                          No riders found
                        </td>
                      </tr>
                    ) : (
                      filteredRiders.map(rider => {
                        const stats = riderStats[rider.id] || {};
                        return (
                          <tr key={rider.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                                    {(rider.name || rider.displayName || 'R').charAt(0).toUpperCase()}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {rider.name || rider.displayName || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Joined {rider.createdAt?.toLocaleDateString() || 'Unknown'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{rider.phone || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{rider.email || 'No email'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{rider.vehicleType || 'N/A'}</div>
                              <div className="text-xs text-gray-500 mb-1">{rider.vehicleNumber || 'No plate'}</div>
                              <select
                                value={displayVehicleOwnership(rider.vehicleOwnership)}
                                onChange={(e) => handleUpdateVehicle(rider.id, 'vehicleOwnership', e.target.value)}
                                className={`text-xs border rounded px-1.5 py-0.5 ${
                                  displayVehicleOwnership(rider.vehicleOwnership) === 'GO7_OWNED'
                                    ? 'border-purple-300 bg-purple-50 text-purple-800'
                                    : 'border-gray-300 bg-gray-50 text-gray-700'
                                }`}
                                title="Vehicle ownership — drives rider share"
                              >
                                <option value="RIDER_OWNED">Rider-owned</option>
                                <option value="GO7_OWNED">Go7-owned</option>
                              </select>
                              <select
                                value={displayVehicleType(rider.vehicleType)}
                                onChange={(e) => handleUpdateVehicle(rider.id, 'vehicleType', e.target.value)}
                                className="text-xs border border-gray-300 rounded px-1.5 py-0.5 ml-1 text-gray-700"
                                title="Canonical vehicle type for dispatch"
                              >
                                <option value="BICYCLE">Bicycle</option>
                                <option value="MOTORCYCLE">Motorcycle</option>
                                <option value="EBIKE">E-bike</option>
                              </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  rider.isOnline 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {rider.isOnline ? '🟢 Online' : '⚫ Offline'}
                                </span>
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  (rider.status === 'active' || !rider.status)
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {rider.status === 'active' || !rider.status ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                <div className="text-gray-900 font-semibold">{stats.totalDeliveries || 0} total</div>
                                <div className="text-green-600 text-xs">{stats.completedDeliveries || 0} completed</div>
                                <div className="text-yellow-600 text-xs">{stats.pendingDeliveries || 0} pending</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                <div className="text-gray-900 font-bold">{formatCurrency(stats.totalEarnings || 0)}</div>
                                <div className="text-xs text-gray-500">
                                  Avg: {formatCurrency(stats.averageEarning || 0)}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => handleViewDetails(rider)}
                                  className="text-blue-600 hover:text-blue-900 text-left"
                                >
                                  View Details
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(rider.id, rider.status || 'active')}
                                  className={`${
                                    (rider.status === 'active' || !rider.status)
                                      ? 'text-red-600 hover:text-red-900' 
                                      : 'text-green-600 hover:text-green-900'
                                  } text-left`}
                                >
                                  {(rider.status === 'active' || !rider.status) ? 'Deactivate' : 'Activate'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
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

export default AdminRiders;
