import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import UltraSimpleApp from './UltraSimpleApp';

console.log('🔄 Starting ultra-simple version to debug loading issues');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
} else {
  console.log('✅ Root element found, mounting React...');
  
  try {
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
      <React.StrictMode>
        <BrowserRouter>
          <UltraSimpleApp />
        </BrowserRouter>
      </React.StrictMode>
    );
    
    console.log('✅ App rendered successfully!');
  } catch (error) {
    console.error('❌ React render error:', error);
  }
}