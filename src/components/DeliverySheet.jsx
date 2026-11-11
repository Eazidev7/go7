import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, useDragControls } from "framer-motion";
import "./DeliverySheet.css";

const DeliverySheet = ({ delivery, rider, onMapZoomChange }) => {
  const [isExpanded, setExpanded] = useState(false);
  const y = useMotionValue(0);
  const dragControls = useDragControls();

  // Dynamic heights based on screen size
  const [sheetHeights, setSheetHeights] = useState({
    collapsed: 120,
    expanded: 400,
  });

  // Update heights on window resize
  useEffect(() => {
    const updateHeights = () => {
      setSheetHeights({
        collapsed: Math.min(120, window.innerHeight * 0.15),
        expanded: Math.min(500, window.innerHeight * 0.65),
      });
    };

    updateHeights();
    window.addEventListener('resize', updateHeights);
    return () => window.removeEventListener('resize', updateHeights);
  }, []);

  // Transform opacity based on drag position
  const opacity = useTransform(
    y,
    [0, -sheetHeights.expanded + sheetHeights.collapsed],
    [0.9, 1]
  );

  // Handle drag end to snap to positions
  const handleDragEnd = (event, info) => {
    const shouldExpand = info.offset.y < -50 || info.velocity.y < -500;
    const shouldCollapse = info.offset.y > 50 || info.velocity.y > 500;

    if (shouldExpand && !isExpanded) {
      setExpanded(true);
      y.set(0); // Reset y position
      if (onMapZoomChange) onMapZoomChange('expanded');
    } else if (shouldCollapse && isExpanded) {
      setExpanded(false);
      y.set(0); // Reset y position
      if (onMapZoomChange) onMapZoomChange('collapsed');
    } else {
      // Snap back to current state
      y.set(0);
    }
  };

  // Handle click on handle to toggle
  const toggleSheet = () => {
    setExpanded(!isExpanded);
    if (onMapZoomChange) {
      onMapZoomChange(isExpanded ? 'collapsed' : 'expanded');
    }
  };

  // Auto-expand on delivery status changes
  useEffect(() => {
    if (delivery?.status === 'delivered' || delivery?.status === 'arrived') {
      setExpanded(true);
      if (onMapZoomChange) onMapZoomChange('expanded');
    }
  }, [delivery?.status, onMapZoomChange]);

  // Format ETA
  const formatETA = (eta) => {
    if (!eta) return "Calculating...";
    if (typeof eta === 'string') return eta;
    if (typeof eta === 'number') return `${eta} min`;
    return "Soon";
  };

  // Get status emoji and text
  const getStatusInfo = (status) => {
    switch (status) {
      case 'confirmed':
        return { emoji: '📋', text: 'Order Confirmed' };
      case 'preparing':
        return { emoji: '👨‍🍳', text: 'Preparing your order' };
      case 'ready':
        return { emoji: '✅', text: 'Ready for pickup' };
      case 'enroute':
      case 'on_the_way':
        return { emoji: '🏍️', text: 'Rider on the way' };
      case 'arrived':
        return { emoji: '📍', text: 'Rider has arrived' };
      case 'delivered':
        return { emoji: '🎉', text: 'Delivered!' };
      default:
        return { emoji: '📦', text: 'Processing order' };
    }
  };

  const statusInfo = getStatusInfo(delivery?.status);

  return (
    <>
      {/* ETA Badge - Shows when collapsed */}
      {!isExpanded && delivery?.eta && (
        <motion.div
          className="eta-badge"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          <span className="eta-text">ETA {formatETA(delivery.eta)}</span>
        </motion.div>
      )}

      {/* Background overlay when expanded */}
      {isExpanded && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Main Sheet */}
      <motion.div
        className="delivery-sheet"
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{
          top: -sheetHeights.expanded + sheetHeights.collapsed,
          bottom: 0,
        }}
        dragElastic={0.1}
        style={{ 
          y,
          opacity,
          height: sheetHeights.expanded,
        }}
        onDragEnd={handleDragEnd}
        animate={{
          y: isExpanded ? -sheetHeights.expanded + sheetHeights.collapsed : 0,
        }}
        transition={{ 
          type: "spring", 
          damping: 30, 
          stiffness: 300,
          mass: 0.8
        }}
      >
        {/* Drag Handle */}
        <div
          className="sheet-handle-container"
          onPointerDown={(event) => dragControls.start(event)}
          onClick={toggleSheet}
        >
          <motion.div 
            className="sheet-handle"
            animate={{ 
              scaleX: isExpanded ? 1.2 : 1,
              backgroundColor: isExpanded ? '#007AFF' : '#D1D5DB'
            }}
            whileHover={{ scaleX: 1.1 }}
          />
          
          {/* Pulsing indicator */}
          <motion.div
            className="sheet-handle-pulse"
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Sheet Content */}
        <div className="sheet-content">
          {/* Quick Status */}
          <motion.div 
            className="status-header"
            initial={false}
            animate={{ opacity: 1 }}
          >
            <div className="status-info">
              <span className="status-emoji">{statusInfo.emoji}</span>
              <h4 className="status-text">{statusInfo.text}</h4>
            </div>
            <div className="eta-info">
              <span className="eta-label">ETA</span>
              <span className="eta-value">{formatETA(delivery?.eta)}</span>
            </div>
          </motion.div>

          {/* Expanded Content */}
          <motion.div
            className="expanded-content"
            initial={false}
            animate={{ 
              opacity: isExpanded ? 1 : 0,
              y: isExpanded ? 0 : 20
            }}
            transition={{ delay: isExpanded ? 0.1 : 0 }}
          >
            {/* Order Details */}
            <div className="order-section">
              <h5>Order Details</h5>
              <div className="address-info">
                <div className="address-item">
                  <span className="address-icon">📍</span>
                  <div>
                    <p className="address-label">Pickup</p>
                    <p className="address-text">{delivery?.pickupAddress || delivery?.pickup?.address || "Restaurant Location"}</p>
                  </div>
                </div>
                <div className="address-item">
                  <span className="address-icon">🏠</span>
                  <div>
                    <p className="address-label">Delivery</p>
                    <p className="address-text">{delivery?.dropoffAddress || delivery?.delivery?.address || "Your Location"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Rider Information */}
            {rider && (
              <div className="rider-section">
                <h5>Your Rider</h5>
                <div className="rider-info">
                  <img 
                    src={rider.photoURL || rider.photo || "/api/placeholder/48/48"} 
                    alt={rider.name || "Rider"}
                    className="rider-photo"
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyNCIgcj0iMjQiIGZpbGw9IiNGM0Y0RjYiLz4KPGNpcmNsZSBjeD0iMjQiIGN5PSIyMCIgcj0iOCIgZmlsbD0iIzlDQTNBRiIvPgo8cGF0aCBkPSJNMTAgMzZDMTAgMzAuNDc3MiAxNC40NzcyIDI2IDE5IDI2SDI5QzMzLjUyMjggMjYgMzggMzAuNDc3MiAzOCAzNlYzOEMzOCAzOS4xMDQ2IDM3LjEwNDYgNDAgMzYgNDBIMTJDMTAuODk1NCA0MCAxMCAzOS4xMDQ2IDEwIDM4VjM2WiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4K";
                    }}
                  />
                  <div className="rider-details">
                    <p className="rider-name">{rider.name || "GO7 Rider"}</p>
                    <p className="rider-phone">{rider.phone || "Rider on the way"}</p>
                    <div className="rider-rating">
                      ⭐ {rider.rating || "4.9"} • {rider.deliveries || "50"} deliveries
                    </div>
                  </div>
                  <div className="rider-actions">
                    <button className="action-btn call-btn">
                      📞
                    </button>
                    <button className="action-btn chat-btn">
                      💬
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Order Progress */}
            {delivery?.orderItems && (
              <div className="order-items-section">
                <h5>Your Order</h5>
                <div className="order-items">
                  {delivery.orderItems.map((item, index) => (
                    <div key={index} className="order-item">
                      <span className="item-quantity">{item.quantity}x</span>
                      <span className="item-name">{item.name}</span>
                      <span className="item-price">₦{item.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};

export default DeliverySheet;