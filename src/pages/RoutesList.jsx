import React from 'react';
import { Link } from 'react-router-dom';

const RoutesList = () => {
  const routes = [
    { path: '/', name: 'Home' },
    { path: '/unified-demo', name: 'Unified Delivery System (NEW!)' },
    { path: '/modal-demo', name: 'Modal Demo (Full)' },
    { path: '/test-modal', name: 'Test Modal (Simple)' },
    { path: '/book', name: 'Book Delivery' },
    { path: '/track', name: 'Track Package' },
    { path: '/rider', name: 'Rider Dashboard' },
    { path: '/admin', name: 'Admin Dashboard' },
    { path: '/go7-map', name: 'Go7 Map Demo' }
  ];

  return (
    <div style={{
      padding: '40px',
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <h1 style={{ color: '#E30613', textAlign: 'center' }}>Go7 App Routes</h1>
      
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '30px',
        borderRadius: '15px',
        marginTop: '30px'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Available Pages:</h2>
        
        <div style={{
          display: 'grid',
          gap: '15px'
        }}>
          {routes.map((route, index) => (
            <Link 
              key={index}
              to={route.path}
              style={{
                display: 'block',
                padding: '15px 20px',
                backgroundColor: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                color: '#333',
                border: '2px solid #e0e0e0',
                transition: 'all 0.2s ease',
                fontWeight: '500'
              }}
              onMouseOver={(e) => {
                e.target.style.borderColor = '#E30613';
                e.target.style.backgroundColor = '#fff5f5';
              }}
              onMouseOut={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.backgroundColor = 'white';
              }}
            >
              <strong>{route.name}</strong>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                {route.path}
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div style={{
        backgroundColor: '#fff5f5',
        padding: '20px',
        borderRadius: '10px',
        marginTop: '30px',
        border: '2px solid #ffe6e6'
      }}>
        <h3 style={{ color: '#E30613', marginBottom: '15px' }}>🎯 Modal Demo Features</h3>
        <ul style={{ lineHeight: '1.6' }}>
          <li><strong>Test Modal:</strong> Simple test to verify routing works</li>
          <li><strong>Modal Demo:</strong> Full modal system demonstration</li>
          <li><strong>Rider Modal:</strong> 30-second countdown with order details</li>
          <li><strong>Customer Toasts:</strong> Status notifications with auto-close</li>
        </ul>
      </div>
    </div>
  );
};

export default RoutesList;