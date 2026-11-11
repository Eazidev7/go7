/**
 * 🎯 Go7 Booking Screen - Fare Estimation
 * Provides real-time fare estimates based on route data
 */

import React, { useState, useEffect } from "react";
import { calculateFare, getFareBreakdown, formatFare, estimateDeliveryTime } from "../utils/fareCalculator";
import './BookingScreen.css';

export default function BookingScreen({ 
  routeDistanceMeters, 
  routeDurationSeconds, 
  onFareUpdate,
  pickupLocation = "Your Location",
  deliveryLocation = "Delivery Address"
}) {
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [fareBreakdown, setFareBreakdown] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [estimatedTime, setEstimatedTime] = useState(null);

  useEffect(() => {
    if (routeDistanceMeters != null && routeDurationSeconds != null) {
      setIsCalculating(true);
      
      // Convert to appropriate units
      const distanceKm = routeDistanceMeters / 1000;
      const durationMin = routeDurationSeconds / 60;
      
      // Calculate fare and breakdown
      const fare = calculateFare(distanceKm, durationMin);
      const breakdown = getFareBreakdown(distanceKm, durationMin);
      const deliveryTime = estimateDeliveryTime(distanceKm);
      
      setEstimatedFare(fare);
      setFareBreakdown(breakdown);
      setEstimatedTime(deliveryTime);
      setIsCalculating(false);
      
      // Notify parent component
      if (onFareUpdate) {
        onFareUpdate({
          fare,
          breakdown,
          distanceKm,
          durationMin,
          estimatedTime: deliveryTime
        });
      }
    } else {
      setEstimatedFare(null);
      setFareBreakdown(null);
      setEstimatedTime(null);
    }
  }, [routeDistanceMeters, routeDurationSeconds, onFareUpdate]);

  return (
    <div className="booking-screen">
      {/* Route Summary */}
      <div className="route-summary">
        <h3 className="route-title">📍 Delivery Route</h3>
        <div className="route-details">
          <div className="route-point pickup">
            <div className="route-icon">🟢</div>
            <div className="route-info">
              <div className="route-label">Pickup</div>
              <div className="route-address">{pickupLocation}</div>
            </div>
          </div>
          
          <div className="route-line"></div>
          
          <div className="route-point delivery">
            <div className="route-icon">🔴</div>
            <div className="route-info">
              <div className="route-label">Delivery</div>
              <div className="route-address">{deliveryLocation}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Fare Estimation */}
      <div className="fare-section">
        <h3 className="fare-title">💰 Fare Estimate</h3>
        
        {isCalculating ? (
          <div className="calculating">
            <div className="spinner"></div>
            <span>Calculating fare...</span>
          </div>
        ) : estimatedFare != null ? (
          <div className="fare-display">
            <div className="main-fare">
              {formatFare(estimatedFare)}
            </div>
            
            {fareBreakdown && (
              <div className="fare-breakdown">
                <div className="breakdown-item">
                  <span>Base Fare</span>
                  <span>{formatFare(fareBreakdown.baseFare)}</span>
                </div>
                <div className="breakdown-item">
                  <span>Distance ({(routeDistanceMeters / 1000).toFixed(1)} km)</span>
                  <span>{formatFare(fareBreakdown.distanceCost)}</span>
                </div>
                <div className="breakdown-item">
                  <span>Time ({(routeDurationSeconds / 60).toFixed(0)} min)</span>
                  <span>{formatFare(fareBreakdown.timeCost)}</span>
                </div>
                <div className="breakdown-item">
                  <span>Service Fee</span>
                  <span>{formatFare(fareBreakdown.platformFee)}</span>
                </div>
                <div className="breakdown-divider"></div>
                <div className="breakdown-total">
                  <span>Total</span>
                  <span>{formatFare(fareBreakdown.total)}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="no-route">
            <div className="no-route-icon">🗺️</div>
            <p>Enter pickup and delivery locations to see fare estimate</p>
          </div>
        )}
      </div>

      {/* Delivery Time Estimate */}
      {estimatedTime && (
        <div className="time-estimate">
          <div className="time-icon">⏱️</div>
          <div className="time-info">
            <div className="time-label">Estimated Delivery</div>
            <div className="time-value">{estimatedTime} minutes</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {estimatedFare && (
        <div className="booking-actions">
          <button 
            className="book-button"
            onClick={() => {
              console.log('Booking confirmed with fare:', estimatedFare);
              // Handle booking confirmation
            }}
          >
            Book Delivery - {formatFare(estimatedFare)}
          </button>
        </div>
      )}
    </div>
  );
}