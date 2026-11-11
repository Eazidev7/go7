/**
 * 📋 Go7 Order Summary - Detailed Fare Breakdown
 * Displays comprehensive order summary with fare calculations
 */

import React from "react";
import { BASE_FARE, PRICE_PER_KM, PRICE_PER_MIN, formatFare } from "../utils/fareCalculator";
import './OrderSummary.css';

export default function OrderSummary({ 
  orderData, 
  showBreakdown = true,
  showRoute = true,
  showActions = false,
  onEdit,
  onConfirm 
}) {
  const distanceKm = orderData?.distanceKm || 0;
  const durationMin = orderData?.durationMin || 0;
  const fare = orderData?.finalFare || orderData?.estimatedFare || 0;
  const serviceFee = Math.round(fare * 0.05);
  const baseAmount = fare - serviceFee;

  // Calculate breakdown components
  const baseFare = BASE_FARE;
  const distanceFee = Math.round(distanceKm * PRICE_PER_KM);
  const timeFee = Math.round(durationMin * PRICE_PER_MIN);
  const calculatedBase = baseFare + distanceFee + timeFee;

  return (
    <div className="order-summary">
      {/* Header */}
      <div className="summary-header">
        <h3>📋 Order Summary</h3>
        {orderData?.status && (
          <span className={`order-status ${orderData.status}`}>
            {orderData.status.replace('_', ' ').toUpperCase()}
          </span>
        )}
      </div>

      {/* Route Information */}
      {showRoute && orderData && (
        <div className="route-section">
          <h4>📍 Route Details</h4>
          <div className="route-info">
            <div className="route-item">
              <div className="route-icon pickup">🟢</div>
              <div className="route-details">
                <div className="route-label">Pickup</div>
                <div className="route-address">
                  {orderData.pickupLocation?.address || orderData.pickup || 'Pickup location'}
                </div>
              </div>
            </div>
            
            <div className="route-divider"></div>
            
            <div className="route-item">
              <div className="route-icon delivery">🔴</div>
              <div className="route-details">
                <div className="route-label">Delivery</div>
                <div className="route-address">
                  {orderData.deliveryLocation?.address || orderData.delivery || 'Delivery location'}
                </div>
              </div>
            </div>
          </div>

          <div className="route-metrics">
            <div className="metric">
              <span className="metric-value">{distanceKm.toFixed(1)} km</span>
              <span className="metric-label">Distance</span>
            </div>
            <div className="metric">
              <span className="metric-value">{durationMin.toFixed(0)} min</span>
              <span className="metric-label">Duration</span>
            </div>
            {orderData.estimatedArrival && (
              <div className="metric">
                <span className="metric-value">{orderData.estimatedArrival}</span>
                <span className="metric-label">ETA</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fare Breakdown */}
      <div className="fare-section">
        <h4>💰 Fare Breakdown</h4>
        
        {showBreakdown ? (
          <div className="fare-breakdown">
            <div className="breakdown-item">
              <span>Base Fare</span>
              <span>{formatFare(baseFare)}</span>
            </div>
            
            <div className="breakdown-item">
              <span>Distance Fee ({distanceKm.toFixed(1)} km × ₦{PRICE_PER_KM})</span>
              <span>{formatFare(distanceFee)}</span>
            </div>
            
            <div className="breakdown-item">
              <span>Time Fee ({durationMin.toFixed(0)} min × ₦{PRICE_PER_MIN})</span>
              <span>{formatFare(timeFee)}</span>
            </div>
            
            <div className="breakdown-divider"></div>
            
            <div className="breakdown-item subtotal">
              <span>Subtotal</span>
              <span>{formatFare(calculatedBase)}</span>
            </div>
            
            <div className="breakdown-item">
              <span>Service Fee (5%)</span>
              <span>{formatFare(serviceFee)}</span>
            </div>
            
            {orderData?.discount > 0 && (
              <div className="breakdown-item discount">
                <span>Discount</span>
                <span>-{formatFare(orderData.discount)}</span>
              </div>
            )}
            
            <div className="breakdown-divider"></div>
            
            <div className="breakdown-total">
              <span>Total Amount</span>
              <span>{formatFare(fare)}</span>
            </div>
          </div>
        ) : (
          <div className="simple-fare">
            <div className="fare-amount">{formatFare(fare)}</div>
            <div className="fare-note">
              {distanceKm.toFixed(1)} km • {durationMin.toFixed(0)} min
            </div>
          </div>
        )}
      </div>

      {/* Order Items */}
      {orderData?.items && orderData.items.length > 0 && (
        <div className="items-section">
          <h4>📦 Order Items</h4>
          <div className="items-list">
            {orderData.items.map((item, index) => (
              <div key={index} className="order-item">
                <div className="item-details">
                  <div className="item-name">{item.name}</div>
                  {item.description && (
                    <div className="item-description">{item.description}</div>
                  )}
                </div>
                <div className="item-quantity">×{item.quantity || 1}</div>
                {item.price && (
                  <div className="item-price">{formatFare(item.price)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Method */}
      {orderData?.paymentMethod && (
        <div className="payment-section">
          <h4>💳 Payment Method</h4>
          <div className="payment-method">
            <div className="payment-icon">
              {orderData.paymentMethod === 'wallet' ? '👛' : 
               orderData.paymentMethod === 'card' ? '💳' : 
               orderData.paymentMethod === 'bank' ? '🏦' : '💰'}
            </div>
            <div className="payment-details">
              <div className="payment-name">
                {orderData.paymentMethod === 'wallet' ? 'Go7 Wallet' :
                 orderData.paymentMethod === 'card' ? 'Card Payment' :
                 orderData.paymentMethod === 'bank' ? 'Bank Transfer' : 
                 orderData.paymentMethod.charAt(0).toUpperCase() + orderData.paymentMethod.slice(1)}
              </div>
              {orderData.paymentStatus && (
                <div className={`payment-status ${orderData.paymentStatus}`}>
                  {orderData.paymentStatus.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Information */}
      {orderData?.notes && (
        <div className="notes-section">
          <h4>📝 Special Instructions</h4>
          <div className="order-notes">{orderData.notes}</div>
        </div>
      )}

      {/* Timestamps */}
      {(orderData?.createdAt || orderData?.confirmedAt) && (
        <div className="timestamps">
          {orderData.createdAt && (
            <div className="timestamp">
              <span>Created:</span> {new Date(orderData.createdAt).toLocaleString()}
            </div>
          )}
          {orderData.confirmedAt && (
            <div className="timestamp">
              <span>Confirmed:</span> {new Date(orderData.confirmedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="summary-actions">
          {onEdit && (
            <button className="edit-button" onClick={onEdit}>
              ✏️ Edit Order
            </button>
          )}
          {onConfirm && (
            <button className="confirm-button" onClick={onConfirm}>
              ✅ Confirm Order
            </button>
          )}
        </div>
      )}
    </div>
  );
}