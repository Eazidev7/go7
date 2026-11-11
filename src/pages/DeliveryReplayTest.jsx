// GO7 Delivery Replay Test Page
// Generate and test mock delivery routes for the replay system

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, 
  Play, 
  Database, 
  Route, 
  Clock, 
  MapPin, 
  Zap,
  Gauge,
  Users,
  Download
} from 'lucide-react';
import { db } from '../firebase/config';
import { createMockDeliveryRoute, generateTestRoutes, DeliveryRouteGenerator } from '../utils/mockRouteGenerator';

export default function DeliveryReplayTest() {
  const navigate = useNavigate();
  const [testRoutes, setTestRoutes] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedRoutes, setUploadedRoutes] = useState([]);

  // Generate different types of test routes
  const generateRoutes = async () => {
    setGenerating(true);
    
    try {
      // Generate various test scenarios
      const generator = new DeliveryRouteGenerator();
      
      const routes = [
        // Quick delivery scenarios
        { ...generator.generateQuickRoute(), label: 'Express Delivery (12 min)', type: 'express' },
        
        // Normal delivery scenarios
        { ...generator.generateNormalRoute(), label: 'Standard Delivery (25 min)', type: 'normal' },
        { ...generator.generateNormalRoute(), label: 'Standard Delivery (28 min)', type: 'normal' },
        
        // Long delivery scenarios
        { ...generator.generateLongRoute(), label: 'Long Distance (45 min)', type: 'long' },
        
        // Delivery with stops
        { ...generator.generateRouteWithStops(), label: 'Multiple Stops (35 min)', type: 'stops' },
        
        // Edge cases
        ...Object.entries(generator.generateEdgeCases()).map(([key, route]) => ({
          ...route,
          label: `Edge Case: ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          type: 'edge'
        }))
      ];

      setTestRoutes(routes);
    } catch (error) {
      console.error('Error generating routes:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Upload routes to Firestore for testing
  const uploadRoutes = async () => {
    setUploading(true);
    const uploaded = [];
    
    try {
      for (const route of testRoutes) {
        if (route.path && route.path.length > 0) {
          // Upload to Firestore
          const docRef = await addDoc(collection(db, 'deliveryRoutes'), {
            ...route,
            createdAt: new Date(),
            testData: true // Mark as test data
          });
          
          uploaded.push({
            ...route,
            firestoreId: docRef.id
          });
        }
      }
      
      setUploadedRoutes(uploaded);
    } catch (error) {
      console.error('Error uploading routes:', error);
      alert('Failed to upload routes to Firestore');
    } finally {
      setUploading(false);
    }
  };

  // Download route data as JSON
  const downloadRouteData = (route) => {
    const dataStr = JSON.stringify(route, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `delivery_route_${route.orderId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format route statistics
  const formatRouteStats = (route) => {
    if (!route.meta) return { distance: '0 km', avgSpeed: '0 km/h', points: 0, duration: '0 min' };
    
    return {
      distance: `${(route.meta.distanceMeters / 1000).toFixed(1)} km`,
      avgSpeed: `${(route.meta.avgSpeed * 3.6).toFixed(1)} km/h`,
      points: route.meta.totalPoints || route.path?.length || 0,
      duration: route.meta.duration ? `${Math.round(route.meta.duration / 60000)} min` : 'Unknown'
    };
  };

  // Get route type color
  const getRouteTypeColor = (type) => {
    const colors = {
      express: 'bg-green-100 text-green-800 border-green-200',
      normal: 'bg-blue-100 text-blue-800 border-blue-200',
      long: 'bg-purple-100 text-purple-800 border-purple-200',
      stops: 'bg-orange-100 text-orange-800 border-orange-200',
      edge: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[type] || colors.normal;
  };

  // Generate routes on mount
  useEffect(() => {
    generateRoutes();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Delivery Replay Test | Go7</title>
        <meta name="description" content="Test and generate mock delivery routes for replay system" />
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
                <h1 className="text-2xl font-bold text-gray-900">Delivery Replay Test</h1>
                <p className="text-gray-600">Generate and test mock delivery routes</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={generateRoutes}
                disabled={generating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                <Database className="h-4 w-4" />
                <span>{generating ? 'Generating...' : 'Regenerate Routes'}</span>
              </button>
              
              {testRoutes.length > 0 && (
                <button
                  onClick={uploadRoutes}
                  disabled={uploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                >
                  <Database className="h-4 w-4" />
                  <span>{uploading ? 'Uploading...' : 'Upload to Firestore'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      {testRoutes.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3">
                <Route className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Routes</p>
                  <p className="text-2xl font-bold text-gray-900">{testRoutes.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3">
                <MapPin className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Points</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {testRoutes.reduce((sum, route) => sum + (route.path?.length || 0), 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Duration</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(testRoutes.reduce((sum, route) => sum + (route.meta?.duration || 0), 0) / 60000)} min
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center space-x-3">
                <Gauge className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">Avg Speed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(testRoutes.reduce((sum, route) => sum + (route.meta?.avgSpeed || 0), 0) / testRoutes.length * 3.6).toFixed(1)} km/h
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Success Message */}
          {uploadedRoutes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-green-600 rounded-full p-1">
                  <Database className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-green-900">Routes Uploaded Successfully!</h3>
                  <p className="text-green-700">
                    {uploadedRoutes.length} routes have been uploaded to Firestore. 
                    You can now test them in the replay system.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Routes Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {testRoutes.map((route, index) => {
              const stats = formatRouteStats(route);
              const uploaded = uploadedRoutes.find(r => r.orderId === route.orderId);
              
              return (
                <motion.div
                  key={route.orderId || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden"
                >
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1">{route.label}</h3>
                        <p className="text-sm text-gray-600">Order: {route.orderId}</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border mt-2 ${getRouteTypeColor(route.type)}`}>
                          {route.type}
                        </span>
                      </div>
                      
                      {uploaded && (
                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          Uploaded
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Distance</p>
                        <p className="font-medium text-gray-900">{stats.distance}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Avg Speed</p>
                        <p className="font-medium text-gray-900">{stats.avgSpeed}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="font-medium text-gray-900">{stats.duration}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Data Points</p>
                        <p className="font-medium text-gray-900">{stats.points}</p>
                      </div>
                    </div>

                    {/* Route Details */}
                    <div className="text-sm text-gray-600 mb-4">
                      <p><strong>Pickup:</strong> {route.pickup?.name || 'Unknown'}</p>
                      <p><strong>Delivery:</strong> {route.delivery?.name || 'Unknown'}</p>
                      {route.startedAt && (
                        <p><strong>Started:</strong> {new Date(route.startedAt).toLocaleString()}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {uploaded ? (
                        <button
                          onClick={() => navigate(`/replay/${route.orderId}`)}
                          className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                        >
                          <Play className="h-4 w-4" />
                          <span>View Replay</span>
                        </button>
                      ) : (
                        <div className="flex-1 bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-center">
                          Upload to enable replay
                        </div>
                      )}
                      
                      <button
                        onClick={() => downloadRouteData(route)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <Download className="h-4 w-4" />
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loading State */}
      {generating && (
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Generating Test Routes</h3>
            <p className="text-gray-600">Creating realistic delivery scenarios...</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">How to Test the Replay System</h3>
          <ol className="list-decimal list-inside text-blue-800 space-y-1">
            <li>Click "Upload to Firestore" to save test routes to the database</li>
            <li>Click "View Replay" on any uploaded route to test the playback system</li>
            <li>Use playback controls to test play/pause, speed adjustment, and seeking</li>
            <li>Download JSON files to inspect the route data structure</li>
            <li>Test different route types to verify edge case handling</li>
          </ol>
        </div>
      </div>
    </div>
  );
}