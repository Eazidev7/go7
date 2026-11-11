import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

console.log('🚀 Starting Go7 App with minimal configuration');

// Make sure the root element exists
const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ Fatal Error: Root element #root not found');
  
  // Create root element if it doesn't exist
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  
  console.log('✅ Created new root element');
}

// Get root element (original or newly created)
const root = ReactDOM.createRoot(
  document.getElementById('root')
);

// Add logs for debugging
console.log('🧪 Creating minimal test component');

// Simple test component in case the main app fails
const MinimalTestComponent = () => {
  const [count, setCount] = React.useState(0);
  
  React.useEffect(() => {
    console.log('✅ Minimal test component mounted successfully');
  }, []);
  
  return React.createElement(
    'div',
    { style: { padding: '20px' } },
    [
      React.createElement('h1', { key: 'h1' }, 'React is working!'),
      React.createElement('p', { key: 'p1' }, `This is a minimal test component. Counter: ${count}`),
      React.createElement(
        'button',
        { 
          key: 'btn', 
          onClick: () => setCount(c => c + 1),
          style: { padding: '8px 16px', background: '#0066cc', color: 'white', border: 'none', borderRadius: '4px' }
        },
        'Click me'
      ),
      React.createElement('p', { key: 'p2' }, 'If you see this, React is working correctly!'),
      React.createElement('p', { key: 'p3', style: { marginTop: '20px', fontSize: '14px', color: '#666' } }, 
        `Using React ${React.version} | ReactDOM ${ReactDOM.version}`)
    ]
  );
};

// Simple error handling
try {
  console.log('🚀 Attempting to render React app...');
  
  // First try to render the minimal test component directly
  root.render(React.createElement(MinimalTestComponent));
  
  // If that works, then try the main app after a delay
  setTimeout(() => {
    try {
      console.log('🔄 Now attempting to render full app with routing...');
      root.render(
        <React.StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </React.StrictMode>
      );
      console.log('✅ React app mounted successfully');
    } catch (error) {
      console.error('❌ React render error:', error);
      
      // Fallback if React fails to render
      document.getElementById('root').innerHTML = `
        <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
          <h1 style="color: #e61e25;">Go7 Error</h1>
          <p>React failed to render. Please check the console for details.</p>
          <button onclick="window.location.reload()" style="background: #e61e25; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
            Reload Page
          </button>
        </div>
      `;
    }
  }, 1000);
  
} catch (error) {
  console.error('❌ Initial React render error:', error);
  
  // Fallback if React fails to render
  document.getElementById('root').innerHTML = `
    <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif;">
      <h1 style="color: #e61e25;">Go7 Error</h1>
      <p>React failed to render. Please check the console for details.</p>
      <button onclick="window.location.reload()" style="background: #e61e25; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
        Reload Page
      </button>
    </div>
  `;
}