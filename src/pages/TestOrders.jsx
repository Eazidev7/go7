import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function TestOrders() {
  const navigate = useNavigate()
  
  console.log('🟢 TestOrders component rendering!')
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1>✅ TEST ORDERS PAGE WORKS!</h1>
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