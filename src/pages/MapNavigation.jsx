// src/pages/MapNavigation.jsx
/**
 * Navigation page for all map implementations
 */

import React from 'react';

const MapNavigation = () => {
  const mapLinks = [
    {
      title: 'Simple Map Test',
      url: '/simple-map-test',
      description: 'Basic Leaflet map with MapTiler tiles - minimal test',
      status: '✅ Working'
    },
    {
      title: 'Go7 Simple Map',
      url: '/go7-simple',
      description: 'Simplified Go7 map with custom icons and markers',
      status: '✅ Working'
    },
    {
      title: 'Go7 Map Test',
      url: '/go7-map-test',
      description: 'Basic functionality test of the full Go7 map',
      status: '⚠️ Testing'
    },
    {
      title: 'Go7 Map Demo',
      url: '/go7-map',
      description: 'Full-featured demo with animations and overlays',
      status: '⚠️ Complex'
    },
    {
      title: 'Styled Map Demo',
      url: '/styled-map',
      description: 'Enhanced delivery map with theme switching',
      status: '✅ Working'
    }
  ];

  const openLink = (url) => {
    window.open(url, '_blank');
  };

  return (
    <div style={{ 
      padding: '40px 20px', 
      maxWidth: '1200px', 
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ 
          fontSize: '36px', 
          color: '#1f2937', 
          marginBottom: '12px',
          fontWeight: '700'
        }}>
          Go7 Map Components
        </h1>
        <p style={{ 
          color: '#6b7280', 
          fontSize: '18px',
          margin: '0'
        }}>
          Choose a map implementation to test
        </p>
      </header>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '20px'
      }}>
        {mapLinks.map((link, index) => (
          <div
            key={index}
            style={{
              background: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
            }}
            onClick={() => openLink(link.url)}
            onMouseEnter={(e) => {
              e.target.style.transform = 'translateY(-4px)';
              e.target.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.1)';
              e.target.style.borderColor = '#FF6B35';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
              e.target.style.borderColor = '#e5e7eb';
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '12px'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1f2937',
                margin: '0'
              }}>
                {link.title}
              </h3>
              <span style={{
                fontSize: '12px',
                fontWeight: '600',
                padding: '4px 8px',
                borderRadius: '12px',
                background: link.status.includes('✅') ? '#dcfce7' : 
                           link.status.includes('⚠️') ? '#fef3c7' : '#fecaca',
                color: link.status.includes('✅') ? '#166534' : 
                       link.status.includes('⚠️') ? '#92400e' : '#dc2626'
              }}>
                {link.status}
              </span>
            </div>
            
            <p style={{ 
              color: '#6b7280', 
              fontSize: '14px', 
              lineHeight: '1.5',
              margin: '0 0 16px 0'
            }}>
              {link.description}
            </p>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              color: '#FF6B35',
              fontSize: '14px',
              fontWeight: '600'
            }}>
              Open Map →
            </div>
          </div>
        ))}
      </div>

      <div style={{ 
        marginTop: '40px', 
        padding: '20px',
        background: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#1f2937',
          marginBottom: '12px'
        }}>
          🔧 Troubleshooting Guide
        </h3>
        <ul style={{ 
          color: '#6b7280', 
          fontSize: '14px',
          lineHeight: '1.6',
          paddingLeft: '20px'
        }}>
          <li><strong>If map doesn't show:</strong> Check browser console for errors</li>
          <li><strong>If icons don't load:</strong> Verify image files in /public folder</li>
          <li><strong>If animation fails:</strong> Try the simplified version first</li>
          <li><strong>MapTiler key:</strong> Currently using: nRGZ9lGblbV9lFK2KclL</li>
        </ul>
      </div>

      <div style={{ 
        textAlign: 'center', 
        marginTop: '40px',
        color: '#9ca3af',
        fontSize: '14px'
      }}>
        Go7 Delivery Platform • Map Components Test Suite
      </div>
    </div>
  );
};

export default MapNavigation;