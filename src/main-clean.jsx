import React from 'react'
import ReactDOM from 'react-dom/client'

// Import basic styles first
import './index.css'

import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'

// Import App component
import App from './App.tsx'

console.log('🚀 Starting Go7 App...')

// Get the root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
  throw new Error('Root element not found!')
}

console.log('✅ Root element found, creating React root...')

// Create root and render app
const root = ReactDOM.createRoot(rootElement)
console.log('✅ React root created, rendering app...')

root.render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
)

console.log('✅ Go7 App rendered successfully!')