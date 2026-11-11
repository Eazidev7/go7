import React, { useState } from 'react';
import Go7SmartFareCalculator from '../components/Go7SmartFareCalculator';
import Go7SmartFareCalculatorMock from '../components/Go7SmartFareCalculatorMock';
import { toast } from 'react-hot-toast';
import './FareCalculatorDemo.css';

const FareCalculatorDemo = () => {
  const [lastFareData, setLastFareData] = useState(null);
  const [useMockVersion, setUseMockVersion] = useState(true); // Use mock by default for testing

  const handleFareCalculated = (fareData) => {
    setLastFareData(fareData);
    toast.success(`Fare calculated: ₦${fareData.fare} for ${fareData.distance.toFixed(1)}km`);
    console.log('📊 Fare Data:', fareData);
  };

  return (
    <div className="fare-calculator-demo">
      <div className="demo-header">
        <h1>🚗 Go7 Smart Fare Calculator</h1>
        <p>Enter pickup and delivery addresses to get instant fare calculation</p>
      </div>

      <div className="demo-content">
        <div className="version-toggle">
          <button 
            className={`toggle-btn ${useMockVersion ? 'active' : ''}`}
            onClick={() => setUseMockVersion(true)}
          >
            🧪 Mock Version (For Testing)
          </button>
          <button 
            className={`toggle-btn ${!useMockVersion ? 'active' : ''}`}
            onClick={() => setUseMockVersion(false)}
          >
            🌐 Live Version (Needs Google API)
          </button>
        </div>

        <div className="calculator-section">
          {useMockVersion ? (
            <Go7SmartFareCalculatorMock onFareCalculated={handleFareCalculated} />
          ) : (
            <Go7SmartFareCalculator onFareCalculated={handleFareCalculated} />
          )}
        </div>

        {lastFareData && (
          <div className="fare-data-display">
            <h3>📋 Last Calculation Data</h3>
            <div className="data-grid">
              <div className="data-item">
                <span className="label">Distance:</span>
                <span className="value">{lastFareData.distance.toFixed(1)} km</span>
              </div>
              <div className="data-item">
                <span className="label">Duration:</span>
                <span className="value">{lastFareData.duration} minutes</span>
              </div>
              <div className="data-item">
                <span className="label">Total Fare:</span>
                <span className="value">₦{lastFareData.fare}</span>
              </div>
            </div>
            
            <div className="breakdown-details">
              <h4>Fare Breakdown:</h4>
              <div className="breakdown-grid">
                <div className="breakdown-row">
                  <span>Base Fare:</span>
                  <span>₦{lastFareData.breakdown.baseFare}</span>
                </div>
                <div className="breakdown-row">
                  <span>Distance Fare:</span>
                  <span>₦{Math.round(lastFareData.breakdown.distanceFare)}</span>
                </div>
                <div className="breakdown-row">
                  <span>Service Fee:</span>
                  <span>₦{lastFareData.breakdown.serviceFee}</span>
                </div>
                <div className="breakdown-row total">
                  <span>Total:</span>
                  <span>₦{lastFareData.breakdown.total}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="features-section">
          <h3>✨ Features</h3>
          <div className="features-grid">
            <div className="feature-item">
              <div className="feature-icon">⚡</div>
              <div className="feature-content">
                <h4>Smart Debouncing</h4>
                <p>Waits 800ms after typing stops to avoid multiple API calls</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">🎭</div>
              <div className="feature-content">
                <h4>Fade-in Animation</h4>
                <p>Smooth fade-in animation prevents jarring fare updates</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">🚫</div>
              <div className="feature-content">
                <h4>Anti-flashing</h4>
                <p>Prevents multiple fares from flashing during calculation</p>
              </div>
            </div>
            
            <div className="feature-item">
              <div className="feature-icon">💰</div>
              <div className="feature-content">
                <h4>Go7 Pricing</h4>
                <p>₦150 base + ₦100/km + ₦50 service fee</p>
              </div>
            </div>
          </div>
        </div>

        <div className="sample-addresses">
          <h3>🧪 Sample Addresses for Testing</h3>
          <div className="address-samples">
            <div className="sample-pair">
              <strong>Lagos Test:</strong>
              <div>📍 Pickup: Victoria Island, Lagos</div>
              <div>🎯 Delivery: Ikeja, Lagos</div>
            </div>
            
            <div className="sample-pair">
              <strong>Abuja Test:</strong>
              <div>📍 Pickup: Wuse 2, Abuja</div>
              <div>🎯 Delivery: Garki, Abuja</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FareCalculatorDemo;