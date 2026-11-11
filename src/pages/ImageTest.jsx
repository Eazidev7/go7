import React from 'react';

const ImageTest = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0' }}>
      <h1>Image Test Page</h1>
      
      <div style={{ margin: '20px 0' }}>
        <h2>Burger Images:</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>
            <p>From /burger-hero.png</p>
            <img 
              src="/burger-hero.png" 
              alt="Burger from root" 
              style={{ width: '200px', border: '2px solid red' }}
              onLoad={() => console.log('Root burger loaded')}
              onError={(e) => console.error('Root burger failed:', e)}
            />
          </div>
          <div>
            <p>From /assets/hero/burger-tall.png</p>
            <img 
              src="/assets/hero/burger-tall.png" 
              alt="Burger from assets" 
              style={{ width: '200px', border: '2px solid blue' }}
              onLoad={() => console.log('Assets burger loaded')}
              onError={(e) => console.error('Assets burger failed:', e)}
            />
          </div>
        </div>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h2>Scooter Images:</h2>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div>
            <p>From /scooter.png</p>
            <img 
              src="/scooter.png" 
              alt="Scooter from root" 
              style={{ width: '200px', border: '2px solid red' }}
              onLoad={() => console.log('Root scooter loaded')}
              onError={(e) => console.error('Root scooter failed:', e)}
            />
          </div>
          <div>
            <p>From /assets/hero/go7-scooter.png</p>
            <img 
              src="/assets/hero/go7-scooter.png" 
              alt="Scooter from assets" 
              style={{ width: '200px', border: '2px solid blue' }}
              onLoad={() => console.log('Assets scooter loaded')}
              onError={(e) => console.error('Assets scooter failed:', e)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageTest;