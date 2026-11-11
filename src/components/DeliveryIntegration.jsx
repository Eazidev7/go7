// GO7 Delivery Integration Component
// Integrates location tracking with delivery interface and replay system

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  startDeliveryTracking, 
  stopDeliveryTracking, 
  getTrackingStatus, 
  initializeDeliveryRoute,
  finalizeDeliveryRoute 
} from '../services/riderLocationTracker';
import './DeliveryIntegration.css';

const DeliveryIntegration = ({ 
  delivery, 
  rider, 
  onStatusChange, 
  showReplayButton = true 
}) => {
  const [tracking, setTracking] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [stats, setStats] = useState({
    duration: 0,
    distance: 0,
    points: 0,
    lastUpdate: null
  });
  
  const statusInterval = useRef(null);
  const statsInterval = useRef(null);

  // Initialize component
  useEffect(() => {
    checkTrackingStatus();
    
    return () => {
      clearIntervals();
    };
  }, []);

  // Status monitoring
  useEffect(() => {
    if (isActive) {
      statusInterval.current = setInterval(() => {
        checkTrackingStatus();
        updateStats();
      }, 2000);
    } else {
      clearInterval(statusInterval.current);
    }
    
    return () => clearInterval(statusInterval.current);
  }, [isActive]);

  const clearIntervals = () => {
    if (statusInterval.current) clearInterval(statusInterval.current);
    if (statsInterval.current) clearInterval(statsInterval.current);
  };

  const checkTrackingStatus = () => {
    const status = getTrackingStatus();
    setTracking(status);
    setIsActive(status?.isTracking || false);
    
    if (onStatusChange) {
      onStatusChange(status);
    }
  };

  const updateStats = () => {
    if (!tracking) return;
    
    const now = Date.now();
    setStats(prev => ({
      ...prev,
      duration: isActive ? Math.floor((now - (tracking.startTime || now)) / 1000) : prev.duration,
      points: tracking.bufferSize || 0,
      lastUpdate: tracking.lastPosition ? new Date(tracking.lastPosition.ts) : prev.lastUpdate
    }));
  };

  // Start tracking delivery
  const handleStartDelivery = async () => {
    try {
      if (!delivery?.orderId || !rider?.id) {
        throw new Error('Missing delivery or rider information');
      }

      // Initialize route document
      await initializeDeliveryRoute({
        orderId: delivery.orderId,
        userId: delivery.userId,
        riderId: rider.id,
        pickup: delivery.pickup,
        delivery: delivery.delivery
      });

      // Start location tracking
      const result = await startDeliveryTracking(delivery.orderId, rider.id, {
        trackingIntervalMs: 3000,  // Every 3 seconds for delivery
        uploadIntervalMs: 15000,   // Upload every 15 seconds
        maxBufferSize: 8,          // Smaller buffer for real-time updates
        minDistanceMeters: 3       // More sensitive for city deliveries
      });

      if (result.success) {
        setIsActive(true);
        console.log('✅ Delivery tracking started');
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Failed to start delivery tracking:', error);
      alert(`Failed to start tracking: ${error.message}`);
    }
  };

  // Stop tracking delivery
  const handleStopDelivery = async () => {
    try {
      // Calculate final stats
      const finalStats = {
        totalDistance: stats.distance,
        avgSpeed: stats.avgSpeed || 0,
        maxSpeed: stats.maxSpeed || 0,
        duration: stats.duration
      };

      // Finalize route document
      await finalizeDeliveryRoute(delivery.orderId, finalStats);

      // Stop location tracking
      const result = await stopDeliveryTracking();
      
      if (result.success) {
        setIsActive(false);
        console.log('✅ Delivery tracking stopped');
      }
    } catch (error) {
      console.error('❌ Failed to stop delivery tracking:', error);
      alert(`Failed to stop tracking: ${error.message}`);
    }
  };

  // Format duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format distance
  const formatDistance = (meters) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  return (
    <div className="delivery-integration">
      {/* Tracking Status Header */}
      <div className="tracking-header">
        <div className="delivery-info">
          <h3>📦 Order #{delivery?.orderId || 'Unknown'}</h3>
          <p>🛵 Rider: {rider?.name || 'Unknown Rider'}</p>
        </div>
        
        <div className="tracking-status">
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.div
                key="active"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="status-indicator active"
              >
                <div className="pulse-dot" />
                <span>Live Tracking</span>
              </motion.div>
            ) : (
              <motion.div
                key="inactive"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="status-indicator inactive"
              >
                <div className="static-dot" />
                <span>Not Tracking</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Live Stats */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="live-stats"
          >
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">⏱️ Duration</span>
                <span className="stat-value">{formatDuration(stats.duration)}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">📍 Points</span>
                <span className="stat-value">{stats.points}</span>
              </div>
              
              <div className="stat-item">
                <span className="stat-label">🗓️ Last Update</span>
                <span className="stat-value">
                  {stats.lastUpdate ? stats.lastUpdate.toLocaleTimeString() : 'Never'}
                </span>
              </div>
              
              {tracking?.lastPosition && (
                <div className="stat-item">
                  <span className="stat-label">🎯 GPS Accuracy</span>
                  <span className="stat-value">±{tracking.lastPosition.accuracy?.toFixed(0)}m</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Buttons */}
      <div className="tracking-controls">
        <AnimatePresence mode="wait">
          {!isActive ? (
            <motion.button
              key="start"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStartDelivery}
              className="control-btn start-btn"
              disabled={!delivery?.orderId || !rider?.id}
            >
              <span className="btn-icon">🚀</span>
              Start Delivery Tracking
            </motion.button>
          ) : (
            <motion.button
              key="stop"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleStopDelivery}
              className="control-btn stop-btn"
            >
              <span className="btn-icon">🛑</span>
              Complete Delivery
            </motion.button>
          )}
        </AnimatePresence>

        {/* Replay Button */}
        {showReplayButton && delivery?.orderId && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.open(`/replay/${delivery.orderId}`, '_blank')}
            className="control-btn replay-btn"
            disabled={isActive}
          >
            <span className="btn-icon">🎬</span>
            View Replay
          </motion.button>
        )}
      </div>

      {/* Permission Notice */}
      <div className="permission-notice">
        <p>📍 <strong>Location Permission Required:</strong> 
           Please allow location access when prompted to enable delivery tracking.
        </p>
      </div>

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && tracking && (
        <details className="debug-info">
          <summary>🐛 Debug Info</summary>
          <pre>{JSON.stringify(tracking, null, 2)}</pre>
        </details>
      )}
    </div>
  );
};

export default DeliveryIntegration;