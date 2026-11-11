import React from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'

export default function RouteDiagnostic() {
  const location = useLocation()
  const params = useParams()
  const navigate = useNavigate()
  
  console.log('🟢 RouteDiagnostic rendering!')
  console.log('Location:', location)
  console.log('Params:', params)
  
  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#ffff00', 
      minHeight: '100vh',
      fontFamily: 'monospace' 
    }}>
      <h1>🚨 ROUTE DIAGNOSTIC PAGE</h1>
      <h2>If you see this, routing is working!</h2>
      
      <div style={{ backgroundColor: '#000', color: '#0f0', padding: '20px', margin: '20px 0' }}>
        <h3>Route Information:</h3>
        <p><strong>Pathname:</strong> {location.pathname}</p>
        <p><strong>Search:</strong> {location.search}</p>
        <p><strong>Hash:</strong> {location.hash}</p>
        <p><strong>State:</strong> {JSON.stringify(location.state)}</p>
      </div>
      
      <div style={{ backgroundColor: '#000', color: '#0ff', padding: '20px', margin: '20px 0' }}>
        <h3>Window Location:</h3>
        <p><strong>href:</strong> {window.location.href}</p>
        <p><strong>origin:</strong> {window.location.origin}</p>
        <p><strong>pathname:</strong> {window.location.pathname}</p>
      </div>
      
      <h3>Test Navigation:</h3>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate('/orders')} style={{ padding: '10px', backgroundColor: '#f0f0f0', border: '1px solid #ccc' }}>
          Go to Orders
        </button>
        <button onClick={() => navigate('/chat')} style={{ padding: '10px', backgroundColor: '#e0f0ff', border: '1px solid #ccc' }}>
          Go to Chat
        </button>
        <button onClick={() => navigate('/profile')} style={{ padding: '10px', backgroundColor: '#ffe0e0', border: '1px solid #ccc' }}>
          Go to Profile
        </button>
        <button onClick={() => navigate('/track')} style={{ padding: '10px', backgroundColor: '#e0ffe0', border: '1px solid #ccc' }}>
          Go to Track
        </button>
        <button onClick={() => navigate('/')} style={{ padding: '10px', backgroundColor: '#e60023', color: 'white', border: 'none' }}>
          Go Home
        </button>
      </div>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#000', color: '#fff' }}>
        <p>Current time: {new Date().toLocaleString()}</p>
        <p>User Agent: {navigator.userAgent}</p>
      </div>
    </div>
  )
}