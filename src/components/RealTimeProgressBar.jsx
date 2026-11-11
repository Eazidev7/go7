// GO7 Real-Time Transit Progress Bar
// Production component for live delivery tracking

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './RealTimeProgressBar.css';

const RealTimeProgressBar = ({
  status = "rider_assigned",
  eta = "Calculating...",
  riderName = "Your Rider",
  riderZone = "",
  pickupZone = "",
  dropZone = "",
  distance = "--",
  orderItems = [],
  onCallRider = null,
  isActive = true
}) => {
  const [progress, setProgress] = useState(0);
  const [currentMilestone, setCurrentMilestone] = useState('');

  // Status to progress mapping
  const statusConfig = {
    rider_assigned: { progress: 15, milestone: '🛵 Rider Assigned', color: '#f59e0b' },
    heading_to_pickup: { progress: 30, milestone: '🏃‍♂️ Heading to Pickup', color: '#3b82f6' },
    picked_up: { progress: 55, milestone: '📦 Order Picked Up', color: '#8b5cf6' },
    on_the_way: { progress: 80, milestone: '🚀 On the Way to You', color: '#22c55e' },
    near_destination: { progress: 95, milestone: '🏃‍♂️ Almost There!', color: '#10b981' },
    delivered: { progress: 100, milestone: '🎉 Delivered!', color: '#059669' }
  };

  // Update progress based on status
  useEffect(() => {
    const config = statusConfig[status] || statusConfig.rider_assigned;
    setProgress(config.progress);
    setCurrentMilestone(config.milestone);
  }, [status]);

  // Format ETA display
  const formatETA = (etaString) => {
    if (!etaString || etaString === "Calculating...") return "Calculating...";
    return etaString;
  };

  // Get route description
  const getRouteDescription = () => {
    if (!pickupZone || !dropZone) return "Preparing route...";
    return `${pickupZone} → ${dropZone}`;
  };

  // Get current progress color
  const getProgressColor = () => {
    const config = statusConfig[status] || statusConfig.rider_assigned;
    return config.color;
  };

  return (
    <div className="realtime-progress-bar">
      {/* Header: ETA and Rider Info */}
      <div className="progress-header-section">
        <div className="eta-section">
          <div className="eta-label">Estimated Arrival</div>
          <motion.div 
            className="eta-value"
            key={eta}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {formatETA(eta)}
          </motion.div>
          <div className="route-info">{getRouteDescription()}</div>
        </div>

        <div className="rider-section">
          <div className="rider-label">Rider En Route to You</div>
          <div className="rider-name">{riderName}</div>
          {riderZone && <div className="rider-zone">From {riderZone}</div>}
        </div>
      </div>

      {/* Live Location Section */}
      <AnimatePresence>
        {(status !== 'rider_assigned' && status !== 'delivered') && (
          <motion.div 
            className="location-section"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="location-header">
              <span className="location-icon">📍</span>
              <span className="location-label">Current Location</span>
            </div>
            <motion.div 
              className="location-text"
              key={`${status}-location`}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {getCurrentLocationDisplay()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar Section */}
      <div className="progress-section">
        <motion.div 
          className="status-message"
          key={currentMilestone}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {currentMilestone}
        </motion.div>

        {/* Main Progress Track */}
        <div className="progress-track-container">
          <div className="progress-track">
            {/* Progress Fill */}
            <motion.div
              className="progress-fill"
              animate={{ 
                width: `${progress}%`,
                backgroundColor: getProgressColor()
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              {/* Animated Shimmer for Active State */}
              <AnimatePresence>
                {isActive && progress < 100 && (
                  <motion.div
                    className="progress-shimmer"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>

            {/* Milestone Dots */}
            <div className="milestone-dots">
              {[25, 50, 75].map((dotPos, index) => (
                <div 
                  key={index}
                  className={`milestone-dot ${progress >= dotPos ? 'active' : ''}`}
                  style={{ left: `${dotPos}%` }}
                >
                  <div className="dot" />
                </div>
              ))}
            </div>
          </div>

          {/* Progress Percentage */}
          <motion.div 
            className="progress-percent"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            {Math.floor(progress)}%
          </motion.div>
        </div>

        {/* Journey Stages */}
        <div className="journey-stages">
          <div className={`stage ${progress >= 15 ? 'completed' : ''}`}>
            <span className="stage-icon">🛵</span>
            <span className="stage-text">Assigned</span>
          </div>
          <div className={`stage ${progress >= 55 ? 'completed' : ''}`}>
            <span className="stage-icon">📦</span>
            <span className="stage-text">Pickup</span>
          </div>
          <div className={`stage ${progress >= 80 ? 'completed' : ''}`}>
            <span className="stage-icon">🚀</span>
            <span className="stage-text">En Route</span>
          </div>
          <div className={`stage ${progress >= 100 ? 'completed' : ''}`}>
            <span className="stage-icon">🎉</span>
            <span className="stage-text">Delivered</span>
          </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="additional-info">
        {distance && distance !== "--" && (
          <div className="info-item">
            <span className="info-label">📏 Distance:</span>
            <span className="info-value">{distance}</span>
          </div>
        )}
        
        {orderItems.length > 0 && (
          <div className="order-summary">
            <div className="summary-header">
              📋 Your Order ({orderItems.length} item{orderItems.length > 1 ? 's' : ''})
            </div>
            <div className="items-preview">
              {orderItems.slice(0, 2).map((item, index) => (
                <span key={index} className="item-preview">
                  {item.quantity}x {item.name}
                </span>
              ))}
              {orderItems.length > 2 && (
                <span className="more-items">+{orderItems.length - 2} more</span>
              )}
            </div>
          </div>
        )}
        
        {onCallRider && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCallRider}
            className="call-rider-btn"
          >
            📞 Call Rider
          </motion.button>
        )}
      </div>

      {/* Pulse Effect for Active Delivery */}
      <AnimatePresence>
        {isActive && progress < 100 && (
          <motion.div
            className="active-pulse-overlay"
            initial={{ scale: 1, opacity: 0.2 }}
            animate={{ scale: 1.02, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealTimeProgressBar;