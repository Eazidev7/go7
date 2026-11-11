import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

console.log('🚀 Starting Go7 App - Clean Version');

// Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ Root element found');

// Simple error fallback
function showErrorFallback(error) {
  console.error('❌ App error:', error);
  rootElement.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      background: #f5f5f5;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        text-align: center;
        max-width: 500px;
      ">
        <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
        <h2 style="color: #dc2626; margin-bottom: 16px;">App Error</h2>
        <p style="color: #666; margin-bottom: 24px;">
          There was an error loading the GO7 app. Please refresh to try again.
        </p>
        <button onclick="window.location.reload()" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
        ">
          Refresh Page
        </button>
        <details style="margin-top: 20px; text-align: left;">
          <summary style="cursor: pointer;">Error Details</summary>
          <pre style="
            background: #f3f4f6;
            padding: 10px;
            border-radius: 4px;
            font-size: 12px;
            margin-top: 10px;
            white-space: pre-wrap;
          ">${error.toString()}</pre>
        </details>
      </div>
    </div>
  `;
}

// Loading screen
function showLoadingScreen() {
  rootElement.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    ">
      <div style="text-align: center;">
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        "></div>
        <h2 style="margin: 0 0 10px 0;">GO7 Delivery</h2>
        <p style="margin: 0; opacity: 0.8;">Loading...</p>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </div>
  `;
}

// Show loading immediately
showLoadingScreen();

try {
  console.log('🔧 Creating React root...');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('🎨 Rendering App...');
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('✅ App rendered successfully');
  
  // Check if app actually rendered after a delay
  setTimeout(() => {
    const appElement = rootElement.querySelector('.App, main, [class*="app"], [id*="app"]');
    if (!appElement || rootElement.children.length === 0) {
      console.warn('⚠️ App may not have rendered correctly');
      setTimeout(() => {
        const stillEmpty = rootElement.querySelector('.App, main, [class*="app"], [id*="app"]');
        if (!stillEmpty) {
          showErrorFallback(new Error('App failed to render content'));
        }
      }, 2000);
    } else {
      console.log('✅ App content detected');
    }
  }, 1000);
  
} catch (error) {
  showErrorFallback(error);
}

// Global error handling
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  showErrorFallback(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});