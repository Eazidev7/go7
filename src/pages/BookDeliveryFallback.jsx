import React from 'react';
import { ServiceFallback } from '../components/ServiceFallback';

// This is a fallback component for the BookDelivery page
// to use when the actual component has dependency issues
function BookDeliveryFallback() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Book a Delivery</h2>
      
      <ServiceFallback 
        serviceName="Delivery Booking" 
        message="The delivery booking service is currently being upgraded. Please try again later or contact our support team for immediate assistance."
      />
      
      <div style={{ marginTop: '20px' }}>
        <button 
          style={{
            padding: '10px 15px',
            backgroundColor: '#e53e3e',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
        
        <button 
          style={{
            padding: '10px 15px',
            backgroundColor: 'transparent',
            color: '#e53e3e',
            border: '1px solid #e53e3e',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          onClick={() => window.location.href = '/contact'}
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}

export default BookDeliveryFallback;