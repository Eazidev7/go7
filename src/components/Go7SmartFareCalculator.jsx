// --- GO7 SMART FARE CALCULATOR FIX ---
// Ensures price calculates only once after valid addresses are entered.
// Features: Debounced API calls, fade-in animation, anti-flashing protection

import React, { useState, useEffect, useRef } from "react";
import "./Go7SmartFareCalculator.css";

const Go7SmartFareCalculator = ({ onFareCalculated }) => {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [distance, setDistance] = useState(null);
  const [price, setPrice] = useState(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [fareVisible, setFareVisible] = useState(false);
  const [lastCalculatedAddresses, setLastCalculatedAddresses] = useState({ pickup: "", dropoff: "" });

  // Replace with your active Google Maps API key
  const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY_HERE";

  // Debounce timer ref to avoid multiple API calls
  const debounceTimer = useRef(null);
  const fadeTimer = useRef(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  // Reset fare visibility when addresses change
  useEffect(() => {
    if (price !== null && fareVisible) {
      // Only show fare if addresses are different from last calculation
      const addressesChanged = 
        pickup !== lastCalculatedAddresses.pickup || 
        dropoff !== lastCalculatedAddresses.dropoff;
      
      if (addressesChanged) {
        setFareVisible(false);
        // Small delay before showing new fare to prevent flashing
        clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => {
          setFareVisible(true);
        }, 100);
      }
    }
  }, [price, pickup, dropoff, lastCalculatedAddresses, fareVisible]);

  function handleAddressChange(type, value) {
    // Clear previous debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Update state
    if (type === "pickup") {
      setPickup(value);
    } else {
      setDropoff(value);
    }

    // Hide fare during typing to prevent confusion
    if (fareVisible) {
      setFareVisible(false);
    }

    // Debounce API call - only trigger after user stops typing
    debounceTimer.current = setTimeout(() => {
      const currentPickup = type === "pickup" ? value : pickup;
      const currentDropoff = type === "dropoff" ? value : dropoff;
      
      // Only calculate if both addresses are provided and not empty
      if (currentPickup.trim() && currentDropoff.trim()) {
        // Check if addresses are different from last calculation to avoid redundant calls
        if (currentPickup !== lastCalculatedAddresses.pickup || 
            currentDropoff !== lastCalculatedAddresses.dropoff) {
          fetchDistanceAndFare(currentPickup, currentDropoff);
        }
      } else {
        // Clear fare if addresses are incomplete
        setPrice(null);
        setDistance(null);
        setFareVisible(false);
      }
    }, 800);
  }

  async function fetchDistanceAndFare(from, to) {
    try {
      setLoadingFare(true);
      setFareVisible(false); // Hide previous fare during calculation
      
      // Use CORS proxy for browser-based requests
      const proxyUrl = "https://cors-anywhere.herokuapp.com/";
      const url = `${proxyUrl}https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        from
      )}&destinations=${encodeURIComponent(to)}&key=${GOOGLE_KEY}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === "OK" && data.rows[0].elements[0].status === "OK") {
        const element = data.rows[0].elements[0];
        const distMeters = element.distance.value;
        const distanceKm = distMeters / 1000;
        const durationMinutes = Math.round(element.duration.value / 60);

        // Go7 Smart Fare Calculation
        const baseFare = 150; // Base fare in Naira
        const perKm = 100; // Per kilometer rate
        const serviceFee = 50; // Service fee
        const total = baseFare + (distanceKm * perKm) + serviceFee;

        // Update state
        setDistance(distanceKm.toFixed(1));
        setPrice(Math.round(total));
        setLastCalculatedAddresses({ pickup: from, dropoff: to });

        // Trigger fade-in animation after a short delay
        setTimeout(() => {
          setFareVisible(true);
        }, 200);

        // Callback to parent component if provided
        if (onFareCalculated) {
          onFareCalculated({
            distance: distanceKm,
            duration: durationMinutes,
            fare: Math.round(total),
            breakdown: {
              baseFare,
              distanceFare: distanceKm * perKm,
              serviceFee,
              total: Math.round(total)
            }
          });
        }

      } else {
        setPrice(null);
        setDistance(null);
        setFareVisible(false);
        
        // Show user-friendly error message
        const errorMsg = data.rows[0]?.elements[0]?.status === "ZERO_RESULTS" 
          ? "⚠️ No route found between these addresses. Please check and try again."
          : "⚠️ Unable to calculate fare. Please verify your addresses.";
        
        // You can replace this with a toast notification
        console.warn("Fare calculation error:", errorMsg);
      }
    } catch (err) {
      console.error("Error calculating fare:", err);
      setPrice(null);
      setDistance(null);
      setFareVisible(false);
      
      // Handle network errors gracefully
      console.warn("⚠️ Network error. Please check your connection and try again.");
    } finally {
      setLoadingFare(false);
    }
  }

  return (
    <div className="go7-fare-calculator">
      <div className="address-inputs">
        <div className="input-group">
          <label htmlFor="pickup-address">📍 Pickup Address</label>
          <input
            id="pickup-address"
            type="text"
            value={pickup}
            onChange={(e) => handleAddressChange("pickup", e.target.value)}
            placeholder="Enter pickup location..."
            className="address-input"
          />
        </div>

        <div className="input-group">
          <label htmlFor="dropoff-address">🎯 Delivery Address</label>
          <input
            id="dropoff-address"
            type="text"
            value={dropoff}
            onChange={(e) => handleAddressChange("dropoff", e.target.value)}
            placeholder="Enter delivery location..."
            className="address-input"
          />
        </div>
      </div>

      {/* Fare Display with Fade-in Animation */}
      <div className="fare-display-container">
        {loadingFare && (
          <div className="fare-loading">
            <div className="loading-spinner"></div>
            <span>Calculating fare...</span>
          </div>
        )}

        {!loadingFare && price && distance && (
          <div className={`fare-result ${fareVisible ? 'fade-in visible' : 'fade-in'}`}>
            <div className="fare-header">
              <h3>🚗 Go7 Delivery Fare</h3>
            </div>
            
            <div className="fare-details">
              <div className="fare-main">
                <span className="currency">₦</span>
                <span className="amount">{price}</span>
              </div>
              
              <div className="fare-info">
                <div className="distance-info">
                  <span className="label">Distance:</span>
                  <span className="value">{distance} km</span>
                </div>
                
                <div className="fare-breakdown">
                  <div className="breakdown-item">
                    <span>Base fare:</span>
                    <span>₦150</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Distance ({distance} km):</span>
                    <span>₦{Math.round(parseFloat(distance) * 100)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>Service fee:</span>
                    <span>₦50</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loadingFare && !price && pickup && dropoff && (
          <div className="fare-error">
            <span>⚠️ Unable to calculate fare for the provided addresses</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Go7SmartFareCalculator;