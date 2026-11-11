import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function TestProfile() {
  const navigate = useNavigate()
  
  console.log('🟢 TestProfile component rendering!')
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#ffe0e0', minHeight: '100vh' }}>
      <h1>✅ TEST PROFILE PAGE WORKS!</h1>
      <p>If you see this, the route is working correctly.</p>
      <button 
        onClick={() => navigate('/')}
        style={{ padding: '10px 20px', backgroundColor: '#e60023', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Go Home
      </button>
    </div>
  )
}