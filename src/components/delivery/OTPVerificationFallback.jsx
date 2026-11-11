import React from 'react';
import { ServiceFallback } from './ServiceFallback';

// This is a fallback component for the OTPVerification component
// to use when the actual component has dependency issues
function OTPVerificationFallback() {
  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>Delivery Verification</h2>
      
      <ServiceFallback 
        serviceName="OTP Verification" 
        message="The delivery verification service is being updated. Please try again later or contact customer support for assistance."
      />
      
      <div style={{ marginTop: '20px' }}>
        <button 
          style={{
            padding: '10px 15px',
            backgroundColor: '#e53e3e',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
          onClick={() => window.history.back()}
        >
          Go Back
        </button>
      </div>
    </div>
  );
}

export default OTPVerificationFallback;