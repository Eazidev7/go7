// GO7 Delivery Replay System - Main Component
// Production-ready route playback with smooth animations and controls
// Supports mobile performance optimization and real-time interpolation

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { GoogleMap, useLoadScript, Polyline, Marker } from '@react-google-maps/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { db } from '../firebase/config';
import { ArrowLeft, Download, Share } from 'lucide-react';
import ReplayControls from '../components/ReplayControls';
import PlaybackMarker from '../components/PlaybackMarker';
import RouteAnalytics from '../components/RouteAnalytics';
import '../styles/replay.css';

// Static libraries array for performance
const GOOGLE_MAPS_LIBRARIES = ['geometry'];

// Map styling optimized for route visualization
const mapContainerStyle = {
  width: '100%',
  height: '70vh',
  minHeight: '400px'
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  gestureHandling: 'greedy',
  styles: [
    {
      featureType: 'poi.business',
      stylers: [{ visibility: 'off' }]
    },
    {
      featureType: 'transit',
      stylers: [{ visibility: 'simplified' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.icon',
      stylers: [{ visibility: 'off' }]
    }
  ]
};

export default function DeliveryReplay() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  // Google Maps setup
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Core replay state
  const [routeData, setRouteData] = useState(null);
  const [route, setRoute] = useState([]);
  const [displayRoute, setDisplayRoute] = useState([]); // Downsampled for performance
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentTs, setCurrentTs] = useState(null);
  const [startTs, setStartTs] = useState(null);
  const [endTs, setEndTs] = useState(null);
  
  // Map and marker refs
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  
  // Playback state
  const [currentPosition, setCurrentPosition] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Performance optimization state
  const [routeStats, setRouteStats] = useState(null);
  const [stops, setStops] = useState([]);
  const rafRef = useRef(null);

  // Binary search for efficient point lookup
  const findNearestPoints = useCallback((timestamp, routePoints) => {
    if (!routePoints || routePoints.length === 0) return { prev: null, next: null, progress: 0 };
    
    let left = 0;
    let right = routePoints.length - 1;
    
    // Binary search for the closest timestamp
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (routePoints[mid].ts === timestamp) {
        return { prev: routePoints[mid], next: routePoints[mid], progress: 1 };
      } else if (routePoints[mid].ts < timestamp) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    // Get surrounding points for interpolation
    const prevIndex = Math.max(0, right);
    const nextIndex = Math.min(routePoints.length - 1, left);
    
    if (prevIndex === nextIndex) {
      return { prev: routePoints[prevIndex], next: routePoints[nextIndex], progress: 1 };
    }
    
    const prev = routePoints[prevIndex];
    const next = routePoints[nextIndex];
    const progress = (timestamp - prev.ts) / (next.ts - prev.ts);
    
    return { prev, next, progress: Math.max(0, Math.min(1, progress)) };
  }, []);

  // Linear interpolation with easing
  const interpolatePosition = useCallback((prev, next, progress) => {
    if (!prev || !next) return prev || next;
    
    // Smooth easing function for natural movement
    const easedProgress = progress < 0.5 
      ? 2 * progress * progress 
      : -1 + (4 - 2 * progress) * progress;
    
    return {
      lat: prev.lat + (next.lat - prev.lat) * easedProgress,
      lng: prev.lng + (next.lng - prev.lng) * easedProgress,
      speed: prev.speed + (next.speed - prev.speed) * easedProgress,
      bearing: prev.bearing + (next.bearing - prev.bearing) * easedProgress,
      ts: prev.ts + (next.ts - prev.ts) * progress
    };
  }, []);

  // Route downsampling for performance (Douglas-Peucker algorithm simplified)
  const downsampleRoute = useCallback((points, tolerance = 0.0001) => {
    if (points.length <= 2) return points;
    
    const result = [points[0]];
    let lastIndex = 0;
    
    for (let i = 1; i < points.length; i++) {
      const current = points[i];
      const last = points[lastIndex];
      
      // Calculate distance (simplified)
      const latDiff = Math.abs(current.lat - last.lat);
      const lngDiff = Math.abs(current.lng - last.lng);
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      
      // Keep point if significant movement or time gap
      if (distance > tolerance || (current.ts - last.ts) > 10000) {
        result.push(current);
        lastIndex = i;
      }
    }
    
    // Always include the last point
    if (result[result.length - 1] !== points[points.length - 1]) {
      result.push(points[points.length - 1]);
    }
    
    return result;
  }, []);

  // Detect stops in the route
  const detectStops = useCallback((points) => {
    const stops = [];
    let currentStop = null;
    const SPEED_THRESHOLD = 0.5; // m/s
    const TIME_THRESHOLD = 30000; // 30 seconds
    
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      
      if (point.speed < SPEED_THRESHOLD) {
        if (!currentStop) {
          currentStop = {
            startIndex: i,
            startTime: point.ts,
            lat: point.lat,
            lng: point.lng,
            duration: 0
          };
        }
      } else {
        if (currentStop) {
          const duration = point.ts - currentStop.startTime;
          if (duration >= TIME_THRESHOLD) {
            stops.push({
              ...currentStop,
              endIndex: i - 1,
              endTime: points[i - 1].ts,
              duration
            });
          }
          currentStop = null;
        }
      }
    }
    
    return stops;
  }, []);

  // Calculate route statistics
  const calculateStats = useCallback((points) => {
    if (!points || points.length === 0) return null;
    
    let totalDistance = 0;
    let maxSpeed = 0;
    let totalSpeed = 0;
    let speedCount = 0;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      
      // Calculate distance using Haversine formula (simplified)
      const R = 6371000; // Earth's radius in meters
      const dLat = (curr.lat - prev.lat) * Math.PI / 180;
      const dLng = (curr.lng - prev.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(prev.lat * Math.PI / 180) * Math.cos(curr.lat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      
      totalDistance += distance;
      
      if (curr.speed) {
        maxSpeed = Math.max(maxSpeed, curr.speed);
        totalSpeed += curr.speed;
        speedCount++;
      }
    }
    
    return {
      totalDistance: Math.round(totalDistance),
      maxSpeed: Math.round(maxSpeed * 10) / 10,
      avgSpeed: speedCount > 0 ? Math.round((totalSpeed / speedCount) * 10) / 10 : 0,
      duration: points[points.length - 1].ts - points[0].ts,
      totalPoints: points.length
    };
  }, []);

  // Load delivery route data
  useEffect(() => {
    async function loadRoute() {
      try {
        setIsLoading(true);
        const docRef = doc(db, 'deliveryRoutes', orderId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setError('Delivery route not found');
          return;
        }
        
        const data = docSnap.data();
        const fullRoute = data.path || [];
        
        if (fullRoute.length === 0) {
          setError('No route data available');
          return;
        }
        
        // Set route data
        setRouteData(data);
        setRoute(fullRoute);
        
        // Downsample for display performance
        const downsampled = downsampleRoute(fullRoute);
        setDisplayRoute(downsampled);
        
        // Set timestamps
        setStartTs(fullRoute[0].ts);
        setEndTs(fullRoute[fullRoute.length - 1].ts);
        setCurrentTs(fullRoute[0].ts);
        
        // Calculate statistics
        const stats = calculateStats(fullRoute);
        setRouteStats(stats);
        
        // Detect stops
        const routeStops = detectStops(fullRoute);
        setStops(routeStops);
        
        // Set initial position
        setCurrentPosition(fullRoute[0]);
        
      } catch (err) {
        console.error('Error loading route:', err);
        setError('Failed to load delivery route');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (orderId) {
      loadRoute();
    }
  }, [orderId, downsampleRoute, calculateStats, detectStops]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying || !route || currentTs >= endTs) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }
    
    let lastTime = performance.now();
    
    function tick(currentTime) {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      // Advance timeline based on speed
      setCurrentTs(prevTs => {
        const nextTs = prevTs + (deltaTime * speed);
        if (nextTs >= endTs) {
          setIsPlaying(false);
          return endTs;
        }
        return nextTs;
      });
      
      rafRef.current = requestAnimationFrame(tick);
    }
    
    rafRef.current = requestAnimationFrame(tick);
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isPlaying, route, speed, endTs]);

  // Update marker position when currentTs changes
  useEffect(() => {
    if (!route || currentTs === null) return;
    
    const { prev, next, progress } = findNearestPoints(currentTs, route);
    
    if (prev && next) {
      const interpolated = interpolatePosition(prev, next, progress);
      setCurrentPosition(interpolated);
      
      // Update breadcrumbs (keep last 50 points for performance)
      setBreadcrumbs(prevCrumbs => {
        const newCrumbs = [...prevCrumbs, interpolated];
        return newCrumbs.slice(-50);
      });
      
      // Center map on current position
      if (mapRef.current && interpolated) {
        mapRef.current.panTo({ lat: interpolated.lat, lng: interpolated.lng });
      }
    }
  }, [currentTs, route, findNearestPoints, interpolatePosition]);

  // Fit map to route bounds on load
  useEffect(() => {
    if (mapRef.current && displayRoute.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      displayRoute.forEach(point => {
        bounds.extend({ lat: point.lat, lng: point.lng });
      });
      mapRef.current.fitBounds(bounds, { padding: 50 });
    }
  }, [displayRoute, isLoaded]);

  // Event handlers
  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleSpeedChange = (newSpeed) => setSpeed(newSpeed);
  
  const handleSeek = (timestamp) => {
    setCurrentTs(timestamp);
    setBreadcrumbs([]); // Clear breadcrumbs when seeking
  };
  
  const handleStepForward = () => {
    const nextTs = Math.min(currentTs + 5000, endTs); // 5 second step
    setCurrentTs(nextTs);
  };
  
  const handleStepBackward = () => {
    const prevTs = Math.max(currentTs - 5000, startTs); // 5 second step
    setCurrentTs(prevTs);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export feature coming soon');
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Maps Loading Error</h2>
          <p className="text-gray-600">Unable to load Google Maps. Please check your API key.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Maps...</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Loading Delivery Route</h2>
          <p className="text-gray-600">Please wait while we load the route data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 p-6 rounded-lg max-w-md">
            <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => navigate(-1)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-replay-page bg-gray-50 min-h-screen">
      <Helmet>
        <title>Delivery Replay - {orderId} | Go7</title>
        <meta name="description" content={`Watch the delivery route replay for order ${orderId}`} />
      </Helmet>

      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Delivery Replay</h1>
                <p className="text-sm text-gray-600">Order {orderId}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <Share className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          
          {/* Map Container */}
          <div className="relative">
            <GoogleMap
              ref={mapRef}
              mapContainerStyle={mapContainerStyle}
              options={mapOptions}
              onLoad={map => {
                mapRef.current = map;
              }}
            >
              {/* Main Route Polyline */}
              {displayRoute.length > 0 && (
                <Polyline
                  ref={polylineRef}
                  path={displayRoute.map(p => ({ lat: p.lat, lng: p.lng }))}
                  options={{
                    strokeColor: '#E0001B',
                    strokeOpacity: 0.8,
                    strokeWeight: 4,
                    geodesic: true
                  }}
                />
              )}
              
              {/* Breadcrumb Trail */}
              {breadcrumbs.length > 1 && (
                <Polyline
                  path={breadcrumbs.map(p => ({ lat: p.lat, lng: p.lng }))}
                  options={{
                    strokeColor: '#FF6B6B',
                    strokeOpacity: 0.6,
                    strokeWeight: 3,
                    geodesic: true
                  }}
                />
              )}
              
              {/* Animated Rider Marker */}
              {currentPosition && (
                <PlaybackMarker 
                  position={currentPosition}
                  speed={currentPosition.speed}
                  bearing={currentPosition.bearing}
                />
              )}
              
              {/* Stop Markers */}
              {stops.map((stop, index) => (
                <Marker
                  key={index}
                  position={{ lat: stop.lat, lng: stop.lng }}
                  icon={{
                    url: 'data:image/svg+xml,' + encodeURIComponent(`
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8" fill="#FFA500" stroke="#fff" stroke-width="2"/>
                        <circle cx="12" cy="12" r="3" fill="#fff"/>
                      </svg>
                    `),
                    scaledSize: new window.google.maps.Size(24, 24),
                    anchor: new window.google.maps.Point(12, 12)
                  }}
                  title={`Stop ${index + 1}: ${Math.round(stop.duration / 1000)}s`}
                />
              ))}
            </GoogleMap>
          </div>
          
          {/* Controls */}
          <div className="p-6">
            <ReplayControls
              isPlaying={isPlaying}
              speed={speed}
              currentTs={currentTs}
              startTs={startTs}
              endTs={endTs}
              onPlay={handlePlay}
              onPause={handlePause}
              onSpeedChange={handleSpeedChange}
              onSeek={handleSeek}
              onStepForward={handleStepForward}
              onStepBackward={handleStepBackward}
            />
          </div>
          
          {/* Route Analytics */}
          {routeStats && (
            <div className="border-t border-gray-200 p-6">
              <RouteAnalytics
                stats={routeStats}
                stops={stops}
                routeData={routeData}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}