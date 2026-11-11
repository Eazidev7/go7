import React from 'react';

const MobileHomePageClean = () => {
  return (
    <div style={{ 
      backgroundColor: '#E30613', 
      color: 'white', 
      padding: '20px', 
      minHeight: '100vh',
      fontSize: '18px'
    }}>
      <h1>🚀 Go7 Mobile Homepage</h1>
      <p>✅ Component is loading successfully!</p>
      <div style={{ marginTop: '20px' }}>
        <h2>📱 Mobile Features:</h2>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>📍 Location: Abeokuta, NG</li>
          <li>🔍 Search functionality</li>
          <li>🎯 Promo: ₦200 off first order</li>  
          <li>🍔 Food categories</li>
          <li>🏪 Vendor listings</li>
          <li>📱 Bottom navigation</li>
        </ul>
      </div>
      <div style={{ 
        marginTop: '30px', 
        padding: '15px', 
        backgroundColor: 'rgba(255,255,255,0.1)', 
        borderRadius: '10px' 
      }}>
        <p><strong>Status:</strong> ✅ Mobile component working!</p>
        <p><strong>Next:</strong> Building full mobile UI...</p>
      </div>
    </div>
  );
};

export default MobileHomePageClean;