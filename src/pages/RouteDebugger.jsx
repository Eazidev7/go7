import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function RouteDebugger() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const testRoutes = [
    { path: '/', name: 'Home' },
    { path: '/orders', name: 'Orders' },
    { path: '/chat', name: 'Chat' },
    { path: '/profile', name: 'Profile' },
    { path: '/track', name: 'Track' }
  ]
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1>🔍 Route Debug Tool</h1>
      <p><strong>Current Location:</strong> {location.pathname}</p>
      <p><strong>Current Search:</strong> {location.search}</p>
      <p><strong>Current Hash:</strong> {location.hash}</p>
      
      <h2>Test Navigation:</h2>
      {testRoutes.map(route => (
        <div key={route.path} style={{ margin: '10px 0' }}>
          <button
            onClick={() => {
              console.log(`🔍 Navigating to: ${route.path}`)
              navigate(route.path)
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: location.pathname === route.path ? '#e60023' : '#ccc',
              color: location.pathname === route.path ? 'white' : 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Go to {route.name} ({route.path})
          </button>
          {location.pathname === route.path && <span>← Current</span>}
        </div>
      ))}
      
      <h2>Window Location Info:</h2>
      <pre style={{ backgroundColor: '#white', padding: '10px', border: '1px solid #ccc' }}>
        {JSON.stringify({
          href: window.location.href,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          host: window.location.host,
          origin: window.location.origin
        }, null, 2)}
      </pre>
    </div>
  )
}