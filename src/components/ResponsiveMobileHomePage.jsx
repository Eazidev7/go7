import React, { useState, useEffect } from 'react';

const ResponsiveMobileHomePage = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (!isMobile) {
    return null; // Don't render on desktop
  }

  return (
    <div style={{
      backgroundColor: 'white',
      minHeight: '100vh',
      paddingBottom: '80px'
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: '0',
        backgroundColor: 'white',
        zIndex: '40',
        padding: '12px 16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '18px' }}>📍</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Abeokuta, NG</span>
          </div>
          <div style={{
            width: '24px',
            height: '24px',
            backgroundColor: '#E30613',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px'
          }}>🔔</div>
        </div>
        
        <input
          type="text"
          placeholder="Search Go7…"
          style={{
            width: '100%',
            padding: '12px 16px 12px 44px',
            backgroundColor: '#F9FAFB',
            borderRadius: '16px',
            border: 'none',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Promo Banner */}
      <div style={{
        margin: '16px',
        padding: '16px',
        backgroundColor: '#E30613',
        borderRadius: '16px',
        color: 'white'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
          Get ₦200 Off Your First Order on Go7
        </h2>
        <p style={{ fontSize: '14px', opacity: '0.9', marginBottom: '16px' }}>
          Use code GOFIRST at checkout
        </p>
        <button style={{
          backgroundColor: 'black',
          color: 'white',
          padding: '8px 24px',
          borderRadius: '20px',
          border: 'none',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          Order Now
        </button>
      </div>

      {/* Categories */}
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          overflowX: 'auto',
          paddingBottom: '8px'
        }}>
          {[
            { icon: '🍔', name: 'Burger' },
            { icon: '🍕', name: 'Pizza' },
            { icon: '🥗', name: 'Salad' },
            { icon: '🍣', name: 'Sushi' },
            { icon: '🛒', name: 'Local Market', highlight: true },
            { icon: '💊', name: 'Pharmacy', highlight: true },
            { icon: '🚚', name: 'Book Delivery' }
          ].map((category, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: '16px',
                backgroundColor: category.highlight ? '#E30613' : '#F9FAFB',
                color: category.highlight ? 'white' : '#374151',
                minWidth: 'max-content',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '24px' }}>{category.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: '500' }}>{category.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vendors */}
      <div style={{ padding: '0 16px', marginBottom: '24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827' }}>
            Popular Near You
          </h3>
          <button style={{
            color: '#E30613',
            fontSize: '14px',
            fontWeight: '500',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}>
            See All
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[
            { name: 'Burger Haven', category: 'Fast Food', eta: '15-25 min', rating: 4.8, fee: '₦200' },
            { name: 'Ibara Market', category: 'Local Market', eta: '10-20 min', rating: 4.6, fee: '₦150' },
            { name: 'MediPlus Pharmacy', category: 'Healthcare', eta: '5-15 min', rating: 4.9, fee: '₦100' }
          ].map((vendor, index) => (
            <div
              key={index}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                border: '1px solid #F3F4F6'
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  width: '80px',
                  height: '64px',
                  backgroundColor: '#E5E7EB',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px'
                }}>
                  🏪
                </div>
                
                <div style={{ flex: '1' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'start',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                        {vendor.name}
                      </h4>
                      <p style={{ fontSize: '12px', color: '#6B7280' }}>{vendor.category}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#FCD34D', fontSize: '14px' }}>⭐</span>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                        {vendor.rating}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#6B7280' }}>
                    <span>🕒 {vendor.eta}</span>
                    <span>🚚 {vendor.fee}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        backgroundColor: 'white',
        borderTop: '1px solid #E5E7EB',
        padding: '8px 16px',
        zIndex: '50'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          {[
            { icon: '🏠', name: 'Explore Go7', active: true },
            { icon: '📦', name: 'Orders', active: false },
            { icon: '📍', name: 'Track', active: false },
            { icon: '💬', name: 'Chat', active: false },
            { icon: '👤', name: 'Profile', active: false }
          ].map((item, index) => (
            <button
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                color: item.active ? '#E30613' : '#6B7280',
                cursor: 'pointer'
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: '500' }}>{item.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveMobileHomePage;