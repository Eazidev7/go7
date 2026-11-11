import React from 'react';

const DesktopHero = ({ location = 'Abeokuta, NG' }) => {
  return (
    <div className="desktop-hero">
      {/* Desktop Hero content */}
      <div style={{ 
        padding: '40px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        margin: '20px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}>
        <h1 style={{ 
          color: '#0066CC', 
          fontSize: '32px', 
          marginBottom: '16px',
          fontWeight: 'bold'
        }}>
          Welcome to Go7 Delivery
        </h1>
        
        <p style={{ 
          fontSize: '18px', 
          lineHeight: '1.6',
          color: '#333',
          maxWidth: '800px'
        }}>
          Fast, reliable delivery service at your fingertips. Order food, groceries, or send packages across town in {location}.
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '16px',
          marginTop: '24px'
        }}>
          <button style={{
            backgroundColor: '#E30613',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Order Now
          </button>
          
          <button style={{
            backgroundColor: 'transparent',
            color: '#0066CC',
            border: '2px solid #0066CC',
            borderRadius: '4px',
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}>
            Learn More
          </button>
        </div>
      </div>
      
      {/* Featured Categories */}
      <div style={{ padding: '20px', margin: '20px' }}>
        <h2 style={{ color: '#333', marginBottom: '16px' }}>Popular Categories</h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          {['Food', 'Groceries', 'Pharmacy', 'Electronics', 'Fashion'].map((category) => (
            <div key={category} style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s ease-in-out',
              cursor: 'pointer'
            }}>
              <div style={{
                fontSize: '24px',
                marginBottom: '8px'
              }}>
                {category === 'Food' && '🍔'}
                {category === 'Groceries' && '🛒'}
                {category === 'Pharmacy' && '💊'}
                {category === 'Electronics' && '📱'}
                {category === 'Fashion' && '👕'}
              </div>
              <h3 style={{ margin: '0' }}>{category}</h3>
            </div>
          ))}
        </div>
      </div>
      
      {/* Stats Section */}
      <div style={{
        backgroundColor: '#0066CC',
        color: 'white',
        padding: '40px',
        margin: '20px',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Why Choose Go7?</h2>
        
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          textAlign: 'center',
          flexWrap: 'wrap',
          gap: '20px'
        }}>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>15min</div>
            <div>Average Delivery Time</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>500+</div>
            <div>Partner Restaurants</div>
          </div>
          <div>
            <div style={{ fontSize: '36px', fontWeight: 'bold' }}>4.8/5</div>
            <div>Customer Rating</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopHero;