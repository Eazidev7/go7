import React, { useState, useEffect } from 'react';

const UnifiedCustomerToast = ({ isOpen, status, message, onClose, riderName, eta, autoClose = true, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(100);

  // Handle toast visibility and animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setProgress(100);
      setTimeout(() => setIsAnimating(true), 10);

      if (autoClose) {
        // Progress bar countdown
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            const newProgress = prev - (100 / (duration / 100));
            return newProgress > 0 ? newProgress : 0;
          });
        }, 100);

        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => {
          clearTimeout(timer);
          clearInterval(progressInterval);
        };
      }
    } else {
      handleClose();
    }
  }, [isOpen, autoClose, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  };

  // Get status-specific styling and content
  const getStatusConfig = (status) => {
    const configs = {
      accepted: {
        icon: '🚀',
        color: '#4CAF50',
        bgColor: '#E8F5E8',
        borderColor: '#4CAF50',
        title: 'Order Accepted!',
        defaultMessage: riderName 
          ? `Rider ${riderName} accepted your delivery${eta ? `, ETA: ${eta}` : ''}` 
          : 'Your order has been accepted by a rider',
        accentColor: '#2E7D32'
      },
      picked_up: {
        icon: '🛍️',
        color: '#FF9800',
        bgColor: '#FFF3E0',
        borderColor: '#FF9800',
        title: 'Order Picked Up!',
        defaultMessage: 'Your order has been collected and is on the way',
        accentColor: '#F57C00'
      },
      en_route: {
        icon: '🛵',
        color: '#2196F3',
        bgColor: '#E3F2FD',
        borderColor: '#2196F3',
        title: 'Rider En Route!',
        defaultMessage: eta ? `Rider en route, ETA: ${eta}` : 'Your order is on the way',
        accentColor: '#1976D2'
      },
      delivered: {
        icon: '🎉',
        color: '#E30613',
        bgColor: '#FFE6E6',
        borderColor: '#E30613',
        title: 'Order Delivered!',
        defaultMessage: 'Your order has been successfully delivered',
        accentColor: '#C5050F'
      },
      cancelled: {
        icon: '❌',
        color: '#F44336',
        bgColor: '#FFEBEE',
        borderColor: '#F44336',
        title: 'Order Cancelled',
        defaultMessage: 'Your order has been cancelled',
        accentColor: '#D32F2F'
      },
      pending: {
        icon: '⏳',
        color: '#9E9E9E',
        bgColor: '#F5F5F5',
        borderColor: '#9E9E9E',
        title: 'Order Pending',
        defaultMessage: 'Finding available rider...',
        accentColor: '#757575'
      }
    };

    return configs[status] || configs.accepted;
  };

  if (!isVisible) return null;

  const config = getStatusConfig(status);
  const displayMessage = message || config.defaultMessage;

  return (
    <div style={{
      position: 'fixed',
      top: '25px',
      right: '25px',
      zIndex: 10000,
      transform: isAnimating ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.8)',
      opacity: isAnimating ? 1 : 0,
      transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: config.bgColor,
        border: `3px solid ${config.borderColor}`,
        borderRadius: '18px',
        padding: '20px 25px',
        minWidth: '350px',
        maxWidth: '450px',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        overflow: 'hidden',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Progress bar for auto-close */}
        {autoClose && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '4px',
            backgroundColor: config.accentColor,
            width: `${progress}%`,
            transition: 'width 0.1s linear',
            borderRadius: '0 0 15px 15px'
          }} />
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0, 0, 0, 0.1)',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
            e.target.style.color = '#333';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            e.target.style.color = '#666';
          }}
        >
          ×
        </button>

        {/* Content */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '15px',
          paddingRight: '35px'
        }}>
          {/* Status icon with animated background */}
          <div style={{
            fontSize: '32px',
            flexShrink: 0,
            marginTop: '3px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              right: '-8px',
              bottom: '-8px',
              backgroundColor: config.color,
              borderRadius: '50%',
              opacity: 0.2,
              animation: 'iconPulse 2s infinite'
            }} />
            {config.icon}
          </div>

          {/* Message content */}
          <div style={{ flex: 1 }}>
            <div style={{
              color: config.accentColor,
              fontSize: '18px',
              fontWeight: '800',
              marginBottom: '6px',
              lineHeight: '1.2'
            }}>
              {config.title}
            </div>
            
            <div style={{
              color: '#333',
              fontSize: '15px',
              lineHeight: '1.5',
              fontWeight: '500'
            }}>
              {displayMessage}
            </div>

            {/* Additional info for specific statuses */}
            {status === 'accepted' && eta && (
              <div style={{
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderRadius: '8px',
                fontSize: '13px',
                color: config.accentColor,
                fontWeight: '600'
              }}>
                ⏱️ Estimated delivery: {eta}
              </div>
            )}

            {status === 'en_route' && (
              <div style={{
                marginTop: '8px',
                fontSize: '13px',
                color: '#666',
                fontStyle: 'italic'
              }}>
                📍 You can track the rider's location in real-time
              </div>
            )}
          </div>
        </div>

        {/* Status indicator dot */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: config.color,
          animation: 'statusDot 2s infinite'
        }} />

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes iconPulse {
            0%, 100% { 
              transform: scale(1);
              opacity: 0.2;
            }
            50% { 
              transform: scale(1.1);
              opacity: 0.3;
            }
          }
          
          @keyframes statusDot {
            0%, 100% { 
              transform: scale(1);
              opacity: 1;
            }
            50% { 
              transform: scale(1.5);
              opacity: 0.7;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

// Enhanced Toast Manager with stacking and positioning
const UnifiedToastManager = ({ toasts, onRemoveToast }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      zIndex: 10000,
      pointerEvents: 'none'
    }}>
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{
            marginTop: index > 0 ? '15px' : '0',
            transform: `translateY(${index * 5}px)`,
            zIndex: 10000 - index
          }}
        >
          <UnifiedCustomerToast
            isOpen={toast.isOpen}
            status={toast.status}
            message={toast.message}
            riderName={toast.riderName}
            eta={toast.eta}
            onClose={() => onRemoveToast(toast.id)}
            autoClose={toast.autoClose !== false}
            duration={toast.duration || 5000}
          />
        </div>
      ))}
    </div>
  );
};

// Enhanced hook for managing toasts with rider info and ETA
export const useUnifiedToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (status, message = null, options = {}) => {
    const toastId = Date.now() + Math.random();
    const newToast = {
      id: toastId,
      status,
      message,
      riderName: options.riderName,
      eta: options.eta,
      isOpen: true,
      autoClose: options.autoClose !== false,
      duration: options.duration || 5000
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration + animation time
    if (newToast.autoClose) {
      setTimeout(() => {
        removeToast(toastId);
      }, newToast.duration + 500);
    }

    return toastId;
  };

  const removeToast = (toastId) => {
    setToasts(prev => prev.filter(toast => toast.id !== toastId));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Show status-specific toasts with automated messages
  const showStatusToast = (status, riderName = null, eta = null, customMessage = null) => {
    return showToast(status, customMessage, { riderName, eta });
  };

  return {
    toasts,
    showToast,
    showStatusToast,
    removeToast,
    clearAllToasts,
    ToastManager: () => <UnifiedToastManager toasts={toasts} onRemoveToast={removeToast} />
  };
};

export default UnifiedCustomerToast;