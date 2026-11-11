import React from 'react';

const MobileHomePageSimple = ({ location = 'Abeokuta, NG' }) => {
  return (
    <div style={{ 
      backgroundColor: 'white',
      minHeight: '100vh',
      padding: '0'
    }}>
      {/* Mobile header */}
      
      {/* Mobile content */}
      <div className="mobile-content" style={{ padding: '20px' }}>
        <h1 style={{ color: '#E30613', fontSize: '24px', fontWeight: 'bold' }}>
          📱 Go7 Mobile Homepage
        </h1>
        
        {/* Location */}
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '18px' }}>📍 {location}</span>
        </div>
        
        {/* Search Bar */}
        <input 
          type="text"
          placeholder="Search Go7…"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#f5f5f5',
            borderRadius: '20px',
            border: 'none',
            marginBottom: '20px'
          }}
        />
        
        {/* Promo Banner */}
        <div style={{
          backgroundColor: '#E30613',
          color: 'white',
          padding: '20px',
          borderRadius: '15px',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Get ₦200 Off Your First Order on Go7
          </h2>
          <p style={{ marginBottom: '15px', opacity: '0.9' }}>
            Use code GOFIRST at checkout
          </p>
          <button style={{
            backgroundColor: 'black',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '20px',
            border: 'none',
            fontWeight: 'bold'
          }}>
            Order Now
          </button>
        </div>
        
        {/* Categories */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px', fontWeight: 'bold' }}>Categories</h3>
          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto' }}>
            {['🍔 Burger', '🍕 Pizza', '🥗 Salad', '🛒 Local Market', '💊 Pharmacy', '🚚 Delivery'].map((cat, i) => (
              <button 
                key={i}
                style={{
                  backgroundColor: cat.includes('Local Market') || cat.includes('Pharmacy') ? '#E30613' : '#f5f5f5',
                  color: cat.includes('Local Market') || cat.includes('Pharmacy') ? 'white' : 'black',
                  padding: '10px 15px',
                  borderRadius: '20px',
                  border: 'none',
                  whiteSpace: 'nowrap',
                  fontSize: '14px'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        
        {/* Vendors */}
        <div>
          <h3 style={{ marginBottom: '15px', fontWeight: 'bold' }}>Popular Near You</h3>
          {[
            { name: 'Burger Haven', eta: '15-25 min', rating: '4.8', fee: '₦200' },
            { name: 'Ibara Market', eta: '10-20 min', rating: '4.6', fee: '₦150' },
            { name: 'MediPlus Pharmacy', eta: '5-15 min', rating: '4.9', fee: '₦100' }
          ].map((vendor, i) => (
            <div key={i} style={{
              backgroundColor: 'white',
              border: '1px solid #e5e5e5',
              borderRadius: '10px',
              padding: '15px',
              marginBottom: '10px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontWeight: 'bold', marginBottom: '5px' }}>{vendor.name}</h4>
                  <p style={{ fontSize: '12px', color: '#666' }}>
                    🕒 {vendor.eta} • ⭐ {vendor.rating} • 🚚 {vendor.fee}
                  </p>
                </div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  🏪
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom Nav */}
        <div style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          backgroundColor: 'white',
          borderTop: '1px solid #e5e5e5',
          padding: '10px',
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          {['🏠 Explore', '📦 Orders', '📍 Track', '💬 Chat', '👤 Profile'].map((nav, i) => (
            <button key={i} style={{
              background: 'none',
              border: 'none',
              color: i === 0 ? '#E30613' : '#666',
              fontSize: '12px',
              textAlign: 'center'
            }}>
              {nav}
            </button>
          ))}
        </div>
      </div>
      
      {/* No mobile-only classes are actually used in this component,
          so we don't need the media query styling */}
    </div>
  );
};

export default MobileHomePageSimple;