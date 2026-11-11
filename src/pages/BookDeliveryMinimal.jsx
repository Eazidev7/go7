import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Temporarily comment out problematic imports to isolate the issue
// import { useAuthContext } from '../contexts/AuthContext';
// import { 
//   getCustomerWalletInfo, 
//   payForDeliveryWithWallet, 
//   formatCurrency, 
//   hasSufficientBalance 
// } from '../services/customerWalletService';
// import { Helmet } from 'react-helmet-async';
// import L from 'leaflet';
// import 'leaflet/dist/leaflet.css';
// import * as maptilersdk from '@maptiler/sdk';
// import '@maptiler/sdk/dist/maptiler-sdk.css';
// import Swal from 'sweetalert2';
// import { bookDelivery, calculateDeliveryPrice, getAvailableRiders } from '../services/deliveryService';
// import { createDeliveryEvent } from '../types/models';

const BookDeliveryMinimal = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('✅ BookDeliveryMinimal mounted successfully');
    console.log('📍 Navigation available:', !!navigate);
  }, [navigate]);

  return (
    <div style={{
      padding: '20px',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh',
      background: 'red',  // Obvious background color for debugging
      color: 'white'      // Contrasting text color
    }}>
      <h1 style={{ color: 'yellow', marginBottom: '20px', fontSize: '24px' }}>📦 BOOK DELIVERY - TESTING</h1>
      <p>Testing minimal BookDelivery component without heavy imports...</p>

      <div style={{
        background: 'white',
        padding: '20px',
        margin: '20px 0',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3>🚀 Import Status</h3>
        <ul style={{ marginTop: '10px' }}>
          <li>✅ React hooks imported</li>
          <li>✅ useNavigate imported</li>
          <li>❌ MapTiler SDK (temporarily disabled)</li>
          <li>❌ Leaflet (temporarily disabled)</li>
          <li>❌ AuthContext (temporarily disabled)</li>
          <li>❌ Services (temporarily disabled)</li>
        </ul>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>📍 Basic Form</h3>
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginTop: '10px' }}>
          <input
            type="text"
            placeholder="Pickup Address"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '10px'
            }}
          />
          <input
            type="text"
            placeholder="Delivery Address"
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '10px'
            }}
          />
          <button
            style={{
              background: '#007bff',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
            onClick={() => {
              console.log('Form submission test');
              alert('Form is working! This is just a test version.');
            }}
          >
            Test Submit
          </button>
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: '#6c757d',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default BookDeliveryMinimal;