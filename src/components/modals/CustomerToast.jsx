import React, { useState, useEffect } from 'react';

const CustomerToast = ({ isOpen, status, message, onClose, autoClose = true, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle toast visibility and animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setTimeout(() => setIsAnimating(true), 10); // Small delay for animation

      if (autoClose) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);

        return () => clearTimeout(timer);
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
    }, 300); // Match animation duration
  };

  // Get status-specific styling
  const getStatusConfig = (status) => {
    const configs = {
      accepted: {
        icon: '✅',
        color: '#4CAF50',
        bgColor: '#E8F5E8',
        borderColor: '#4CAF50',
        title: 'Order Accepted!',
        defaultMessage: 'Your order has been accepted by a rider'
      },
      picked_up: {
        icon: '📦',
        color: '#FF9800',
        bgColor: '#FFF3E0',
        borderColor: '#FF9800',
        title: 'Order Picked Up!',
        defaultMessage: 'Your order has been collected'
      },
      en_route: {
        icon: '🛵',
        color: '#2196F3',
        bgColor: '#E3F2FD',
        borderColor: '#2196F3',
        title: 'Rider En Route!',
        defaultMessage: 'Your order is on the way'
      },
      delivered: {
        icon: '🎉',
        color: '#E30613',
        bgColor: '#FFE6E6',
        borderColor: '#E30613',
        title: 'Order Delivered!',
        defaultMessage: 'Your order has been successfully delivered'
      },
      cancelled: {
        icon: '❌',
        color: '#F44336',
        bgColor: '#FFEBEE',
        borderColor: '#F44336',
        title: 'Order Cancelled',
        defaultMessage: 'Your order has been cancelled'
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
      top: '20px',
      right: '20px',
      zIndex: 10000,
      transform: isAnimating ? 'translateX(0)' : 'translateX(100%)',
      opacity: isAnimating ? 1 : 0,
      transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      pointerEvents: 'auto'
    }}>
      <div style={{
        backgroundColor: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        borderRadius: '12px',
        padding: '16px 20px',
        minWidth: '300px',
        maxWidth: '400px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Progress bar for auto-close */}
        {autoClose && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '3px',
            backgroundColor: config.color,
            animation: `shrink ${duration}ms linear`,
            width: '100%'
          }} />
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: '#999',
            padding: '4px',
            lineHeight: 1
          }}
        >
          ×
        </button>

        {/* Content */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          paddingRight: '20px'
        }}>
          {/* Status icon */}
          <div style={{
            fontSize: '24px',
            flexShrink: 0,
            marginTop: '2px'
          }}>
            {config.icon}
          </div>

          {/* Message content */}
          <div style={{ flex: 1 }}>
            <div style={{
              color: config.color,
              fontSize: '16px',
              fontWeight: '700',
              marginBottom: '4px',
              lineHeight: '1.2'
            }}>
              {config.title}
            </div>
            <div style={{
              color: '#333',
              fontSize: '14px',
              lineHeight: '1.4'
            }}>
              {displayMessage}
            </div>
          </div>
        </div>

        {/* CSS Animations */}
        <style jsx>{`
          @keyframes shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    </div>
  );
};

// Toast Manager Component
const ToastManager = ({ toasts, onRemoveToast }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      zIndex: 10000,
      pointerEvents: 'none'
    }}>
      {toasts.map((toast, index) => (
        <div key={toast.id} style={{
          marginTop: index > 0 ? '10px' : '0'
        }}>
          <CustomerToast
            isOpen={toast.isOpen}
            status={toast.status}
            message={toast.message}
            onClose={() => onRemoveToast(toast.id)}
            autoClose={toast.autoClose !== false}
            duration={toast.duration || 5000}
          />
        </div>
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const showToast = (status, message = null, options = {}) => {
    const toastId = Date.now() + Math.random();
    const newToast = {
      id: toastId,
      status,
      message,
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

  return {
    toasts,
    showToast,
    removeToast,
    clearAllToasts,
    ToastManager: () => <ToastManager toasts={toasts} onRemoveToast={removeToast} />
  };
};

export default CustomerToast;