// GO7 Route Analytics Component
// Displays comprehensive delivery route statistics and insights

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  MapPin, 
  Gauge, 
  Route, 
  Pause,
  TrendingUp,
  Download,
  BarChart3,
  Eye,
  EyeOff
} from 'lucide-react';

export default function RouteAnalytics({ stats, stops, routeData }) {
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  if (!stats) return null;

  // Format metrics
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters} m`;
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const formatSpeed = (ms) => `${(ms * 3.6).toFixed(1)} km/h`;

  // Calculate efficiency metrics
  const efficiencyScore = Math.min(100, Math.max(0, 
    (stats.avgSpeed / Math.max(stats.maxSpeed, 1)) * 100
  ));

  const stopTime = stops.reduce((total, stop) => total + stop.duration, 0);
  const moveTime = stats.duration - stopTime;
  const movePercentage = (moveTime / stats.duration) * 100;

  // Generate export data
  const handleExportData = (format) => {
    const exportData = {
      orderId: routeData?.orderId,
      timestamp: new Date().toISOString(),
      statistics: stats,
      stops: stops,
      route: routeData?.path
    };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      downloadBlob(blob, `delivery-route-${routeData?.orderId}.json`);
    } else if (format === 'csv') {
      const csvData = routeDataToCSV(routeData?.path || []);
      const blob = new Blob([csvData], { type: 'text/csv' });
      downloadBlob(blob, `delivery-route-${routeData?.orderId}.csv`);
    } else if (format === 'geojson') {
      const geoJson = routeToGeoJSON(routeData?.path || [], routeData);
      const blob = new Blob([JSON.stringify(geoJson, null, 2)], { 
        type: 'application/geo+json' 
      });
      downloadBlob(blob, `delivery-route-${routeData?.orderId}.geojson`);
    }
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const routeDataToCSV = (path) => {
    const headers = ['timestamp', 'latitude', 'longitude', 'speed', 'bearing'];
    const rows = path.map(point => [
      new Date(point.ts).toISOString(),
      point.lat,
      point.lng,
      point.speed || 0,
      point.bearing || 0
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const routeToGeoJSON = (path, metadata) => {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            orderId: metadata?.orderId,
            userId: metadata?.userId,
            riderId: metadata?.riderId,
            startedAt: metadata?.startedAt?.toDate?.()?.toISOString(),
            endedAt: metadata?.endedAt?.toDate?.()?.toISOString(),
            statistics: stats
          },
          geometry: {
            type: 'LineString',
            coordinates: path.map(point => [point.lng, point.lat])
          }
        }
      ]
    };
  };

  return (
    <div className="route-analytics">
      {/* Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <span>Route Analytics</span>
        </h3>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center space-x-2 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span>{showDetails ? 'Hide Details' : 'Show Details'}</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div 
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <Route className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 font-medium">Distance</p>
              <p className="text-xl font-bold text-blue-900">{formatDistance(stats.totalDistance)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-green-700 font-medium">Duration</p>
              <p className="text-xl font-bold text-green-900">{formatDuration(stats.duration)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <Gauge className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700 font-medium">Avg Speed</p>
              <p className="text-xl font-bold text-purple-900">{formatSpeed(stats.avgSpeed)}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center space-x-3">
            <Pause className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-sm text-orange-700 font-medium">Stops</p>
              <p className="text-xl font-bold text-orange-900">{stops.length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Detailed Analytics */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Tab Navigation */}
            <div className="flex space-x-4 border-b border-gray-200 mb-6">
              {['overview', 'stops', 'export'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 px-1 text-sm font-medium capitalize transition-colors border-b-2 ${
                    activeTab === tab
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-48">
              {activeTab === 'overview' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid md:grid-cols-2 gap-6"
                >
                  {/* Performance Metrics */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span>Performance</span>
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Efficiency Score</span>
                          <span className="font-medium">{efficiencyScore.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${efficiencyScore}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Moving Time</span>
                          <span className="font-medium">{movePercentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${movePercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Speed Analysis */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Speed Analysis</h4>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Maximum Speed</span>
                        <span className="font-medium">{formatSpeed(stats.maxSpeed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Speed</span>
                        <span className="font-medium">{formatSpeed(stats.avgSpeed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Data Points</span>
                        <span className="font-medium">{stats.totalPoints.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'stops' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  {stops.length > 0 ? (
                    stops.map((stop, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                            <MapPin className="h-4 w-4 text-red-600" />
                            <span>Stop {index + 1}</span>
                          </h5>
                          <span className="text-sm text-gray-500">
                            {formatDuration(stop.duration)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Started:</span>
                            <br />
                            <span className="font-medium">
                              {new Date(stop.startTime).toLocaleTimeString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Ended:</span>
                            <br />
                            <span className="font-medium">
                              {new Date(stop.endTime).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Pause className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No stops detected during this delivery</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'export' && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <p className="text-gray-600 mb-4">
                    Export delivery route data in various formats for analysis or record keeping.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-4">
                    <button
                      onClick={() => handleExportData('json')}
                      className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Download className="h-5 w-5 text-blue-600" />
                      <div className="text-left">
                        <div className="font-medium">JSON</div>
                        <div className="text-sm text-gray-600">Complete route data</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleExportData('csv')}
                      className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Download className="h-5 w-5 text-green-600" />
                      <div className="text-left">
                        <div className="font-medium">CSV</div>
                        <div className="text-sm text-gray-600">Spreadsheet format</div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => handleExportData('geojson')}
                      className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Download className="h-5 w-5 text-purple-600" />
                      <div className="text-left">
                        <div className="font-medium">GeoJSON</div>
                        <div className="text-sm text-gray-600">GIS compatible</div>
                      </div>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}