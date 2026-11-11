import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Package } from 'lucide-react';
import './PaymentSuccessModal.css';

/**
 * 🎉 PAYMENT SUCCESS MODAL
 * Animated success screen after payment completion
 * Shows order code, total, and tracking button
 */

const PaymentSuccessModal = ({ 
  isOpen, 
  onClose, 
  orderData,
  onTrackOrder 
}) => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  // Safely destructure orderData with fallback
  const {
    orderCode = 'GO7-000000',
    serviceType = 'Delivery',
    total = 0,
    paymentMethod = 'wallet',
    orderId = null
  } = orderData || {};

  useEffect(() => {
    if (isOpen) {
      // Delay content appearance for animation effect
      setTimeout(() => setShowContent(true), 300);
    } else {
      setShowContent(false);
    }
  }, [isOpen]);

  const handleTrackOrder = () => {
    if (orderId) {
      navigate(`/track/${orderId}`);
    } else {
      navigate('/orders');
    }
    if (onTrackOrder) onTrackOrder();
  };

  if (!isOpen) return null;

  return (
    <div className="payment-success-overlay" onClick={onClose}>
      <div 
        className="payment-success-modal" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Animation */}
        <div className="success-animation">
          <div className="success-checkmark">
            <CheckCircle size={80} className="checkmark-icon" />
            <div className="success-ring"></div>
            <div className="success-ring-pulse"></div>
          </div>
        </div>

        {/* Content */}
        <div className={`success-content ${showContent ? 'visible' : ''}`}>
          <h2 className="success-title">Payment Successful!</h2>
          <p className="success-subtitle">Your order is being processed</p>

          {/* Order Details */}
          <div className="order-details-card">
            <div className="order-code-section">
              <div className="order-icon-wrapper">
                <Package size={24} className="order-icon" />
              </div>
              <div className="order-info">
                <span className="order-label">Order Code</span>
                <span className="order-code">{orderCode}</span>
              </div>
            </div>

            <div className="order-divider"></div>

            <div className="order-summary">
              <div className="summary-row">
                <span className="summary-label">Service Type</span>
                <span className="summary-value capitalize">{serviceType}</span>
              </div>
              <div className="summary-row">
                <span className="summary-label">Payment Method</span>
                <span className="summary-value capitalize">{paymentMethod}</span>
              </div>
              <div className="summary-row total-row">
                <span className="summary-label">Total Paid</span>
                <span className="summary-total">₦{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="success-actions">
            <button 
              className="track-order-btn"
              onClick={handleTrackOrder}
            >
              <span>Track My Order</span>
              <ArrowRight size={20} />
            </button>
            <button 
              className="done-btn"
              onClick={onClose}
            >
              Done
            </button>
          </div>

          {/* Footer Note */}
          <p className="success-note">
            You will receive updates about your order via notifications
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessModal;
