// GO7 Firebase Live Tracking Integration
// Connect simulation-optimized components to real Firestore data

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  Timestamp,
  query,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase/config';

export class LiveTrackingService {
  constructor(orderId) {
    this.orderId = orderId;
    this.listeners = new Map();
    this.isActive = false;
    this.lastPosition = null;
    this.routePoints = [];
    
    // Performance optimization
    this.updateThrottle = 2000; // 2 seconds between updates
    this.maxRoutePoints = 500; // Limit route points for performance
    this.positionBuffer = [];
    this.bufferTimeout = null;
  }

  // Start live tracking subscription
  startTracking(callbacks = {}) {
    if (this.isActive) return;
    
    this.isActive = true;
    const { onPositionUpdate, onStatusChange, onRouteUpdate, onError } = callbacks;

    try {
      // Listen to rider position updates
      const positionRef = doc(db, 'liveDeliveries', this.orderId);
      const unsubscribePosition = onSnapshot(
        positionRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            this.handlePositionUpdate(data, onPositionUpdate);
            
            if (data.status && onStatusChange) {
              onStatusChange(data.status);
            }
          }
        },
        (error) => {
          console.error('❌ Position tracking error:', error);
          if (onError) onError(error);
        }
      );

      // Listen to route updates (for replay and path drawing)
      const routeRef = collection(db, 'deliveryRoutes', this.orderId, 'positions');
      const routeQuery = query(routeRef, orderBy('timestamp', 'desc'));
      
      const unsubscribeRoute = onSnapshot(
        routeQuery,
        (snapshot) => {
          const routeData = [];
          snapshot.forEach((doc) => {
            routeData.push({ id: doc.id, ...doc.data() });
          });
          
          this.routePoints = routeData.reverse(); // Chronological order
          
          // Optimize route for performance
          if (this.routePoints.length > this.maxRoutePoints) {
            this.routePoints = this.downsampleRoute(this.routePoints);
          }
          
          if (onRouteUpdate) {
            onRouteUpdate(this.routePoints);
          }
        },
        (error) => {
          console.error('❌ Route tracking error:', error);
          if (onError) onError(error);
        }
      );

      // Store unsubscribe functions
      this.listeners.set('position', unsubscribePosition);
      this.listeners.set('route', unsubscribeRoute);
      
      console.log(`🎯 Live tracking started for order: ${this.orderId}`);
      
    } catch (error) {
      console.error('❌ Failed to start live tracking:', error);
      if (onError) onError(error);
    }
  }

  // Handle position updates with throttling
  handlePositionUpdate(data, callback) {
    if (!data.location) return;
    
    const position = {
      lat: data.location.lat,
      lng: data.location.lng,
      timestamp: data.timestamp?.toMillis() || Date.now(),
      speed: data.speed || 0,
      bearing: data.bearing || 0,
      accuracy: data.accuracy || 10
    };

    // Throttle updates for performance
    this.positionBuffer.push(position);
    
    if (this.bufferTimeout) return;
    
    this.bufferTimeout = setTimeout(() => {
      const latestPosition = this.positionBuffer[this.positionBuffer.length - 1];
      this.lastPosition = latestPosition;
      
      if (callback) {
        callback(latestPosition);
      }
      
      this.positionBuffer = [];
      this.bufferTimeout = null;
    }, this.updateThrottle);
  }

  // Downsample route for performance (keep important points)
  downsampleRoute(points) {
    if (points.length <= this.maxRoutePoints) return points;
    
    const step = Math.floor(points.length / this.maxRoutePoints);
    const downsampled = [];
    
    // Always keep first and last points
    downsampled.push(points[0]);
    
    for (let i = step; i < points.length - step; i += step) {
      downsampled.push(points[i]);
    }
    
    // Always keep last point
    if (points.length > 1) {
      downsampled.push(points[points.length - 1]);
    }
    
    console.log(`📉 Route downsampled: ${points.length} → ${downsampled.length} points`);
    return downsampled;
  }

  // Stop tracking
  stopTracking() {
    this.isActive = false;
    
    // Cleanup listeners
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
    
    // Clear buffers
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
    
    this.positionBuffer = [];
    
    console.log(`🛑 Live tracking stopped for order: ${this.orderId}`);
  }

  // Get current status
  getStatus() {
    return {
      isActive: this.isActive,
      lastPosition: this.lastPosition,
      routePointCount: this.routePoints.length,
      orderId: this.orderId
    };
  }
}

