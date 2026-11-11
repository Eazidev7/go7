// GO7 Transit Progress Bar Component
// Visual progress indicator between estimated arrival and rider status

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './TransitProgressBar.css';

const TransitProgressBar = ({
  estimatedArrival,
  riderStatus = "En Route to You",
  progress = 0, // 0-100 percentage
  isActive = false,
  riderName = "Your Rider",
  orderItems = [],
  showDetails = true
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState('');

  // Animate progress changes
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(() => {
        setAnimatedProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress, isActive]);

  // Calculate time remaining
  useEffect(() => {
    if (!estimatedArrival) return;
    
    const updateTime = () => {
      const now = new Date();
      const arrival = new Date(estimatedArrival);
      const diff = arrival - now;
      
      if (diff <= 0) {
        setTimeRemaining('Arriving now');
        return;
      }
      
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${seconds}s`);
      }
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, [estimatedArrival]);

  // Progress status messages
  const getStatusMessage = () => {
    if (progress === 0) return "📦 Order confirmed - Rider assigned";
    if (progress < 25) return "🛵 Rider heading to restaurant";
    if (progress < 50) return "👨‍🍳 Picking up your order";
    if (progress < 75) return "🚀 On the way to you";
    if (progress < 100) return "🏃‍♂️ Almost there!";
    return "🎉 Delivered!";
  };

  const getProgressColor = () => {
    if (progress < 25) return '#f59e0b'; // Amber
    if (progress < 50) return '#3b82f6'; // Blue  
    if (progress < 75) return '#8b5cf6'; // Purple
    if (progress < 100) return '#22c55e'; // Green
    return '#10b981'; // Emerald
  };

  return (
    <div className="transit-progress-container">
      {/* Header Section */}
      <div className="progress-header">
        <div className="arrival-info">
          <div className="estimated-time">
            <span className="time-label">Estimated Arrival</span>
            <motion.div 
              className="time-value"
              key={timeRemaining}
              initial={{ scale: 1.1, opacity: 0.8 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {timeRemaining || '...'}
            </motion.div>
          </div>
        </div>

        <div className="rider-info">
          <div className="rider-status">
            <span className="status-label">{riderStatus}</span>
            <div className="rider-name">{riderName}</div>
          </div>
        </div>
      </div>

      {/* Main Progress Section */}
      <div className="progress-main">
        {/* Status Message */}
        <motion.div 
          className="status-message"
          key={getStatusMessage()}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {getStatusMessage()}
        </motion.div>

        {/* Progress Bar Container */}
        <div className="progress-bar-container">
          {/* Background Track */}
          <div className="progress-track">
            {/* Animated Progress Fill */}
            <motion.div
              className="progress-fill"
              initial={{ width: 0 }}
              animate={{ 
                width: `${animatedProgress}%`,
                backgroundColor: getProgressColor()
              }}
              transition={{ 
                duration: 0.8,
                ease: "easeOut"
              }}
            >
              {/* Moving Shimmer Effect */}
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

            {/* Progress Markers */}
            <div className="progress-markers">
              {[25, 50, 75].map(marker => (
                <div 
                  key={marker}
                  className={`progress-marker ${progress >= marker ? 'completed' : ''}`}
                  style={{ left: `${marker}%` }}
                >
                  <div className="marker-dot" />
                </div>
              ))}
            </div>
          </div>

          {/* Progress Percentage */}
          <motion.div 
            className="progress-percentage"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            key={Math.floor(animatedProgress)}
          >
            {Math.floor(animatedProgress)}%
          </motion.div>
        </div>

        {/* Milestone Indicators */}
        <div className="milestone-indicators">
          <div className={`milestone ${progress >= 0 ? 'active' : ''}`}>
            <span className="milestone-icon">📦</span>
            <span className="milestone-text">Confirmed</span>
          </div>
          <div className={`milestone ${progress >= 25 ? 'active' : ''}`}>
            <span className="milestone-icon">🛵</span>
            <span className="milestone-text">Pickup</span>
          </div>
          <div className={`milestone ${progress >= 75 ? 'active' : ''}`}>
            <span className="milestone-icon">🚀</span>
            <span className="milestone-text">Delivering</span>
          </div>
          <div className={`milestone ${progress >= 100 ? 'active' : ''}`}>
            <span className="milestone-icon">🎉</span>
            <span className="milestone-text">Delivered</span>
          </div>
        </div>
      </div>

      {/* Order Details (Optional) */}
      {showDetails && orderItems.length > 0 && (
        <motion.div 
          className="order-details"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="details-header">
            <span>📋 Your Order ({orderItems.length} item{orderItems.length > 1 ? 's' : ''})</span>
          </div>
          <div className="items-list">
            {orderItems.slice(0, 3).map((item, index) => (
              <div key={index} className="order-item">
                <span className="item-quantity">{item.quantity}x</span>
                <span className="item-name">{item.name}</span>
              </div>
            ))}
            {orderItems.length > 3 && (
              <div className="more-items">
                +{orderItems.length - 3} more item{orderItems.length - 3 > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Pulse Effect for Active State */}
      <AnimatePresence>
        {isActive && progress < 100 && (
          <motion.div
            className="active-pulse"
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 1.05, opacity: 0 }}
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

// Hook for managing transit progress
export const useTransitProgress = (initialProgress = 0) => {
  const [progress, setProgress] = useState(initialProgress);
  const [isActive, setIsActive] = useState(false);
  const [estimatedArrival, setEstimatedArrival] = useState(null);

  const startProgress = (arrivalTime) => {
    setIsActive(true);
    if (arrivalTime) {
      setEstimatedArrival(arrivalTime);
    }
  };

  const updateProgress = (newProgress) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
  };

  const completeDelivery = () => {
    setProgress(100);
    setTimeout(() => setIsActive(false), 2000); // Keep active for celebration
  };

  const resetProgress = () => {
    setProgress(0);
    setIsActive(false);
    setEstimatedArrival(null);
  };

  return {
    progress,
    isActive,
    estimatedArrival,
    startProgress,
    updateProgress,
    completeDelivery,
    resetProgress,
    setEstimatedArrival
  };
};

export default TransitProgressBar;