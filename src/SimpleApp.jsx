import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// Simple placeholder component for testing
const PlaceholderPage = ({ title, color = "#f0f0f0" }) => (
  <div style={{ 
    minHeight: '100vh', 
    backgroundColor: color,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }}>
    <h1 style={{ marginBottom: '20px' }}>{title}</h1>
    <div style={{ marginBottom: '20px' }}>
      <Link to="/" style={buttonStyle}>Home</Link>
      <Link to="/book-delivery" style={buttonStyle}>Book Delivery</Link>
      <Link to="/orders" style={buttonStyle}>Orders</Link>
      <Link to="/profile" style={buttonStyle}>Profile</Link>
    </div>
    <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'white', borderRadius: '8px', maxWidth: '500px', width: '100%' }}>
      <p>This is a simple placeholder for the {title} page. The app is running in diagnostic mode to help troubleshoot the blank screen issue.</p>
    </div>
  </div>
);

const buttonStyle = {
  backgroundColor: '#5c6ac4',
  color: 'white',
  padding: '10px 15px',
  borderRadius: '5px',
  margin: '0 5px 10px 5px',
  textDecoration: 'none',
  display: 'inline-block'
};

function SimpleApp() {
  console.log('🚀 SimpleApp rendering - Diagnostic Mode');
  
  return (
    <>
      <Helmet>
        <title>Go7 Mobile - Diagnostic Mode</title>
        <meta name="description" content="Go7 Mobile running in diagnostic mode" />
      </Helmet>
      
      <Routes>
        <Route path="/" element={
          <PlaceholderPage title="Go7 Home" color="#e6f7ff" />
        } />
        
        <Route path="/book-delivery" element={
          <PlaceholderPage title="Book Delivery" color="#e6ffe6" />
        } />
        
        <Route path="/orders" element={
          <PlaceholderPage title="Orders" color="#fff0e6" />
        } />
        
        <Route path="/profile" element={
          <PlaceholderPage title="Profile" color="#f5e6ff" />
        } />
        
        <Route path="*" element={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            textAlign: 'center',
            background: '#ffebeb'
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
        boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
      }}>
        <Link to="/" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px' }}>🏠<br/>Home</Link>
        <Link to="/book-delivery" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px' }}>📦<br/>Delivery</Link>
        <Link to="/orders" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px' }}>📋<br/>Orders</Link>
        <Link to="/profile" style={{ textDecoration: 'none', color: '#5c6ac4', fontSize: '14px' }}>👤<br/>Profile</Link>
      </div>
    </>
  );
}

export default SimpleApp;