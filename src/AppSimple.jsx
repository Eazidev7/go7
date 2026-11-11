import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Simple test components
const SimpleHome = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Go7 Home - Loading Test</h1>
    <p>If you can see this, the app is loading correctly!</p>
    <div style={{ marginTop: '20px' }}>
      <a href="/book-delivery" style={{ margin: '10px', padding: '10px 20px', background: '#5c6ac4', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
        Book Delivery
      </a>
    </div>
  </div>
);

const SimpleBookDelivery = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Book Delivery - Simple Version</h1>
    <p>This is a simplified version to test if the route works.</p>
    <div style={{ marginTop: '20px' }}>
      <a href="/" style={{ margin: '10px', padding: '10px 20px', background: '#5c6ac4', color: 'white', textDecoration: 'none', borderRadius: '5px' }}>
        Back to Home
      </a>
    </div>
  </div>
);

const SimpleOrders = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Orders</h1>
    <p>Orders page - coming soon</p>
  </div>
);

const SimpleProfile = () => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1>Profile</h1>
    <p>Profile page - coming soon</p>
  </div>
);

function AppSimple() {
  const location = useLocation();
  
  console.log('🚀 Simple App loading, current path:', location.pathname);
  
  return (
    <div className="App">
      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#ffffff',
            color: '#1f2937',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            borderRadius: '8px',
            padding: '12px 16px',
          },
        }}
      />

      <Routes>
        <Route path="/" element={<SimpleHome />} />
        <Route path="/book-delivery" element={<SimpleBookDelivery />} />
        <Route path="/orders" element={<SimpleOrders />} />
        <Route path="/profile" element={<SimpleProfile />} />
        
        <Route path="*" element={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            background: '#f5f7fa'
          }}>
            <div style={{ fontSize: '80px', marginBottom: '20px' }}>⚠️</div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '10px' }}>Page Not Found</h1>
            <p style={{ marginBottom: '10px', fontSize: '18px' }}>
              Tried to access: <strong>"{window.location.pathname}"</strong>
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: '#5c6ac4',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '20px'
              }}
            >
              Go Home
            </button>
          </div>
        } />
      </Routes>
      
      {/* Simple bottom navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
        borderTop: '1px solid #e1e5e9'
      }}>
        <a href="/" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px', textAlign: 'center' }}>
          🏠<br/>Home
        </a>
        <a href="/book-delivery" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px', textAlign: 'center' }}>
          📦<br/>Delivery
        </a>
        <a href="/orders" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px', textAlign: 'center' }}>
          📋<br/>Orders
        </a>
        <a href="/profile" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px', textAlign: 'center' }}>
          👤<br/>Profile
        </a>
      </div>
    </div>
  );
}

export default AppSimple;