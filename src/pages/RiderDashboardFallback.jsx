import React from 'react';
import { ServiceFallback } from '../components/ServiceFallback';

// This is a fallback component for the RiderDashboard page
// to use when the actual component has dependency issues
function RiderDashboardFallback() {
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Rider Dashboard</h2>
      
      <ServiceFallback 
        serviceName="Rider Dashboard" 
        message="The rider dashboard is currently undergoing maintenance. Please check back later or contact dispatch for your deliveries."
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
          onClick={() => window.location.href = '/'}
        >
          Go to Home
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
          onClick={() => window.location.href = '/help'}
        >
          Get Help
        </button>
      </div>
    </div>
  );
}

export default RiderDashboardFallback;