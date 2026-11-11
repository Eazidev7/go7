import React from 'react'

const MobileTestBanner = () => {
  const currentTime = new Date().toLocaleTimeString()
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(90deg, #e60023, #ff4757)',
      color: 'white',
      padding: '8px',
      textAlign: 'center',
      fontSize: '14px',
      fontWeight: 'bold',
      zIndex: 1000,
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      🚀 LIVE UPDATE TEST - {currentTime} - Cache Buster v3.01.02
    </div>
  )
}

export default MobileTestBanner