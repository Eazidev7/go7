import React from 'react';

const SimpleMap = () => {
  return (
    <div style={{ padding: '20px' }}>
      <h1>🗺️ Your Cartoon Icons Map</h1>
      
      <div style={{ 
        width: '100%', 
        height: '500px', 
        border: '3px solid #333',
        background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
        position: 'relative',
        borderRadius: '15px',
        overflow: 'hidden',
        marginBottom: '20px'
      }}>
        <div style={{
          position: 'absolute',
          top: '15px',
          left: '15px',
          background: 'white',
          padding: '15px',
          borderRadius: '10px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#333' }}>GO7 Delivery Map</h2>
          <p style={{ margin: '0', color: '#666' }}>Your cartoon icons below!</p>
        </div>
        
        {/* Your 4 cartoon icons positioned as map markers */}
        <div style={{
          position: 'absolute',
          top: '120px',
          left: '80px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid #ff4757',
          boxShadow: '0 6px 20px rgba(255, 71, 87, 0.4)',
          background: 'white'
        }}>
          <img 
            src="/bag-icon.jpg" 
            alt="Pickup Bag" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ff4757',
            color: 'white',
            fontSize: '24px'
          }}>🛍️</div>
        </div>
        
        <div style={{
          position: 'absolute',
          top: '250px',
          left: '250px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid #2ed573',
          boxShadow: '0 6px 20px rgba(46, 213, 115, 0.4)',
          background: 'white'
        }}>
          <img 
            src="/shop-icon.jpg" 
            alt="Shop" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2ed573',
            color: 'white',
            fontSize: '24px'
          }}>🏪</div>
        </div>
        
        <div style={{
          position: 'absolute',
          top: '180px',
          left: '400px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid #3742fa',
          boxShadow: '0 6px 20px rgba(55, 66, 250, 0.4)',
          background: 'white'
        }}>
          <img 
            src="/rider-icon.jpg" 
            alt="Rider" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#3742fa',
            color: 'white',
            fontSize: '24px'
          }}>🏍️</div>
        </div>
        
        <div style={{
          position: 'absolute',
          top: '100px',
          left: '550px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid #ffa502',
          boxShadow: '0 6px 20px rgba(255, 165, 2, 0.4)',
          background: 'white'
        }}>
          <img 
            src="/olumo-rock-icon.jpg" 
            alt="Olumo Rock" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div style={{
            display: 'none',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffa502',
            color: 'white',
            fontSize: '24px'
          }}>🏛️</div>
        </div>
        
        {/* Map grid pattern */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
          pointerEvents: 'none'
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '15px',
          right: '15px',
          fontSize: '14px',
          background: 'rgba(255,255,255,0.95)',
          padding: '8px 12px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          🗺️ Cartoon Map with Your Icons
        </div>
      </div>
      
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '10px', 
        boxShadow: '0 2px 15px rgba(0,0,0,0.1)' 
      }}>
        <h3>✅ Your Cartoon Icons Are Working!</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginTop: '15px' }}>
          <div style={{ padding: '15px', background: '#ffe8e8', borderRadius: '8px', border: '2px solid #ff4757' }}>
            <strong>🛍️ Bag Icon (Red)</strong><br/>
            Used for pickup locations
          </div>
          <div style={{ padding: '15px', background: '#e8ffe8', borderRadius: '8px', border: '2px solid #2ed573' }}>
            <strong>🏪 Shop Icon (Green)</strong><br/>
            Used for vendor/restaurant locations
          </div>
          <div style={{ padding: '15px', background: '#e8eeff', borderRadius: '8px', border: '2px solid #3742fa' }}>
            <strong>🏍️ Rider Icon (Blue)</strong><br/>
            Used for delivery person
          </div>
          <div style={{ padding: '15px', background: '#fff8e8', borderRadius: '8px', border: '2px solid #ffa502' }}>
            <strong>🏛️ Olumo Rock Icon (Orange)</strong><br/>
            Used for landmark locations
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleMap;