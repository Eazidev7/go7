// GO7 Admin Delivery Replay Management Interface
// Secure admin panel for managing delivery route replays and exports

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Download, 
  Eye, 
  Trash2, 
  Filter, 
  Search, 
  Calendar,
  Clock,
  MapPin,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader,
  RefreshCw
} from 'lucide-react';
import { db, functions } from '../../firebase/config';
import { createMockDeliveryRoute, generateTestRoutes } from '../../utils/mockRouteGenerator';

export default function AdminReplayDashboard() {
  const navigate = useNavigate();
  
  // State management
  const [routes, setRoutes] = useState([]);
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRoutes, setSelectedRoutes] = useState([]);
  const [activeTab, setActiveTab] = useState('routes');
  const [filters, setFilters] = useState({
    dateRange: 'week',
    status: 'all',
    searchTerm: ''
  });

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({});

  // Load delivery routes
  const loadRoutes = async () => {
    try {
      setLoading(true);
      const routesRef = collection(db, 'deliveryRoutes');
      
      // Apply filters
      let q = query(routesRef, orderBy('startedAt', 'desc'), limit(50));
      
      if (filters.dateRange !== 'all') {
        const days = filters.dateRange === 'week' ? 7 : filters.dateRange === 'month' ? 30 : 90;
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        q = query(routesRef, where('startedAt', '>=', cutoffDate), orderBy('startedAt', 'desc'), limit(50));
      }

      const snapshot = await getDocs(q);
      const routesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startedAt: doc.data().startedAt?.toDate(),
        endedAt: doc.data().endedAt?.toDate()
      }));

      // Apply search filter
      const filteredRoutes = routesList.filter(route => {
        if (!filters.searchTerm) return true;
        const searchLower = filters.searchTerm.toLowerCase();
        return route.orderId?.toLowerCase().includes(searchLower) ||
               route.userId?.toLowerCase().includes(searchLower) ||
               route.riderId?.toLowerCase().includes(searchLower);
      });

      setRoutes(filteredRoutes);
    } catch (err) {
      console.error('Error loading routes:', err);
      setError('Failed to load delivery routes');
    } finally {
      setLoading(false);
    }
  };

  // Load export history
  const loadExports = async () => {
    try {
      const exportsRef = collection(db, 'routeExports');
      const q = query(exportsRef, orderBy('createdAt', 'desc'), limit(50));
      const snapshot = await getDocs(q);
      
      const exportsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }));

      setExports(exportsList);
    } catch (err) {
      console.error('Error loading exports:', err);
    }
  };

  // Generate test data
  const generateTestData = async () => {
    try {
      setLoading(true);
      const testSuite = generateTestRoutes();
      
      // Add test routes to Firestore (in a real app, you'd want better error handling)
      const routes = Object.values(testSuite);
      for (const route of routes) {
        // In a real implementation, you'd use Firebase Admin SDK or a cloud function
        console.log('Test route generated:', route);
      }
      
      // For demo purposes, add to local state
      const testRoutes = routes.map((route, index) => ({
        id: `test_${Date.now()}_${index}`,
        ...route,
        startedAt: route.startedAt?.toDate?.() || new Date(route.startedAt),
        endedAt: route.endedAt?.toDate?.() || new Date(route.endedAt)
      }));
      
      setRoutes(prev => [...testRoutes, ...prev]);
    } catch (err) {
      console.error('Error generating test data:', err);
      setError('Failed to generate test data');
    } finally {
      setLoading(false);
    }
  };

  // Export single route
  const exportRoute = async (routeId, format = 'gif') => {
    try {
      setExportProgress(prev => ({ ...prev, [routeId]: { status: 'starting', progress: 0 } }));
      
      const exportReplay = httpsCallable(functions, 'exportReplay');
      const result = await exportReplay({ 
        orderId: routeId, 
        format,
        options: { width: 800, height: 600, fps: 30, speedMultiplier: 4 }
      });

      setExportProgress(prev => ({ ...prev, [routeId]: { status: 'completed', downloadUrl: result.data.downloadUrl } }));
      
      // Refresh exports list
      loadExports();
      
    } catch (err) {
      console.error('Export error:', err);
      setExportProgress(prev => ({ ...prev, [routeId]: { status: 'failed', error: err.message } }));
    }
  };

  // Batch export routes
  const batchExport = async (format = 'mp4') => {
    if (selectedRoutes.length === 0) return;
    
    try {
      setExporting(true);
      const batchExportReplays = httpsCallable(functions, 'batchExportReplays');
      
      const result = await batchExportReplays({
        orderIds: selectedRoutes,
        format,
        options: { width: 1200, height: 800, fps: 30, speedMultiplier: 2 }
      });

      console.log('Batch export results:', result.data.results);
      loadExports();
      setSelectedRoutes([]);
      
    } catch (err) {
      console.error('Batch export error:', err);
      setError(`Batch export failed: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Delete route
  const deleteRoute = async (routeId) => {
    if (!confirm('Are you sure you want to delete this delivery route? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'deliveryRoutes', routeId));
      setRoutes(prev => prev.filter(route => route.id !== routeId));
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete route');
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    loadRoutes();
    loadExports();
  }, [filters]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  // Format duration
  const formatDuration = (ms) => {
    if (!ms) return 'Unknown';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Admin - Delivery Replay Management | Go7</title>
      </Helmet>

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delivery Replay Management</h1>
                <p className="text-gray-600">Manage delivery route replays and exports</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateTestData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Generate Test Data
              </button>
              
              {selectedRoutes.length > 0 && (
                <button
                  onClick={() => batchExport('mp4')}
                  disabled={exporting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  {exporting ? <Loader className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span>Export Selected ({selectedRoutes.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Tab Navigation */}
        <div className="flex space-x-6 border-b border-gray-200 mb-6">
          {['routes', 'exports'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 px-1 text-sm font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab === 'routes' ? `Routes (${routes.length})` : `Exports (${exports.length})`}
            </button>
          ))}
        </div>

        {/* Filters */}
        {activeTab === 'routes' && (
          <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="quarter">Last Quarter</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Search className="h-4 w-4 inline mr-1" />
                  Search
                </label>
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  placeholder="Order ID, User ID, or Rider ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center space-x-3"
            >
              <AlertCircle className="h-5 w-5 text-red-600" />
              <span className="text-red-800">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : activeTab === 'routes' ? (
          <RoutesTable 
            routes={routes}
            selectedRoutes={selectedRoutes}
            setSelectedRoutes={setSelectedRoutes}
            onExport={exportRoute}
            onDelete={deleteRoute}
            exportProgress={exportProgress}
          />
        ) : (
          <ExportsTable exports={exports} />
        )}
      </div>
    </div>
  );
}

// Routes Table Component
function RoutesTable({ routes, selectedRoutes, setSelectedRoutes, onExport, onDelete, exportProgress }) {
  const navigate = useNavigate();

  const toggleSelection = (routeId) => {
    setSelectedRoutes(prev => 
      prev.includes(routeId) 
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const toggleAllSelection = () => {
    setSelectedRoutes(prev => 
      prev.length === routes.length ? [] : routes.map(r => r.id)
    );
  };

  if (routes.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Routes Found</h3>
        <p className="text-gray-600">Try adjusting your filters or generate some test data.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectedRoutes.length === routes.length}
                onChange={toggleAllSelection}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order Details
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Route Info
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timing
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {routes.map((route) => {
            const progress = exportProgress[route.id];
            
            return (
              <tr key={route.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedRoutes.includes(route.id)}
                    onChange={() => toggleSelection(route.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{route.orderId || route.id}</div>
                  <div className="text-sm text-gray-500">User: {route.userId}</div>
                  <div className="text-sm text-gray-500">Rider: {route.riderId}</div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{route.meta?.totalPoints || 0} points</div>
                  <div className="text-sm text-gray-500">
                    {route.meta?.distanceMeters ? `${(route.meta.distanceMeters / 1000).toFixed(1)} km` : 'Unknown distance'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Avg: {route.meta?.avgSpeed?.toFixed(1) || 0} m/s
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {route.startedAt?.toLocaleString() || 'Unknown start'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Duration: {route.meta?.duration ? formatDuration(route.meta.duration) : 'Unknown'}
                  </div>
                </td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button
                    onClick={() => navigate(`/replay/${route.orderId || route.id}`)}
                    className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  
                  {progress?.status === 'starting' || progress?.status === 'processing' ? (
                    <span className="text-yellow-600 inline-flex items-center space-x-1">
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Exporting...</span>
                    </span>
                  ) : progress?.status === 'completed' ? (
                    <a
                      href={progress.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-900 inline-flex items-center space-x-1"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Download</span>
                    </a>
                  ) : progress?.status === 'failed' ? (
                    <span className="text-red-600 inline-flex items-center space-x-1" title={progress.error}>
                      <AlertCircle className="h-4 w-4" />
                      <span>Failed</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => onExport(route.orderId || route.id)}
                      className="text-purple-600 hover:text-purple-900 inline-flex items-center space-x-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDelete(route.id)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center space-x-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Exports Table Component
function ExportsTable({ exports }) {
  if (exports.length === 0) {
    return (
      <div className="text-center py-12">
        <Download className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No Exports Found</h3>
        <p className="text-gray-600">Export some delivery routes to see them here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Export Details
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              File Info
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
          {exports.map((exportItem) => (
            <tr key={exportItem.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{exportItem.orderId}</div>
                <div className="text-sm text-gray-500">Format: {exportItem.format?.toUpperCase()}</div>
                <div className="text-sm text-gray-500">User: {exportItem.userId}</div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  Size: {formatFileSize(exportItem.fileSize)}
                </div>
                <div className="text-sm text-gray-500">
                  Duration: {exportItem.duration ? `${exportItem.duration.toFixed(1)}s` : 'Unknown'}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {exportItem.createdAt?.toLocaleString() || 'Unknown'}
                </div>
              </td>
              
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <a
                  href={exportItem.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-900 inline-flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function (duplicate from RouteAnalytics for demo purposes)
function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}