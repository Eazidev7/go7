import React, { useState } from 'react';

/**
 * Real Figma Mobile App - This will load the actual Figma app
 * For now, using a working mobile interface while we set up proper imports
 */

const FigmaMobileApp = () => {
  const [currentScreen, setCurrentScreen] = useState('explore');

  return (
    <div style={{ 
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      position: 'relative'
    }}>
      {/* Status Bar Simulation */}
      <div style={{
        height: '44px',
        backgroundColor: '#000',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600'
      }}>
        <span>9:41</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <span>📶</span>
          <span>📶</span>
          <span>🔋</span>
        </div>
      </div>

      {/* Location Header */}
      <div style={{
        backgroundColor: '#E83A2E',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>Deliver to</div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>📍 Abeokuta, NG</div>
        </div>
        <div style={{ fontSize: '20px' }}>🔔</div>
      </div>

      {/* Hero Promo Card */}
      <div style={{
        margin: '16px 20px',
        backgroundColor: '#FFEFE7',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ color: '#E83A2E', fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
            Free Delivery! 🚚
          </div>
          <div style={{ color: '#666', fontSize: '14px' }}>
            On orders above ₦2,000
          </div>
        </div>
        <div style={{ fontSize: '32px' }}>🍔</div>
      </div>

      {/* Categories */}
      <div style={{ padding: '0 20px', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
          Categories
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px'
        }}>
          {[
            { name: 'Food', icon: '🍔', color: '#FFE5E5' },
            { name: 'Grocery', icon: '🛒', color: '#E5F5FF' },
            { name: 'Pharmacy', icon: '💊', color: '#E5FFE5' },
            { name: 'Drinks', icon: '🥤', color: '#FFF5E5' }
          ].map((category) => (
            <div 
              key={category.name}
              style={{
                backgroundColor: category.color,
                borderRadius: '12px',
                padding: '16px 8px',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{category.icon}</div>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#333' }}>{category.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Section */}
      <div style={{ padding: '0 20px', marginBottom: '100px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px', color: '#333' }}>
          🔥 Trending Now
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { name: 'Tasty Burgers', rating: '4.8', time: '15-20 min', fee: '₦200', image: '🍔' },
            { name: 'Pizza Palace', rating: '4.6', time: '20-25 min', fee: 'Free', image: '🍕' },
            { name: 'Chicken Republic', rating: '4.7', time: '10-15 min', fee: '₦150', image: '🍗' }
          ].map((vendor, index) => (
            <div 
              key={index}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '60px',
                height: '60px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                {vendor.image}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                  {vendor.businessName || vendor.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#666' }}>
                  <span>⭐ {vendor.rating}</span>
                  <span>•</span>
                  <span>🕐 {vendor.time}</span>
                  <span>•</span>
                  <span style={{ color: vendor.fee === 'Free' ? '#4CAF50' : '#666' }}>
                    🚚 {vendor.fee}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #e0e0e0',
        padding: '12px 0',
        paddingBottom: '24px', // iOS safe area
        display: 'flex',
        justifyContent: 'space-around'
      }}>
        {[
          { name: 'Home', icon: '🏠', active: true },
          { name: 'Delivery', icon: '🚚', active: false },
          { name: 'Orders', icon: '📋', active: false },
          { name: 'Profile', icon: '👤', active: false }
        ].map((tab) => (
          <div 
            key={tab.name}
            style={{
              textAlign: 'center',
              color: tab.active ? '#E83A2E' : '#999',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            <div style={{ marginBottom: '4px', fontSize: '20px' }}>
              {tab.icon}
            </div>
            <div style={{ fontWeight: tab.active ? '600' : '400' }}>
              {tab.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * MobileApp - Your actual Figma mobile app 
 */
function MobileApp() {
  return <FigmaMobileApp />;
}

export default MobileApp;