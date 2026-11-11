import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import HeroSection from './components/HeroSection-test'

console.log('🚀 Starting Go7 App Test...')

// Get the root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
  throw new Error('Root element not found!')
}

console.log('✅ Root element found')

// Create a simple component for testing
const App = () => {
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif' 
    }}>
      <h1 style={{ color: '#e53e3e' }}>Go7 Delivery App - Test Page</h1>
      <p>This is a simple test page with our hero section component:</p>
      
      <HeroSection />
      
      <p>If you're seeing this and the hero section above, the React application is working correctly!</p>
    </div>
  )
}

// Create root and render app
const root = ReactDOM.createRoot(rootElement)
console.log('✅ React root created, rendering app...')

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

console.log('✅ Go7 App Test rendered successfully!')