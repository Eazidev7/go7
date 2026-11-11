// --- GO7 SMART FARE CALCULATOR (Mock Version for Testing) ---
// Simulates fare calculation without Google Maps API for development testing

import React, { useState, useEffect, useRef } from "react";
import "./Go7SmartFareCalculatorMock.css";

const Go7SmartFareCalculatorMock = ({ onFareCalculated }) => {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [distance, setDistance] = useState(null);
  const [price, setPrice] = useState(null);
  const [loadingFare, setLoadingFare] = useState(false);
  const [fareVisible, setFareVisible] = useState(false);
  const [lastCalculatedAddresses, setLastCalculatedAddresses] = useState({ pickup: "", dropoff: "" });

  // Debounce timer ref to avoid multiple calculations
  const debounceTimer = useRef(null);
  const fadeTimer = useRef(null);

  // Mock distance data for common Lagos routes
  const mockDistances = {
    "victoria island": { "ikeja": 15.2, "lekki": 8.5, "mainland": 20.3, "yaba": 12.7 },
    "ikeja": { "victoria island": 15.2, "lekki": 22.8, "yaba": 18.5, "mainland": 8.3 },
    "lekki": { "victoria island": 8.5, "ikeja": 22.8, "yaba": 18.9, "mainland": 25.1 },
    "yaba": { "ikeja": 18.5, "victoria island": 12.7, "lekki": 18.9, "mainland": 5.2 },
    "mainland": { "ikeja": 8.3, "victoria island": 20.3, "lekki": 25.1, "yaba": 5.2 }
  };

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
      const addressesChanged = 
        pickup !== lastCalculatedAddresses.pickup || 
        dropoff !== lastCalculatedAddresses.dropoff;
      
      if (addressesChanged) {
        setFareVisible(false);
        clearTimeout(fadeTimer.current);
        fadeTimer.current = setTimeout(() => {
          setFareVisible(true);
        }, 100);
      }
    }
  }, [price, pickup, dropoff, lastCalculatedAddresses, fareVisible]);

  function handleAddressChange(type, value) {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (type === "pickup") {
      setPickup(value);
    } else {
      setDropoff(value);
    }

    if (fareVisible) {
      setFareVisible(false);
    }

    debounceTimer.current = setTimeout(() => {
      const currentPickup = type === "pickup" ? value : pickup;
      const currentDropoff = type === "dropoff" ? value : dropoff;
      
      if (currentPickup.trim() && currentDropoff.trim()) {
        if (currentPickup !== lastCalculatedAddresses.pickup || 
            currentDropoff !== lastCalculatedAddresses.dropoff) {
          fetchDistanceAndFare(currentPickup, currentDropoff);
        }
      } else {
        setPrice(null);
        setDistance(null);
        setFareVisible(false);
      }
    }, 800);
  }

  function findMockDistance(from, to) {
    const fromKey = from.toLowerCase().trim();
    const toKey = to.toLowerCase().trim();
    
    // Check direct match
    if (mockDistances[fromKey] && mockDistances[fromKey][toKey]) {
      return mockDistances[fromKey][toKey];
    }
    
    // Check reverse direction
    if (mockDistances[toKey] && mockDistances[toKey][fromKey]) {
      return mockDistances[toKey][fromKey];
    }
    
    // Check partial matches
    for (const [area1, destinations] of Object.entries(mockDistances)) {
      if (fromKey.includes(area1) || area1.includes(fromKey)) {
        for (const [area2, dist] of Object.entries(destinations)) {
          if (toKey.includes(area2) || area2.includes(toKey)) {
            return dist;
          }
        }
      }
    }
    
    // Default random distance for any other addresses
    return Math.random() * 20 + 5; // 5-25 km
  }

  async function fetchDistanceAndFare(from, to) {
    try {
      setLoadingFare(true);
      setFareVisible(false);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
      
      const distanceKm = findMockDistance(from, to);
      const durationMinutes = Math.round((distanceKm / 25) * 60 + 10); // Estimate based on 25km/h average speed

      // Go7 Smart Fare Calculation
      const baseFare = 150; // Base fare in Naira
      const perKm = 100; // Per kilometer rate
      const serviceFee = 50; // Service fee
      const total = baseFare + (distanceKm * perKm) + serviceFee;

      // Update state
      setDistance(distanceKm.toFixed(1));
      setPrice(Math.round(total));
      setLastCalculatedAddresses({ pickup: from, dropoff: to });

      // Trigger fade-in animation
      setTimeout(() => {
        setFareVisible(true);
      }, 200);

      // Callback to parent component
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

    } catch (err) {
      console.error("Error calculating fare:", err);
      setPrice(null);
      setDistance(null);
      setFareVisible(false);
    } finally {
      setLoadingFare(false);
    }
  }

  return (
    <div className="go7-fare-calculator-mock">
      <div className="mock-banner">
        <span>🧪 DEMO MODE - Using mock data for testing</span>
      </div>
      
      <div className="address-inputs">
        <div className="input-group">
          <label htmlFor="pickup-address">📍 Pickup Address</label>
          <input
            id="pickup-address"
            type="text"
            value={pickup}
            onChange={(e) => handleAddressChange("pickup", e.target.value)}
            placeholder="Try: Victoria Island, Ikeja, Lekki, Yaba..."
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
            placeholder="Try: Victoria Island, Ikeja, Lekki, Yaba..."
            className="address-input"
          />
        </div>
      </div>

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

export default Go7SmartFareCalculatorMock;