// React hook for easy integration
export const useLiveTracking = (orderId) => {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState('unknown');
  const [route, setRoute] = useState([]);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const serviceRef = useRef(null);

  const startTracking = useCallback(() => {
    if (!orderId) return;
    
    // Create service instance
    serviceRef.current = new LiveTrackingService(orderId);
    
    // Start tracking with callbacks
    serviceRef.current.startTracking({
      onPositionUpdate: (newPosition) => {
        setPosition(newPosition);
        setIsConnected(true);
      },
      onStatusChange: (newStatus) => {
        setStatus(newStatus);
      },
      onRouteUpdate: (newRoute) => {
        setRoute(newRoute);
      },
      onError: (err) => {
        setError(err);
        setIsConnected(false);
      }
    });
  }, [orderId]);

  const stopTracking = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopTracking();
      serviceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const getTrackingStatus = useCallback(() => {
    return serviceRef.current ? serviceRef.current.getStatus() : null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    position,
    status,
    route,
    error,
    isConnected,
    startTracking,
    stopTracking,
    getTrackingStatus
  };
};

// Utility functions for Firebase integration
export const updateRiderPosition = async (orderId, positionData) => {
  try {
    const deliveryRef = doc(db, 'liveDeliveries', orderId);
    
    await updateDoc(deliveryRef, {
      location: {
        lat: positionData.lat,
        lng: positionData.lng
      },
      speed: positionData.speed || 0,
      bearing: positionData.bearing || 0,
      accuracy: positionData.accuracy || 10,
      timestamp: Timestamp.now(),
      lastUpdate: Timestamp.now()
    });
    
    // Also add to route history
    const routeRef = collection(db, 'deliveryRoutes', orderId, 'positions');
    await addDoc(routeRef, {
      ...positionData,
      timestamp: Timestamp.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update rider position:', error);
    return { success: false, error: error.message };
  }
};

export const updateDeliveryStatus = async (orderId, status, metadata = {}) => {
  try {
    const deliveryRef = doc(db, 'liveDeliveries', orderId);
    
    await updateDoc(deliveryRef, {
      status,
      [`statusHistory.${status}`]: Timestamp.now(),
      lastStatusUpdate: Timestamp.now(),
      ...metadata
    });
    
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update delivery status:', error);
    return { success: false, error: error.message };
  }
};

// Performance monitoring for live tracking
export class TrackingPerformanceMonitor {
  constructor() {
    this.metrics = {
      updateCount: 0,
      avgUpdateTime: 0,
      lastUpdateTime: 0,
      errors: 0,
      droppedUpdates: 0
    };
    
    this.updateTimes = [];
    this.maxSamples = 100; // Keep last 100 samples
  }

  recordUpdate(startTime) {
    const updateTime = performance.now() - startTime;
    this.updateTimes.push(updateTime);
    
    // Keep only recent samples
    if (this.updateTimes.length > this.maxSamples) {
      this.updateTimes.shift();
    }
    
    // Calculate average
    this.metrics.avgUpdateTime = this.updateTimes.reduce((a, b) => a + b, 0) / this.updateTimes.length;
    this.metrics.lastUpdateTime = updateTime;
    this.metrics.updateCount++;
  }

  recordError() {
    this.metrics.errors++;
  }

  recordDroppedUpdate() {
    this.metrics.droppedUpdates++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      updateRate: this.metrics.updateCount / (Date.now() / 1000), // Updates per second
      errorRate: this.metrics.errors / this.metrics.updateCount,
      dropRate: this.metrics.droppedUpdates / this.metrics.updateCount
    };
  }

  reset() {
    this.metrics = {
      updateCount: 0,
      avgUpdateTime: 0,
      lastUpdateTime: 0,
      errors: 0,
      droppedUpdates: 0
    };
    this.updateTimes = [];
  }
}

export default LiveTrackingService;