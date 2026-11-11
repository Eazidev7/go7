import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import VendorAuthApp from './VendorAuthApp.jsx';
import './index.css';

window.__GO7_VENDOR_ENTRY__ = true;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <VendorAuthApp />
    </HelmetProvider>
  </React.StrictMode>
);
