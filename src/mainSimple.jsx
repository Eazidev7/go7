import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Simple app without providers
import AppRouter from './AppRouter'

console.log('🚀 Simplified main.jsx loading...')

// Get the root element
const rootElement = document.getElementById('root')
console.log('🔍 Root element check:', !!rootElement)

if (!rootElement) {
  console.error('❌ Root element not found!')
  throw new Error('Root element not found!')
}

console.log('✅ Creating React root...')
const root = ReactDOM.createRoot(rootElement)

console.log('✅ Rendering simplified app...')
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </React.StrictMode>
)

console.log('✅ Simplified app rendered!')