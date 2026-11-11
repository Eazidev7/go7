import React, { useState, useEffect } from 'react';
import { useCart } from '../contexts/CartContext';
import './PaymentSummary.css';

const PaymentSummary = ({ 
  deliveryFee = 0, 
  serviceFee = 0, 
  promoCode = null,
  onPromoCodeChange,
  showPromoInput = true 
}) => {
  const { cartItems, cartTotal } = useCart();
  const [promoInput, setPromoInput] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Calculate totals
  const subtotal = cartTotal || 0;
  const deliveryAmount = parseFloat(deliveryFee) || 0;
  const serviceAmount = parseFloat(serviceFee) || 0;
  const promoDiscount = promoCode ? parseFloat(promoCode.discount || 0) : 0;
  
  const finalTotal = subtotal + deliveryAmount + serviceAmount - promoDiscount;

  // Get item count
  const itemCount = cartItems.reduce((count, item) => count + (item.quantity || 1), 0);

  const handlePromoSubmit = async (e) => {
    e.preventDefault();
    
    if (!promoInput.trim()) return;
    
    setPromoLoading(true);
    setPromoError('');
    
    try {
      // Simulate promo code validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock promo codes for demo
      const promoCodes = {
        'GO7NEW': { 
          code: 'GO7NEW', 
          discount: 100, 
          description: 'New user discount' 
        },
        'SAVE20': { 
          code: 'SAVE20', 
          discount: subtotal * 0.2, 
          description: '20% off your order' 
        },
        'FREEDELIVERY': { 
          code: 'FREEDELIVERY', 
          discount: deliveryAmount, 
          description: 'Free delivery' 
        }
      };
      
      const validPromo = promoCodes[promoInput.toUpperCase()];
      
      if (validPromo) {
        onPromoCodeChange && onPromoCodeChange(validPromo);
        setPromoInput('');
      } else {
        setPromoError('Invalid promo code. Please try again.');
      }
      
    } catch (error) {
      setPromoError('Failed to validate promo code. Please try again.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    onPromoCodeChange && onPromoCodeChange(null);
    setPromoError('');
  };

  const formatPrice = (amount) => {
    return `₦${parseFloat(amount || 0).toLocaleString()}`;
  };

  return (
    <div className="payment-summary">
      <h3 className="summary-title">Order Summary</h3>
      
      {/* Subtotal */}
      <div className="summary-row">
        <span className="summary-label">
          Subtotal ({itemCount} item{itemCount !== 1 ? 's' : ''})
        </span>
        <span className="summary-value">{formatPrice(subtotal)}</span>
      </div>

      {/* Delivery Fee */}
      <div className="summary-row">
        <span className="summary-label">Delivery Fee</span>
        <span className="summary-value">
          {deliveryAmount === 0 ? 'Free' : formatPrice(deliveryAmount)}
        </span>
      </div>

      {/* Service Fee */}
      {serviceAmount > 0 && (
        <div className="summary-row">
          <span className="summary-label">Service Fee</span>
          <span className="summary-value">{formatPrice(serviceAmount)}</span>
        </div>
      )}

      {/* Promo Code Section */}
      {showPromoInput && (
        <div className="promo-section">
          {!promoCode ? (
            <form onSubmit={handlePromoSubmit} className="promo-form">
              <div className="promo-input-group">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="promo-input"
                  disabled={promoLoading}
                />
                <button 
                  type="submit" 
                  className="apply-promo-btn"
                  disabled={!promoInput.trim() || promoLoading}
                >
                  {promoLoading ? (
                    <span className="loading-spinner"></span>
                  ) : (
                    'Apply'
                  )}
                </button>
              </div>
              
              {promoError && (
                <div className="promo-error">
                  ⚠️ {promoError}
                </div>
              )}
            </form>
          ) : (
            <div className="applied-promo">
              <div className="promo-info">
                <span className="promo-icon">🎉</span>
                <div className="promo-details">
                  <span className="promo-code">{promoCode.code}</span>
                  <span className="promo-description">{promoCode.description}</span>
                </div>
              </div>
              <button 
                className="remove-promo-btn"
                onClick={handleRemovePromo}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Promo Discount */}
      {promoDiscount > 0 && (
        <div className="summary-row discount-row">
          <span className="summary-label">
            Discount ({promoCode?.code})
          </span>
          <span className="summary-value discount-value">
            -{formatPrice(promoDiscount)}
          </span>
        </div>
      )}

      {/* Divider */}
      <div className="summary-divider"></div>

      {/* Total */}
      <div className="summary-row total-row">
        <span className="summary-label total-label">Total</span>
        <span className="summary-value total-value">
          {formatPrice(finalTotal)}
        </span>
      </div>

      {/* Savings Display */}
      {promoDiscount > 0 && (
        <div className="savings-badge">
          You saved {formatPrice(promoDiscount)}! 🎉
        </div>
      )}
    </div>
  );
};

export default PaymentSummary;