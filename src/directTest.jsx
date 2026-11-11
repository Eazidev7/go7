import React from 'react'
import ReactDOM from 'react-dom/client'

// Ultra simple test without any providers
const DirectTest = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#00ff00',
      color: 'black',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '2rem',
      fontWeight: 'bold',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <h1>🟢 DIRECT REACT TEST 🟢</h1>
      <p>If you see this, React is working!</p>
      <div style={{ marginTop: '2rem', fontSize: '1.2rem' }}>
        <p>✅ ReactDOM.createRoot working</p>
        <p>✅ Component rendering working</p>
        <p>✅ Styles applying working</p>
      </div>
    </div>
  );
};

// Get the root element
const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('Root element not found!')
} else {
  console.log('Root element found, rendering DirectTest...')
  const root = ReactDOM.createRoot(rootElement)
  root.render(<DirectTest />)
}