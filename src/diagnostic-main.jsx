import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import SimpleApp from './SimpleApp.jsx';
import './index.css';
import './styles/mobile.css';

console.log('🚀 Starting Go7 Diagnostic App...');

// Wrap the app with necessary providers but keep it minimal
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <SimpleApp />
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Add a check to make sure the app loaded
console.log('✅ Go7 Diagnostic App loaded successfully');

// Create a visual indicator that the app loaded
setTimeout(() => {
  const indicator = document.createElement('div');
  indicator.innerHTML = '✅ App Loaded';
  indicator.style.cssText = 'position:fixed;top:10px;right:10px;background:green;color:white;padding:5px;border-radius:5px;z-index:9999;font-size:12px';
  document.body.appendChild(indicator);
  setTimeout(() => indicator.remove(), 3000);
}, 1000);