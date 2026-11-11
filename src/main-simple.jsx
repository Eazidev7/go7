import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

console.log('🚀 Starting Go7 App (Simplified Version)...')

// Define SimpleApp component
function SimpleApp() {
  return (
    <div className="p-8 max-w-screen-xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Go7 Simple App</h1>
      <p className="text-gray-600 mb-6">This is a simplified version of the Go7 application.</p>
      
      <div className="bg-red-100 p-4 rounded-lg border border-red-300">
        <h2 className="text-xl font-semibold text-red-700 mb-2">Development Mode</h2>
        <p className="text-red-600">
          This is a simplified version of the application for development and testing purposes.
        </p>
      </div>
    </div>
  )
}

// Get the root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('❌ Root element not found!')
  throw new Error('Root element not found!')
} else {
  console.log('Root element found, creating React app...')
  const root = ReactDOM.createRoot(rootElement)
  root.render(<SimpleApp />)
  console.log('Simple app rendered!')
}