import React from 'react';

// Mobile Home Test - Simple version
const MobileHomeTest = () => {
  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '100%', 
      backgroundColor: '#f5f5f5',
      minHeight: '100vh'
    }}>
      <header style={{ 
        backgroundColor: '#E30613', 
        color: 'white', 
        padding: '15px', 
        borderRadius: '8px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '20px' }}>Go7 Mobile</h1>
        <div style={{ fontSize: '20px' }}>📱</div>
      </header>

      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#E30613', margin: '0 0 15px 0', fontSize: '18px' }}>
          Mobile Interface Test
        </h2>
        <p>
          This is a simplified mobile interface for testing purposes. If you can see this message,
          the mobile component is rendering successfully!
        </p>
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#E5FFE5', 
          borderRadius: '5px',
          border: '1px solid #00CC00',
          marginTop: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ fontSize: '16px', marginRight: '5px' }}>✅</div>
            <div style={{ fontWeight: 'bold' }}>Status: Mobile Test Working</div>
          </div>
          <p style={{ margin: '0', fontSize: '14px' }}>
            Mobile interface is loaded and rendering correctly.
          </p>
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        overflowX: 'auto', 
        paddingBottom: '10px',
        marginBottom: '15px'
      }}>
        <div style={{ 
          flexShrink: 0, 
          backgroundColor: '#f0f0f0', 
          padding: '15px', 
          borderRadius: '8px', 
          textAlign: 'center', 
          minWidth: '80px'
        }}>
          <div style={{ fontSize: '24px' }}>🍔</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Food</div>
        </div>
        <div style={{ 
          flexShrink: 0, 
          backgroundColor: '#f0f0f0', 
          padding: '15px', 
          borderRadius: '8px', 
          textAlign: 'center', 
          minWidth: '80px'
        }}>
          <div style={{ fontSize: '24px' }}>🛒</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Market</div>
        </div>
        <div style={{ 
          flexShrink: 0, 
          backgroundColor: '#E30613', 
          color: 'white',
          padding: '15px', 
          borderRadius: '8px', 
          textAlign: 'center', 
          minWidth: '80px'
        }}>
          <div style={{ fontSize: '24px' }}>💊</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Pharmacy</div>
        </div>
        <div style={{ 
          flexShrink: 0, 
          backgroundColor: '#f0f0f0', 
          padding: '15px', 
          borderRadius: '8px', 
          textAlign: 'center', 
          minWidth: '80px'
        }}>
          <div style={{ fontSize: '24px' }}>📦</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>Package</div>
        </div>
      </div>

      <div style={{ marginTop: '15px' }}>
        <button onClick={() => window.location.href = '/'} style={{ 
          backgroundColor: '#333', 
          color: 'white', 
          border: 'none', 
          padding: '12px', 
          borderRadius: '5px', 
          fontWeight: 'bold', 
          width: '100%',
          cursor: 'pointer'
        }}>
          Return to Main Homepage
        </button>
      </div>
    </div>
  );
};

export default MobileHomeTest;