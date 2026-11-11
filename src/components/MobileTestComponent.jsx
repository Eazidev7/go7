import React from 'react';

function MobileTestComponent() {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, backgroundColor: '#f5f5f5' }}>
      <div style={{ maxWidth: '100%', padding: '20px' }}>
        <div style={{ backgroundColor: '#E30613', color: 'white', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', marginBottom: '20px' }}>
          🧪 REACT COMPONENT MOBILE TEST PAGE
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'white', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '20px' }}>📍</span>
            <span style={{ fontSize: '16px', fontWeight: 500 }}>Abeokuta, NG</span>
          </div>
          <div style={{ width: '30px', height: '30px', backgroundColor: '#E30613', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            🔔
          </div>
        </div>

        <input 
          type="text" 
          placeholder="Search Go7..." 
          style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #ddd', fontSize: '16px', backgroundColor: '#f9f9f9', marginBottom: '20px', boxSizing: 'border-box' }}
        />

        <div style={{ backgroundColor: '#E30613', color: 'white', padding: '20px', borderRadius: '10px', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>Get ₦200 Off Your First Order</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px', opacity: 0.9 }}>Use code GOFIRST at checkout</p>
          <button style={{ backgroundColor: 'black', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
            Order Now
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Categories</h3>
          <div style={{ display: 'flex', overflowX: 'auto', gap: '10px', paddingBottom: '10px' }}>
            {['🍔 Burger', '🍕 Pizza', '🛒 Market', '🥗 Salad', '💊 Pharmacy'].map((cat, i) => (
              <div key={i} style={{ 
                padding: '10px 15px', 
                backgroundColor: cat.includes('Market') ? '#E30613' : '#f5f5f5', 
                color: cat.includes('Market') ? 'white' : '#333', 
                borderRadius: '20px', 
                fontSize: '14px', 
                whiteSpace: 'nowrap'
              }}>
                {cat}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '80px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>Popular Near You</h3>
          
          {[
            { name: 'Burger Haven', icon: '🍔', rating: 4.8 },
            { name: 'Ibara Market', icon: '🛒', rating: 4.6 },
            { name: 'MediPlus Pharmacy', icon: '💊', rating: 4.9 }
          ].map((vendor, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '15px',
              padding: '15px',
              backgroundColor: 'white',
              borderRadius: '10px',
              marginBottom: '10px',
              boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                width: '70px',
                height: '70px',
                backgroundColor: '#eee',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '30px'
              }}>
                {vendor.icon}
              </div>
              <div>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>
                  {vendor.name}
                </h4>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  <span>⭐ {vendor.rating}</span> • <span>🕒 15-25 min</span> • <span>🚚 ₦200</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '10px 15px'
      }}>
        {[
          { icon: '🏠', name: 'Explore', active: true },
          { icon: '📦', name: 'Orders' },
          { icon: '📍', name: 'Track' },
          { icon: '💬', name: 'Chat' },
          { icon: '👤', name: 'Profile' }
        ].map((item, i) => (
          <div key={i} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            color: item.active ? '#E30613' : '#666'
          }}>
            <div style={{ fontSize: '24px' }}>{item.icon}</div>
            <div style={{ fontSize: '12px' }}>{item.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MobileTestComponent;