/**
 * 🔄 Go7 Live Tracking - Real-time Fare Updates
 * Provides live tracking with real-time fare calculation and route logging
 */

import React, { useEffect, useState } from "react";
import { calculateFare, formatFare, getFareBreakdown } from "../utils/fareCalculator";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import './LiveTracking.css';

export default function LiveTracking({ 
  orderId, 
  riderDistanceMeters, 
  riderDurationSeconds,
  riderLocation,
  destinationLocation,
  orderStatus = 'in_progress'
}) {
  const [liveFare, setLiveFare] = useState(null);
  const [fareHistory, setFareHistory] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (riderDistanceMeters == null || riderDurationSeconds == null) {
      console.log('LiveTracking: Missing distance or duration data');
      return;
    }

    const distanceKm = riderDistanceMeters / 1000;
    const durationMin = riderDurationSeconds / 60;
    const fare = calculateFare(distanceKm, durationMin);

    console.log('🔄 Live fare update:', {
      orderId,
      distanceKm: distanceKm.toFixed(2),
      durationMin: durationMin.toFixed(1),
      fare
    });

    setLiveFare(fare);
    setLastUpdate(new Date());
    
    // Add to fare history for trend analysis
    setFareHistory(prev => [...prev.slice(-9), { // Keep last 10 entries
      timestamp: new Date(),
      fare,
      distanceKm,
      durationMin
    }]);

    // Log current route snapshot to Firestore order doc for analytics
    const logRouteData = async () => {
      if (!orderId) return;
      
      setIsLogging(true);
      setError(null);

      try {
        await updateDoc(doc(db, "orders", orderId), {
          routeDistance: distanceKm,
          routeDuration: durationMin,
          currentFare: fare,
          riderLocation: riderLocation ? {
            latitude: riderLocation.lat,
            longitude: riderLocation.lng,
            timestamp: serverTimestamp()
          } : null,
          destinationLocation: destinationLocation ? {
            latitude: destinationLocation.lat,
            longitude: destinationLocation.lng
          } : null,
          lastFareUpdate: serverTimestamp(),
          orderStatus,
          // Analytics data
          analytics: {
            totalUpdates: fareHistory.length + 1,
            averageFare: fareHistory.length > 0 ? 
              Math.round(fareHistory.reduce((sum, h) => sum + h.fare, fare) / (fareHistory.length + 1)) : fare,
            maxFare: fareHistory.length > 0 ? 
              Math.max(fare, ...fareHistory.map(h => h.fare)) : fare,
            minFare: fareHistory.length > 0 ? 
              Math.min(fare, ...fareHistory.map(h => h.fare)) : fare
          }
        });

        console.log('✅ Route data logged successfully');
      } catch (err) {
        console.error('❌ Failed to log route data:', err);
        setError('Failed to update tracking data');
      } finally {
        setIsLogging(false);
      }
    };

    logRouteData();
  }, [orderId, riderDistanceMeters, riderDurationSeconds, riderLocation, destinationLocation, orderStatus, fareHistory]);

  const fareBreakdown = liveFare ? getFareBreakdown(
    riderDistanceMeters / 1000, 
    riderDurationSeconds / 60
  ) : null;

  const fareChange = fareHistory.length >= 2 ? 
    liveFare - fareHistory[fareHistory.length - 2].fare : 0;

  return (
    <div className="live-tracking">
      {/* Header */}
      <div className="tracking-header">
        <h2>🔄 Live Tracking</h2>
        <div className={`status-indicator ${orderStatus}`}>
          <div className="status-dot"></div>
          <span>{orderStatus.replace('_', ' ').toUpperCase()}</span>
        </div>
      </div>

      {/* Live Fare Display */}
      <div className="live-fare-section">
        <div className="fare-container">
          <div className="fare-header">
            <h3>💰 Current Fare</h3>
            {isLogging && <div className="update-indicator">Updating...</div>}
          </div>
          
          <div className="live-fare-display">
            {liveFare != null ? (
              <>
                <div className="main-fare">
                  {formatFare(liveFare)}
                </div>
                
                {fareChange !== 0 && (
                  <div className={`fare-change ${fareChange > 0 ? 'increase' : 'decrease'}`}>
                    {fareChange > 0 ? '+' : ''}{formatFare(Math.abs(fareChange))}
                    <span className="change-icon">
                      {fareChange > 0 ? '↗️' : '↘️'}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="calculating">Calculating...</div>
            )}
          </div>

          {fareBreakdown && (
            <div className="live-breakdown">
              <div className="breakdown-row">
                <span>Distance</span>
                <span>{(riderDistanceMeters / 1000).toFixed(1)} km</span>
              </div>
              <div className="breakdown-row">
                <span>Duration</span>
                <span>{(riderDurationSeconds / 60).toFixed(0)} min</span>
              </div>
              <div className="breakdown-row">
                <span>Base + Distance + Time</span>
                <span>{formatFare(fareBreakdown.rideCost)}</span>
              </div>
              <div className="breakdown-row">
                <span>Service Fee</span>
                <span>{formatFare(fareBreakdown.platformFee)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Route Progress */}
      <div className="route-progress">
        <h4>📍 Route Progress</h4>
        <div className="progress-stats">
          <div className="stat-item">
            <div className="stat-value">{(riderDistanceMeters / 1000).toFixed(1)}</div>
            <div className="stat-label">Kilometers</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{(riderDurationSeconds / 60).toFixed(0)}</div>
            <div className="stat-label">Minutes</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{fareHistory.length}</div>
            <div className="stat-label">Updates</div>
          </div>
        </div>
      </div>

      {/* Fare Trend */}
      {fareHistory.length > 1 && (
        <div className="fare-trend">
          <h4>📈 Fare Trend</h4>
          <div className="trend-chart">
            {fareHistory.slice(-5).map((entry, index) => (
              <div key={index} className="trend-point">
                <div 
                  className="trend-bar" 
                  style={{ 
                    height: `${(entry.fare / Math.max(...fareHistory.map(h => h.fare))) * 100}%` 
                  }}
                ></div>
                <div className="trend-value">{formatFare(entry.fare)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Update Info */}
      {lastUpdate && (
        <div className="update-info">
          <small>
            Last updated: {lastUpdate.toLocaleTimeString()}
            {error && <span className="error-text"> • {error}</span>}
          </small>
        </div>
      )}

      {/* Debug Info (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <details>
            <summary>🔧 Debug Info</summary>
            <pre>{JSON.stringify({
              orderId,
              riderDistanceMeters,
              riderDurationSeconds,
              liveFare,
              fareHistory: fareHistory.slice(-3)
            }, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
}