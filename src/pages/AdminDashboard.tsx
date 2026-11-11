import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  doc,
  updateDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import PinModal from '../components/admin/PinModal';
import AdminRiderRatings from '../components/admin/AdminRiderRatings';
import AdminWalletManagement from '../components/AdminWalletManagement';
import { formatDistance, currencyFormatNGN } from '../utils/pricing';
import { formatDuration } from '../utils/directions';

// Type definitions
interface Delivery {
  liveId: string;
  jobId: string;
  status: string;
  customerName: string;
  customerPhone: string;
  pickupArea: string;
  dropoffArea: string;
  distanceKm: number;
  durationMin?: number;
  estimatedPrice: number;
  riderId: string;
  riderName?: string;
  createdAt: Timestamp;
  acceptedAt?: Timestamp;
  pickedUpAt?: Timestamp;
  deliveredAt?: Timestamp;
}

interface DeliveryCounter {
  active: number;
  assigned: number;
  pickedUp: number;
  completed: number;
}

interface Rider {
  id: string;
  name: string;
  phone: string;
  rating?: number;
  isAvailable?: boolean;
}

// Helper function to format timestamp
const formatTimestamp = (timestamp?: Timestamp): string => {
  if (!timestamp) return '--';
  
  const date = timestamp.toDate();
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

// Main component
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [showPinModal, setShowPinModal] = useState<boolean>(true);
  
  // Dashboard state
  const [counters, setCounters] = useState<DeliveryCounter>({
    active: 0,
    assigned: 0,
    pickedUp: 0,
    completed: 0
  });
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [areas, setAreas] = useState<string[]>([]);
  
  // Reassignment state
  const [reassigningDelivery, setReassigningDelivery] = useState<string | null>(null);
  const [selectedRider, setSelectedRider] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'ratings' | 'wallet'>('deliveries');

  // Check authentication on load
  useEffect(() => {
    const authStatus = sessionStorage.getItem('go7_admin_auth') === 'true';
    setIsAuthenticated(authStatus);
    setShowPinModal(!authStatus);
  }, []);

  // Subscribe to delivery counters
  useEffect(() => {
    if (!isAuthenticated) return;

    setLoading(true);
    
    // Get today's start timestamp (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = Timestamp.fromDate(today);
    
    // Query for active deliveries (assigned or picked_up)
    const activeQuery = query(
      collection(db, 'deliveries'),
      where('status', 'in', ['assigned', 'picked_up']),
      orderBy('createdAt', 'desc')
    );
    
    // Query for today's completed deliveries
    const completedTodayQuery = query(
      collection(db, 'deliveries'),
      where('status', '==', 'completed'),
      where('deliveredAt', '>=', todayStart),
      orderBy('deliveredAt', 'desc')
    );
    
    // Subscribe to active deliveries
    const unsubscribeActive = onSnapshot(activeQuery, (snapshot) => {
      const assignedCount = snapshot.docs.filter(doc => doc.data().status === 'assigned').length;
      const pickedUpCount = snapshot.docs.filter(doc => doc.data().status === 'picked_up').length;
      
      setCounters(prev => ({
        ...prev,
        active: assignedCount + pickedUpCount,
        assigned: assignedCount,
        pickedUp: pickedUpCount
      }));
    });
    
    // Subscribe to completed deliveries for today
    const unsubscribeCompleted = onSnapshot(completedTodayQuery, (snapshot) => {
      setCounters(prev => ({
        ...prev,
        completed: snapshot.docs.length
      }));
    });
    
    return () => {
      unsubscribeActive();
      unsubscribeCompleted();
    };
  }, [isAuthenticated]);

  // Subscribe to latest deliveries
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Query for latest 20 deliveries across all statuses
    const deliveriesQuery = query(
      collection(db, 'deliveries'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(deliveriesQuery, (snapshot) => {
      const deliveryDocs: Delivery[] = snapshot.docs.map(doc => ({
        liveId: doc.id,
        ...(doc.data() as Omit<Delivery, 'liveId'>)
      }));
      
      setDeliveries(deliveryDocs);
      
      // Extract unique areas for filtering
      const uniqueAreas = Array.from(new Set([
        ...deliveryDocs.map(d => d.pickupArea),
        ...deliveryDocs.map(d => d.dropoffArea)
      ])).filter(Boolean).sort();
      
      setAreas(uniqueAreas);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [isAuthenticated]);

  // Get all riders for reassignment
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const fetchRiders = async () => {
      const ridersQuery = query(
        collection(db, 'riders'),
        where('isActive', '==', true)
      );
      
      const snapshot = await getDocs(ridersQuery);
      const riderDocs: Rider[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Rider, 'id'>)
      }));
      
      setRiders(riderDocs);
    };
    
    fetchRiders().catch(console.error);
  }, [isAuthenticated]);
  
  // Apply filters to deliveries
  useEffect(() => {
    let filtered = [...deliveries];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(delivery => delivery.status === statusFilter);
    }
    
    // Apply area filter
    if (areaFilter !== 'all') {
      filtered = filtered.filter(
        delivery => delivery.pickupArea === areaFilter || delivery.dropoffArea === areaFilter
      );
    }
    
    setFilteredDeliveries(filtered);
  }, [deliveries, statusFilter, areaFilter]);

  // Handle authentication success
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setShowPinModal(false);
  };
  
  // Handle authentication cancel
  const handleAuthCancel = () => {
    navigate('/');
  };
  
  // Handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('go7_admin_auth');
    setIsAuthenticated(false);
    navigate('/');
  };
  
  // Handle reassign delivery
  const handleReassignDelivery = async (deliveryId: string) => {
    if (!selectedRider) return;
    
    setIsProcessing(true);
    
    try {
      // Find rider details
      const rider = riders.find(r => r.id === selectedRider);
      if (!rider) throw new Error('Rider not found');
      
      // Update delivery document
      const deliveryRef = doc(db, 'deliveries', deliveryId);
      await updateDoc(deliveryRef, {
        riderId: rider.id,
        riderName: rider.name,
        status: 'assigned',
        updatedAt: Timestamp.now(),
        acceptedAt: Timestamp.now(),
        reassignedAt: Timestamp.now(),
        reassignedBy: 'admin',
        
        // Add timeline entry
        [`timeline.${Date.now()}`]: {
          status: 'assigned',
          timestamp: Timestamp.now(),
          note: `Admin reassigned delivery to ${rider.name}`
        }
      });
      
      // Reset state
      setReassigningDelivery(null);
      setSelectedRider('');
      
      // Show confirmation
      alert(`Delivery reassigned to ${rider.name} successfully`);
    } catch (error) {
      console.error('Error reassigning delivery:', error);
      alert('Failed to reassign delivery. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // If not authenticated, show PIN modal or nothing
  if (!isAuthenticated) {
    return showPinModal ? (
      <PinModal onSuccess={handleAuthSuccess} onCancel={handleAuthCancel} />
    ) : null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Go7 Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
          >
            Logout
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('deliveries')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'deliveries'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📦 Deliveries
              </button>
              <button
                onClick={() => setActiveTab('ratings')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ratings'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ⭐ Rider Ratings
              </button>
              <button
                onClick={() => setActiveTab('wallet')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'wallet'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                💰 Wallet Management
              </button>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'deliveries' && (
          <>
        {/* Counters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Active Deliveries</h3>
            <p className="text-3xl font-bold text-gray-900">{counters.active}</p>
            <div className="text-xs text-gray-500 mt-2">
              Assigned: {counters.assigned} | Picked up: {counters.pickedUp}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Assigned</h3>
            <p className="text-3xl font-bold text-yellow-600">{counters.assigned}</p>
            <div className="text-xs text-gray-500 mt-2">
              Awaiting pickup
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">In Transit</h3>
            <p className="text-3xl font-bold text-blue-600">{counters.pickedUp}</p>
            <div className="text-xs text-gray-500 mt-2">
              En route to delivery
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Delivered Today</h3>
            <p className="text-3xl font-bold text-green-600">{counters.completed}</p>
            <div className="text-xs text-gray-500 mt-2">
              Since midnight
            </div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="all">All Statuses</option>
                <option value="created">Created</option>
                <option value="assigned">Assigned</option>
                <option value="picked_up">Picked Up</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Area
              </label>
              <select
                id="area-filter"
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="all">All Areas</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            
            <div className="flex-grow flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setAreaFilter('all');
                }}
                className="text-sm text-gray-600 hover:text-gray-800 py-2 px-3 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
        
        {/* Deliveries Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Latest Deliveries</h3>
            <p className="mt-1 text-sm text-gray-500">
              {filteredDeliveries.length} {filteredDeliveries.length === 1 ? 'delivery' : 'deliveries'} found
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Job ID
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Route
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rider
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Info
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                      Loading deliveries...
                    </td>
                  </tr>
                ) : filteredDeliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                      No deliveries found matching the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredDeliveries.map((delivery) => (
                    <tr key={delivery.liveId}>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {delivery.jobId}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                          delivery.status === 'completed' ? 'bg-green-100 text-green-800' :
                          delivery.status === 'picked_up' ? 'bg-blue-100 text-blue-800' :
                          delivery.status === 'assigned' ? 'bg-yellow-100 text-yellow-800' :
                          delivery.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {delivery.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="font-medium text-gray-900">{delivery.customerName}</div>
                        <div>{delivery.customerPhone}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-red-100 text-red-800 rounded-full text-xs mr-2">A</span>
                          <span>{delivery.pickupArea}</span>
                        </div>
                        <div className="ml-7">→</div>
                        <div className="flex items-center">
                          <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-800 rounded-full text-xs mr-2">B</span>
                          <span>{delivery.dropoffArea}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {delivery.riderName || 'Not assigned'}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        <div className="space-y-1">
                          <div>{formatDistance(delivery.distanceKm)}</div>
                          {delivery.durationMin && (
                            <div>{formatDuration(delivery.durationMin)}</div>
                          )}
                          <div>{currencyFormatNGN(delivery.estimatedPrice)}</div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        {reassigningDelivery === delivery.liveId ? (
                          <div className="flex flex-col space-y-2">
                            <select
                              aria-label="Select rider for reassignment"
                              value={selectedRider}
                              onChange={(e) => setSelectedRider(e.target.value)}
                              className="text-sm border border-gray-300 rounded-md"
                              disabled={isProcessing}
                            >
                              <option value="">Select Rider</option>
                              {riders.map(rider => (
                                <option key={rider.id} value={rider.id}>
                                  {rider.name}
                                </option>
                              ))}
                            </select>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleReassignDelivery(delivery.liveId)}
                                disabled={!selectedRider || isProcessing}
                                className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 disabled:opacity-50"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => {
                                  setReassigningDelivery(null);
                                  setSelectedRider('');
                                }}
                                disabled={isProcessing}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded hover:bg-gray-200 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setReassigningDelivery(delivery.liveId)}
                            disabled={delivery.status === 'completed' || delivery.status === 'cancelled'}
                            className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 disabled:hover:text-indigo-600"
                          >
                            Reassign
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {filteredDeliveries.length > 0 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
              Showing {filteredDeliveries.length} of {deliveries.length} deliveries
            </div>
          )}
        </div>
        </>
        )}
        
        {activeTab === 'ratings' && (
          <AdminRiderRatings />
        )}
        
        {activeTab === 'wallet' && (
          <AdminWalletManagement />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
